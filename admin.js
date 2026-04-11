// ============================================================
//  HIMIKO — Admin Panel Logikasi (admin.js)
//  Fayllar IndexedDB ga saqlanadi
// ============================================================

var uploadedVideoBlob   = null;   // File object
var uploadedVideoName   = "";
var editingTaskId       = null;

window.addEventListener("DOMContentLoaded", () => {
  const ADMIN_PASS = "admin123";
  if (!HimikoData.isAdmin()) {
    const entered = prompt("Admin paroli:");
    if (entered !== ADMIN_PASS) {
      alert("Notogri parol!");
      window.location.href = "index.html";
      return;
    }
    HimikoData.setAdmin(true);
  }
  loadTasks();
  loadUsers();
});

function adminLogout() {
  HimikoData.setAdmin(false);
  window.location.href = "index.html";
}

function showTab(name, btn) {
  document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  btn.classList.add("active");
  if (name === "users") loadUsers();
}

// ── VIDEO YUKLASH ──
function handleVideoUpload(input) {
  const file = input.files[0];
  if (!file) return;

  uploadedVideoBlob = file;
  uploadedVideoName = file.name;

  const url = URL.createObjectURL(file);
  document.getElementById("videoFileName").textContent = file.name;
  document.getElementById("videoPreview").src = url;
  document.getElementById("videoPreviewWrap").style.display = "block";
  document.getElementById("f_video").value = "";
}

function removeVideo() {
  uploadedVideoBlob = null;
  uploadedVideoName = "";
  const inp = document.getElementById("f_video_file");
  if (inp) inp.value = "";
  const fn = document.getElementById("videoFileName");
  if (fn) fn.textContent = "Video faylni tanlang (mp4, webm)";
  const wrap = document.getElementById("videoPreviewWrap");
  if (wrap) wrap.style.display = "none";
  const prev = document.getElementById("videoPreview");
  if (prev) prev.src = "";
  const fv = document.getElementById("f_video");
  if (fv) fv.value = "";
}

// ── RESURS QATOR ──
function addResourceInput(existing) {
  const container = document.getElementById("resourceInputs");
  const row       = document.createElement("div");
  row.className   = "resource-row";

  const n   = existing ? escHtml(existing.name) : "";
  const t   = existing ? existing.type : "file";
  const url = (existing && !existing.fileKey) ? escHtml(existing.url || "") : "";

  row.innerHTML = `
    <div class="res-row-inner">
      <div class="res-row-top">
        <input type="text" placeholder="Fayl nomi" value="${n}" class="res-name-inp" />
        <select class="res-type-inp">
          <option value="file"  ${t==="file"  ?"selected":""}>Fayl</option>
          <option value="txt"   ${t==="txt"   ?"selected":""}>TXT</option>
          <option value="image" ${t==="image" ?"selected":""}>Rasm</option>
          <option value="audio" ${t==="audio" ?"selected":""}>Audio</option>
          <option value="video" ${t==="video" ?"selected":""}>Video</option>
        </select>
        <button class="btn-del" onclick="this.closest('.resource-row').remove()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="res-row-bottom">
        <div class="file-upload-box small" onclick="this.nextElementSibling.click()">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span class="res-file-label">${existing && existing.fileKey ? escHtml(existing.name)+" (yuklangan)" : "Faylni tanlang"}</span>
        </div>
        <input type="file" class="res-file-inp" style="display:none" onchange="handleResFileUpload(this)" />
        <input type="text" class="res-url-inp" placeholder="yoki URL" value="${url}" />
        <input type="hidden" class="res-filekey-inp" value="${existing && existing.fileKey ? escHtml(existing.fileKey) : ""}" />
      </div>
    </div>`;
  container.appendChild(row);
}

function handleResFileUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const row      = input.closest(".resource-row");
  const label    = row.querySelector(".res-file-label");
  const nameInp  = row.querySelector(".res-name-inp");
  const urlInp   = row.querySelector(".res-url-inp");
  const keyInp   = row.querySelector(".res-filekey-inp");

  // Faylni File object sifatida saqlash (blob reference)
  input._fileObj = file;
  label.textContent = file.name + " (yuklashga tayyor)";
  urlInp.value = "";
  if (!nameInp.value) nameInp.value = file.name;

  // Fayl turini avtomatik aniqlash
  const typeSelect = row.querySelector(".res-type-inp");
  const mime = file.type;
  if (mime.startsWith("image/"))      typeSelect.value = "image";
  else if (mime.startsWith("audio/")) typeSelect.value = "audio";
  else if (mime.startsWith("video/")) typeSelect.value = "video";
  else if (mime === "text/plain")     typeSelect.value = "txt";
  else                                typeSelect.value = "file";

  // Temporary key
  keyInp.value = "pending_" + Date.now();
}

// ── TASKLARNI KO'RSATISH ──
function loadTasks() {
  const tasks     = HimikoData.getTasks();
  const container = document.getElementById("taskList");
  if (tasks.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);padding:20px;">Hali task yoq.</p>';
    return;
  }
  container.innerHTML = tasks.map(t => {
    const resCount = (t.resources || []).length;
    return `<div class="task-card">
      <div class="task-card-left">
        <div class="task-card-title">${escHtml(t.title)}</div>
        <div class="task-card-q">${escHtml(t.question.substring(0,120))}${t.question.length>120?"...":""}</div>
        <div class="task-card-meta">
          <span class="meta-chip"><i class="fa-solid fa-clock"></i> ${t.timerHours}h</span>
          <span class="meta-chip"><i class="fa-solid fa-lightbulb"></i> ${t.maxHints} yordam</span>
          ${(t.videoKey||t.videoUrl) ? '<span class="meta-chip"><i class="fa-solid fa-video"></i> Video bor</span>' : ""}
          ${resCount ? `<span class="meta-chip"><i class="fa-solid fa-paperclip"></i> ${resCount} resurs</span>` : ""}
        </div>
      </div>
      <div class="task-card-actions">
        <button class="btn-edit"   onclick="openTaskModal(${t.id})"><i class="fa-solid fa-pen"></i> Tahrirlash</button>
        <button class="btn-danger" onclick="deleteTask(${t.id})"><i class="fa-solid fa-trash"></i> Ochirish</button>
      </div>
    </div>`;
  }).join("");
}

// ── FOYDALANUVCHILAR ──
function loadUsers() {
  const users = HimikoData.getUsers();
  const tasks = HimikoData.getTasks();
  const tbody = document.getElementById("usersTableBody");
  const keys  = Object.keys(users);
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">Foydalanuvchilar yoq</td></tr>';
    return;
  }
  tbody.innerHTML = keys.map(uname => {
    const u     = users[uname];
    const task  = tasks.find(t => t.id === u.currentTaskId);
    const total = Object.values(u.hintsUsed || {}).reduce((a,b) => a+b, 0);
    const ago   = u.lastSeen ? timeAgo(u.lastSeen) : "-";
    return `<tr>
      <td><strong>${escHtml(uname)}</strong></td>
      <td>${task ? escHtml(task.title) : ((u.completedTasks||[]).length ? "Tugatdi" : "-")}</td>
      <td>${(u.completedTasks||[]).length} ta</td>
      <td>${total} marta</td>
      <td>${ago}</td>
      <td><span class="badge ${u.blocked?"badge-blocked":"badge-active"}">${u.blocked?"Bloklangan":"Faol"}</span></td>
      <td>
        <button class="btn-${u.blocked?"edit":"danger"}" onclick="toggleBlock('${uname}')">
          <i class="fa-solid fa-${u.blocked?"lock-open":"ban"}"></i>
          ${u.blocked?"Blokni olib tashlash":"Bloklash"}
        </button>
      </td>
    </tr>`;
  }).join("");
}

function toggleBlock(username) {
  const u = HimikoData.getUser(username);
  if (!u) return;
  HimikoData.blockUser(username, !u.blocked);
  loadUsers();
}

// ── MODAL OCHISH ──
function openTaskModal(taskId) {
  editingTaskId = taskId || null;
  document.getElementById("modalTitle").textContent = taskId ? "Taskni tahrirlash" : "Yangi Task";
  document.getElementById("resourceInputs").innerHTML = "";
  removeVideo();

  if (taskId) {
    const t = HimikoData.getTaskById(taskId);
    if (!t) return;
    document.getElementById("f_title").value    = t.title;
    document.getElementById("f_question").value = t.question;
    document.getElementById("f_answer").value   = t.answer;
    document.getElementById("f_timer").value    = t.timerHours;
    document.getElementById("f_maxHints").value = t.maxHints;
    document.getElementById("f_hints").value    = (t.hints || []).join("\n");

    if (t.videoKey) {
      document.getElementById("videoFileName").textContent = "Yuklangan video mavjud";
    } else if (t.videoUrl) {
      document.getElementById("f_video").value = t.videoUrl;
    }

    (t.resources || []).forEach(r => addResourceInput(r));
  } else {
    ["f_title","f_question","f_answer","f_hints","f_video"].forEach(id => {
      document.getElementById(id).value = "";
    });
    document.getElementById("f_timer").value    = "172";
    document.getElementById("f_maxHints").value = "3";
  }

  document.getElementById("taskModal").style.display = "flex";
}

function closeTaskModal() {
  document.getElementById("taskModal").style.display = "none";
  editingTaskId = null;
}

// ── SAQLASH (async) ──
async function saveTask() {
  const title    = document.getElementById("f_title").value.trim();
  const question = document.getElementById("f_question").value.trim();
  const answer   = document.getElementById("f_answer").value.trim();
  const timer    = parseInt(document.getElementById("f_timer").value) || 172;
  const maxHints = parseInt(document.getElementById("f_maxHints").value) || 3;
  const hintsRaw = document.getElementById("f_hints").value.trim();
  const videoUrlText = document.getElementById("f_video").value.trim();

  if (!title || !question || !answer) {
    alert("Sarlavha, savol va javob majburiy!");
    return;
  }

  // Saqlash tugmasini disable qilish
  const saveBtn = document.querySelector(".modal-footer .btn-primary");
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saqlanmoqda...';

  try {
    const hints = hintsRaw ? hintsRaw.split("\n").map(h => h.trim()).filter(Boolean) : [];

    // ── VIDEO ──
    let videoKey = (editingTaskId ? (HimikoData.getTaskById(editingTaskId)||{}).videoKey : "") || "";
    let videoUrl = videoUrlText;

    if (uploadedVideoBlob) {
      videoKey = "video_task_" + (editingTaskId || Date.now());
      await HimikoDB.set(videoKey, uploadedVideoBlob);
      videoUrl = "";
    }

    // ── RESURSLAR ──
    const resources = [];
    const rows = document.querySelectorAll(".resource-row");
    for (const row of rows) {
      const n       = row.querySelector(".res-name-inp").value.trim();
      const type    = row.querySelector(".res-type-inp").value;
      const urlVal  = row.querySelector(".res-url-inp").value.trim();
      const keyInp  = row.querySelector(".res-filekey-inp");
      const fileInp = row.querySelector(".res-file-inp");
      if (!n) continue;

      let fileKey = keyInp.value || "";
      let resUrl  = urlVal;

      // Yangi fayl yuklangan bo'lsa
      if (fileInp && fileInp._fileObj) {
        fileKey = "res_" + Date.now() + "_" + Math.random().toString(36).substr(2,6);
        await HimikoDB.set(fileKey, fileInp._fileObj);
        resUrl = "";
      }

      resources.push({ name: n, type, fileKey: fileKey || "", url: resUrl || "" });
    }

    const tasks = HimikoData.getTasks();
    const maxId = tasks.length ? Math.max(...tasks.map(t => t.id)) : 0;
    const task  = {
      id: editingTaskId ? Number(editingTaskId) : maxId + 1,
      title, question, answer, timerHours: timer,
      maxHints, hints, videoKey, videoUrl, resources
    };

    HimikoData.upsertTask(task);
    closeTaskModal();
    loadTasks();

  } catch(err) {
    alert("Saqlashda xato: " + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Saqlash';
  }
}

function deleteTask(id) {
  if (!confirm("Bu taskni ochirish tasdiqlaysizmi?")) return;
  HimikoData.deleteTask(id);
  loadTasks();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "Hozir";
  if (m < 60) return m + " daqiqa oldin";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " soat oldin";
  return Math.floor(h/24) + " kun oldin";
}