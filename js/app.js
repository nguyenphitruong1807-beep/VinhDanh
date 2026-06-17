import {
  signInAdmin,
  signOutAdmin,
  getMyProfile,
  loadActiveTemplate,
  listAdminTemplates,
  getTemplateBySlugAdmin,
  saveTemplateToSupabase,
  archiveTemplate,
  loadFontsFromTemplate,
  createLinearGradientFill
} from './supabase-templates.js';

const DEFAULT_TEMPLATE = {
  templateId: "unite-award-poster-05-2026",
  templateName: "Unite Group - Award Poster",
  canvas: { width: 1229, height: 1536 },
  layers: {
    background: "assets/unite-bg-clean.png",
    foreground: "assets/unite-foreground.png"
  },
  backgroundVariants: [
    { id: "tinhhoa", label: "TINHHOA", src: "assets/unite-bg-clean.png", isDefault: true },
    { id: "kitai", label: "KITAI", src: "assets/unite-bg.png" },
    { id: "tienphong", label: "TIENPHONG", src: "assets/unite-bg-clean.png" },
    { id: "khaipha", label: "KHAIPHA", src: "assets/unite-bg-clean.png" },
    { id: "bucpha", label: "BUCPHA", src: "assets/unite-bg-clean.png" }
  ],
  foregroundVariants: [
    { id: "tinhhoa", label: "TINHHOA", src: "assets/unite-foreground.png", isDefault: true },
    { id: "kitai", label: "KITAI", src: "assets/unite-foreground.png" },
    { id: "tienphong", label: "TIENPHONG", src: "assets/unite-foreground.png" },
    { id: "khaipha", label: "KHAIPHA", src: "assets/unite-foreground.png" },
    { id: "bucpha", label: "BUCPHA", src: "assets/unite-foreground.png" }
  ],
  fonts: [],
  personSlot: {
    x: 335,
    y: 420,
    width: 560,
    height: 650,
    fitMode: "head_to_belly",
    bottomSafeY: 1070
  },
  textFields: [
    {
      key: "awardTitle",
      label: "Tên giải lớn",
      defaultValue: "BEST SELLER",
      x: 615,
      y: 280,
      width: 880,
      fontFamily: "Montserrat, Arial, sans-serif",
      fontSize: 104,
      fontWeight: "900",
      color: "#f3f76b",
      fillType: "solid",
      align: "center",
      shadowColor: "rgba(245,255,130,0.35)",
      shadowBlur: 10,
      letterSpacing: 1,
      uppercase: true,
      draggable: true,
      snapToCenter: true
    },
    {
      key: "month",
      label: "Tháng / năm",
      defaultValue: "THÁNG 5/2026",
      x: 615,
      y: 380,
      width: 520,
      fontFamily: "Montserrat, Arial, sans-serif",
      fontSize: 40,
      fontWeight: "800",
      color: "#ffffff",
      fillType: "solid",
      align: "center",
      shadowColor: "rgba(0,0,0,0.65)",
      shadowBlur: 8,
      letterSpacing: 1,
      draggable: true,
      snapToCenter: true
    },
    {
      key: "name",
      label: "Tên nhân sự",
      defaultValue: "MR.BEAR",
      x: 615,
      y: 1196,
      width: 620,
      fontFamily: "Montserrat, Arial, sans-serif",
      fontSize: 52,
      fontWeight: "900",
      color: "#ffffff",
      fillType: "solid",
      align: "center",
      shadowColor: "rgba(0,0,0,0.75)",
      shadowBlur: 7,
      uppercase: true,
      draggable: true,
      snapToCenter: true
    },
    {
      key: "team",
      label: "Team",
      defaultValue: "TEAM T - REX",
      x: 615,
      y: 1260,
      width: 640,
      fontFamily: "Playfair Display, Georgia, serif",
      fontSize: 40,
      fontWeight: "700",
      color: "#ffffff",
      fillType: "solid",
      align: "center",
      shadowColor: "rgba(0,0,0,0.75)",
      shadowBlur: 6,
      draggable: true,
      snapToCenter: true
    },
    {
      key: "subline",
      label: "Dòng mô tả phụ",
      defaultValue: "THE BEST SELLER IN MAY 2026",
      x: 615,
      y: 1378,
      width: 760,
      fontFamily: "Montserrat, Arial, sans-serif",
      fontSize: 29,
      fontWeight: "900",
      color: "#111111",
      fillType: "solid",
      align: "center",
      shadowColor: "rgba(255,225,120,0.35)",
      shadowBlur: 4,
      uppercase: true,
      draggable: true,
      snapToCenter: true
    }
  ]
};

const SNAP_THRESHOLD = 14;
const SLOT_HANDLE_SIZE = 20;
const FOREGROUND_HANDLE_SIZE = 26;
const BACKGROUND_SLOT_LIMIT = 5;
const REMOVE_BG_MODULE_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";
const MAX_PERSON_EDGE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 1800 : 2400;
const MAX_REMOVE_BG_EDGE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 1280 : 1600;
const $ = (id) => document.getElementById(id);
const canvas = $("posterCanvas");
const ctx = canvas.getContext("2d");

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const routeOptions = getRouteOptions();

let template = structuredClone(DEFAULT_TEMPLATE);
let bgImg = null;
let fgImg = null;
let personImg = null;
let personSourceFile = null;
let bgSourceFile = null;
let fgSourceFile = null;
let selectedFontFiles = [];
let backgroundVariantFiles = new Map();
let foregroundVariantFiles = new Map();
let showSlot = true;
let leaderGuidesVisible = true;
let showTextGuides = true;
let activeTab = "leader";
let cloudStatusState = "warn";
let cloudTemplates = [];
let selectedCloudSlug = null;
let currentProfile = null;
let selectedBackgroundId = routeOptions.backgroundId || "";

let draggingPerson = false;
let draggingText = false;
let draggingLeaderText = false;
let draggingSlot = false;
let resizingSlot = false;
let draggingForeground = false;
let resizingForeground = false;
let editForegroundMode = false;
let lastTapAt = 0;
let hideToastTimer = null;
const activePointers = new Map();
let pinchState = null;
let selectedTextKey = "awardTitle";
let dragStart = { x:0, y:0, px:0, py:0, fieldX:0, fieldY:0, slotX:0, slotY:0, slotW:0, slotH:0, fgX:0, fgY:0, fgW:0, fgH:0 };
let textRenderBoxes = new Map();
let snapState = { active:false, targetX:0, label:"Đã canh giữa" };
let renderFrame = 0;
let inlineEditorKey = null;
let inlineEditorBeforeValue = "";
let removeBgModulePromise = null;
let leaderTextPress = null;
let leaderTempTextCounter = 1;
let leaderTempTextFields = [];
let leaderTextOverrides = new Map();
const imageCache = new Map();

let person = {
  x: 0,
  y: 0,
  scale: 1,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  bounds: null
};

let processedPersonCanvas = null;
let processedPersonKey = "";
let exportCleanMode = false;

let textValues = {};

async function init(){
  setupCanvas();
  bindEvents();
  if(isIOS && $("iosSavePanel")) $("iosSavePanel").hidden = false;
  resetRemoveBgProgress();
  await loadFonts();

  const saved = localStorage.getItem("unite_poster_template");
  if(saved){
    try {
      template = JSON.parse(saved);
      normalizeTemplate(template);
    } catch(e) {}
  }

  try {
    const cloudTemplate = await loadActiveTemplate(routeOptions.templateSlug || null);
    if (cloudTemplate) {
      template = structuredClone(cloudTemplate);
      normalizeTemplate(template);
      setPublicTemplateInfo(`Đã nạp template active từ cloud: <b>${escapeHtml(template.templateName || template.templateId || 'Template')}</b>${routeOptions.templateSlug ? ` / slug: <b>${escapeHtml(routeOptions.templateSlug)}</b>` : ''}`);
      setCloudStatus('Cloud: đã kết nối', 'good');
    } else {
      setPublicTemplateInfo('Cloud chưa có template active. Tool đang dùng template local / mặc định.');
      setCloudStatus('Cloud: chưa có active template', 'warn');
    }
  } catch (err) {
    console.warn('Không load được template cloud lúc khởi động:', err);
    setPublicTemplateInfo('Không load được cloud lúc khởi động. Tool đang dùng template local / mặc định.');
    setCloudStatus('Cloud: lỗi khi kiểm tra', 'bad');
  }

  await applyCurrentTemplate();
  syncLeaderGuideButton();
  syncModeSwitchButton();
  syncCompactToolbarLabels();
  scheduleIdleTask(() => preloadBackgroundVariants(), 500);
  scheduleIdleTask(() => preloadRemoveBgModule(), 1400);
  await refreshAuthStatus();
}

function normalizeTemplate(t){
  t.canvas ||= { width: 1229, height: 1536 };
  t.layers ||= {};
  normalizeBackgroundVariants(t);
  normalizeForegroundVariants(t);
  t.fonts ||= [];
  t.templateId ||= 'unite-template';
  t.templateName ||= t.templateId;
  t.personSlot ||= { x: 335, y: 420, width: 560, height: 650, fitMode: "head_to_belly", bottomSafeY: 1070 };
  t.textFields ||= [];
  t.textFields.forEach(field => {
    if(field.draggable === undefined) field.draggable = true;
    if(field.snapToCenter === undefined) field.snapToCenter = field.align !== "left" && field.align !== "right";
    if(field.width === undefined) field.width = 600;
    if(field.fontSize === undefined) field.fontSize = 36;
    if(field.align === undefined) field.align = "center";
    if(field.fillType === undefined) field.fillType = 'solid';
  });
  normalizeVariantLayouts(t);
  applyActiveVariantLayout({ rebuild: false });
}

function normalizeBackgroundVariants(t){
  const baseBackground = t.layers?.background || DEFAULT_TEMPLATE.layers.background;
  const existing = Array.isArray(t.backgroundVariants) ? t.backgroundVariants : [];
  const defaults = DEFAULT_TEMPLATE.backgroundVariants.map(item => ({ ...item }));
  const merged = existing.length ? existing : defaults;

  t.backgroundVariants = merged.slice(0, BACKGROUND_SLOT_LIMIT).map((item, index) => {
    const fallback = defaults[index] || defaults[0];
    return {
      id: normalizeBackgroundId(fallback.id || item.id || `bg-${index + 1}`),
      label: fallback.label || item.label || `Nền ${index + 1}`,
      src: item.src || item.url || (index === 0 ? baseBackground : fallback.src || baseBackground),
      storagePath: item.storagePath || null,
      isDefault: Boolean(item.isDefault || index === 0)
    };
  });

  while(t.backgroundVariants.length < BACKGROUND_SLOT_LIMIT){
    const index = t.backgroundVariants.length;
    const fallback = defaults[index] || defaults[0];
    t.backgroundVariants.push({
      id: normalizeBackgroundId(fallback.id || `bg-${index + 1}`),
      label: fallback.label || `Nền ${index + 1}`,
      src: fallback.src || baseBackground,
      storagePath: null,
      isDefault: index === 0
    });
  }

  if(!t.backgroundVariants.some(item => item.isDefault)){
    t.backgroundVariants[0].isDefault = true;
  }

  const wantedId = normalizeBackgroundId(selectedBackgroundId || routeOptions.backgroundId || "");
  const selectedExists = wantedId && t.backgroundVariants.some(item => item.id === wantedId);
  selectedBackgroundId = selectedExists
    ? wantedId
    : (getDefaultBackgroundVariant(t)?.id || t.backgroundVariants[0]?.id || "");

  const active = getActiveBackgroundVariant(t);
  if(active?.src) t.layers.background = active.src;
}

function normalizeForegroundVariants(t){
  const baseForeground = t.layers?.foreground || DEFAULT_TEMPLATE.layers.foreground;
  const existing = Array.isArray(t.foregroundVariants) ? t.foregroundVariants : [];
  const defaults = DEFAULT_TEMPLATE.foregroundVariants.map(item => ({ ...item }));
  const merged = existing.length ? existing : defaults;

  t.foregroundVariants = merged.slice(0, BACKGROUND_SLOT_LIMIT).map((item, index) => {
    const fallback = defaults[index] || defaults[0];
    return {
      id: normalizeBackgroundId(fallback.id || item.id || `fg-${index + 1}`),
      label: fallback.label || item.label || `Bản trên ${index + 1}`,
      src: item.src || item.url || baseForeground,
      storagePath: item.storagePath || null,
      isDefault: Boolean(item.isDefault || index === 0),
      transform: normalizeForegroundTransform(item.transform, t.canvas)
    };
  });

  while(t.foregroundVariants.length < BACKGROUND_SLOT_LIMIT){
    const index = t.foregroundVariants.length;
    const fallback = defaults[index] || defaults[0];
    t.foregroundVariants.push({
      id: normalizeBackgroundId(fallback.id || `fg-${index + 1}`),
      label: fallback.label || `Bản trên ${index + 1}`,
      src: fallback.src || baseForeground,
      storagePath: null,
      isDefault: index === 0,
      transform: normalizeForegroundTransform(null, t.canvas)
    });
  }

  if(!t.foregroundVariants.some(item => item.isDefault)){
    t.foregroundVariants[0].isDefault = true;
  }

  const active = getActiveForegroundVariant(t);
  if(active?.src) t.layers.foreground = active.src;
}

function normalizeForegroundTransform(transform, canvasDef = template.canvas){
  const canvasWidth = Number(canvasDef?.width || canvas.width || 1229);
  const canvasHeight = Number(canvasDef?.height || canvas.height || 1536);
  const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    x: numberOr(transform?.x, 0),
    y: numberOr(transform?.y, 0),
    width: Math.max(80, numberOr(transform?.width, canvasWidth)),
    height: Math.max(80, numberOr(transform?.height, canvasHeight))
  };
}

function normalizeVariantLayouts(t){
  const baseLayout = makeLayoutSnapshot(t);
  getBackgroundVariants(t).forEach((variant) => {
    variant.layout = normalizeLayoutSnapshot(variant.layout, baseLayout);
  });
}

function makeLayoutSnapshot(sourceTemplate = template){
  return {
    personSlot: structuredClone(sourceTemplate.personSlot || DEFAULT_TEMPLATE.personSlot),
    textFields: structuredClone(sourceTemplate.textFields || DEFAULT_TEMPLATE.textFields)
  };
}

function normalizeLayoutSnapshot(layout, fallbackLayout = makeLayoutSnapshot()){
  const next = {
    personSlot: structuredClone(layout?.personSlot || fallbackLayout.personSlot),
    textFields: structuredClone(Array.isArray(layout?.textFields) ? layout.textFields : fallbackLayout.textFields)
  };
  next.personSlot ||= structuredClone(DEFAULT_TEMPLATE.personSlot);
  next.textFields ||= structuredClone(DEFAULT_TEMPLATE.textFields);
  next.textFields.forEach(field => {
    if(field.draggable === undefined) field.draggable = true;
    if(field.snapToCenter === undefined) field.snapToCenter = field.align !== "left" && field.align !== "right";
    if(field.width === undefined) field.width = 600;
    if(field.fontSize === undefined) field.fontSize = 36;
    if(field.align === undefined) field.align = "center";
    if(field.fillType === undefined) field.fillType = 'solid';
  });
  return next;
}

function syncActiveVariantLayout(){
  const variant = getActiveBackgroundVariant();
  if(!variant) return;
  variant.layout = makeLayoutSnapshot();
}

function applyActiveVariantLayout({ rebuild = true } = {}){
  const variant = getActiveBackgroundVariant();
  if(!variant?.layout) return;
  const layout = normalizeLayoutSnapshot(variant.layout, makeLayoutSnapshot());
  template.personSlot = structuredClone(layout.personSlot);
  template.textFields = structuredClone(layout.textFields);
  if(rebuild){
    ensureTextValues();
    buildForms();
    syncSlotInputs();
    syncAdminTextCards();
  }
}

async function applyCurrentTemplate(){
  resetLeaderSessionLayout({ clearTemp:true, silent:true });
  setupCanvas();
  await loadFontsFromTemplate(template);
  await loadTemplateImages();
  syncTemplateMetaInputs();
  ensureTextValues();
  buildForms();
  autoFitPerson();
  render();
}

function ensureTextValues(){
  const next = {};
  template.textFields.forEach(field => {
    next[field.key] = textValues[field.key] ?? field.defaultValue ?? "";
  });
  textValues = next;
}

async function loadFonts(){
  if(document.fonts?.ready){
    try { await document.fonts.ready; } catch(e) {}
  }
}

function setupCanvas(){
  canvas.width = template.canvas.width;
  canvas.height = template.canvas.height;
  $("canvasSize").textContent = `${canvas.width} × ${canvas.height}px`;
}

function bindEvents(){
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  $("personUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    personSourceFile = file;
    preloadRemoveBgModule();
    setRemoveBgStatus("Đang tối ưu ảnh cho điện thoại...");
    const rawImg = await fileToImage(file);
    personImg = await downscaleImageIfNeeded(rawImg, MAX_PERSON_EDGE);
    await waitImage(personImg);
    person.bounds = getAlphaBounds(personImg);
    invalidatePersonCache();
    resetToneControls(false);
    autoFitPerson();
    setRemoveBgStatus("Đã nạp ảnh. Có thể kéo trực tiếp trên poster hoặc chụm 2 ngón để zoom.");
    showMobileToast("Kéo avatar bằng 1 ngón • Chụm 2 ngón để zoom");
    render();
  });

  $("bgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    bgSourceFile = file;
    const dataUrl = await fileToDataURL(file);
    setActiveBackgroundSource(dataUrl, file);
    bgImg = await srcToImage(dataUrl, { cache:false });
    buildBackgroundSwitcher();
    buildBackgroundVariantAdmin();
    showMobileToast("Đã cập nhật nền đang chọn");
    render();
  });

  $("fgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    fgSourceFile = file;
    const dataUrl = await fileToDataURL(file);
    setActiveForegroundSource(dataUrl, file);
    fgImg = await srcToImage(dataUrl, { cache:false });
    buildBackgroundVariantAdmin();
    showMobileToast("Đã cập nhật bản trên đang chọn");
    render();
  });

  $("fontUpload").addEventListener("change", async (e) => {
    selectedFontFiles = Array.from(e.target.files || []);
    const label = selectedFontFiles.length
      ? `Đã chọn ${selectedFontFiles.length} font: ${selectedFontFiles.map(f => f.name).join(', ')}`
      : 'Chưa chọn font nào.';
    $("fontFilesInfo").textContent = label;
  });

  $("templateUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const txt = await file.text();
    template = JSON.parse(txt);
    normalizeTemplate(template);
    await applyCurrentTemplate();
  });

  $("btnDownloadTemplate").addEventListener("click", () => downloadJSON(template, `${template.templateId || "template"}.json`));
  $("btnSaveLocal").addEventListener("click", () => {
    try {
      localStorage.setItem("unite_poster_template", JSON.stringify(template));
      alert("Đã lưu template trên trình duyệt này.");
    } catch(e) {
      alert("Template có thể quá nặng do ảnh base64. Nên để ảnh trong thư mục assets hoặc lưu qua Supabase.");
    }
  });

  $("btnAutoFit").addEventListener("click", () => { autoFitPerson(); render(); showMobileToast("Đã tự căn vào khung avatar"); });
  $("btnMobileFit").addEventListener("click", () => { mobileQuickFit(); render(); });
  $("btnExport").addEventListener("click", handleTopPrimaryAction);
  $("btnSharePoster").addEventListener("click", handleTopSecondaryAction);
  $("btnRemoveBg").addEventListener("click", removeBackgroundInBrowser);
  if($("btnAddLeaderText")) $("btnAddLeaderText").addEventListener("click", addLeaderTempText);
  if($("btnClearLeaderText")) $("btnClearLeaderText").addEventListener("click", clearLeaderTempText);
  if($("btnResetLeaderLayout")) $("btnResetLeaderLayout").addEventListener("click", () => resetLeaderSessionLayout({ clearTemp:false }));
  if($("btnDeleteSelectedTemp")) $("btnDeleteSelectedTemp").addEventListener("click", deleteSelectedLeaderTempText);
  ["leaderFontSelect","leaderFontSize","leaderFontWeight","leaderFontColor","leaderTextAlign","leaderTextWidth"].forEach(id => {
    if($(id)) $(id).addEventListener("input", (e) => updateLeaderSelectedTextStyle(e.target));
    if($(id)) $(id).addEventListener("change", (e) => updateLeaderSelectedTextStyle(e.target));
  });
  $("btnResetTone").addEventListener("click", () => { resetToneControls(true); render(); });

  $("scaleRange").addEventListener("input", e => { person.scale = Number(e.target.value); render(); });
  $("brightnessRange").addEventListener("input", e => { person.brightness = Number(e.target.value); invalidatePersonCache(); render(); });
  $("contrastRange").addEventListener("input", e => { person.contrast = Number(e.target.value); invalidatePersonCache(); render(); });
  $("saturationRange").addEventListener("input", e => { person.saturation = Number(e.target.value); invalidatePersonCache(); render(); });
  $("temperatureRange").addEventListener("input", e => { person.temperature = Number(e.target.value); updateToneLabels(); invalidatePersonCache(); render(); });
  $("tintRange").addEventListener("input", e => { person.tint = Number(e.target.value); updateToneLabels(); invalidatePersonCache(); render(); });
  $("sharpnessRange").addEventListener("input", e => { person.sharpness = Number(e.target.value); updateToneLabels(); invalidatePersonCache(); render(); });

  document.querySelectorAll("[data-nudge]").forEach(btn => {
    btn.addEventListener("click", () => nudge(btn.dataset.nudge));
  });

  $("showSlot").addEventListener("change", e => { showSlot = e.target.checked; render(); });
  $("showTextGuides").addEventListener("change", e => { showTextGuides = e.target.checked; render(); });
  ["slotX","slotY","slotW","slotH"].forEach(id => $(id).addEventListener("input", updateSlotFromInputs));
  if($("editForegroundMode")) $("editForegroundMode").addEventListener("change", e => {
    editForegroundMode = e.target.checked;
    resetDragAndSnap();
    render();
  });
  ["fgX","fgY","fgW","fgH"].forEach(id => {
    if($(id)) $(id).addEventListener("input", updateForegroundTransformFromInputs);
  });
  if($("btnResetForegroundTransform")) $("btnResetForegroundTransform").addEventListener("click", resetForegroundTransform);
  if($("btnFitForegroundOriginal")) $("btnFitForegroundOriginal").addEventListener("click", fitForegroundToOriginalRatio);

  $("templateIdInput").addEventListener("input", e => { template.templateId = e.target.value.trim(); });
  $("templateNameInput").addEventListener("input", e => { template.templateName = e.target.value.trim(); });

  $("btnAdminLogin").addEventListener("click", onAdminLogin);
  $("btnAdminLogout").addEventListener("click", onAdminLogout);
  $("btnRefreshProfile").addEventListener("click", refreshAuthStatus);
  $("btnSaveCloudDraft").addEventListener("click", () => onSaveCloud('draft'));
  $("btnSaveCloudActive").addEventListener("click", () => onSaveCloud('active'));
  if($("btnAddAdminTextField")) $("btnAddAdminTextField").addEventListener("click", addAdminTextField);
  $("btnReloadCloudList").addEventListener("click", refreshCloudTemplates);
  $("btnLoadSelectedCloud").addEventListener("click", loadSelectedCloudTemplate);
  $("btnArchiveCloud").addEventListener("click", onArchiveSelectedCloud);
  $("btnReloadActiveCloud").addEventListener("click", reloadActiveCloudTemplate);
  if($("btnHideIosTip")) $("btnHideIosTip").addEventListener("click", () => { const panel = $("iosSavePanel"); if(panel) panel.hidden = true; });
  if($("btnToggleGuides")) $("btnToggleGuides").addEventListener("click", () => {
    leaderGuidesVisible = !leaderGuidesVisible;
    syncLeaderGuideButton();
    render();
  });
  if($("canvasTextEditor")){
    $("canvasTextEditor").addEventListener("input", onInlineTextInput);
    $("canvasTextEditor").addEventListener("keydown", onInlineTextKeyDown);
    $("canvasTextEditor").addEventListener("blur", () => closeInlineTextEditor());
  }
  if($("brandAdminTrigger")) {
    const toggleAdminFromLogo = () => {
      switchTab(activeTab === "admin" ? "leader" : "admin");
      showMobileToast(activeTab === "admin" ? "Đã mở Admin • Đăng nhập Supabase nếu cần" : "Đã về chế độ tạo poster");
    };
    $("brandAdminTrigger").addEventListener("click", toggleAdminFromLogo);
    $("brandAdminTrigger").addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        toggleAdminFromLogo();
      }
    });
  }

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerleave", pointerLeave);
  canvas.addEventListener("pointercancel", pointerUp);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("resize", () => { syncCompactToolbarLabels(); showMobileToast("Kéo 1 ngón • Chụm 2 ngón để zoom"); });
}

async function handleTopPrimaryAction(){
  if(activeTab === "admin"){
    await onSaveCloud("active");
    return;
  }
  await exportPNG();
}

async function handleTopSecondaryAction(){
  if(activeTab === "admin"){
    await onSaveCloud("draft");
    return;
  }
  await sharePosterPNG();
}

async function refreshAuthStatus(){
  try {
    const profile = await getMyProfile();
    currentProfile = profile;
    if(profile?.role === 'admin'){
      setAuthStatus(`Đã đăng nhập admin: <b>${escapeHtml(profile.full_name || profile.email || 'Admin')}</b> (${escapeHtml(profile.email || '')})`, true);
      setCloudStatus('Cloud: admin online', 'good');
      await refreshCloudTemplates();
    } else if(profile) {
      setAuthStatus(`Tài khoản đã đăng nhập nhưng chưa có quyền admin: ${escapeHtml(profile.email || '')}`, false);
      setCloudStatus('Cloud: tài khoản chưa có quyền admin', 'warn');
    } else {
      setAuthStatus('Chưa đăng nhập admin. Leader vẫn có thể dùng template active công khai.', false);
      await refreshCloudTemplates(false);
    }
  } catch (err) {
    console.warn(err);
    currentProfile = null;
    setAuthStatus('Chưa đăng nhập admin hoặc không đọc được profile.', false);
  }
}

async function onAdminLogin(){
  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;
  if(!email || !password){
    alert('Nhập email và mật khẩu admin trước nha.');
    return;
  }
  try {
    setAuthStatus('Đang đăng nhập admin...', true);
    await signInAdmin(email, password);
    await refreshAuthStatus();
    alert('Đăng nhập admin thành công.');
  } catch (err) {
    console.error(err);
    setAuthStatus(`Đăng nhập lỗi: ${escapeHtml(err.message || 'Không xác định')}`, false);
    alert(`Đăng nhập lỗi: ${err.message || 'Không xác định'}`);
  }
}

async function onAdminLogout(){
  try {
    await signOutAdmin();
    currentProfile = null;
    setAuthStatus('Đã đăng xuất admin.', false);
    await refreshCloudTemplates(false);
  } catch (err) {
    alert(`Đăng xuất lỗi: ${err.message || 'Không xác định'}`);
  }
}

async function onSaveCloud(status){
  syncActiveVariantLayout();
  syncTemplateMetaFromInputs();
  if(!template.templateId){
    alert('Nhập Template ID / slug trước khi lưu cloud nha.');
    return;
  }
  try {
    const saveBtn = status === 'active' ? $("btnSaveCloudActive") : $("btnSaveCloudDraft");
    const oldText = saveBtn.textContent;
    saveBtn.textContent = 'Đang lưu cloud...';
    saveBtn.disabled = true;
    const saved = await saveTemplateToSupabase({
      template,
      status,
      backgroundFile: backgroundVariantFiles.size ? null : bgSourceFile,
      backgroundVariantFiles: getBackgroundVariantFilePayload(),
      foregroundFile: foregroundVariantFiles.size ? null : fgSourceFile,
      foregroundVariantFiles: getForegroundVariantFilePayload(),
      fontFiles: selectedFontFiles
    });
    template = structuredClone(saved.template_json);
    normalizeTemplate(template);
    await applyCurrentTemplate();
    await refreshCloudTemplates();
    selectedCloudSlug = saved.slug;
    backgroundVariantFiles.clear();
    foregroundVariantFiles.clear();
    bgSourceFile = null;
    fgSourceFile = null;
    selectedFontFiles = [];
    const persistenceSummary = describeTemplatePersistence(saved.template_json);
    setPublicTemplateInfo(`Cloud lưu thành công: <b>${escapeHtml(saved.name)}</b> (${escapeHtml(saved.status)})<br>${persistenceSummary}`);
    alert(`Đã lưu template cloud thành công với status = ${saved.status}.\n${stripHtml(persistenceSummary)}`);
    saveBtn.textContent = oldText;
    saveBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert(`Lưu cloud lỗi: ${err.message || 'Không xác định'}`);
    $(status === 'active' ? "btnSaveCloudActive" : "btnSaveCloudDraft").disabled = false;
    $(status === 'active' ? "btnSaveCloudActive" : "btnSaveCloudDraft").textContent = status === 'active' ? 'Lưu cloud thành Active' : 'Lưu cloud dạng Draft';
  }
}

async function refreshCloudTemplates(requireAdmin = true){
  const listEl = $("cloudTemplatesList");
  listEl.innerHTML = '<div class="cloud-box mini-box">Đang tải danh sách template...</div>';
  try {
    cloudTemplates = requireAdmin ? await listAdminTemplates() : [];
    renderCloudTemplateList();
  } catch (err) {
    cloudTemplates = [];
    listEl.innerHTML = `<div class="cloud-box mini-box">Không tải được danh sách template admin. ${escapeHtml(err.message || '')}</div>`;
  }
}

function renderCloudTemplateList(){
  const listEl = $("cloudTemplatesList");
  if(!cloudTemplates.length){
    listEl.innerHTML = '<div class="cloud-box mini-box">Chưa có danh sách template hoặc chưa đăng nhập admin.</div>';
    return;
  }
  listEl.innerHTML = '';
  cloudTemplates.forEach(item => {
    const div = document.createElement('div');
    div.className = `cloud-item ${selectedCloudSlug === item.slug ? 'selected' : ''}`;
    div.innerHTML = `
      <div><b>${escapeHtml(item.name || item.slug)}</b></div>
      <div class="meta">
        <span>slug: ${escapeHtml(item.slug)}</span>
        <span>status: ${escapeHtml(item.status)}</span>
      </div>
      <div class="meta"><span>updated: ${formatDate(item.updated_at)}</span></div>
    `;
    div.addEventListener('click', () => {
      selectedCloudSlug = item.slug;
      renderCloudTemplateList();
    });
    listEl.appendChild(div);
  });
}

async function loadSelectedCloudTemplate(){
  if(!selectedCloudSlug){
    alert('Chọn 1 template cloud trong danh sách trước nha.');
    return;
  }
  try {
    const row = await getTemplateBySlugAdmin(selectedCloudSlug);
    if(!row?.template_json){
      alert('Không tìm thấy dữ liệu template.');
      return;
    }
    template = structuredClone(row.template_json);
    normalizeTemplate(template);
    await applyCurrentTemplate();
    setPublicTemplateInfo(`Đã nạp template từ cloud: <b>${escapeHtml(row.name || row.slug)}</b> (${escapeHtml(row.status)})`);
    alert('Đã nạp template cloud vào editor.');
  } catch (err) {
    alert(`Nạp template cloud lỗi: ${err.message || 'Không xác định'}`);
  }
}

async function reloadActiveCloudTemplate(){
  try {
    const cloudTemplate = await loadActiveTemplate();
    if (!cloudTemplate) {
      alert('Cloud chưa có template active.');
      return;
    }
    template = structuredClone(cloudTemplate);
    normalizeTemplate(template);
    await applyCurrentTemplate();
    setPublicTemplateInfo(`Đã load active cloud: <b>${escapeHtml(template.templateName || template.templateId)}</b>`);
  } catch (err) {
    alert(`Load active cloud lỗi: ${err.message || 'Không xác định'}`);
  }
}

async function onArchiveSelectedCloud(){
  if(!selectedCloudSlug){
    alert('Chọn 1 template cloud trước nha.');
    return;
  }
  if(!confirm(`Archive template ${selectedCloudSlug}?`)) return;
  try {
    await archiveTemplate(selectedCloudSlug);
    await refreshCloudTemplates();
    alert('Đã archive template.');
  } catch (err) {
    alert(`Archive lỗi: ${err.message || 'Không xác định'}`);
  }
}

function setAuthStatus(html, ok=false){
  const el = $("authStatus");
  el.innerHTML = html;
  el.className = `auth-status ${ok ? 'ok' : 'bad'}`;
}

function setCloudStatus(text, state='warn'){
  const el = $("cloudStatus");
  if(!el) return;
  cloudStatusState = state;
  el.dataset.fulltext = text;
  el.textContent = text;
  el.className = `pill compact-pill ${state}`;
  syncCompactToolbarLabels();
}

function setPublicTemplateInfo(html){
  $("publicTemplateInfo").innerHTML = html;
}

function syncLeaderGuideButton(){
  const btn = $("btnToggleGuides");
  if(!btn) return;
  btn.classList.toggle("active", leaderGuidesVisible);
  btn.textContent = leaderGuidesVisible ? "Khung: Bật" : "Khung: Tắt";
  syncCompactToolbarLabels();
}

function syncModeSwitchButton(){
  const btn = $("btnModeSwitch");
  if(!btn) return;
  const isAdmin = activeTab === "admin";
  btn.textContent = isAdmin ? "Poster" : "Admin";
  btn.classList.toggle("admin-active", isAdmin);
  syncCompactToolbarLabels();
}

function syncCompactToolbarLabels(){
  const mobile = window.innerWidth <= 900;
  const modeBtn = $("btnModeSwitch");
  const guideBtn = $("btnToggleGuides");
  const shareBtn = $("btnSharePoster");
  const exportBtn = $("btnExport");
  const cloudEl = $("cloudStatus");
  const heading = document.querySelector('.stage-head strong');
  if(heading) heading.textContent = mobile ? 'Preview' : 'Preview poster';
  if(modeBtn) modeBtn.textContent = mobile ? (activeTab === 'admin' ? 'Post' : 'Ad') : (activeTab === 'admin' ? 'Poster' : 'Admin');
  if(guideBtn) guideBtn.textContent = mobile ? 'Khung' : (leaderGuidesVisible ? 'Khung: Bật' : 'Khung: Tắt');
  if(shareBtn){
    shareBtn.textContent = activeTab === 'admin'
      ? (mobile ? 'Nháp' : 'Lưu nháp')
      : (mobile ? 'Share' : 'Chia sẻ');
    shareBtn.title = activeTab === 'admin' ? 'Lưu chỉnh sửa admin dạng Draft' : 'Chia sẻ poster';
  }
  if(exportBtn){
    exportBtn.textContent = activeTab === 'admin'
      ? (mobile ? 'Active' : 'Lưu Active')
      : (mobile ? 'PNG' : 'Xuất PNG');
    exportBtn.title = activeTab === 'admin' ? 'Lưu chỉnh sửa admin thành template Active' : 'Xuất poster PNG';
  }
  if(cloudEl){
    const fullText = cloudEl.dataset.fulltext || cloudEl.textContent || '';
    cloudEl.title = fullText;
    if(mobile){
      let shortText = '☁';
      if(cloudStatusState === 'good') shortText = '☁ On';
      else if(cloudStatusState === 'warn') shortText = '☁ Wait';
      else if(cloudStatusState === 'bad') shortText = '☁ Err';
      cloudEl.textContent = shortText;
    } else {
      cloudEl.textContent = fullText;
    }
  }
}

function switchTab(tabName){
  const safeTab = tabName === "admin" ? "admin" : "leader";
  closeInlineTextEditor();
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === safeTab));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.toggle("active", p.id === `${safeTab}Tab`));
  activeTab = safeTab;
  const hint = $("canvasHint");
  if(hint){
    hint.textContent = activeTab === "admin"
      ? "Admin: kéo chữ, vùng người; bật chế độ bản trên để kéo/resize foreground."
      : "Leader: kéo ảnh người, kéo mọi vùng chữ; thay đổi chỉ tồn tại trong phiên.";
  }
  syncModeSwitchButton();
  syncLeaderGuideButton();
  syncCompactToolbarLabels();
  syncLeaderTextStylePanel();
  syncForegroundTransformInputs();
  snapState.active = false;
  render();
}

function syncTemplateMetaInputs(){
  $("templateIdInput").value = template.templateId || '';
  $("templateNameInput").value = template.templateName || '';
}

function syncTemplateMetaFromInputs(){
  template.templateId = $("templateIdInput").value.trim() || template.templateId || 'unite-template';
  template.templateName = $("templateNameInput").value.trim() || template.templateName || template.templateId;
}

function resetDragAndSnap(){
  const changed = draggingPerson || draggingText || draggingLeaderText || draggingSlot || resizingSlot || draggingForeground || resizingForeground || snapState.active || pinchState || activePointers.size || leaderTextPress;
  draggingPerson = false;
  draggingText = false;
  draggingLeaderText = false;
  draggingSlot = false;
  resizingSlot = false;
  draggingForeground = false;
  resizingForeground = false;
  leaderTextPress = null;
  pinchState = null;
  activePointers.clear();
  if(snapState.active){ snapState.active = false; }
  if(changed) render();
}

async function loadTemplateImages(){
  const bgSrc = getActiveBackgroundSrc();
  const fgSrc = getActiveForegroundSrc();
  template.layers.background = bgSrc || template.layers.background;
  template.layers.foreground = fgSrc || template.layers.foreground;
  [bgImg, fgImg] = await Promise.all([
    bgSrc ? srcToImage(bgSrc) : null,
    fgSrc ? srcToImage(fgSrc) : null
  ]);
  preloadBackgroundVariants();
  preloadForegroundVariants();
}

async function loadActiveBackgroundImage(){
  const bgSrc = getActiveBackgroundSrc();
  const fgSrc = getActiveForegroundSrc();
  template.layers.background = bgSrc || template.layers.background;
  template.layers.foreground = fgSrc || template.layers.foreground;
  [bgImg, fgImg] = await Promise.all([
    bgSrc ? srcToImage(bgSrc) : null,
    fgSrc ? srcToImage(fgSrc) : null
  ]);
  preloadBackgroundVariants();
  preloadForegroundVariants();
}

function buildForms(){
  const form = $("textForm");
  form.innerHTML = "";
  template.textFields.forEach(field => {
    if(textValues[field.key] === undefined) textValues[field.key] = field.defaultValue || "";
    const label = document.createElement("label");
    label.textContent = field.label || field.key;
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.key = field.key;
    input.value = textValues[field.key];
    input.addEventListener("focus", () => selectLeaderTextField(field.key));
    input.addEventListener("input", () => { textValues[field.key] = input.value; render(); });
    label.appendChild(input);
    form.appendChild(label);
  });
  leaderTempTextFields.forEach(field => {
    if(textValues[field.key] === undefined) textValues[field.key] = field.defaultValue || "";
    const label = document.createElement("label");
    label.className = "temp-text-label";
    label.textContent = field.label || field.key;
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.key = field.key;
    input.value = textValues[field.key];
    input.addEventListener("focus", () => selectLeaderTextField(field.key));
    input.addEventListener("input", () => { textValues[field.key] = input.value; render(); });
    label.appendChild(input);
    form.appendChild(label);
  });

  buildBackgroundSwitcher();
  buildBackgroundVariantAdmin();
  syncSlotInputs();
  syncForegroundTransformInputs();
  syncAdminTextCards();
  syncLeaderTextStylePanel();
}

function getDrawableTextFields(){
  const baseFields = template.textFields.map(field => {
    if(activeTab !== "leader") return field;
    return leaderTextOverrides.get(field.key) || field;
  });
  return activeTab === "leader" ? [...baseFields, ...leaderTempTextFields] : baseFields;
}

function findTextFieldByKey(key){
  if(activeTab === "leader"){
    const temporary = leaderTempTextFields.find(field => field.key === key);
    if(temporary) return temporary;
    return leaderTextOverrides.get(key) || template.textFields.find(field => field.key === key);
  }
  return template.textFields.find(field => field.key === key);
}

function isLeaderTempTextKey(key){
  return leaderTempTextFields.some(field => field.key === key);
}

function ensureLeaderTextOverride(key){
  if(isLeaderTempTextKey(key)) return leaderTempTextFields.find(field => field.key === key) || null;
  if(leaderTextOverrides.has(key)) return leaderTextOverrides.get(key);
  const source = template.textFields.find(field => field.key === key);
  if(!source) return null;
  const override = structuredClone(source);
  leaderTextOverrides.set(key, override);
  return override;
}

function selectLeaderTextField(key){
  selectedTextKey = key;
  syncLeaderTextStylePanel();
  render();
}

function resetLeaderSessionLayout({ clearTemp = false, silent = false } = {}){
  closeInlineTextEditor();
  leaderTextOverrides.clear();
  if(clearTemp){
    leaderTempTextFields.forEach(field => delete textValues[field.key]);
    leaderTempTextFields = [];
    leaderTempTextCounter = 1;
  }
  if(!findTextFieldByKey(selectedTextKey)) selectedTextKey = template.textFields[0]?.key || "awardTitle";
  if(!silent){
    if($("textForm")) buildForms();
    showMobileToast(clearTemp ? "Đã làm mới chỉnh sửa tạm" : "Đã khôi phục vị trí/style gốc");
    render();
  }
}

function getLeaderFontOptions(){
  const builtIn = [
    { label:"Montserrat", value:"Montserrat, Arial, sans-serif" },
    { label:"Inter", value:"Inter, Arial, sans-serif" },
    { label:"Playfair Display", value:"Playfair Display, Georgia, serif" },
    { label:"Arial", value:"Arial, sans-serif" },
    { label:"Georgia", value:"Georgia, serif" }
  ];
  const uploaded = (template.fonts || [])
    .filter(font => font?.family)
    .map(font => ({ label:`Admin · ${font.name || font.family}`, value:`${font.family}, Arial, sans-serif` }));
  const seen = new Set();
  return [...builtIn, ...uploaded].filter(item => {
    if(seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
}

function syncLeaderTextStylePanel(){
  const panel = $("leaderTextStylePanel");
  if(!panel) return;
  const field = activeTab === "leader" ? findTextFieldByKey(selectedTextKey) : null;
  panel.hidden = !field;
  if(!field) return;
  const name = $("leaderSelectedTextName");
  const type = $("leaderSelectedTextType");
  if(name) name.textContent = field.label || field.key;
  const isTemp = isLeaderTempTextKey(field.key);
  const isOverride = leaderTextOverrides.has(field.key);
  if(type) type.textContent = isTemp ? "Vùng chữ tạm · không lưu cloud" : (isOverride ? "Đã tùy chỉnh tạm · không lưu cloud" : "Vùng có sẵn · kéo/style chỉ trong phiên");

  const fontSelect = $("leaderFontSelect");
  if(fontSelect){
    const options = getLeaderFontOptions();
    const current = field.fontFamily || "Arial, sans-serif";
    if(!options.some(item => item.value === current)) options.unshift({ label:"Font hiện tại", value:current });
    fontSelect.innerHTML = options.map(item => `<option value="${escapeAttr(item.value)}">${escapeHtml(item.label)}</option>`).join("");
    fontSelect.value = current;
  }
  if($("leaderFontSize")) $("leaderFontSize").value = Math.round(Number(field.fontSize || 36));
  if($("leaderFontWeight")) $("leaderFontWeight").value = String(field.fontWeight || "700");
  if($("leaderFontColor")) $("leaderFontColor").value = toHex(field.color || "#ffffff");
  if($("leaderTextAlign")) $("leaderTextAlign").value = field.align || "center";
  if($("leaderTextWidth")) $("leaderTextWidth").value = Math.round(Number(field.width || 600));
  if($("btnDeleteSelectedTemp")) $("btnDeleteSelectedTemp").hidden = !isTemp;
}

function updateLeaderSelectedTextStyle(control){
  if(activeTab !== "leader" || !control) return;
  const field = ensureLeaderTextOverride(selectedTextKey);
  if(!field) return;
  if(control.id === "leaderFontSelect") field.fontFamily = control.value;
  if(control.id === "leaderFontSize") field.fontSize = clamp(Number(control.value || 36), 12, 220);
  if(control.id === "leaderFontWeight") field.fontWeight = String(control.value || "700");
  if(control.id === "leaderFontColor"){
    field.color = control.value;
    if(field.fillType === "gradient") field.fillType = "solid";
  }
  if(control.id === "leaderTextAlign") field.align = control.value || "center";
  if(control.id === "leaderTextWidth") field.width = clamp(Number(control.value || 600), 80, canvas.width);
  syncLeaderTextStylePanel();
  render();
}

function deleteSelectedLeaderTempText(){
  if(!isLeaderTempTextKey(selectedTextKey)) return;
  const index = leaderTempTextFields.findIndex(field => field.key === selectedTextKey);
  if(index < 0) return;
  const [removed] = leaderTempTextFields.splice(index, 1);
  delete textValues[removed.key];
  selectedTextKey = template.textFields[0]?.key || leaderTempTextFields[0]?.key || "awardTitle";
  buildForms();
  showMobileToast("Đã xóa vùng chữ tạm đang chọn");
  render();
}

function cloneTextFieldForNewArea(sourceField, overrides = {}){
  const base = structuredClone(sourceField || template.textFields[0] || DEFAULT_TEMPLATE.textFields[0]);
  return {
    ...base,
    ...overrides,
    gradient: base.gradient ? structuredClone(base.gradient) : undefined,
    draggable: overrides.draggable ?? true,
    snapToCenter: overrides.snapToCenter ?? true
  };
}

function addLeaderTempText(){
  const source = findTextFieldByKey(selectedTextKey) || template.textFields[0] || DEFAULT_TEMPLATE.textFields[0];
  const key = `leaderTemp_${Date.now()}_${leaderTempTextCounter++}`;
  const field = cloneTextFieldForNewArea(source, {
    key,
    label: `Chữ tạm ${leaderTempTextCounter - 1}`,
    defaultValue: "CHỮ TẠM",
    x: canvas.width / 2,
    y: Math.round(canvas.height * 0.52),
    width: Math.min(source.width || 620, canvas.width - 120),
    fontSize: Math.min(Math.max(source.fontSize || 42, 28), 54)
  });
  leaderTempTextFields.push(field);
  textValues[key] = field.defaultValue;
  selectedTextKey = key;
  buildForms();
  showMobileToast("Đã thêm chữ tạm • kéo chữ trên poster để đặt vị trí");
  render(true);
  requestAnimationFrame(() => openInlineTextEditor(key));
}

function clearLeaderTempText(){
  if(!leaderTempTextFields.length){
    showMobileToast("Chưa có chữ tạm để xóa");
    return;
  }
  closeInlineTextEditor();
  leaderTempTextFields.forEach(field => delete textValues[field.key]);
  leaderTempTextFields = [];
  leaderTempTextCounter = 1;
  selectedTextKey = template.textFields[0]?.key || "awardTitle";
  buildForms();
  showMobileToast("Đã xóa toàn bộ chữ tạm");
  render();
}

function addAdminTextField(){
  syncActiveVariantLayout();
  const source = template.textFields.find(field => field.key === selectedTextKey) || template.textFields[0] || DEFAULT_TEMPLATE.textFields[0];
  const key = `customText_${Date.now()}`;
  const field = cloneTextFieldForNewArea(source, {
    key,
    label: "Vùng chữ mới",
    defaultValue: "CHỮ MỚI",
    x: canvas.width / 2,
    y: Math.round(canvas.height * 0.58),
    width: Math.min(source.width || 620, canvas.width - 120),
    fontSize: Math.min(Math.max(source.fontSize || 42, 26), 58)
  });
  template.textFields.push(field);
  textValues[key] = field.defaultValue;
  selectedTextKey = key;
  syncActiveVariantLayout();
  buildForms();
  showMobileToast("Admin đã thêm vùng chữ cho màu đang chọn");
  render();
}

function deleteAdminTextField(key){
  const index = template.textFields.findIndex(field => field.key === key);
  if(index < 0) return;
  if(template.textFields.length <= 1){
    alert("Template cần giữ ít nhất 1 vùng chữ.");
    return;
  }
  if(!confirm("Xóa vùng chữ này khỏi layout màu đang chọn?")) return;
  const [removed] = template.textFields.splice(index, 1);
  delete textValues[removed.key];
  selectedTextKey = template.textFields[Math.max(0, index - 1)]?.key || template.textFields[0]?.key || "";
  syncActiveVariantLayout();
  buildForms();
  render();
}

function buildBackgroundSwitcher(){
  const wrap = $("backgroundSwitcher");
  if(!wrap) return;
  const variants = getBackgroundVariants();
  wrap.innerHTML = "";
  variants.forEach((variant, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `background-chip ${variant.id === selectedBackgroundId ? "active" : ""}`;
    btn.dataset.bg = variant.id;
    btn.innerHTML = `<span>${index + 1}</span><div><small>Trang ${index + 1}</small><b>${escapeHtml(variant.label || variant.id)}</b></div>`;
    btn.addEventListener("click", () => selectBackgroundVariant(variant.id, { updateUrl:true }));
    wrap.appendChild(btn);
  });
}

function buildBackgroundVariantAdmin(){
  const wrap = $("backgroundVariantAdmin");
  if(!wrap) return;
  wrap.innerHTML = "";
  getBackgroundVariants().forEach((variant, index) => {
    const card = document.createElement("div");
    card.className = `background-variant-card ${variant.id === selectedBackgroundId ? "selected" : ""}`;
    card.dataset.bg = variant.id;
    card.innerHTML = `
      <div class="background-variant-top">
        <strong>Link ${index + 1} - ${escapeHtml(variant.label || variant.id)}</strong>
        <em>Layout riêng</em>
        <button type="button" class="soft mini" data-bg-action="select">Chọn</button>
      </div>
      <div class="field-grid two">
        <label>Tên màu <input data-bg-field="label" type="text" value="${escapeAttr(variant.label || '')}"></label>
        <label>Slug trang <input data-bg-field="id" type="text" value="${escapeAttr(variant.id || '')}" readonly></label>
      </div>
      <label class="filebox small bg-filebox">
        <input data-bg-action="file" type="file" accept="image/*">
        <span>Upload nền dưới link ${index + 1}</span>
      </label>
      <label class="filebox small fg-filebox">
        <input data-fg-action="file" type="file" accept="image/*">
        <span>Upload bản trên PNG link ${index + 1}</span>
      </label>
      <div class="background-link-row">
        <input data-bg-field="link" type="text" value="${escapeAttr(buildBackgroundLink(variant.id))}" readonly>
        <button type="button" class="soft mini" data-bg-action="copy">Copy</button>
      </div>
    `;

    card.querySelector('[data-bg-action="select"]').addEventListener("click", () => selectBackgroundVariant(variant.id, { updateUrl:true }));
    card.querySelector('[data-bg-action="copy"]').addEventListener("click", () => copyBackgroundLink(variant.id));
    card.querySelector('[data-bg-action="file"]').addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if(!file) return;
      const dataUrl = await fileToDataURL(file);
      variant.src = dataUrl;
      backgroundVariantFiles.set(variant.id, file);
      if(variant.id === selectedBackgroundId){
        template.layers.background = dataUrl;
        bgImg = await srcToImage(dataUrl, { cache:false });
        render();
      }
      buildBackgroundSwitcher();
      buildBackgroundVariantAdmin();
      showMobileToast(`Đã cập nhật ${variant.label || variant.id}`);
    });
    card.querySelector('[data-fg-action="file"]').addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if(!file) return;
      const dataUrl = await fileToDataURL(file);
      setForegroundVariantSource(variant.id, dataUrl, file);
      if(variant.id === selectedBackgroundId){
        template.layers.foreground = dataUrl;
        fgImg = await srcToImage(dataUrl, { cache:false });
        render();
      }
      buildBackgroundVariantAdmin();
      showMobileToast(`Đã cập nhật bản trên ${variant.label || variant.id}`);
    });

    card.querySelectorAll('[data-bg-field]').forEach((input) => {
      if(input.dataset.bgField === "link") return;
      input.addEventListener("input", () => updateBackgroundVariantField(variant, input, { rebuildAdmin:false }));
      input.addEventListener("change", () => updateBackgroundVariantField(variant, input, { rebuildAdmin:true }));
    });
    wrap.appendChild(card);
  });
}

function updateBackgroundVariantField(variant, input, { rebuildAdmin = true } = {}){
  const field = input.dataset.bgField;
  if(field === "label"){
    variant.label = input.value.trim() || variant.id;
    const foregroundVariant = getForegroundVariants().find(item => item.id === variant.id);
    if(foregroundVariant) foregroundVariant.label = variant.label;
  }
  if(field === "id"){
    const oldId = variant.id;
    const nextId = normalizeBackgroundId(input.value || oldId);
    variant.id = nextId;
    input.value = nextId;
    if(selectedBackgroundId === oldId) selectedBackgroundId = nextId;
    if(backgroundVariantFiles.has(oldId)){
      backgroundVariantFiles.set(nextId, backgroundVariantFiles.get(oldId));
      backgroundVariantFiles.delete(oldId);
    }
    if(foregroundVariantFiles.has(oldId)){
      foregroundVariantFiles.set(nextId, foregroundVariantFiles.get(oldId));
      foregroundVariantFiles.delete(oldId);
    }
  }
  buildBackgroundSwitcher();
  if(rebuildAdmin) buildBackgroundVariantAdmin();
  render();
}

function getBackgroundVariants(sourceTemplate = template){
  return Array.isArray(sourceTemplate.backgroundVariants) ? sourceTemplate.backgroundVariants.slice(0, BACKGROUND_SLOT_LIMIT) : [];
}

function getDefaultBackgroundVariant(sourceTemplate = template){
  const variants = getBackgroundVariants(sourceTemplate);
  return variants.find(item => item.isDefault) || variants[0] || null;
}

function getActiveBackgroundVariant(sourceTemplate = template){
  const variants = getBackgroundVariants(sourceTemplate);
  return variants.find(item => item.id === selectedBackgroundId) || getDefaultBackgroundVariant(sourceTemplate);
}

function getActiveBackgroundSrc(){
  return getActiveBackgroundVariant()?.src || template.layers?.background || "";
}

function getForegroundVariants(sourceTemplate = template){
  return Array.isArray(sourceTemplate.foregroundVariants) ? sourceTemplate.foregroundVariants.slice(0, BACKGROUND_SLOT_LIMIT) : [];
}

function getActiveForegroundVariant(sourceTemplate = template){
  const variants = getForegroundVariants(sourceTemplate);
  return variants.find(item => item.id === selectedBackgroundId) || variants.find(item => item.isDefault) || variants[0] || null;
}

function getActiveForegroundSrc(){
  return getActiveForegroundVariant()?.src || template.layers?.foreground || "";
}

function getActiveForegroundTransform(){
  const variant = getActiveForegroundVariant();
  if(!variant) return normalizeForegroundTransform(null, template.canvas);
  variant.transform = normalizeForegroundTransform(variant.transform, template.canvas);
  return variant.transform;
}

function syncForegroundTransformInputs(){
  const transform = getActiveForegroundTransform();
  if($("fgX")) $("fgX").value = Math.round(transform.x);
  if($("fgY")) $("fgY").value = Math.round(transform.y);
  if($("fgW")) $("fgW").value = Math.round(transform.width);
  if($("fgH")) $("fgH").value = Math.round(transform.height);
  if($("editForegroundMode")) $("editForegroundMode").checked = editForegroundMode;
}

function updateForegroundTransformFromInputs(){
  const transform = getActiveForegroundTransform();
  transform.x = Number($("fgX")?.value || 0);
  transform.y = Number($("fgY")?.value || 0);
  transform.width = Math.max(80, Number($("fgW")?.value || canvas.width));
  transform.height = Math.max(80, Number($("fgH")?.value || canvas.height));
  render();
}

function resetForegroundTransform(){
  const variant = getActiveForegroundVariant();
  if(!variant) return;
  variant.transform = normalizeForegroundTransform(null, template.canvas);
  syncForegroundTransformInputs();
  render();
  showMobileToast("Bản trên đã phủ toàn poster");
}

function fitForegroundToOriginalRatio(){
  const variant = getActiveForegroundVariant();
  if(!variant || !fgImg) return;
  const scale = Math.min(canvas.width / fgImg.width, canvas.height / fgImg.height);
  const width = Math.max(80, fgImg.width * scale);
  const height = Math.max(80, fgImg.height * scale);
  variant.transform = {
    x: Math.round((canvas.width - width) / 2),
    y: Math.round((canvas.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height)
  };
  syncForegroundTransformInputs();
  render();
  showMobileToast("Đã giữ đúng tỷ lệ bản trên");
}

function setActiveBackgroundSource(src, file = null){
  const variant = getActiveBackgroundVariant();
  if(variant){
    variant.src = src;
    if(file) backgroundVariantFiles.set(variant.id, file);
  }
  template.layers.background = src;
}

function setForegroundVariantSource(id, src, file = null){
  const variant = getForegroundVariants().find(item => item.id === id);
  if(variant){
    variant.src = src;
    if(file) foregroundVariantFiles.set(variant.id, file);
  }
}

function setActiveForegroundSource(src, file = null){
  const variant = getActiveForegroundVariant();
  if(variant){
    variant.src = src;
    if(file) foregroundVariantFiles.set(variant.id, file);
  }
  template.layers.foreground = src;
}

async function selectBackgroundVariant(id, { updateUrl = false } = {}){
  const nextId = normalizeBackgroundId(id);
  const variants = getBackgroundVariants();
  if(!variants.some(item => item.id === nextId)) return;
  if(activeTab === "leader" && (leaderTextOverrides.size || leaderTempTextFields.length)){
    resetLeaderSessionLayout({ clearTemp:true, silent:true });
  }
  syncActiveVariantLayout();
  selectedBackgroundId = nextId;
  applyActiveVariantLayout({ rebuild:true });
  await loadActiveBackgroundImage();
  buildBackgroundSwitcher();
  buildBackgroundVariantAdmin();
  syncForegroundTransformInputs();
  if(updateUrl) writeBackgroundRoute(nextId);
  showMobileToast(getActiveBackgroundVariant()?.label || nextId);
  render();
}

function getBackgroundVariantFilePayload(){
  return [...backgroundVariantFiles.entries()].map(([id, file]) => ({ id, file })).filter(item => item.file);
}

function getForegroundVariantFilePayload(){
  return [...foregroundVariantFiles.entries()].map(([id, file]) => ({ id, file })).filter(item => item.file);
}

function buildBackgroundLink(id){
  const bgId = normalizeBackgroundId(id);
  const url = new URL(`${bgId}.html`, window.location.href);
  if(template.templateId) url.searchParams.set("template", template.templateId);
  return url.href;
}

function writeBackgroundRoute(id){
  const url = new URL(window.location.href);
  const bgId = normalizeBackgroundId(id);
  url.searchParams.set("bg", bgId);
  url.searchParams.set("page", bgId);
  if(routeOptions.templateSlug || template.templateId) url.searchParams.set("template", routeOptions.templateSlug || template.templateId);
  window.history.replaceState({}, "", url);
}

async function copyBackgroundLink(id){
  const link = buildBackgroundLink(id);
  try {
    await navigator.clipboard.writeText(link);
    showMobileToast("Đã copy link nền");
  } catch (err) {
    window.prompt("Copy link nền:", link);
  }
}

function syncSlotInputs(){
  $("slotX").value = template.personSlot.x;
  $("slotY").value = template.personSlot.y;
  $("slotW").value = template.personSlot.width;
  $("slotH").value = template.personSlot.height;
}

function syncAdminTextCards(){
  const admin = $("adminTextFields");
  admin.innerHTML = "";
  template.textFields.forEach((field) => {
    const card = document.createElement("div");
    card.className = `field-card ${selectedTextKey === field.key ? "selected" : ""}`;
    card.dataset.key = field.key;
    const grad = normalizeGradient(field);
    card.innerHTML = `
      <div class="field-card-title">
        <strong>${escapeHtml(field.label || field.key)}</strong>
        <button type="button" class="soft mini danger" data-action="delete-text">Xóa</button>
      </div>
      <label>Giá trị mặc định <input data-field="defaultValue" type="text" value="${escapeAttr(field.defaultValue || "")}"></label>
      <div class="field-grid four">
        <label>X <input data-field="x" type="number" value="${field.x}"></label>
        <label>Y <input data-field="y" type="number" value="${field.y}"></label>
        <label>Size <input data-field="fontSize" type="number" value="${field.fontSize}"></label>
        <label>Rộng <input data-field="width" type="number" value="${field.width || 600}"></label>
      </div>
      <div class="field-grid two">
        <label>Font
          <input data-field="fontFamily" type="text" value="${escapeAttr(field.fontFamily || '')}" placeholder="vd: Montserrat, Arial, sans-serif">
        </label>
        <label>Độ đậm
          <select data-field="fontWeight">
            <option value="600" ${isSelected(field.fontWeight, "600")}>600</option>
            <option value="700" ${isSelected(field.fontWeight, "700")}>700</option>
            <option value="800" ${isSelected(field.fontWeight, "800")}>800</option>
            <option value="900" ${isSelected(field.fontWeight, "900")}>900</option>
          </select>
        </label>
      </div>
      <div class="field-grid two">
        <label>Kiểu fill
          <select data-field="fillType">
            <option value="solid" ${isSelected(field.fillType, 'solid')}>Màu đơn</option>
            <option value="gradient" ${isSelected(field.fillType, 'gradient')}>Gradient</option>
          </select>
        </label>
        <label>Canh chữ
          <select data-field="align">
            <option value="center" ${isSelected(field.align, "center")}>Giữa</option>
            <option value="left" ${isSelected(field.align, "left")}>Trái</option>
            <option value="right" ${isSelected(field.align, "right")}>Phải</option>
          </select>
        </label>
      </div>
      <div class="field-grid two">
        <label>Màu 1 / Solid <input data-field="color" type="color" value="${toHex(field.color || '#ffffff')}"></label>
        <label>Màu 2 Gradient <input data-field="gradientColor2" type="color" value="${toHex(grad.stops[1]?.color || '#d9c45b')}"></label>
      </div>
      <div class="field-grid two">
        <label>Góc gradient <input data-field="gradientAngle" type="number" value="${Number(grad.angle || 0)}"></label>
        <label>Giãn chữ <input data-field="letterSpacing" type="number" value="${field.letterSpacing || 0}"></label>
      </div>
      <div class="field-grid two">
        <label>Viết hoa
          <select data-field="uppercase">
            <option value="false" ${field.uppercase ? "" : "selected"}>Không</option>
            <option value="true" ${field.uppercase ? "selected" : ""}>Có</option>
          </select>
        </label>
        <label>Snap giữa
          <select data-field="snapToCenter">
            <option value="true" ${field.snapToCenter ? "selected" : ""}>Có</option>
            <option value="false" ${field.snapToCenter ? "" : "selected"}>Không</option>
          </select>
        </label>
      </div>
      <div class="field-grid two">
        <label>Cho kéo thả
          <select data-field="draggable">
            <option value="true" ${field.draggable !== false ? "selected" : ""}>Có</option>
            <option value="false" ${field.draggable === false ? "selected" : ""}>Không</option>
          </select>
        </label>
        <label>Blur đổ bóng <input data-field="shadowBlur" type="number" value="${field.shadowBlur || 0}"></label>
      </div>
      <p class="mini-note">Nếu admin upload font lên cloud rồi lưu template, trường fontFamily của field này có thể điền đúng tên family được lưu trong template.fonts. Ví dụ: AdminFont_TenFont_12345, Arial, sans-serif</p>
    `;
    card.addEventListener("click", () => {
      selectedTextKey = field.key;
      syncAdminTextCards();
      render();
    });
    const deleteBtn = card.querySelector('[data-action="delete-text"]');
    if(deleteBtn){
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteAdminTextField(field.key);
      });
    }
    card.querySelectorAll("input,select").forEach(input => {
      input.addEventListener("click", e => e.stopPropagation());
      input.addEventListener("input", () => updateFieldFromControl(field, input));
      input.addEventListener("change", () => updateFieldFromControl(field, input));
    });
    admin.appendChild(card);
  });
}

function normalizeGradient(field){
  return field.gradient || {
    angle: 0,
    stops: [
      { offset: 0, color: field.color || '#ffffff' },
      { offset: 1, color: field.color || '#ffffff' }
    ]
  };
}

function updateFieldFromControl(field, input){
  const k = input.dataset.field;
  if(k === 'gradientColor2' || k === 'gradientAngle'){
    field.gradient ||= { angle: 0, stops: [{ offset: 0, color: field.color || '#ffffff' }, { offset: 1, color: '#d9c45b' }] };
    field.gradient.stops ||= [{ offset: 0, color: field.color || '#ffffff' }, { offset: 1, color: '#d9c45b' }];
    if(field.gradient.stops.length < 2){
      field.gradient.stops = [{ offset: 0, color: field.color || '#ffffff' }, { offset: 1, color: '#d9c45b' }];
    }
    if(k === 'gradientColor2') field.gradient.stops[1].color = input.value;
    if(k === 'gradientAngle') field.gradient.angle = Number(input.value || 0);
  } else if(input.type === "number") {
    field[k] = Number(input.value || 0);
  } else if(k === "uppercase" || k === "snapToCenter" || k === "draggable") {
    field[k] = input.value === "true";
  } else {
    field[k] = input.value;
  }

  if(k === 'color'){
    field.gradient ||= { angle: 0, stops: [{ offset: 0, color: input.value }, { offset: 1, color: '#d9c45b' }] };
    field.gradient.stops ||= [{ offset: 0, color: input.value }, { offset: 1, color: '#d9c45b' }];
    field.gradient.stops[0].color = input.value;
  }

  if(k === "defaultValue"){
    textValues[field.key] = input.value;
    const leaderInput = Array.from(document.querySelectorAll('#textForm input')).find((el, idx) => template.textFields[idx]?.key === field.key);
    if(leaderInput) leaderInput.value = input.value;
  }
  syncActiveVariantLayout();
  render();
}

function updateSlotFromInputs(){
  template.personSlot.x = Number($("slotX").value || 0);
  template.personSlot.y = Number($("slotY").value || 0);
  template.personSlot.width = Number($("slotW").value || 0);
  template.personSlot.height = Number($("slotH").value || 0);
  syncActiveVariantLayout();
  render();
}

function render(force = false){
  if(force){
    if(renderFrame){
      cancelAnimationFrame(renderFrame);
      renderFrame = 0;
    }
    drawPoster();
    return;
  }
  if(renderFrame) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = 0;
    drawPoster();
  });
}

function drawPoster(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if(bgImg) drawCover(bgImg, 0, 0, canvas.width, canvas.height);
  else fillPlaceholder("Chưa có background");

  if(personImg){
    const drawable = getProcessedPersonDrawable();
    const slotBottom = template.personSlot.y + template.personSlot.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, slotBottom);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(drawable, person.x, person.y, drawable.width * person.scale, drawable.height * person.scale);
    ctx.restore();
  }

  if(fgImg){
    const foreground = getActiveForegroundTransform();
    ctx.drawImage(fgImg, foreground.x, foreground.y, foreground.width, foreground.height);
  }
  drawDynamicText();
  if(activeTab === "leader" && leaderGuidesVisible && !exportCleanMode) drawLeaderTextGuides();
  if(activeTab === "admin" && showTextGuides && !editForegroundMode) drawTextGuides();
  if(activeTab === "admin" && showSlot && !editForegroundMode) drawPersonSlotGuide();
  if(activeTab === "admin" && editForegroundMode && fgImg && !exportCleanMode) drawForegroundTransformGuide();
  if(personImg && activeTab === "leader" && leaderGuidesVisible && !exportCleanMode) drawPersonTransformGuide();
  if(snapState.active && !exportCleanMode) drawCenterSnapFeedback();
  positionInlineTextEditor();
}

function drawCover(img, x, y, w, h){
  ctx.drawImage(img, x, y, w, h);
}

function fillPlaceholder(text){
  ctx.fillStyle = "#050505";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#f5c85b";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width/2, canvas.height/2);
}

function drawDynamicText(){
  textRenderBoxes.clear();
  getDrawableTextFields().forEach(field => {
    let value = textValues[field.key] ?? field.defaultValue ?? "";
    if(field.uppercase) value = String(value).toUpperCase();
    if(!value) return;

    ctx.save();
    ctx.textAlign = field.align || "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = field.shadowColor || "transparent";
    ctx.shadowBlur = field.shadowBlur || 0;

    let size = field.fontSize || 36;
    const weight = String(field.fontWeight || "700");
    const family = field.fontFamily || "Arial, sans-serif";
    const maxWidth = field.width || 800;
    const letterSpacing = Number(field.letterSpacing || 0);
    ctx.font = `${weight} ${size}px ${family}`;

    while(measureWithLetterSpacing(value, letterSpacing) > maxWidth && size > 14){
      size -= 1;
      ctx.font = `${weight} ${size}px ${family}`;
    }

    const boxHeight = Math.max(size * 1.25, 30);
    const boxWidth = maxWidth;
    let left = field.x - boxWidth / 2;
    if((field.align || "center") === "left") left = field.x;
    if((field.align || "center") === "right") left = field.x - boxWidth;
    const box = {
      key: field.key,
      x: left,
      y: field.y - boxHeight / 2,
      width: boxWidth,
      height: boxHeight,
      centerX: field.x,
      centerY: field.y
    };

    ctx.fillStyle = field.fillType === 'gradient'
      ? createLinearGradientFill(ctx, field, box)
      : (field.color || '#ffffff');

    drawTextWithLetterSpacing(value, field.x, field.y, letterSpacing, field.align || "center");
    textRenderBoxes.set(field.key, box);
    ctx.restore();
  });
}

function measureWithLetterSpacing(text, letterSpacing){
  if(!letterSpacing) return ctx.measureText(text).width;
  let width = 0;
  for(let i=0;i<text.length;i++) width += ctx.measureText(text[i]).width;
  return width + Math.max(0, text.length - 1) * letterSpacing;
}

function drawTextWithLetterSpacing(text, x, y, letterSpacing, align){
  if(!letterSpacing){
    ctx.fillText(text, x, y);
    return;
  }
  const totalWidth = measureWithLetterSpacing(text, letterSpacing);
  let startX = x;
  if(align === "center") startX = x - totalWidth / 2;
  if(align === "right") startX = x - totalWidth;
  const oldAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let curX = startX;
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    ctx.fillText(ch, curX, y);
    curX += ctx.measureText(ch).width + letterSpacing;
  }
  ctx.textAlign = oldAlign;
}

function drawTextGuides(){
  textRenderBoxes.forEach((box, key) => {
    if(isLeaderTempTextKey(key)) return;
    const isSelected = key === selectedTextKey;
    ctx.save();
    ctx.setLineDash(isSelected ? [] : [8, 8]);
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeStyle = isSelected ? "rgba(245,200,91,.98)" : "rgba(106,168,255,.9)";
    ctx.fillStyle = isSelected ? "rgba(245,200,91,.13)" : "rgba(106,168,255,.08)";
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.fillStyle = isSelected ? "#f5c85b" : "#6aa8ff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(key, box.x + 8, box.y + 7);
    ctx.restore();
  });
}

function drawLeaderTextGuides(){
  textRenderBoxes.forEach((box, key) => {
    const isEditing = key === inlineEditorKey;
    const isSelected = key === selectedTextKey;
    const isTemp = isLeaderTempTextKey(key);
    const isOverride = leaderTextOverrides.has(key);
    ctx.save();
    ctx.setLineDash(isSelected ? [] : [7, 9]);
    ctx.lineWidth = isEditing || isSelected ? 3 : 2;
    ctx.strokeStyle = isTemp
      ? (isEditing || isSelected ? "rgba(126,176,255,.98)" : "rgba(126,176,255,.62)")
      : (isOverride ? "rgba(66,216,139,.88)" : (isEditing || isSelected ? "rgba(255,231,163,.95)" : "rgba(255,231,163,.36)"));
    ctx.fillStyle = isTemp
      ? "rgba(126,176,255,.09)"
      : (isOverride ? "rgba(66,216,139,.08)" : (isEditing || isSelected ? "rgba(233,189,85,.12)" : "rgba(233,189,85,.035)"));
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    if(isTemp || isOverride){
      ctx.fillStyle = isTemp ? "#dcebff" : "#c9ffe1";
      ctx.font = "800 16px Inter, Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(isTemp ? "TẠM" : "TÙY CHỈNH", box.x + 8, box.y + 6);
    }
    ctx.restore();
  });
}

function drawForegroundTransformGuide(){
  const transform = getActiveForegroundTransform();
  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,115,115,.98)";
  ctx.fillStyle = "rgba(255,115,115,.06)";
  ctx.fillRect(transform.x, transform.y, transform.width, transform.height);
  ctx.strokeRect(transform.x, transform.y, transform.width, transform.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,115,115,.98)";
  ctx.fillRect(transform.x + transform.width - FOREGROUND_HANDLE_SIZE, transform.y + transform.height - FOREGROUND_HANDLE_SIZE, FOREGROUND_HANDLE_SIZE, FOREGROUND_HANDLE_SIZE);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(transform.x + transform.width - FOREGROUND_HANDLE_SIZE, transform.y + transform.height - FOREGROUND_HANDLE_SIZE, FOREGROUND_HANDLE_SIZE, FOREGROUND_HANDLE_SIZE);
  ctx.fillStyle = "rgba(5,6,10,.78)";
  roundRect(ctx, clamp(transform.x + 12, 8, canvas.width - 220), clamp(transform.y + 12, 8, canvas.height - 48), 205, 36, 16);
  ctx.fill();
  ctx.fillStyle = "#ffd7d7";
  ctx.font = "800 17px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("BẢN TRÊN · ADMIN", clamp(transform.x + 26, 22, canvas.width - 205), clamp(transform.y + 30, 26, canvas.height - 28));
  ctx.restore();
}

function drawPersonSlotGuide(){
  const s = template.personSlot;
  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(106,168,255,.95)";
  ctx.strokeRect(s.x, s.y, s.width, s.height);
  ctx.fillStyle = "rgba(106,168,255,.12)";
  ctx.fillRect(s.x, s.y, s.width, s.height);
  ctx.fillStyle = "#6aa8ff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PERSON SLOT", s.x + 12, s.y + 30);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(106,168,255,.95)";
  ctx.fillRect(s.x + s.width - SLOT_HANDLE_SIZE, s.y + s.height - SLOT_HANDLE_SIZE, SLOT_HANDLE_SIZE, SLOT_HANDLE_SIZE);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(s.x + s.width - SLOT_HANDLE_SIZE, s.y + s.height - SLOT_HANDLE_SIZE, SLOT_HANDLE_SIZE, SLOT_HANDLE_SIZE);
  ctx.restore();
}

function drawPersonTransformGuide(){
  if(!personImg) return;
  const b = person.bounds || { x:0, y:0, width:personImg.width, height:personImg.height };
  const x = person.x + b.x * person.scale;
  const y = person.y + b.y * person.scale;
  const w = b.width * person.scale;
  const h = b.height * person.scale;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,216,115,.95)";
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(0,0,0,.58)";
  const label = "Avatar: kéo / chụm để chỉnh";
  ctx.font = "800 20px Inter, Arial, sans-serif";
  const labelW = Math.min(ctx.measureText(label).width + 28, canvas.width - 36);
  const labelX = clamp(x + w / 2 - labelW / 2, 18, canvas.width - labelW - 18);
  const labelY = clamp(y - 52, 18, canvas.height - 60);
  roundRect(ctx, labelX, labelY, labelW, 38, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,216,115,.75)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffe49a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, labelX + labelW / 2, labelY + 20);
  const dots = [[x,y],[x+w,y],[x,y+h],[x+w,y+h]];
  ctx.fillStyle = "#ffd86c";
  ctx.strokeStyle = "rgba(0,0,0,.7)";
  dots.forEach(([dx,dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 8, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawCenterSnapFeedback(){
  const centerX = snapState.targetX || canvas.width / 2;
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = "rgba(255,216,115,0.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, 34);
  ctx.lineTo(centerX, canvas.height - 34);
  ctx.stroke();

  const label = snapState.label || "Đã canh giữa";
  ctx.font = "700 22px Inter, Arial, sans-serif";
  const textW = ctx.measureText(label).width;
  const w = textW + 32;
  const h = 42;
  const x = centerX - w / 2;
  const y = 22;
  ctx.fillStyle = "rgba(0,0,0,0.68)";
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,216,115,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffd86c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, centerX, y + h / 2 + 1);
  ctx.restore();
}

function autoFitPerson(){
  if(!personImg) return;
  const slot = template.personSlot;
  const b = person.bounds || getAlphaBounds(personImg);
  person.bounds = b;
  const scale = Math.min(slot.width / b.width, slot.height / b.height) * 1.06;
  person.scale = clamp(scale, 0.2, 3);
  person.x = slot.x + slot.width / 2 - (b.x + b.width / 2) * person.scale;
  person.y = slot.y + slot.height - (b.y + b.height) * person.scale;
  $("scaleRange").value = person.scale;
}

function getAlphaBounds(img){
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const data = cx.getImageData(0,0,c.width,c.height).data;
  let minX=c.width, minY=c.height, maxX=0, maxY=0, found=false;
  for(let y=0; y<c.height; y++){
    for(let x=0; x<c.width; x++){
      const i = (y*c.width+x)*4;
      if(data[i+3] > 20){
        found = true;
        if(x<minX) minX=x;
        if(y<minY) minY=y;
        if(x>maxX) maxX=x;
        if(y>maxY) maxY=y;
      }
    }
  }
  if(!found) return {x:0,y:0,width:img.width,height:img.height};
  return {x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
}

function invalidatePersonCache(){
  processedPersonCanvas = null;
  processedPersonKey = "";
}

function getToneKey(){
  return [
    personImg?.src || personImg?.width,
    personImg?.height,
    person.brightness,
    person.contrast,
    person.saturation,
    person.temperature,
    person.tint,
    person.sharpness
  ].join("|");
}

function hasPixelToneAdjustment(){
  return person.brightness !== 100 || person.contrast !== 100 || person.saturation !== 100 ||
    person.temperature !== 0 || person.tint !== 0 || person.sharpness !== 0;
}

function getProcessedPersonDrawable(){
  if(!personImg) return personImg;
  if(!hasPixelToneAdjustment()) return personImg;
  const key = getToneKey();
  if(processedPersonCanvas && processedPersonKey === key) return processedPersonCanvas;

  const c = document.createElement("canvas");
  c.width = personImg.width;
  c.height = personImg.height;
  const cx = c.getContext("2d", { willReadFrequently:true });
  cx.drawImage(personImg, 0, 0);
  const img = cx.getImageData(0, 0, c.width, c.height);
  const data = img.data;

  const brightness = person.brightness / 100;
  const contrastValue = (person.contrast - 100) * 2.55;
  const saturation = person.saturation / 100;
  const temp = person.temperature / 100;
  const tint = person.tint / 100;
  const cFactor = 259 * (contrastValue + 255) / (255 * (259 - contrastValue));

  for(let i=0; i<data.length; i+=4){
    if(data[i+3] === 0) continue;
    let r = data[i], g = data[i+1], b = data[i+2];
    r = cFactor * (r - 128) + 128;
    g = cFactor * (g - 128) + 128;
    b = cFactor * (b - 128) + 128;
    r *= brightness; g *= brightness; b *= brightness;

    const gray = r * 0.2126 + g * 0.7152 + b * 0.0722;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;

    // temperature: âm = lạnh hơn, dương = ấm hơn
    r += 30 * temp;
    b -= 34 * temp;
    g += 5 * temp;

    // tint: âm = xanh lá hơn, dương = hồng/magenta hơn
    r += 18 * tint;
    b += 18 * tint;
    g -= 26 * tint;

    data[i] = clampByte(r);
    data[i+1] = clampByte(g);
    data[i+2] = clampByte(b);
  }

  if(person.sharpness > 0){
    applySoftSharpen(data, c.width, c.height, person.sharpness / 100);
  }

  cx.putImageData(img, 0, 0);
  processedPersonCanvas = c;
  processedPersonKey = key;
  return c;
}

function applySoftSharpen(data, width, height, amount){
  const copy = new Uint8ClampedArray(data);
  const strength = clamp(amount, 0, .75);
  for(let y=1; y<height-1; y++){
    const row = y * width;
    for(let x=1; x<width-1; x++){
      const i = (row + x) * 4;
      if(copy[i+3] < 8) continue;
      for(let ch=0; ch<3; ch++){
        const center = copy[i+ch] * 5;
        const around = copy[i-4+ch] + copy[i+4+ch] + copy[i-width*4+ch] + copy[i+width*4+ch];
        const sharp = center - around;
        data[i+ch] = clampByte(copy[i+ch] * (1-strength) + sharp * strength);
      }
    }
  }
}

function resetToneControls(showNotice = false){
  person.brightness = 100;
  person.contrast = 100;
  person.saturation = 100;
  person.temperature = 0;
  person.tint = 0;
  person.sharpness = 0;
  const controls = {
    brightnessRange: 100,
    contrastRange: 100,
    saturationRange: 100,
    temperatureRange: 0,
    tintRange: 0,
    sharpnessRange: 0
  };
  Object.entries(controls).forEach(([id, value]) => { if($(id)) $(id).value = value; });
  updateToneLabels();
  invalidatePersonCache();
  if(showNotice) showMobileToast("Đã reset màu ảnh về mặc định");
}

function updateToneLabels(){
  if($("temperatureValue")) $("temperatureValue").textContent = person.temperature > 0 ? `+${person.temperature}` : String(person.temperature);
  if($("tintValue")) $("tintValue").textContent = person.tint > 0 ? `+${person.tint}` : String(person.tint);
  if($("sharpnessValue")) $("sharpnessValue").textContent = String(person.sharpness);
}

async function downscaleImageIfNeeded(img, maxEdge = MAX_PERSON_EDGE){
  const edge = Math.max(img.width, img.height);
  if(edge <= maxEdge) return img;
  const ratio = maxEdge / edge;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * ratio);
  c.height = Math.round(img.height * ratio);
  const cx = c.getContext("2d", { alpha:true });
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = "high";
  cx.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(resolve => c.toBlob(resolve, "image/png", .94));
  if(!blob) return img;
  const url = URL.createObjectURL(blob);
  return srcToImage(url, { cache:false });
}

async function compressFileForRemoval(file){
  const img = await fileToImage(file);
  const small = await downscaleImageIfNeeded(img, MAX_REMOVE_BG_EDGE);
  const c = document.createElement("canvas");
  c.width = small.width;
  c.height = small.height;
  const cx = c.getContext("2d");
  cx.drawImage(small, 0, 0);
  const blob = await new Promise(resolve => c.toBlob(resolve, "image/jpeg", .92));
  return new File([blob], (file.name || "person") + "-mobile.jpg", { type:"image/jpeg" });
}

function setRemoveBgStatus(text){
  const el = $("removeBgStatus");
  if(el) el.textContent = text;
}

function updateRemoveBgProgress({ visible = true, percent = 0, title = "Đang xử lý", hint = "", step = "prepare", mode = "ai" } = {}){
  const card = $("removeBgProgressCard");
  if(!card) return;
  card.hidden = !visible;
  card.classList.toggle("is-fallback", mode === "fallback");
  card.classList.toggle("is-done", step === "done");
  const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const bar = $("removeBgProgressBar");
  if(bar) bar.style.width = `${safePercent}%`;
  const badge = $("removeBgPercentBadge");
  if(badge) badge.textContent = `${safePercent}%`;
  const titleEl = $("removeBgStepTitle");
  if(titleEl) titleEl.textContent = title;
  const hintEl = $("removeBgStepHint");
  if(hintEl) hintEl.textContent = hint;
  document.querySelectorAll("#removeBgSteps .step-chip").forEach((chip) => {
    const chipStep = chip.dataset.step;
    chip.classList.remove("active", "done");
    const order = ["prepare", "download", "segment", "done"];
    const currentIndex = order.indexOf(step);
    const chipIndex = order.indexOf(chipStep);
    if(chipIndex < currentIndex) chip.classList.add("done");
    if(chipIndex === currentIndex) chip.classList.add("active");
    if(step === "done" && chipIndex <= currentIndex) chip.classList.add("done");
  });
}

function resetRemoveBgProgress(){
  updateRemoveBgProgress({ visible:false, percent:0, title:"Sẵn sàng xóa nền", hint:"Tool sẽ hiện tiến trình rõ ràng từng bước để dễ theo dõi trên điện thoại.", step:"prepare", mode:"ai" });
}

function showMobileToast(text){
  const el = $("mobileToast");
  if(!el) return;
  el.textContent = text;
  el.classList.remove("hide");
  clearTimeout(hideToastTimer);
  hideToastTimer = setTimeout(() => el.classList.add("hide"), 2500);
}

function mobileQuickFit(){
  if(!personImg){ alert("Upload ảnh nhân sự trước nha."); return; }
  autoFitPerson();
  person.scale = clamp(person.scale * 1.04, 0.2, 3);
  $("scaleRange").value = person.scale;
  showMobileToast("Đã canh nhanh cho màn điện thoại");
}

async function removeBackgroundInBrowser(){
  if(!personSourceFile){ alert("Upload ảnh nhân sự trước nha."); return; }
  const btn = $("btnRemoveBg");
  const old = btn.textContent;
  btn.textContent = "Đang xóa nền...";
  btn.disabled = true;
  updateRemoveBgProgress({ visible:true, percent:6, title:"Chuẩn bị ảnh", hint:"Đang tối ưu ảnh để điện thoại xử lý nhẹ và mượt hơn.", step:"prepare", mode:"ai" });
  setRemoveBgStatus("Đang chuẩn bị ảnh nhẹ hơn để iPhone xử lý mượt...");
  try{
    preloadRemoveBgModule();
    const mobileFile = await compressFileForRemoval(personSourceFile);
    updateRemoveBgProgress({ visible:true, percent:18, title:"Tải mô hình AI", hint:"Lần đầu có thể mất 10–30 giây tùy mạng. Những lần sau sẽ nhanh hơn.", step:"download", mode:"ai" });
    setRemoveBgStatus("Đang tải AI xóa nền trong trình duyệt...");
    const mod = await getRemoveBgModule();
    let reachedInference = false;
    const blob = await mod.removeBackground(mobileFile, {
      progress: (key, current, total) => {
        if(total){
          const pct = 18 + Math.round((current / total) * 47);
          updateRemoveBgProgress({ visible:true, percent:pct, title:"Tải mô hình AI", hint:"Đang tải các thành phần xóa nền cho trình duyệt.", step:"download", mode:"ai" });
          setRemoveBgStatus(`Đang tải AI xóa nền: ${Math.round(current / total * 100)}%`);
        } else if(!reachedInference) {
          reachedInference = true;
          updateRemoveBgProgress({ visible:true, percent:74, title:"Đang tách nền", hint:"AI đang nhận diện chủ thể và xử lý nền. Vui lòng chờ một chút.", step:"segment", mode:"ai" });
          setRemoveBgStatus("Đang tách nền bằng AI...");
        }
      }
    });
    updateRemoveBgProgress({ visible:true, percent:90, title:"Hoàn thiện ảnh", hint:"Đang đưa ảnh đã tách nền vào poster và canh lại avatar.", step:"segment", mode:"ai" });
    const url = URL.createObjectURL(blob);
    personImg = await srcToImage(url);
    personImg = await downscaleImageIfNeeded(personImg, MAX_PERSON_EDGE);
    person.bounds = getAlphaBounds(personImg);
    invalidatePersonCache();
    autoFitPerson();
    updateRemoveBgProgress({ visible:true, percent:100, title:"Xóa nền hoàn tất", hint:"Avatar đã sẵn sàng. Bây giờ có thể kéo hoặc chụm để căn lại cho đẹp.", step:"done", mode:"ai" });
    setRemoveBgStatus("Đã xóa nền AI xong. Có thể kéo/chụm để căn avatar.");
    showMobileToast("Đã xóa nền xong • Kéo/chụm để căn ảnh");
    render();
  }catch(err){
    console.warn("AI remove background failed, fallback to local edge matting", err);
    try{
      updateRemoveBgProgress({ visible:true, percent:32, title:"Chuyển sang chế độ dự phòng", hint:"AI/CDN đang chậm hoặc lỗi. Tool sẽ dùng thuật toán fallback ngay trên máy để tiếp tục.", step:"prepare", mode:"fallback" });
      setRemoveBgStatus("AI/CDN chưa chạy được, đang dùng thuật toán fallback nhẹ trên máy...");
      const rawImg = await fileToImage(personSourceFile);
      updateRemoveBgProgress({ visible:true, percent:58, title:"Phân tích nền", hint:"Đang quét viền và ước lượng vùng nền để tách nhanh trên điện thoại.", step:"download", mode:"fallback" });
      const smallImg = await downscaleImageIfNeeded(rawImg, MAX_REMOVE_BG_EDGE);
      updateRemoveBgProgress({ visible:true, percent:78, title:"Đang tách nền fallback", hint:"Thuật toán fallback đang xử lý. Kết quả đẹp nhất khi ảnh có nền đơn giản hoặc tương phản tốt.", step:"segment", mode:"fallback" });
      const fallbackCanvas = smartFallbackRemoveBackground(smallImg);
      personImg = await srcToImage(fallbackCanvas.toDataURL("image/png"));
      personImg = await downscaleImageIfNeeded(personImg, MAX_PERSON_EDGE);
      person.bounds = getAlphaBounds(personImg);
      invalidatePersonCache();
      autoFitPerson();
      updateRemoveBgProgress({ visible:true, percent:100, title:"Fallback hoàn tất", hint:"Đã tách nền bằng thuật toán dự phòng. Nếu ảnh có nền phức tạp, có thể thử lại bằng ảnh nền đơn giản hơn để sạch hơn.", step:"done", mode:"fallback" });
      setRemoveBgStatus("Đã xóa nền bằng fallback. Với nền quá phức tạp, nên dùng ảnh chụp nền đơn sắc để sạch hơn.");
      showMobileToast("Đã xóa nền fallback • Kéo/chụm để căn ảnh");
      render();
    }catch(fallbackErr){
      console.error(fallbackErr);
      updateRemoveBgProgress({ visible:true, percent:100, title:"Chưa xóa nền được", hint:"Hãy thử ảnh nhẹ hơn, mạng ổn định hơn hoặc dùng ảnh có nền rõ chủ thể hơn rồi bấm lại.", step:"done", mode:"fallback" });
      setRemoveBgStatus("Chưa xóa nền được. Hãy thử ảnh nhẹ hơn hoặc mạng ổn định hơn rồi bấm lại.");
      alert("Chưa xóa nền được trên trình duyệt này. Hạnh thử ảnh nhẹ hơn hoặc mạng ổn định hơn nha.");
    }
  }finally{
    btn.textContent = old;
    btn.disabled = false;
  }
}

function smartFallbackRemoveBackground(img){
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const cx = c.getContext("2d", { willReadFrequently:true });
  cx.drawImage(img, 0, 0);
  const image = cx.getImageData(0, 0, c.width, c.height);
  const data = image.data;
  const w = c.width, h = c.height;

  const bg = estimateBorderColor(data, w, h);
  const visited = new Uint8Array(w * h);
  const queue = [];
  const threshold = Math.max(34, Math.min(92, bg.std * 2.2 + 28));
  const push = (x,y) => {
    if(x<0 || y<0 || x>=w || y>=h) return;
    const idx = y*w+x;
    if(visited[idx]) return;
    const di = idx*4;
    const d = colorDistance(data[di], data[di+1], data[di+2], bg.r, bg.g, bg.b);
    if(d <= threshold){
      visited[idx] = 1;
      queue.push(idx);
    }
  };
  for(let x=0; x<w; x+=2){ push(x,0); push(x,h-1); }
  for(let y=0; y<h; y+=2){ push(0,y); push(w-1,y); }

  let head = 0;
  while(head < queue.length){
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx / w) | 0;
    push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1);
  }

  // Alpha matting nhẹ: nền chắc chắn = trong suốt, vùng viền feather để đỡ răng cưa.
  for(let y=0; y<h; y++){
    for(let x=0; x<w; x++){
      const idx = y*w+x;
      const i = idx*4;
      if(visited[idx]){
        data[i+3] = 0;
      }else{
        const d = colorDistance(data[i], data[i+1], data[i+2], bg.r, bg.g, bg.b);
        const edge = clamp((d - threshold) / 38, 0, 1);
        if(edge < 1) data[i+3] = Math.round(data[i+3] * (0.25 + edge * 0.75));
      }
    }
  }
  featherAlpha(data, w, h, 1);
  cx.putImageData(image, 0, 0);
  return c;
}

function estimateBorderColor(data, w, h){
  const samples = [];
  const step = Math.max(1, Math.floor(Math.min(w,h) / 80));
  for(let x=0; x<w; x+=step){
    samples.push(pixelRGB(data, x, 0, w));
    samples.push(pixelRGB(data, x, h-1, w));
  }
  for(let y=0; y<h; y+=step){
    samples.push(pixelRGB(data, 0, y, w));
    samples.push(pixelRGB(data, w-1, y, w));
  }
  const r = median(samples.map(p => p[0]));
  const g = median(samples.map(p => p[1]));
  const b = median(samples.map(p => p[2]));
  const distances = samples.map(p => colorDistance(p[0], p[1], p[2], r, g, b));
  return { r, g, b, std: median(distances) };
}

function pixelRGB(data, x, y, w){
  const i = (y*w+x)*4;
  return [data[i], data[i+1], data[i+2]];
}

function median(arr){
  const a = arr.slice().sort((x,y)=>x-y);
  return a[(a.length/2)|0] || 0;
}

function colorDistance(r1,g1,b1,r2,g2,b2){
  const dr = r1-r2, dg = g1-g2, db = b1-b2;
  return Math.sqrt(dr*dr*.9 + dg*dg*1.15 + db*db*.95);
}

function featherAlpha(data, w, h, radius = 1){
  const alpha = new Uint8ClampedArray(w*h);
  for(let i=0, p=0; i<data.length; i+=4, p++) alpha[p] = data[i+3];
  for(let y=0; y<h; y++){
    for(let x=0; x<w; x++){
      let sum=0, count=0;
      for(let yy=-radius; yy<=radius; yy++){
        for(let xx=-radius; xx<=radius; xx++){
          const nx=x+xx, ny=y+yy;
          if(nx<0 || ny<0 || nx>=w || ny>=h) continue;
          sum += alpha[ny*w+nx]; count++;
        }
      }
      data[(y*w+x)*4+3] = Math.round(sum / count);
    }
  }
}


function nudge(dir){
  const step = 15;
  if(dir === "left") person.x -= step;
  if(dir === "right") person.x += step;
  if(dir === "up") person.y -= step;
  if(dir === "down") person.y += step;
  if(dir === "reset") autoFitPerson();
  render();
}

function pointerDown(e){
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
  const p = canvasPoint(e);
  activePointers.set(e.pointerId, p);

  if(activePointers.size === 2 && personImg && activeTab === "leader"){
    closeInlineTextEditor();
    startPinchGesture();
    showMobileToast("Đang zoom avatar bằng 2 ngón");
    return;
  }

  if(activeTab === "leader"){
    const textHit = hitTextBox(p.x, p.y);
    if(textHit){
      selectedTextKey = textHit.key;
      syncLeaderTextStylePanel();
      const sourceField = findTextFieldByKey(textHit.key);
      if(sourceField?.draggable !== false){
        closeInlineTextEditor();
        const field = ensureLeaderTextOverride(textHit.key);
        if(field) leaderTextPress = { key:textHit.key, x:p.x, y:p.y, fieldX:field.x, fieldY:field.y, moved:false };
      } else {
        openInlineTextEditor(textHit.key);
      }
      render();
      return;
    }
    closeInlineTextEditor();
  }

  if(activeTab === "admin"){
    closeInlineTextEditor();
    if(editForegroundMode && fgImg){
      const foregroundHit = hitForegroundTransform(p.x, p.y);
      const transform = getActiveForegroundTransform();
      if(foregroundHit === "resize"){
        resizingForeground = true;
        dragStart = { ...dragStart, x:p.x, y:p.y, fgX:transform.x, fgY:transform.y, fgW:transform.width, fgH:transform.height };
        return;
      }
      if(foregroundHit === "body"){
        draggingForeground = true;
        dragStart = { ...dragStart, x:p.x, y:p.y, fgX:transform.x, fgY:transform.y, fgW:transform.width, fgH:transform.height };
        return;
      }
    }
    const hit = hitTextBox(p.x, p.y, { includeTemp:false });
    if(hit){
      selectedTextKey = hit.key;
      const field = template.textFields.find(f => f.key === hit.key);
      if(field?.draggable !== false){
        draggingText = true;
        dragStart = { x:p.x, y:p.y, fieldX:field.x, fieldY:field.y };
      }
      syncAdminTextCards();
      render();
      return;
    }

    const slotHit = hitPersonSlot(p.x, p.y);
    if(slotHit === "resize"){
      resizingSlot = true;
      dragStart = { x:p.x, y:p.y, slotX:template.personSlot.x, slotY:template.personSlot.y, slotW:template.personSlot.width, slotH:template.personSlot.height };
      return;
    }
    if(slotHit === "body"){
      draggingSlot = true;
      dragStart = { x:p.x, y:p.y, slotX:template.personSlot.x, slotY:template.personSlot.y, slotW:template.personSlot.width, slotH:template.personSlot.height };
      return;
    }
  }

  if(!personImg) return;
  if(hitPersonImage(p.x, p.y)){
    draggingPerson = true;
    dragStart = { x:p.x, y:p.y, px:person.x, py:person.y };
    showMobileToast("Kéo để chỉnh vị trí avatar");
  }
}

function pointerMove(e){
  const p = canvasPoint(e);
  if(activePointers.has(e.pointerId)) activePointers.set(e.pointerId, p);

  if(pinchState && activePointers.size >= 2){
    updatePinchGesture();
    return;
  }

  if(leaderTextPress && activeTab === "leader"){
    const field = findTextFieldByKey(leaderTextPress.key);
    if(!field) return;
    const dx = p.x - leaderTextPress.x;
    const dy = p.y - leaderTextPress.y;
    if(!leaderTextPress.moved && Math.hypot(dx, dy) > 8){
      leaderTextPress.moved = true;
      draggingLeaderText = true;
      showMobileToast("Đang kéo chữ · chỉ áp dụng trong phiên này");
    }
    if(leaderTextPress.moved){
      const rawX = Math.round(leaderTextPress.fieldX + dx);
      const rawY = Math.round(leaderTextPress.fieldY + dy);
      const snap = applyTextSnap(field, rawX);
      field.x = snap.x;
      field.y = rawY;
      snapState.active = snap.snapped;
      snapState.targetX = canvas.width / 2;
      syncLeaderTextStylePanel();
      render();
      return;
    }
  }

  if(draggingText){
    const field = template.textFields.find(f => f.key === selectedTextKey);
    if(!field) return;
    const rawX = Math.round(dragStart.fieldX + (p.x - dragStart.x));
    const rawY = Math.round(dragStart.fieldY + (p.y - dragStart.y));
    const snap = applyTextSnap(field, rawX);
    field.x = snap.x;
    field.y = rawY;
    snapState.active = snap.snapped;
    snapState.targetX = canvas.width / 2;
    updateAdminCardValues(field);
    syncActiveVariantLayout();
    render();
    return;
  }

  if(draggingForeground){
    const transform = getActiveForegroundTransform();
    transform.x = Math.round(dragStart.fgX + (p.x - dragStart.x));
    transform.y = Math.round(dragStart.fgY + (p.y - dragStart.y));
    syncForegroundTransformInputs();
    render();
    return;
  }

  if(resizingForeground){
    const transform = getActiveForegroundTransform();
    transform.width = Math.max(80, Math.round(dragStart.fgW + (p.x - dragStart.x)));
    transform.height = Math.max(80, Math.round(dragStart.fgH + (p.y - dragStart.y)));
    syncForegroundTransformInputs();
    render();
    return;
  }

  if(draggingSlot){
    template.personSlot.x = Math.round(dragStart.slotX + (p.x - dragStart.x));
    template.personSlot.y = Math.round(dragStart.slotY + (p.y - dragStart.y));
    syncSlotInputs();
    syncActiveVariantLayout();
    render();
    return;
  }

  if(resizingSlot){
    template.personSlot.width = Math.max(120, Math.round(dragStart.slotW + (p.x - dragStart.x)));
    template.personSlot.height = Math.max(120, Math.round(dragStart.slotH + (p.y - dragStart.y)));
    syncSlotInputs();
    syncActiveVariantLayout();
    render();
    return;
  }

  if(draggingPerson){
    person.x = dragStart.px + (p.x - dragStart.x);
    person.y = dragStart.py + (p.y - dragStart.y);
    render();
    return;
  }

  updateCanvasCursor(p);
}

function pointerUp(e){
  if(e?.pointerId !== undefined){
    activePointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
  }
  if(pinchState && activePointers.size < 2){
    pinchState = null;
    syncPersonControls();
  }
  if(activePointers.size === 0){
    const pendingLeaderPress = leaderTextPress;
    const wasDragging = draggingPerson || draggingText || draggingLeaderText || draggingSlot || resizingSlot || draggingForeground || resizingForeground;
    draggingPerson = false;
    draggingText = false;
    draggingLeaderText = false;
    draggingSlot = false;
    resizingSlot = false;
    draggingForeground = false;
    resizingForeground = false;
    leaderTextPress = null;
    if(snapState.active) snapState.active = false;
    if(pendingLeaderPress && !pendingLeaderPress.moved){
      openInlineTextEditor(pendingLeaderPress.key);
    }
    if(wasDragging) render();
  }
}

function pointerLeave(e){
  if(e.pointerType === "mouse") resetDragAndSnap();
}

function startPinchGesture(){
  const pts = [...activePointers.values()].slice(0, 2);
  const center = midpoint(pts[0], pts[1]);
  pinchState = {
    startDistance: distance(pts[0], pts[1]) || 1,
    startScale: person.scale,
    anchorX: (center.x - person.x) / person.scale,
    anchorY: (center.y - person.y) / person.scale
  };
  draggingPerson = false;
}

function updatePinchGesture(){
  const pts = [...activePointers.values()].slice(0, 2);
  const center = midpoint(pts[0], pts[1]);
  const ratio = distance(pts[0], pts[1]) / pinchState.startDistance;
  const nextScale = clamp(pinchState.startScale * ratio, 0.2, 3);
  person.scale = nextScale;
  person.x = center.x - pinchState.anchorX * nextScale;
  person.y = center.y - pinchState.anchorY * nextScale;
  syncPersonControls();
  render();
}

function syncPersonControls(){
  if($("scaleRange")) $("scaleRange").value = person.scale;
}

function midpoint(a,b){ return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 }; }
function distance(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

function hitPersonImage(x, y){
  if(!personImg) return false;
  const b = person.bounds || { x:0, y:0, width:personImg.width, height:personImg.height };
  const left = person.x + b.x * person.scale;
  const top = person.y + b.y * person.scale;
  const right = left + b.width * person.scale;
  const bottom = top + b.height * person.scale;
  const pad = 32;
  return x >= left - pad && x <= right + pad && y >= top - pad && y <= bottom + pad;
}

function applyTextSnap(field, rawX){
  if(field.snapToCenter === false || (field.align || "center") !== "center") return { snapped:false, x:rawX };
  const centerX = canvas.width / 2;
  const dist = Math.abs(rawX - centerX);
  if(dist <= SNAP_THRESHOLD) return { snapped:true, x:centerX };
  return { snapped:false, x:rawX };
}

function updateCanvasCursor(p){
  if(activeTab === "leader"){
    const leaderHit = hitTextBox(p.x, p.y);
    if(leaderHit){
      const field = findTextFieldByKey(leaderHit.key);
      canvas.style.cursor = field?.draggable === false ? "text" : "grab";
      return;
    }
  }
  if(activeTab === "admin"){
    if(editForegroundMode && fgImg){
      const foregroundHit = hitForegroundTransform(p.x, p.y);
      if(foregroundHit === "resize"){ canvas.style.cursor = "nwse-resize"; return; }
      if(foregroundHit === "body"){ canvas.style.cursor = "move"; return; }
    }
    const textHit = hitTextBox(p.x, p.y, { includeTemp:false });
    if(textHit){ canvas.style.cursor = "grab"; return; }
    const slotHit = hitPersonSlot(p.x, p.y);
    if(slotHit === "resize") { canvas.style.cursor = "nwse-resize"; return; }
    if(slotHit === "body") { canvas.style.cursor = "move"; return; }
  }
  if(personImg && hitPersonImage(p.x, p.y)){
    canvas.style.cursor = "grab";
    return;
  }
  canvas.style.cursor = "default";
}

function hitTextBox(x, y, { includeTemp = true } = {}){
  const sourceFields = includeTemp ? getDrawableTextFields() : template.textFields;
  const fields = [...sourceFields].reverse();
  for(const f of fields){
    const box = textRenderBoxes.get(f.key);
    if(!box) continue;
    if(x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height){ return box; }
  }
  return null;
}

function hitForegroundTransform(x, y){
  const transform = getActiveForegroundTransform();
  const hx = transform.x + transform.width - FOREGROUND_HANDLE_SIZE;
  const hy = transform.y + transform.height - FOREGROUND_HANDLE_SIZE;
  if(x >= hx && x <= hx + FOREGROUND_HANDLE_SIZE && y >= hy && y <= hy + FOREGROUND_HANDLE_SIZE) return "resize";
  if(x >= transform.x && x <= transform.x + transform.width && y >= transform.y && y <= transform.y + transform.height) return "body";
  return null;
}

function hitPersonSlot(x, y){
  const s = template.personSlot;
  const hx = s.x + s.width - SLOT_HANDLE_SIZE;
  const hy = s.y + s.height - SLOT_HANDLE_SIZE;
  if(x >= hx && x <= hx + SLOT_HANDLE_SIZE && y >= hy && y <= hy + SLOT_HANDLE_SIZE) return "resize";
  if(x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) return "body";
  return null;
}

function updateAdminCardValues(field){
  const card = document.querySelector(`.field-card[data-key="${CSS.escape(field.key)}"]`);
  if(!card) return;
  const x = card.querySelector('input[data-field="x"]');
  const y = card.querySelector('input[data-field="y"]');
  if(x) x.value = field.x;
  if(y) y.value = field.y;
}

function openInlineTextEditor(key){
  const field = findTextFieldByKey(key);
  const box = textRenderBoxes.get(key);
  const editor = $("canvasTextEditor");
  if(!field || !box || !editor) return;
  inlineEditorKey = key;
  inlineEditorBeforeValue = textValues[key] ?? field.defaultValue ?? "";
  editor.value = inlineEditorBeforeValue;
  editor.hidden = false;
  editor.dataset.key = key;
  positionInlineTextEditor();
  requestAnimationFrame(() => {
    editor.focus({ preventScroll:true });
    editor.select();
  });
  render();
}

function positionInlineTextEditor(){
  const editor = $("canvasTextEditor");
  if(!editor || !inlineEditorKey || editor.hidden || exportCleanMode) return;
  const box = textRenderBoxes.get(inlineEditorKey);
  const field = findTextFieldByKey(inlineEditorKey);
  if(!box || !field) return;
  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;
  const rawLeft = canvas.offsetLeft + box.x * scaleX;
  const rawTop = canvas.offsetTop + box.y * scaleY;
  const shellWidth = canvas.parentElement?.clientWidth || canvas.clientWidth;
  const width = Math.min(Math.max(90, box.width * scaleX), Math.max(90, shellWidth - 16));
  const height = Math.max(34, box.height * scaleY);
  const left = clamp(rawLeft, 8, Math.max(8, shellWidth - width - 8));
  const top = Math.max(8, rawTop);
  editor.style.left = `${left}px`;
  editor.style.top = `${top}px`;
  editor.style.width = `${width}px`;
  editor.style.minHeight = `${height}px`;
  editor.style.fontFamily = field.fontFamily || "Inter, Arial, sans-serif";
  editor.style.fontSize = `${clamp((field.fontSize || 36) * scaleY, 13, 46)}px`;
  editor.style.fontWeight = field.fontWeight || "800";
  editor.style.textAlign = field.align || "center";
}

function onInlineTextInput(e){
  if(!inlineEditorKey) return;
  textValues[inlineEditorKey] = e.target.value;
  syncLeaderTextInput(inlineEditorKey, e.target.value);
  render();
}

function onInlineTextKeyDown(e){
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    closeInlineTextEditor();
  }
  if(e.key === "Escape"){
    e.preventDefault();
    closeInlineTextEditor({ revert:true });
  }
}

function closeInlineTextEditor({ revert = false } = {}){
  const editor = $("canvasTextEditor");
  if(!editor || !inlineEditorKey) return;
  const key = inlineEditorKey;
  if(revert){
    textValues[key] = inlineEditorBeforeValue;
    syncLeaderTextInput(key, inlineEditorBeforeValue);
  }
  inlineEditorKey = null;
  inlineEditorBeforeValue = "";
  editor.hidden = true;
  editor.blur();
  render();
}

function syncLeaderTextInput(key, value){
  const input = document.querySelector(`#textForm input[data-key="${CSS.escape(key)}"]`);
  if(input && input.value !== value) input.value = value;
}

function canvasPoint(e){
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * canvas.width / rect.width,
    y: (e.clientY - rect.top) * canvas.height / rect.height
  };
}

async function exportPNG(){
  try{
    const blob = await makePosterBlob();
    if(isIOS){
      const shared = await sharePosterBlob(blob, true);
      if(!shared) openBlobPreviewForIOS(blob);
      return;
    }
    downloadBlob(blob, `poster-${Date.now()}.png`);
  }catch(err){
    console.error(err);
    alert("Chưa xuất được poster. Hạnh thử bấm lại nha.");
  }
}

async function sharePosterPNG(){
  try{
    const blob = await makePosterBlob();
    const shared = await sharePosterBlob(blob, false);
    if(!shared){
      if(isIOS) openBlobPreviewForIOS(blob);
      else downloadBlob(blob, `poster-${Date.now()}.png`);
    }
  }catch(err){
    console.error(err);
    alert("Thiết bị/trình duyệt này chưa hỗ trợ chia sẻ trực tiếp. Tool sẽ tải file PNG thay thế.");
  }
}

function makePosterBlob(){
  const originalShowSlot = showSlot;
  const originalShowTextGuides = showTextGuides;
  const originalSnap = snapState.active;
  const originalExportCleanMode = exportCleanMode;
  showSlot = false;
  showTextGuides = false;
  snapState.active = false;
  exportCleanMode = true;
  render(true);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      showSlot = originalShowSlot;
      showTextGuides = originalShowTextGuides;
      snapState.active = originalSnap;
      exportCleanMode = originalExportCleanMode;
      render(true);
      if(blob) resolve(blob);
      else reject(new Error("Không tạo được PNG blob"));
    }, "image/png", 1);
  });
}

async function sharePosterBlob(blob, quiet = false){
  const file = new File([blob], `poster-${Date.now()}.png`, { type:"image/png" });
  if(navigator.canShare && navigator.canShare({ files:[file] }) && navigator.share){
    await navigator.share({ files:[file], title:"Unite Poster", text:"Poster vinh danh Unite Group" });
    if(!quiet) showMobileToast("Đã mở bảng chia sẻ");
    return true;
  }
  return false;
}

function openBlobPreviewForIOS(blob){
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if(opened){
    showMobileToast("Nhấn giữ ảnh rồi chọn Lưu vào Ảnh");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }else{
    downloadBlob(blob, `poster-${Date.now()}.png`);
  }
}

function downloadBlob(blob, filename){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function fileToImage(file){
  const url = URL.createObjectURL(file);
  try {
    return await srcToImage(url, { cache:false });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

function srcToImage(src, { cache = true, priority = "auto" } = {}){
  const canCache = cache && isCacheableImageSource(src);
  if(canCache && imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = priority;
    img.onload = () => {
      if(img.decode) img.decode().catch(() => {}).finally(() => resolve(img));
      else resolve(img);
    };
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
  if(canCache) imageCache.set(src, promise);
  return promise;
}

function waitImage(img){ return img.complete ? Promise.resolve() : new Promise(res => img.onload = res); }
function isCacheableImageSource(src){ return typeof src === "string" && !src.startsWith("data:") && !src.startsWith("blob:"); }
function scheduleIdleTask(fn, timeout = 800){
  if("requestIdleCallback" in window) window.requestIdleCallback(fn, { timeout });
  else setTimeout(fn, Math.min(timeout, 1000));
}
function preloadBackgroundVariants(){
  getBackgroundVariants()
    .map(item => item.src)
    .filter(Boolean)
    .filter(src => src !== getActiveBackgroundSrc())
    .forEach(src => srcToImage(src, { priority:"low" }).catch(() => {}));
}
function preloadForegroundVariants(){
  getForegroundVariants()
    .map(item => item.src)
    .filter(Boolean)
    .filter(src => src !== getActiveForegroundSrc())
    .forEach(src => srcToImage(src, { priority:"low" }).catch(() => {}));
}
function preloadRemoveBgModule(){
  getRemoveBgModule().catch(() => {});
}
function getRemoveBgModule(){
  if(!removeBgModulePromise){
    removeBgModulePromise = import(REMOVE_BG_MODULE_URL).catch(err => {
      removeBgModulePromise = null;
      throw err;
    });
  }
  return removeBgModulePromise;
}
function getRouteOptions(){
  const params = new URLSearchParams(window.location.search);
  const routeBg = normalizeBackgroundId(params.get("page") || params.get("bg") || params.get("background") || params.get("color") || "");
  return {
    templateSlug: normalizeBackgroundId(params.get("template") || params.get("slug") || ""),
    backgroundId: resolveBackgroundAlias(routeBg)
  };
}
function resolveBackgroundAlias(id){
  const aliases = {
    "gold": "tinhhoa",
    "black-gold": "kitai",
    "blue": "tienphong",
    "red": "khaipha",
    "green": "bucpha"
  };
  return aliases[id] || id;
}
function normalizeBackgroundId(input){
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function clampByte(n){ return Math.max(0, Math.min(255, Math.round(n))); }
function toHex(color){ return /^#/.test(color) ? color : '#ffffff'; }
function isSelected(current, value){ return String(current || "") === String(value) ? "selected" : ""; }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }
function escapeAttr(str){ return escapeHtml(str); }
function describeTemplatePersistence(sourceTemplate){
  const textCount = Array.isArray(sourceTemplate?.textFields) ? sourceTemplate.textFields.length : 0;
  const bgCount = Array.isArray(sourceTemplate?.backgroundVariants) ? sourceTemplate.backgroundVariants.length : 0;
  const fgCount = Array.isArray(sourceTemplate?.foregroundVariants) ? sourceTemplate.foregroundVariants.length : 0;
  const fontCount = Array.isArray(sourceTemplate?.fonts) ? sourceTemplate.fonts.length : 0;
  const transformedForegrounds = (sourceTemplate?.foregroundVariants || []).filter(item => item?.transform).length;
  return `<span>Đã xác nhận response DB: ${textCount} vùng chữ · ${bgCount} nền · ${fgCount} bản trên (${transformedForegrounds} transform) · ${fontCount} font.</span>`;
}
function stripHtml(value){
  const div = document.createElement("div");
  div.innerHTML = String(value || "");
  return div.textContent || div.innerText || "";
}
function formatDate(v){ return v ? new Date(v).toLocaleString('vi-VN') : '-'; }
function roundRect(cx, x, y, w, h, r){
  const radius = Math.min(r, w/2, h/2);
  cx.beginPath();
  cx.moveTo(x + radius, y);
  cx.lineTo(x + w - radius, y);
  cx.quadraticCurveTo(x + w, y, x + w, y + radius);
  cx.lineTo(x + w, y + h - radius);
  cx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  cx.lineTo(x + radius, y + h);
  cx.quadraticCurveTo(x, y + h, x, y + h - radius);
  cx.lineTo(x, y + radius);
  cx.quadraticCurveTo(x, y, x + radius, y);
  cx.closePath();
}

init();
