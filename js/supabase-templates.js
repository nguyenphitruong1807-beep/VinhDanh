import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, POSTER_BUCKET } from "./supabase-config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getMyProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function assertAdmin() {
  const profile = await getMyProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Tài khoản này chưa có quyền admin.");
  }
  return profile;
}

export async function loadActiveTemplate(slug = null) {
  let query = supabase
    .from("poster_templates")
    .select("id,slug,name,status,template_json,updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (slug) query = query.eq("slug", slug);

  const { data, error } = await query.limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;

  const template = row.template_json;
  await loadFontsFromTemplate(template);
  return template;
}

export async function listActiveTemplates() {
  const { data, error } = await supabase
    .from("poster_templates")
    .select("id,slug,name,status,updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}


export async function getTemplateBySlugAdmin(slug) {
  await assertAdmin();
  const { data, error } = await supabase
    .from("poster_templates")
    .select("id,slug,name,status,template_json,updated_at")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  if (!data) return null;
  const template = data.template_json;
  await loadFontsFromTemplate(template);
  return data;
}

export async function listAdminTemplates() {
  await assertAdmin();
  const { data, error } = await supabase
    .from("poster_templates")
    .select("id,slug,name,status,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveTemplateToSupabase({
  template,
  status = "active",
  backgroundFile = null,
  backgroundVariantFiles = [],
  foregroundFile = null,
  foregroundVariantFiles = [],
  fontFiles = []
}) {
  const profile = await assertAdmin();

  const slug = slugify(template.templateId || template.slug || template.templateName || `template-${Date.now()}`);
  const workingTemplate = structuredClone(template);
  workingTemplate.templateId = slug;
  workingTemplate.templateName = workingTemplate.templateName || slug;
  workingTemplate.layers ||= {};
  workingTemplate.fonts ||= [];

  const uploadedAssets = [];

  if (backgroundFile) {
    const bg = await uploadPosterAsset(backgroundFile, `templates/${slug}`, "background");
    workingTemplate.layers.background = bg.publicUrl;
    uploadedAssets.push(bg);
  }

  const variantFiles = Array.isArray(backgroundVariantFiles) ? backgroundVariantFiles : [];
  if (variantFiles.length && Array.isArray(workingTemplate.backgroundVariants)) {
    for (const item of variantFiles) {
      if (!item?.id || !item?.file) continue;
      const variant = workingTemplate.backgroundVariants.find(bg => bg.id === item.id);
      if (!variant) continue;
      const bg = await uploadPosterAsset(item.file, `templates/${slug}/backgrounds`, "background");
      variant.src = bg.publicUrl;
      variant.storagePath = bg.storagePath;
      uploadedAssets.push(bg);
    }
    const defaultVariant = workingTemplate.backgroundVariants.find(bg => bg.isDefault) || workingTemplate.backgroundVariants[0];
    if (defaultVariant?.src) workingTemplate.layers.background = defaultVariant.src;
  }

  if (foregroundFile) {
    const fg = await uploadPosterAsset(foregroundFile, `templates/${slug}`, "foreground");
    workingTemplate.layers.foreground = fg.publicUrl;
    uploadedAssets.push(fg);
  }

  const foregroundFiles = Array.isArray(foregroundVariantFiles) ? foregroundVariantFiles : [];
  if (foregroundFiles.length && Array.isArray(workingTemplate.foregroundVariants)) {
    for (const item of foregroundFiles) {
      if (!item?.id || !item?.file) continue;
      const variant = workingTemplate.foregroundVariants.find(fg => fg.id === item.id);
      if (!variant) continue;
      const fg = await uploadPosterAsset(item.file, `templates/${slug}/foregrounds`, "foreground");
      variant.src = fg.publicUrl;
      variant.storagePath = fg.storagePath;
      uploadedAssets.push(fg);
    }
    const defaultVariant = workingTemplate.foregroundVariants.find(fg => fg.isDefault) || workingTemplate.foregroundVariants[0];
    if (defaultVariant?.src) workingTemplate.layers.foreground = defaultVariant.src;
  }

  for (const file of fontFiles) {
    const fontAsset = await uploadPosterAsset(file, `templates/${slug}/fonts`, "font");
    const family = makeFontFamilyName(file.name);
    workingTemplate.fonts.push({
      family,
      name: file.name,
      url: fontAsset.publicUrl,
      storagePath: fontAsset.storagePath,
      format: inferFontFormat(file.name)
    });
    uploadedAssets.push(fontAsset);
  }

  workingTemplate.fonts = (workingTemplate.fonts || []).filter((font, index, list) => {
    const identity = `${font.family || ""}|${font.url || ""}`;
    return list.findIndex(item => `${item.family || ""}|${item.url || ""}` === identity) === index;
  });

  const payload = {
    slug,
    name: workingTemplate.templateName,
    status,
    template_json: workingTemplate,
    updated_by: profile.id,
    created_by: profile.id
  };

  const { data: saved, error } = await supabase
    .from("poster_templates")
    .upsert(payload, { onConflict: "slug" })
    .select("id,slug,name,status,template_json,updated_at")
    .single();

  if (error) throw error;

  if (uploadedAssets.length) {
    const assetRows = uploadedAssets.map(asset => ({
      template_id: saved.id,
      asset_type: asset.assetType,
      storage_path: asset.storagePath,
      public_url: asset.publicUrl,
      file_name: asset.fileName,
      mime_type: asset.mimeType,
      size_bytes: asset.sizeBytes,
      created_by: profile.id
    }));

    const { error: assetError } = await supabase
      .from("poster_assets")
      .insert(assetRows);

    // Template JSON đã được upsert thành công ở trên. Không báo "lưu thất bại"
    // chỉ vì bảng log asset chưa được tạo/chưa đủ policy.
    if (assetError) {
      console.warn("Template đã lưu nhưng poster_assets chưa ghi được:", assetError);
      saved.asset_log_warning = assetError.message || String(assetError);
    }
  }

  return saved;
}

export async function archiveTemplate(slug) {
  await assertAdmin();
  const { data, error } = await supabase
    .from("poster_templates")
    .update({ status: "archived" })
    .eq("slug", slug)
    .select("id,slug,name,status")
    .single();

  if (error) throw error;
  return data;
}

export async function uploadPosterAsset(file, folder, assetType = "other") {
  const safeFileName = sanitizeFileName(file.name || `${assetType}.bin`);
  const storagePath = `${folder}/${assetType}-${crypto.randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(POSTER_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type || guessMimeType(file.name)
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(POSTER_BUCKET)
    .getPublicUrl(storagePath);

  return {
    assetType,
    storagePath,
    publicUrl: data.publicUrl,
    fileName: file.name,
    mimeType: file.type || guessMimeType(file.name),
    sizeBytes: file.size
  };
}

export async function loadFontsFromTemplate(template) {
  const fonts = template?.fonts || [];
  for (const font of fonts) {
    if (!font.family || !font.url) continue;
    try {
      const fontFace = new FontFace(font.family, `url(${font.url})`);
      await fontFace.load();
      document.fonts.add(fontFace);
    } catch (err) {
      console.warn("Không load được font:", font, err);
    }
  }
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}

export function applyCustomFontToField(template, fieldKey, fontFamily) {
  const field = template.textFields?.find(item => item.key === fieldKey);
  if (!field) throw new Error(`Không tìm thấy text field: ${fieldKey}`);
  field.fontFamily = `${fontFamily}, Arial, sans-serif`;
  return template;
}

export function setGradientForField(template, fieldKey, gradient) {
  const field = template.textFields?.find(item => item.key === fieldKey);
  if (!field) throw new Error(`Không tìm thấy text field: ${fieldKey}`);
  field.fillType = "gradient";
  field.gradient = gradient;
  return template;
}

export function createLinearGradientFill(ctx, field, box) {
  const gradient = field.gradient;
  if (!gradient || !box) return field.color || "#ffffff";

  // angle 0: trái sang phải; 90: trên xuống dưới
  const angle = Number(gradient.angle ?? 0) * Math.PI / 180;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const len = Math.max(box.width, box.height);
  const x1 = cx - Math.cos(angle) * len / 2;
  const y1 = cy - Math.sin(angle) * len / 2;
  const x2 = cx + Math.cos(angle) * len / 2;
  const y2 = cy + Math.sin(angle) * len / 2;

  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  const stops = gradient.stops || [];
  if (!stops.length) {
    g.addColorStop(0, field.color || "#ffffff");
    g.addColorStop(1, field.color || "#ffffff");
    return g;
  }

  stops.forEach(stop => {
    g.addColorStop(Number(stop.offset), stop.color);
  });
  return g;
}

function slugify(input) {
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || `template-${Date.now()}`;
}

function sanitizeFileName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function makeFontFamilyName(fileName) {
  const base = sanitizeFileName(fileName).replace(/\.(woff2?|ttf|otf)$/i, "");
  return `AdminFont_${base}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function inferFontFormat(fileName) {
  const lower = String(fileName).toLowerCase();
  if (lower.endsWith(".woff2")) return "woff2";
  if (lower.endsWith(".woff")) return "woff";
  if (lower.endsWith(".ttf")) return "truetype";
  if (lower.endsWith(".otf")) return "opentype";
  return "unknown";
}

function guessMimeType(fileName = "") {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  if (lower.endsWith(".otf")) return "font/otf";
  return "application/octet-stream";
}
