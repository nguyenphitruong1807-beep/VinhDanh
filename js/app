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
const $ = (id) => document.getElementById(id);
const canvas = $("posterCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let template = structuredClone(DEFAULT_TEMPLATE);
let bgImg = null;
let fgImg = null;
let personImg = null;
let personSourceFile = null;
let bgSourceFile = null;
let fgSourceFile = null;
let selectedFontFiles = [];
let showSlot = true;
let showTextGuides = true;
let activeTab = "leader";
let cloudTemplates = [];
let selectedCloudSlug = null;
let currentProfile = null;

let draggingPerson = false;
let draggingText = false;
let draggingSlot = false;
let resizingSlot = false;
let selectedTextKey = "awardTitle";
let dragStart = { x:0, y:0, px:0, py:0, fieldX:0, fieldY:0, slotX:0, slotY:0, slotW:0, slotH:0 };
let textRenderBoxes = new Map();
let snapState = { active:false, targetX:0, label:"Đã canh giữa" };

let person = {
  x: 0,
  y: 0,
  scale: 1,
  brightness: 100,
  contrast: 100,
  bounds: null
};

let textValues = {};

async function init(){
  setupCanvas();
  bindEvents();
  await loadFonts();

  const saved = localStorage.getItem("unite_poster_template");
  if(saved){
    try {
      template = JSON.parse(saved);
      normalizeTemplate(template);
    } catch(e) {}
  }

  try {
    const cloudTemplate = await loadActiveTemplate();
    if (cloudTemplate) {
      template = structuredClone(cloudTemplate);
      normalizeTemplate(template);
      setPublicTemplateInfo(`Đã nạp template active từ cloud: <b>${escapeHtml(template.templateName || template.templateId || 'Template')}</b>`);
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
  await refreshAuthStatus();
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
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      $(`${btn.dataset.tab}Tab`).classList.add("active");
      activeTab = btn.dataset.tab;
      $("canvasHint").textContent = activeTab === "admin"
        ? "Admin: kéo chữ, kéo vùng người hoặc kéo nút resize ở góc phải dưới."
        : "Leader: kéo trực tiếp ảnh người để chỉnh vị trí.";
      snapState.active = false;
      render();
    });
  });

  $("personUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    personSourceFile = file;
    personImg = await fileToImage(file);
    await waitImage(personImg);
    person.bounds = getAlphaBounds(personImg);
    autoFitPerson();
    render();
  });

  $("bgUpload").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    bgSourceFile = file;
    const dataUrl = await fileToDataURL(file);
    template.layers.background = dataUrl;
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
      localStorage.setItem("unite_poster_template", JSON.stringify(template));
      alert("Đã lưu template trên trình duyệt này.");
    } catch(e) {
      alert("Template có thể quá nặng do ảnh base64. Nên để ảnh trong thư mục assets hoặc lưu qua Supabase.");
    }
  });

  $("btnAutoFit").addEventListener("click", () => { autoFitPerson(); render(); });
  $("btnExport").addEventListener("click", exportPNG);
  $("btnRemoveBg").addEventListener("click", removeBackgroundInBrowser);

  $("scaleRange").addEventListener("input", e => { person.scale = Number(e.target.value); render(); });
  $("brightnessRange").addEventListener("input", e => { person.brightness = Number(e.target.value); render(); });
  $("contrastRange").addEventListener("input", e => { person.contrast = Number(e.target.value); render(); });

  document.querySelectorAll("[data-nudge]").forEach(btn => {
    btn.addEventListener("click", () => nudge(btn.dataset.nudge));
  });

  $("showSlot").addEventListener("change", e => { showSlot = e.target.checked; render(); });
  $("showTextGuides").addEventListener("change", e => { showTextGuides = e.target.checked; render(); });
  ["slotX","slotY","slotW","slotH"].forEach(id => $(id).addEventListener("input", updateSlotFromInputs));

  $("templateIdInput").addEventListener("input", e => { template.templateId = e.target.value.trim(); });
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

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerleave", resetDragAndSnap);
  window.addEventListener("pointerup", resetDragAndSnap);
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
    await applyCurrentTemplate();
    await refreshCloudTemplates();
    selectedCloudSlug = saved.slug;
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
  el.textContent = text;
  el.className = `pill ${state}`;
}

function setPublicTemplateInfo(html){
  $("publicTemplateInfo").innerHTML = html;
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
  const changed = draggingPerson || draggingText || draggingSlot || resizingSlot || snapState.active;
  draggingPerson = false;
  draggingText = false;
  draggingSlot = false;
  resizingSlot = false;
  if(snapState.active){ snapState.active = false; }
  if(changed) render();
}

async function loadTemplateImages(){
  bgImg = template.layers.background ? await srcToImage(template.layers.background) : null;
  fgImg = template.layers.foreground ? await srcToImage(template.layers.foreground) : null;
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
    input.value = textValues[field.key];
    input.addEventListener("input", () => { textValues[field.key] = input.value; render(); });
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

  if(personImg){
    ctx.save();
    ctx.filter = `brightness(${person.brightness}%) contrast(${person.contrast}%)`;
    ctx.drawImage(personImg, person.x, person.y, personImg.width * person.scale, personImg.height * person.scale);
    ctx.restore();
  }

  if(fgImg) drawCover(fgImg, 0, 0, canvas.width, canvas.height);
  drawDynamicText();
  if(activeTab === "admin" && showTextGuides) drawTextGuides();
  if(showSlot) drawPersonSlotGuide();
  if(snapState.active) drawCenterSnapFeedback();
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

async function removeBackgroundInBrowser(){
  if(!personSourceFile){ alert("Upload ảnh nhân sự trước nha."); return; }
  const btn = $("btnRemoveBg");
  const old = btn.textContent;
  btn.textContent = "Đang xóa nền...";
  btn.disabled = true;
  try{
    const mod = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm");
    const blob = await mod.removeBackground(personSourceFile);
    const url = URL.createObjectURL(blob);
    personImg = await srcToImage(url);
    person.bounds = getAlphaBounds(personImg);
    autoFitPerson();
    render();
  }catch(err){
    console.error(err);
    alert("Chưa xóa nền được trên trình duyệt này. Có thể do mạng/CDN hoặc ảnh quá nặng.");
  }finally{
    btn.textContent = old;
    btn.disabled = false;
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
  const p = canvasPoint(e);
  if(activeTab === "admin"){
    const hit = hitTextBox(p.x, p.y);
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
  const w = personImg.width * person.scale;
  const h = personImg.height * person.scale;
  if(p.x >= person.x && p.x <= person.x+w && p.y >= person.y && p.y <= person.y+h){
    draggingPerson = true;
    dragStart = { x:p.x, y:p.y, px:person.x, py:person.y };
  }
}

function pointerMove(e){
  const p = canvasPoint(e);
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
  if(personImg){
    const w = personImg.width * person.scale;
    const h = personImg.height * person.scale;
    if(p.x >= person.x && p.x <= person.x+w && p.y >= person.y && p.y <= person.y+h){
      canvas.style.cursor = "grab";
      return;
    }
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
  if(x) x.value = field.x;
  if(y) y.value = field.y;
}

function canvasPoint(e){
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * canvas.width / rect.width,
    y: (e.clientY - rect.top) * canvas.height / rect.height
  };
}

function exportPNG(){
  const originalShowSlot = showSlot;
  const originalShowTextGuides = showTextGuides;
  const originalSnap = snapState.active;
  showSlot = false;
  showTextGuides = false;
  snapState.active = false;
  render();
  canvas.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `poster-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    showSlot = originalShowSlot;
    showTextGuides = originalShowTextGuides;
    snapState.active = originalSnap;
    render();
  }, "image/png", 1);
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

function srcToImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

function waitImage(img){ return img.complete ? Promise.resolve() : new Promise(res => img.onload = res); }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
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
