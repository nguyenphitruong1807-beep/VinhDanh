-- KIỂM TRA NHANH BACKEND UNITE POSTER STUDIO V6.2

-- 1) Template đã lưu chưa?
select slug, name, status, updated_at,
       jsonb_array_length(coalesce(template_json->'textFields', '[]'::jsonb)) as text_fields,
       jsonb_array_length(coalesce(template_json->'backgroundVariants', '[]'::jsonb)) as backgrounds,
       jsonb_array_length(coalesce(template_json->'foregroundVariants', '[]'::jsonb)) as foregrounds,
       jsonb_array_length(coalesce(template_json->'fonts', '[]'::jsonb)) as fonts
from public.poster_templates
order by updated_at desc;

-- 2) Xem transform bản trên của từng màu.
select pt.slug,
       fg->>'id' as foreground_id,
       fg->'transform' as foreground_transform
from public.poster_templates pt
cross join lateral jsonb_array_elements(
  coalesce(pt.template_json->'foregroundVariants', '[]'::jsonb)
) as fg
order by pt.updated_at desc, foreground_id;

-- 3) Asset đã upload/log chưa?
select template_id, asset_type, file_name, storage_path, created_at
from public.poster_assets
order by created_at desc
limit 100;
