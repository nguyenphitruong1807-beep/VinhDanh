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
import { BACKEND_URL, BACKEND_TIMEOUT_MS, BACKEND_WARMUP_TIMEOUT_MS } from './backend-config.js';

const DEFAULT_TEMPLATE = {
  templateId: "unite-award-poster-05-2026",
  templateName: "Unite Group - Award Poster",
  canvas: { width: 1229, height: 1536 },
  layers: {
    background: "assets/unite-bg-clean.png",
    foreground: "assets/unite-foreground.png"
  },
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

const PAGE_PRESETS = {
  gold:   { slug:"gold",   label:"Vàng",   path:"gold/",   templateSlug:"unite-gold",   accent:"#e9bd55", tint:"#c89424", tintOpacity:0.00 },
  red:    { slug:"red",    label:"Đỏ",     path:"red/",    templateSlug:"unite-red",    accent:"#e15b56", tint:"#b51f2b", tintOpacity:0.28 },
  blue:   { slug:"blue",   label:"Xanh",   path:"blue/",   templateSlug:"unite-blue",   accent:"#5d9eff", tint:"#1555a6", tintOpacity:0.28 },
  green:  { slug:"green",  label:"Lục",    path:"green/",  templateSlug:"unite-green",  accent:"#50c98b", tint:"#0c7b51", tintOpacity:0.24 },
  purple: { slug:"purple", label:"Tím",    path:"purple/", templateSlug:"unite-purple", accent:"#a276ed", tint:"#6332a8", tintOpacity:0.27 }
};

// document.baseURI tự nhận đúng domain gốc lẫn project site dạng
// https://username.github.io/repository/. Các trang màu có <base href="../">.
const SITE_BASE_URL = new URL("./", document.baseURI);

function detectPageSlug(){
  const query = new URLSearchParams(location.search).get("page");
  if(query && PAGE_PRESETS[query]) return query;
  const segments = location.pathname.split("/").filter(Boolean);
  const pageSegment = segments.find(segment => PAGE_PRESETS[segment]);
  return pageSegment || "gold";
}

function getPageUrl(slug){
  const page = PAGE_PRESETS[slug] || PAGE_PRESETS.gold;
  return new URL(page.path, SITE_BASE_URL);
}

let currentPageSlug = detectPageSlug();
let currentPage = PAGE_PRESETS[currentPageSlug];
let backendReady = false;
let backendWakePromise = null;
let inlineEditingKey = null;
let inlineOriginalValue = "";
let tapCandidate = null;
const processedImageCache = new Map();
const drawableCache = new Map();
const pendingBackgroundFiles = new Map();

const SNAP_THRESHOLD = 14;
const SLOT_HANDLE_SIZE = 20;
const MAX_PERSON_EDGE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 1800 : 2400;
const MAX_REMOVE_BG_EDGE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 1500 : 1900;
const $ = (id) => document.getElementById(id);
const canvas = $("posterCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

let template = structuredClone(DEFAULT_TEMPLATE);
let bgImg = null;
let fgImg = null;
let personImg = null;
let personSourceFile = null;
let bgSourceFile = null;
let fgSourceFile = null;
let selectedFontFiles = [];
let showSlot = true;
let leaderGuidesVisible = true;
let showTextGuides = true;
let activeTab = "leader";
let cloudStatusState = "warn";
let cloudTemplates = [];
let selectedCloudSlug = null;
let currentProfile = null;

let draggingPerson = false;
let draggingText = false;
let draggingSlot = false;
let resizingSlot = false;
let lastTapAt = 0;
let hideToastTimer = null;
const activePointers = new Map();
let pinchState = null;
let selectedTextKey = "name";
let dragStart = { x:0, y:0, px:0, py:0, fieldX:0, fieldY:0, slotX:0, slotY:0, slotW:0, slotH:0 };
let textRenderBoxes = new Map();
let snapState = { active:false, targetX:0, label:"Đã canh giữa" };

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
  setupPageUI();
  setupCanvas();
  bindEvents();
  registerServiceWorker();
  backendWakePromise = warmBackend();
  if(isIOS && $("iosSavePanel")) $("iosSavePanel").hidden = false;
  resetRemoveBgProgress();
  loadFonts().catch(() => null);

  const localKey = `unite_poster_template_${currentPageSlug}`;
  const saved = localStorage.getItem(localKey);
  if(saved){
    try {
      template = JSON.parse(saved);
      normalizeTemplate(template);
    } catch(e) {}
  }

  // Hiển thị nền local ngay, không chờ mạng/Supabase.
  applyPageDefaults(true);
  showCanvasLoading(true, `Đang mở trang ${currentPage.label}...`);
  await applyCurrentTemplate();
  showCanvasLoading(false);
  setPublicTemplateInfo(`Đang dùng template local của trang <b>${escapeHtml(currentPage.label)}</b>, đồng thời kiểm tra bản cloud mới nhất.`);

  // Sau khi preview đã hiện mới đồng bộ cloud ở nền.
  try {
    const cloudTemplate = await withTimeoutPromise(loadActiveTemplate(currentPage.templateSlug), 10000, "Cloud phản hồi chậm");
    if (cloudTemplate) {
      template = structuredClone(cloudTemplate);
      normalizeTemplate(template);
      applyPageDefaults(false);
      await applyCurrentTemplate();
      setPublicTemplateInfo(`Đã đồng bộ template <b>${escapeHtml(currentPage.label)}</b> từ cloud.`);
      setCloudStatus('Cloud: đã kết nối', 'good');
    } else {
      setPublicTemplateInfo(`Trang ${escapeHtml(currentPage.label)} chưa có template active. Admin có thể upload nền riêng và Lưu Active.`);
      setCloudStatus('Cloud: chưa có template trang này', 'warn');
    }
  } catch (err) {
    console.warn('Không load được template cloud lúc khởi động:', err);
    setPublicTemplateInfo('Cloud đang chậm hoặc offline; preview local vẫn dùng bình thường.');
    setCloudStatus('Cloud: dùng local', 'warn');
  }

  syncLeaderGuideButton();
  syncModeSwitchButton();
  syncCompactToolbarLabels();
  refreshAuthStatus().catch(() => null);
}

function withTimeoutPromise(promise, timeoutMs, message = "Quá thời gian chờ"){
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs))
  ]);
}

function applyPageDefaults(useFallbackTint = false){
  normalizeTemplate(template);
  template.templateId = currentPage.templateSlug;
  template.templateName ||= `Unite Poster - ${currentPage.label}`;
  template.page ||= {};
  template.page.slug = currentPage.slug;
  template.page.label = currentPage.label;
  template.page.path = currentPage.path;
  template.page.accent = currentPage.accent;
  if(template.page.tintEnabled === undefined) template.page.tintEnabled = useFallbackTint && currentPage.tintOpacity > 0;
  if(!template.page.tintColor) template.page.tintColor = currentPage.tint;
  if(template.page.tintOpacity === undefined) template.page.tintOpacity = useFallbackTint ? currentPage.tintOpacity : 0;
  document.documentElement.style.setProperty('--page-accent', currentPage.accent);
  syncPageAdminControls();
}

function normalizeTemplate(t){
  t.canvas ||= { width: 1229, height: 1536 };
  t.layers ||= {};
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
}

async function applyCurrentTemplate(){
  setupCanvas();
  await loadFontsFromTemplate(template);
  await loadTemplateImages();
  syncTemplateMetaInputs();
  ensureTextValues();
  buildForms();
  syncPageAdminControls();
  autoFitPerson();
  render();
}

function ensureTextValues(){
  const savedDraft = loadPageDraft() || {};
  const next = {};
  template.textFields.forEach(field => {
    next[field.key] = textValues[field.key] ?? savedDraft[field.key] ?? field.defaultValue ?? "";
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
    template.layers.background = dataUrl;
    template.page ||= {};
    template.page.tintEnabled = false;
    if($("pageTintEnabled")) $("pageTintEnabled").checked = false;
    bgImg = await srcToImage(dataUrl);
    render();
  });

  $("fgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    fgSourceFile = file;
    const dataUrl = await fileToDataURL(file);
    template.layers.foreground = dataUrl;
    fgImg = await srcToImage(dataUrl);
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
      localStorage.setItem(`unite_poster_template_${currentPageSlug}`, JSON.stringify(template));
      alert("Đã lưu template trên trình duyệt này.");
    } catch(e) {
      alert("Template có thể quá nặng do ảnh base64. Nên để ảnh trong thư mục assets hoặc lưu qua Supabase.");
    }
  });

  $("btnAutoFit").addEventListener("click", () => { autoFitPerson(); render(); showMobileToast("Đã tự căn vào khung avatar"); });
  $("btnMobileFit").addEventListener("click", () => { mobileQuickFit(); render(); });
  $("btnExport").addEventListener("click", handleTopPrimaryAction);
  $("btnSharePoster").addEventListener("click", handleTopSecondaryAction);
  $("btnRemoveBg").addEventListener("click", removeBackgroundSmart);
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

  $("templateIdInput").readOnly = true;
  $("templateIdInput").title = "Slug được khóa theo trang đang chọn";
  $("templateNameInput").addEventListener("input", e => { template.templateName = e.target.value.trim(); });

  $("btnAdminLogin").addEventListener("click", onAdminLogin);
  $("btnAdminLogout").addEventListener("click", onAdminLogout);
  $("btnRefreshProfile").addEventListener("click", refreshAuthStatus);
  $("btnSaveCloudDraft").addEventListener("click", () => onSaveCloud('draft'));
  $("btnSaveCloudActive").addEventListener("click", () => onSaveCloud('active'));
  $("btnReloadCloudList").addEventListener("click", refreshCloudTemplates);
  $("btnLoadSelectedCloud").addEventListener("click", loadSelectedCloudTemplate);
  $("btnArchiveCloud").addEventListener("click", onArchiveSelectedCloud);
  $("btnReloadActiveCloud").addEventListener("click", reloadActiveCloudTemplate);

  if($("pageSwitcher")) $("pageSwitcher").addEventListener("change", e => navigateToPage(e.target.value));
  if($("copyPageLink")) $("copyPageLink").addEventListener("click", async e => {
    e.preventDefault();
    await navigator.clipboard?.writeText(getCurrentPageUrl());
    showMobileToast("Đã copy link trang " + currentPage.label);
  });
  if($("btnOpenCurrentPage")) $("btnOpenCurrentPage").addEventListener("click", () => window.open(getCurrentPageUrl(), "_blank"));
  if($("btnBatchSaveBackgrounds")) $("btnBatchSaveBackgrounds").addEventListener("click", saveBatchBackgrounds);
  if($("pageTintEnabled")) $("pageTintEnabled").addEventListener("change", e => { template.page.tintEnabled = e.target.checked; render(); });
  if($("pageTintColor")) $("pageTintColor").addEventListener("input", e => { template.page.tintColor = e.target.value; render(); });
  if($("pageTintOpacity")) $("pageTintOpacity").addEventListener("input", e => { template.page.tintOpacity = Number(e.target.value); render(); });

  if($("btnQuickUpload")) $("btnQuickUpload").addEventListener("click", () => $("personUpload").click());
  if($("btnQuickRemoveBg")) $("btnQuickRemoveBg").addEventListener("click", removeBackgroundSmart);
  if($("btnQuickFit")) $("btnQuickFit").addEventListener("click", () => { autoFitPerson(); render(); showMobileToast("Đã tự căn avatar"); });
  if($("btnQuickText")) $("btnQuickText").addEventListener("click", () => openInlineTextEditor(selectedTextKey || "name"));

  if($("inlineTextInput")) $("inlineTextInput").addEventListener("input", onInlineTextInput);
  if($("inlineTextInput")) $("inlineTextInput").addEventListener("keydown", e => {
    if(e.key === "Enter"){ e.preventDefault(); closeInlineTextEditor(true); }
    if(e.key === "Escape"){ e.preventDefault(); closeInlineTextEditor(false); }
  });
  if($("inlineTextApply")) $("inlineTextApply").addEventListener("click", () => closeInlineTextEditor(true));
  if($("inlineTextClose")) $("inlineTextClose").addEventListener("click", () => closeInlineTextEditor(false));
  if($("inlineTextSmaller")) $("inlineTextSmaller").addEventListener("click", () => nudgeInlineFont(-2));
  if($("inlineTextLarger")) $("inlineTextLarger").addEventListener("click", () => nudgeInlineFont(2));
  if($("btnHideIosTip")) $("btnHideIosTip").addEventListener("click", () => { const panel = $("iosSavePanel"); if(panel) panel.hidden = true; });
  if($("btnToggleGuides")) $("btnToggleGuides").addEventListener("click", () => {
    leaderGuidesVisible = !leaderGuidesVisible;
    syncLeaderGuideButton();
    render();
  });
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

  canvas.addEventListener("dblclick", e => {
    const p = canvasPoint(e);
    const hit = hitTextBox(p.x, p.y);
    if(hit) openInlineTextEditor(hit.key);
  });
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerleave", pointerLeave);
  canvas.addEventListener("pointercancel", pointerUp);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("resize", () => { syncCompactToolbarLabels(); showMobileToast("Kéo 1 ngón • Chụm 2 ngón để zoom"); });
}


function setupPageUI(){
  document.documentElement.style.setProperty('--page-accent', currentPage.accent);
  document.title = `Unite Poster ${currentPage.label} · Studio Pro V7`;
  const select = $("pageSwitcher");
  if(select){
    select.innerHTML = Object.values(PAGE_PRESETS).map(page => `<option value="${page.slug}" ${page.slug === currentPageSlug ? "selected" : ""}>${page.label}</option>`).join("");
  }
  const pageStatus = $("pageStatus");
  if(pageStatus){
    pageStatus.textContent = `Trang: ${currentPage.label}`;
    pageStatus.style.borderColor = currentPage.accent;
  }
  const grid = $("channelAdminGrid");
  if(grid){
    grid.innerHTML = "";
    Object.values(PAGE_PRESETS).forEach(page => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `channel-card ${page.slug === currentPageSlug ? "active" : ""}`;
      btn.style.setProperty("--channel-color", page.accent);
      btn.textContent = page.label;
      btn.addEventListener("click", () => navigateToPage(page.slug));
      grid.appendChild(btn);
    });
  }
  const batchGrid = $("batchBackgroundGrid");
  if(batchGrid){
    batchGrid.innerHTML = "";
    Object.values(PAGE_PRESETS).forEach(page => {
      const item = document.createElement("div");
      item.className = "batch-bg-item";
      item.style.setProperty("--channel-color", page.accent);
      item.innerHTML = `<label><span class="batch-bg-preview"></span><span>${page.label}</span><input type="file" accept="image/*" data-page="${page.slug}"></label>`;
      const input = item.querySelector("input");
      const preview = item.querySelector(".batch-bg-preview");
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if(!file) return;
        pendingBackgroundFiles.set(page.slug, file);
        item.classList.add("has-file");
        preview.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
        updateBatchBackgroundStatus();
      });
      batchGrid.appendChild(item);
    });
  }
  if($("adminCurrentChannelName")) $("adminCurrentChannelName").textContent = `Trang ${currentPage.label}`;
  if($("adminCurrentChannelLink")) $("adminCurrentChannelLink").textContent = currentPage.path;
}

function navigateToPage(slug){
  if(!PAGE_PRESETS[slug] || slug === currentPageSlug) return;
  if(location.protocol === "file:"){
    const url = new URL(location.href);
    url.searchParams.set("page", slug);
    location.href = url.toString();
    return;
  }
  location.href = getPageUrl(slug).toString();
}

function getCurrentPageUrl(){
  if(location.protocol === "file:"){
    const url = new URL(location.href);
    url.searchParams.set("page", currentPageSlug);
    return url.toString();
  }
  return getPageUrl(currentPageSlug).toString();
}

function syncPageAdminControls(){
  if(!template.page) return;
  if($("pageTintEnabled")) $("pageTintEnabled").checked = Boolean(template.page.tintEnabled);
  if($("pageTintColor")) $("pageTintColor").value = template.page.tintColor || currentPage.tint;
  if($("pageTintOpacity")) $("pageTintOpacity").value = Number(template.page.tintOpacity ?? currentPage.tintOpacity);
  if($("templateIdInput")) $("templateIdInput").value = currentPage.templateSlug;
}

function showCanvasLoading(visible, text = "Đang tải..."){
  const el = $("canvasLoading");
  if(!el) return;
  el.hidden = !visible;
  if($("canvasLoadingText")) $("canvasLoadingText").textContent = text;
}

async function warmBackend(){
  if(backendWakePromise) return backendWakePromise;
  backendWakePromise = (async () => {
    setBackendStatus("AI: đang khởi động...", "warn");
    try{
      let response;
      try{
        response = await fetchWithTimeout(`${BACKEND_URL}/api/warmup`, { cache:"no-store" }, BACKEND_WARMUP_TIMEOUT_MS);
      }catch(_){
        response = await fetchWithTimeout(`${BACKEND_URL}/health`, { cache:"no-store" }, BACKEND_WARMUP_TIMEOUT_MS);
      }
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      backendReady = true;
      setBackendStatus("AI: sẵn sàng", "good");
      return true;
    }catch(err){
      backendReady = false;
      setBackendStatus("AI: dùng dự phòng", "warn");
      console.warn("Backend warmup failed", err);
      return false;
    }
  })();
  return backendWakePromise;
}

function setBackendStatus(text, state="warn"){
  const el = $("backendStatus");
  if(!el) return;
  el.textContent = text;
  el.className = `pill compact-pill ${state}`;
}

async function fetchWithTimeout(url, options = {}, timeout = BACKEND_TIMEOUT_MS){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try{
    return await fetch(url, { ...options, signal:controller.signal });
  }finally{
    clearTimeout(timer);
  }
}

function registerServiceWorker(){
  if("serviceWorker" in navigator && location.protocol.startsWith("http")){
    const workerUrl = new URL("sw.js", SITE_BASE_URL);
    navigator.serviceWorker.register(workerUrl.href, { scope: SITE_BASE_URL.pathname })
      .catch(err => console.warn("Service worker chưa đăng ký được", err));
  }
}

function openInlineTextEditor(key){
  const field = template.textFields.find(item => item.key === key);
  const box = textRenderBoxes.get(key);
  const editor = $("inlineTextEditor");
  const input = $("inlineTextInput");
  if(!field || !box || !editor || !input) return;
  inlineEditingKey = key;
  selectedTextKey = key;
  inlineOriginalValue = textValues[key] ?? field.defaultValue ?? "";
  input.value = inlineOriginalValue;
  if($("inlineTextLabel")) $("inlineTextLabel").textContent = field.label || "Sửa nội dung";
  editor.hidden = false;
  positionInlineTextEditor(box);
  render();
  requestAnimationFrame(() => {
    input.focus({ preventScroll:false });
    input.select();
  });
}

function positionInlineTextEditor(box){
  const editor = $("inlineTextEditor");
  if(!editor || window.innerWidth <= 900) return;
  const canvasRect = canvas.getBoundingClientRect();
  const shellRect = $("canvasShell").getBoundingClientRect();
  const sx = canvasRect.width / canvas.width;
  const sy = canvasRect.height / canvas.height;
  const width = clamp(box.width * sx, 240, Math.max(240, shellRect.width - 18));
  let left = canvasRect.left - shellRect.left + box.x * sx;
  left = clamp(left, 8, Math.max(8, shellRect.width - width - 8));
  let top = canvasRect.top - shellRect.top + box.y * sy - 118;
  if(top < 8) top = canvasRect.top - shellRect.top + (box.y + box.height) * sy + 8;
  editor.style.left = `${left}px`;
  editor.style.top = `${top}px`;
  editor.style.width = `${width}px`;
}

function onInlineTextInput(e){
  if(!inlineEditingKey) return;
  textValues[inlineEditingKey] = e.target.value;
  const field = template.textFields.find(item => item.key === inlineEditingKey);
  if(activeTab === "admin" && field) field.defaultValue = e.target.value;
  syncLeaderTextInput(inlineEditingKey, e.target.value);
  savePageDraft();
  render();
}

function closeInlineTextEditor(apply = true){
  if(!inlineEditingKey) return;
  const key = inlineEditingKey;
  if(!apply){
    textValues[key] = inlineOriginalValue;
    const field = template.textFields.find(item => item.key === key);
    if(activeTab === "admin" && field) field.defaultValue = inlineOriginalValue;
    syncLeaderTextInput(key, inlineOriginalValue);
  }
  inlineEditingKey = null;
  const editor = $("inlineTextEditor");
  if(editor) editor.hidden = true;
  savePageDraft();
  render();
}

function nudgeInlineFont(delta){
  if(!inlineEditingKey) return;
  const field = template.textFields.find(item => item.key === inlineEditingKey);
  if(!field) return;
  field.fontSize = clamp(Number(field.fontSize || 36) + delta, 12, 180);
  updateAdminCardValues(field);
  render();
}

function syncLeaderTextInput(key, value){
  const input = document.querySelector(`#textForm input[data-key="${CSS.escape(key)}"]`);
  if(input && input.value !== value) input.value = value;
}

function savePageDraft(){
  try{
    localStorage.setItem(`unite_poster_values_${currentPageSlug}`, JSON.stringify(textValues));
  }catch(_){ }
}

function loadPageDraft(){
  try{
    const raw = localStorage.getItem(`unite_poster_values_${currentPageSlug}`);
    return raw ? JSON.parse(raw) : null;
  }catch(_){ return null; }
}

function updateBatchBackgroundStatus(){
  const el = $("batchBackgroundStatus");
  if(!el) return;
  const count = pendingBackgroundFiles.size;
  el.textContent = count ? `Đã chọn ${count}/5 nền. Bấm Lưu để cập nhật cùng lúc.` : "Có thể chọn một hoặc đủ 5 nền rồi lưu một lần.";
}

async function saveBatchBackgrounds(){
  if(!pendingBackgroundFiles.size){
    alert("Chọn ít nhất 1 ảnh nền trước nha.");
    return;
  }
  const btn = $("btnBatchSaveBackgrounds");
  const old = btn.textContent;
  btn.disabled = true;
  try{
    let done = 0;
    const total = pendingBackgroundFiles.size;
    for(const [pageSlug, file] of pendingBackgroundFiles.entries()){
      const page = PAGE_PRESETS[pageSlug];
      btn.textContent = `Đang lưu ${++done}/${total}: ${page.label}`;
      let pageTemplate = null;
      try{ pageTemplate = await loadActiveTemplate(page.templateSlug); }catch(_){ }
      if(!pageTemplate) pageTemplate = structuredClone(DEFAULT_TEMPLATE);
      normalizeTemplate(pageTemplate);
      pageTemplate.templateId = page.templateSlug;
      pageTemplate.templateName = `Unite Poster - ${page.label}`;
      pageTemplate.page = {
        ...(pageTemplate.page || {}),
        slug:page.slug,
        label:page.label,
        path:page.path,
        accent:page.accent,
        tintEnabled:false,
        tintColor:page.tint,
        tintOpacity:0
      };
      await saveTemplateToSupabase({
        template:pageTemplate,
        status:"active",
        backgroundFile:file,
        foregroundFile:null,
        fontFiles:[]
      });
    }
    pendingBackgroundFiles.clear();
    updateBatchBackgroundStatus();
    alert("Đã cập nhật các nền đã chọn thành Active cho từng link.");
    await reloadActiveCloudTemplate();
  }catch(err){
    console.error(err);
    alert(`Lưu nhiều nền lỗi: ${err.message || "Không xác định"}`);
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
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
      backgroundFile: bgSourceFile,
      foregroundFile: fgSourceFile,
      fontFiles: selectedFontFiles
    });
    template = structuredClone(saved.template_json);
    normalizeTemplate(template);
    applyPageDefaults(false);
    await applyCurrentTemplate();
    await refreshCloudTemplates();
    selectedCloudSlug = saved.slug;
    bgSourceFile = null;
    fgSourceFile = null;
    selectedFontFiles = [];
    if($("fontFilesInfo")) $("fontFilesInfo").textContent = "Chưa chọn font nào.";
    setPublicTemplateInfo(`Cloud lưu thành công: <b>${escapeHtml(saved.name)}</b> (${escapeHtml(saved.status)})`);
    alert(`Đã lưu template cloud thành công với status = ${saved.status}.`);
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
    const allTemplates = requireAdmin ? await listAdminTemplates() : [];
    cloudTemplates = allTemplates.filter(item => item.slug === currentPage.templateSlug);
    selectedCloudSlug = cloudTemplates[0]?.slug || null;
    renderCloudTemplateList();
  } catch (err) {
    cloudTemplates = [];
    listEl.innerHTML = `<div class="cloud-box mini-box">Không tải được danh sách template admin. ${escapeHtml(err.message || '')}</div>`;
  }
}

function renderCloudTemplateList(){
  const listEl = $("cloudTemplatesList");
  if(!cloudTemplates.length){
    listEl.innerHTML = `<div class="cloud-box mini-box">Trang ${escapeHtml(currentPage.label)} chưa có template cloud hoặc admin chưa đăng nhập.</div>`;
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
    const cloudTemplate = await loadActiveTemplate(currentPage.templateSlug);
    if (!cloudTemplate) {
      alert('Cloud chưa có template active.');
      return;
    }
    template = structuredClone(cloudTemplate);
    normalizeTemplate(template);
    applyPageDefaults(false);
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
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === safeTab));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.toggle("active", p.id === `${safeTab}Tab`));
  activeTab = safeTab;
  const hint = $("canvasHint");
  if(hint){
    hint.textContent = activeTab === "admin"
      ? "Admin: kéo chữ, kéo vùng người hoặc kéo nút resize ở góc phải dưới."
      : "Leader: kéo ảnh người, chụm 2 ngón để zoom trên điện thoại.";
  }
  syncModeSwitchButton();
  syncLeaderGuideButton();
  syncCompactToolbarLabels();
  snapState.active = false;
  render();
}

function syncTemplateMetaInputs(){
  $("templateIdInput").value = currentPage.templateSlug;
  $("templateNameInput").value = template.templateName || `Unite Poster - ${currentPage.label}`;
}

function syncTemplateMetaFromInputs(){
  template.templateId = currentPage.templateSlug;
  template.templateName = $("templateNameInput").value.trim() || template.templateName || `Unite Poster - ${currentPage.label}`;
  template.page ||= {};
  template.page.slug = currentPage.slug;
  template.page.label = currentPage.label;
  template.page.path = currentPage.path;
  template.page.accent = currentPage.accent;
}

function resetDragAndSnap(){
  const changed = draggingPerson || draggingText || draggingSlot || resizingSlot || snapState.active || pinchState || activePointers.size;
  draggingPerson = false;
  draggingText = false;
  draggingSlot = false;
  resizingSlot = false;
  pinchState = null;
  activePointers.clear();
  if(snapState.active){ snapState.active = false; }
  if(changed) render();
}

async function loadTemplateImages(){
  const [background, foreground] = await Promise.all([
    template.layers.background ? loadCachedDrawable(template.layers.background) : Promise.resolve(null),
    template.layers.foreground ? loadCachedDrawable(template.layers.foreground) : Promise.resolve(null)
  ]);
  bgImg = background;
  fgImg = foreground;
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
    input.addEventListener("input", () => { textValues[field.key] = input.value; if(activeTab === "admin") field.defaultValue = input.value; savePageDraft(); render(); });
    label.appendChild(input);
    form.appendChild(label);
  });

  syncSlotInputs();
  syncAdminTextCards();
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
      <strong>${escapeHtml(field.label || field.key)}</strong>
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
  render();
}

function updateSlotFromInputs(){
  template.personSlot.x = Number($("slotX").value || 0);
  template.personSlot.y = Number($("slotY").value || 0);
  template.personSlot.width = Number($("slotW").value || 0);
  template.personSlot.height = Number($("slotH").value || 0);
  render();
}

function render(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if(bgImg) drawCover(bgImg, 0, 0, canvas.width, canvas.height);
  else fillPlaceholder("Chưa có background");
  drawPageTint();

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

  if(fgImg) drawCover(fgImg, 0, 0, canvas.width, canvas.height);
  drawDynamicText();
  if(inlineEditingKey && !exportCleanMode) drawInlineTextGuide();
  if(activeTab === "admin" && showTextGuides) drawTextGuides();
  if(activeTab === "admin" && showSlot) drawPersonSlotGuide();
  if(personImg && activeTab === "leader" && leaderGuidesVisible && !exportCleanMode) drawPersonTransformGuide();
  if(snapState.active && !exportCleanMode) drawCenterSnapFeedback();
}

function drawCover(img, x, y, w, h){
  ctx.drawImage(img, x, y, w, h);
}

function drawPageTint(){
  const page = template.page || {};
  const opacity = Number(page.tintOpacity || 0);
  if(!page.tintEnabled || opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(opacity, 0, 0.75);
  ctx.globalCompositeOperation = "color";
  ctx.fillStyle = page.tintColor || currentPage.tint;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawInlineTextGuide(){
  const box = textRenderBoxes.get(inlineEditingKey);
  if(!box) return;
  ctx.save();
  ctx.setLineDash([10, 7]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = currentPage.accent;
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
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
  template.textFields.forEach(field => {
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
  const url = c.toDataURL("image/png", .96);
  return srcToImage(url);
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

async function removeBackgroundSmart(){
  if(!personSourceFile){ alert("Upload ảnh nhân sự trước nha."); return; }
  const cacheKey = `${personSourceFile.name}:${personSourceFile.size}:${personSourceFile.lastModified}`;
  const cached = processedImageCache.get(cacheKey);
  if(cached){
    personImg = cached.image;
    person.bounds = cached.bounds;
    person.x = cached.transform.x;
    person.y = cached.transform.y;
    person.scale = cached.transform.scale;
    syncPersonControls();
    invalidatePersonCache();
    render();
    showMobileToast("Đã dùng kết quả tách nền đã lưu tạm");
    return;
  }

  const btn = $("btnRemoveBg");
  const quickBtn = $("btnQuickRemoveBg");
  const old = btn?.textContent || "Xóa nền AI";
  if(btn){ btn.textContent = "Đang tách nền..."; btn.disabled = true; }
  if(quickBtn) quickBtn.disabled = true;
  updateRemoveBgProgress({ visible:true, percent:5, title:"Chuẩn bị ảnh", hint:"Đang nén ảnh trước khi gửi AI để giảm thời gian upload và xử lý.", step:"prepare", mode:"ai" });

  try{
    const ready = await Promise.race([
      backendWakePromise || warmBackend(),
      new Promise(resolve => setTimeout(() => resolve(false), 12000))
    ]);
    if(ready) setBackendStatus("AI: đang xử lý", "warn");
    const result = await removeBackgroundViaBackend(personSourceFile);
    processedImageCache.set(cacheKey, result);
    personImg = result.image;
    person.bounds = result.bounds;
    person.x = result.transform.x;
    person.y = result.transform.y;
    person.scale = result.transform.scale;
    syncPersonControls();
    invalidatePersonCache();
    updateRemoveBgProgress({ visible:true, percent:100, title:"AI hoàn tất", hint:"Đã tách nền và tự căn avatar trong một lần xử lý.", step:"done", mode:"ai" });
    setRemoveBgStatus("Đã tách nền bằng backend và tự căn avatar.");
    setBackendStatus("AI: sẵn sàng", "good");
    showMobileToast("Tách nền xong • Đã tự căn avatar");
    render();
  }catch(err){
    console.warn("Backend remove background failed, falling back to browser", err);
    setBackendStatus("AI: fallback trên máy", "warn");
    setRemoveBgStatus(`Backend chưa xử lý được (${err.message || "lỗi"}). Đang chuyển sang AI/fallback trên máy...`);
    await removeBackgroundInBrowser();
  }finally{
    if(btn){ btn.textContent = old; btn.disabled = false; }
    if(quickBtn) quickBtn.disabled = false;
  }
}

async function removeBackgroundViaBackend(file){
  updateRemoveBgProgress({ visible:true, percent:16, title:"Gửi ảnh đến AI", hint:"Ảnh đã được tối ưu kích thước trước khi gửi.", step:"download", mode:"ai" });
  const optimizedFile = await compressFileForRemoval(file);
  const form = new FormData();
  form.append("file", optimizedFile, optimizedFile.name || "person.jpg");
  form.append("slot_x", String(template.personSlot.x));
  form.append("slot_y", String(template.personSlot.y));
  form.append("slot_width", String(template.personSlot.width));
  form.append("slot_height", String(template.personSlot.height));
  form.append("anchor_y", "bottom");
  form.append("fit_mode", "head_to_belly");
  form.append("save_removed_bg", "false");
  form.append("return_base64", "true");
  form.append("folder", `processed/autofit/${currentPageSlug}`);

  updateRemoveBgProgress({ visible:true, percent:35, title:"AI đang nhận diện người", hint:"Backend đang tách nền và tính vị trí đầu–thân phù hợp với poster.", step:"segment", mode:"ai" });
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/auto-fit-person`, { method:"POST", body:form }, BACKEND_TIMEOUT_MS);
  const data = await response.json().catch(() => ({}));
  if(!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);

  let source = null;
  if(data.base64) source = `data:image/png;base64,${data.base64}`;
  if(!source) source = data.storage?.public_url || data.storage?.publicUrl;
  if(!source) throw new Error("Backend chưa trả ảnh PNG đã tách nền");

  updateRemoveBgProgress({ visible:true, percent:84, title:"Đang đưa ảnh vào poster", hint:"Đang tải ảnh trong suốt và áp dụng vị trí tự căn.", step:"segment", mode:"ai" });
  const image = await loadCachedDrawable(source, { bypassCache:source.startsWith("data:") });
  const bounds = getAlphaBounds(image);
  const transform = data.transform || {};
  return {
    image,
    bounds,
    transform:{
      x:Number.isFinite(Number(transform.x)) ? Number(transform.x) : template.personSlot.x,
      y:Number.isFinite(Number(transform.y)) ? Number(transform.y) : template.personSlot.y,
      scale:Number.isFinite(Number(transform.scale)) ? Number(transform.scale) : 1
    }
  };
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
    const mobileFile = await compressFileForRemoval(personSourceFile);
    updateRemoveBgProgress({ visible:true, percent:18, title:"Tải mô hình AI", hint:"Lần đầu có thể mất 10–30 giây tùy mạng. Những lần sau sẽ nhanh hơn.", step:"download", mode:"ai" });
    setRemoveBgStatus("Đang tải AI xóa nền trong trình duyệt...");
    const mod = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm");
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
    tapCandidate = null;
    startPinchGesture();
    showMobileToast("Đang zoom avatar bằng 2 ngón");
    return;
  }

  const textHit = hitTextBox(p.x, p.y);
  if(inlineEditingKey && (!textHit || textHit.key !== inlineEditingKey)) closeInlineTextEditor(true);
  if(textHit){
    selectedTextKey = textHit.key;
    tapCandidate = { pointerId:e.pointerId, key:textHit.key, x:p.x, y:p.y, startedAt:performance.now(), moved:false };
    if(activeTab === "admin"){
      const field = template.textFields.find(f => f.key === textHit.key);
      if(field?.draggable !== false){
        draggingText = true;
        dragStart = { x:p.x, y:p.y, fieldX:field.x, fieldY:field.y };
      }
      syncAdminTextCards();
    }
    render();
    return;
  }

  if(activeTab === "admin"){
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

  if(tapCandidate && tapCandidate.pointerId === e.pointerId){
    if(Math.hypot(p.x - tapCandidate.x, p.y - tapCandidate.y) > 9) tapCandidate.moved = true;
  }

  if(pinchState && activePointers.size >= 2){
    updatePinchGesture();
    return;
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
    render();
    return;
  }

  if(draggingSlot){
    template.personSlot.x = Math.round(dragStart.slotX + (p.x - dragStart.x));
    template.personSlot.y = Math.round(dragStart.slotY + (p.y - dragStart.y));
    syncSlotInputs();
    render();
    return;
  }

  if(resizingSlot){
    template.personSlot.width = Math.max(120, Math.round(dragStart.slotW + (p.x - dragStart.x)));
    template.personSlot.height = Math.max(120, Math.round(dragStart.slotH + (p.y - dragStart.y)));
    syncSlotInputs();
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
  const candidate = tapCandidate && e?.pointerId === tapCandidate.pointerId ? tapCandidate : null;
  if(e?.pointerId !== undefined){
    activePointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch(err) {}
  }
  if(pinchState && activePointers.size < 2){
    pinchState = null;
    syncPersonControls();
  }
  if(activePointers.size === 0){
    const wasDragging = draggingPerson || draggingText || draggingSlot || resizingSlot;
    draggingPerson = false;
    draggingText = false;
    draggingSlot = false;
    resizingSlot = false;
    if(snapState.active) snapState.active = false;
    if(wasDragging) render();
  }
  if(candidate && !candidate.moved && performance.now() - candidate.startedAt < 750){
    requestAnimationFrame(() => openInlineTextEditor(candidate.key));
  }
  if(candidate) tapCandidate = null;
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
  if(activeTab === "admin"){
    const textHit = hitTextBox(p.x, p.y);
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

function hitTextBox(x, y){
  const fields = [...template.textFields].reverse();
  for(const f of fields){
    const box = textRenderBoxes.get(f.key);
    if(!box) continue;
    if(x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height){ return box; }
  }
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
  const size = card.querySelector('input[data-field="fontSize"]');
  if(x) x.value = field.x;
  if(y) y.value = field.y;
  if(size) size.value = field.fontSize;
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
  render();
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      showSlot = originalShowSlot;
      showTextGuides = originalShowTextGuides;
      snapState.active = originalSnap;
      exportCleanMode = originalExportCleanMode;
      render();
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
  const url = await fileToDataURL(file);
  return srcToImage(url);
}

async function loadCachedDrawable(src, { bypassCache = false } = {}){
  if(!src) return null;
  if(src.startsWith("data:") || src.startsWith("blob:")) return srcToImage(src);
  const absolute = new URL(src, location.href).href;
  if(drawableCache.has(absolute)) return drawableCache.get(absolute);
  const promise = (async () => {
    try{
      let response = null;
      if(!bypassCache && "caches" in window){
        const cache = await caches.open("unite-poster-assets-v7");
        response = await cache.match(absolute);
        if(!response){
          response = await fetch(absolute, { mode:"cors", cache:"force-cache" });
          if(response.ok) await cache.put(absolute, response.clone());
        }
      }else{
        response = await fetch(absolute, { mode:"cors", cache:"force-cache" });
      }
      if(!response?.ok) throw new Error(`Không tải được asset ${response?.status || ""}`);
      const blob = await response.blob();
      if("createImageBitmap" in window){
        return await createImageBitmap(blob, { premultiplyAlpha:"premultiply", colorSpaceConversion:"default" });
      }
      return await srcToImage(URL.createObjectURL(blob));
    }catch(err){
      console.warn("Cache image fallback", absolute, err);
      return await srcToImage(absolute);
    }
  })();
  drawableCache.set(absolute, promise);
  try{
    const drawable = await promise;
    drawableCache.set(absolute, drawable);
    return drawable;
  }catch(err){
    drawableCache.delete(absolute);
    throw err;
  }
}

function srcToImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

function waitImage(img){ return img.complete ? Promise.resolve() : new Promise(res => img.onload = res); }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function clampByte(n){ return Math.max(0, Math.min(255, Math.round(n))); }
function toHex(color){ return /^#/.test(color) ? color : '#ffffff'; }
function isSelected(current, value){ return String(current || "") === String(value) ? "selected" : ""; }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }
function escapeAttr(str){ return escapeHtml(str); }
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
