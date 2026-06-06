-- UNITE POSTER GENERATOR - SUPABASE SCHEMA
-- Copy toàn bộ file này vào Supabase SQL Editor và chạy.
-- Sau đó tạo user admin trong Authentication, lấy UUID user đó rồi chạy lệnh INSERT profile ở cuối file.

create extension if not exists "pgcrypto";

-- 1) User profile + role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'leader' check (role in ('admin', 'leader')),
  created_at timestamptz not null default now()
);

-- Function check admin. Dùng trong RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 2) Template JSON chính
create table if not exists public.poster_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  template_json jsonb not null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_poster_templates_status on public.poster_templates(status);
create index if not exists idx_poster_templates_json on public.poster_templates using gin(template_json);

-- 3) Asset log: ảnh nền, foreground, font, logo...
create table if not exists public.poster_assets (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.poster_templates(id) on delete cascade,
  asset_type text not null check (asset_type in ('background', 'foreground', 'font', 'logo', 'other')),
  storage_path text not null,
  public_url text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_poster_assets_template_id on public.poster_assets(template_id);
create index if not exists idx_poster_assets_type on public.poster_assets(asset_type);

-- 4) updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_poster_templates_updated_at on public.poster_templates;
create trigger trg_poster_templates_updated_at
before update on public.poster_templates
for each row execute function public.set_updated_at();

-- 5) Storage bucket: poster-assets
-- Có thể tạo bucket này bằng giao diện Supabase Storage cũng được.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'poster-assets',
  'poster-assets',
  true,
  20971520,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'font/woff2',
    'font/woff',
    'font/ttf',
    'font/otf',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 6) RLS
alter table public.profiles enable row level security;
alter table public.poster_templates enable row level security;
alter table public.poster_assets enable row level security;

-- Profiles policies
drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- Poster templates policies
-- Leader/nhân sự không cần login vẫn đọc được template active.
drop policy if exists "poster_templates_public_read_active" on public.poster_templates;
create policy "poster_templates_public_read_active"
on public.poster_templates
for select
to anon, authenticated
using (status = 'active');

-- Admin đọc được toàn bộ draft/active/archived.
drop policy if exists "poster_templates_admin_read_all" on public.poster_templates;
create policy "poster_templates_admin_read_all"
on public.poster_templates
for select
to authenticated
using (public.is_admin());

-- Admin thêm/sửa/xóa template.
drop policy if exists "poster_templates_admin_insert" on public.poster_templates;
create policy "poster_templates_admin_insert"
on public.poster_templates
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "poster_templates_admin_update" on public.poster_templates;
create policy "poster_templates_admin_update"
on public.poster_templates
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "poster_templates_admin_delete" on public.poster_templates;
create policy "poster_templates_admin_delete"
on public.poster_templates
for delete
to authenticated
using (public.is_admin());

-- Poster assets table policies
drop policy if exists "poster_assets_public_read" on public.poster_assets;
create policy "poster_assets_public_read"
on public.poster_assets
for select
to anon, authenticated
using (true);

drop policy if exists "poster_assets_admin_insert" on public.poster_assets;
create policy "poster_assets_admin_insert"
on public.poster_assets
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "poster_assets_admin_update" on public.poster_assets;
create policy "poster_assets_admin_update"
on public.poster_assets
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "poster_assets_admin_delete" on public.poster_assets;
create policy "poster_assets_admin_delete"
on public.poster_assets
for delete
to authenticated
using (public.is_admin());

-- 7) Storage policies
-- Public đọc asset từ bucket poster-assets.
drop policy if exists "storage_public_read_poster_assets" on storage.objects;
create policy "storage_public_read_poster_assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'poster-assets');

-- Chỉ admin upload/update/delete file trong bucket poster-assets.
drop policy if exists "storage_admin_upload_poster_assets" on storage.objects;
create policy "storage_admin_upload_poster_assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'poster-assets' and public.is_admin());

drop policy if exists "storage_admin_update_poster_assets" on storage.objects;
create policy "storage_admin_update_poster_assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'poster-assets' and public.is_admin())
with check (bucket_id = 'poster-assets' and public.is_admin());

drop policy if exists "storage_admin_delete_poster_assets" on storage.objects;
create policy "storage_admin_delete_poster_assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'poster-assets' and public.is_admin());

-- 8) Tạo admin đầu tiên
-- Sau khi tạo account trong Supabase Authentication, copy UUID user và chạy mẫu bên dưới:
-- insert into public.profiles (id, email, full_name, role)
-- values ('PASTE_AUTH_USER_UUID_HERE', 'admin@unitegroup.vn', 'Admin Unite', 'admin')
-- on conflict (id) do update set role = 'admin', email = excluded.email, full_name = excluded.full_name;
