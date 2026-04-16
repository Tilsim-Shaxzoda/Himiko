// ============================================================
//  HIMIKO — Task Sahifasi Logikasi (game.js)
// ============================================================

let currentTask   = null;
let hintsUsed     = 0;
let timerInterval = null;
let endTime       = null;
let currentUser   = null;
// ── MUSIQA ──
let musicStarted = false;

function initMusic() {
  const audio = document.getElementById("bgMusic");
  if (!audio) return;
  audio.volume = 0.5;
  audio.currentTime = 0;        // ← har doim boshidan
  audio.play().then(() => {
    musicStarted = true;
    updateMusicBtn(true);
  }).catch(() => {
    musicStarted = false;
    updateMusicBtn(false);
  });
}

function toggleMusic() {
  const audio = document.getElementById("bgMusic");
  if (!audio) return;
  if (audio.paused) {
    audio.currentTime = 0;      // ← to'xtatib qayta boslaganda ham boshidan
    audio.play();
    updateMusicBtn(true);
  } else {
    audio.pause();
    audio.currentTime = 0;      // ← to'xtatilganda pozitsiyani reset
    updateMusicBtn(false);
  }
}

function updateMusicBtn(isPlaying) {
  const btn  = document.getElementById("musicControl");
  const icon = document.getElementById("musicIcon");
  if (!btn || !icon) return;
  if (isPlaying) {
    btn.classList.remove("paused");
    btn.classList.add("playing");
    icon.className = "fa-solid fa-music";
  } else {
    btn.classList.remove("playing");
    btn.classList.add("paused");
    icon.className = "fa-solid fa-pause";
  }
}

function playCorrectSound() {
  const audio = document.getElementById("bgMusic");
  if (!audio) return;
  audio.currentTime = 0;        // ← to'g'ri javobdan keyin ham boshidan
  audio.play().then(() => updateMusicBtn(true)).catch(() => {});
}

window.addEventListener("DOMContentLoaded", () => {
  currentUser = HimikoData.getCurrentUser() || "guest";
  HimikoData.ensureUser(currentUser);

  const userData = HimikoData.getUser(currentUser);

  if (userData && userData.blocked) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
        background:#000;color:#fff;font-family:Poppins,sans-serif;text-align:center;">
        <div>
          <h2 style="font-size:2rem;margin-bottom:1rem;">Kirish taqiqlandi</h2>
          <p>Sizning hisobingiz administrator tomonidan bloklangan.</p>
        </div>
      </div>`;
    return;
  }

  loadTask(userData ? userData.currentTaskId : 1);
  // Musiqa — birinchi task yuklanganida boshlash
  if (!musicStarted) initMusic();

  document.getElementById("answerInput").addEventListener("keydown", e => {
    if (e.key === "Enter") checkAnswer();
  });
// ── RUBBER SCROLL EFFEKTI ──
const card = document.querySelector(".glass-card");
const positioner = document.querySelector(".game-positioner");

let isAnimating = false;
let lastScrollY = 0;
let rafId = null;

function applyRubber(scrollEl, target) {
  const scrollTop = scrollEl.scrollTop;
  const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
  const diff = scrollTop - lastScrollY;
  lastScrollY = scrollTop;

  // Pastga scroll — card pastki qismi cho'zilsin
  if (scrollTop > 20 && diff > 0) {
    const stretch = Math.min(diff * 0.04, 0.06);
    target.style.transform = "scaleY(" + (1 + stretch) + ") translateY(-" + (stretch * 30) + "px)";
    target.style.transformOrigin = "top center";
    target.style.borderRadius = "28px 28px 40px 40px";
  }
  // Yuqoriga qaytganda
  else if (scrollTop < 10 && diff < 0) {
    const stretch = Math.min(Math.abs(diff) * 0.04, 0.05);
    target.style.transform = "scaleY(" + (1 + stretch) + ") translateY(-" + (stretch * 20) + "px)";
    target.style.transformOrigin = "bottom center";
    target.style.borderRadius = "40px 40px 28px 28px";
  }
  // Normal holat
  else {
    target.style.transform = "";
    target.style.borderRadius = "";
  }

  // Spring — normal holatga qaytish
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    setTimeout(() => {
      target.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
      target.style.transform = "";
      target.style.borderRadius = "";
      setTimeout(() => {
        target.style.transition = "";
      }, 500);
    }, 80);
  });
}

if (positioner && card) {
  positioner.addEventListener("scroll", () => {
    applyRubber(positioner, card);
  });
}

});

// ── TASK YUKLASH ──
async function loadTask(taskId) {
  currentTask = HimikoData.getTaskById(taskId);
  if (!currentTask) { showCompletion(); return; }

  const tasks    = HimikoData.getTasks();
  const userData = HimikoData.getUser(currentUser);
  hintsUsed      = (userData && userData.hintsUsed[taskId]) || 0;

  renderProgressBar(tasks, taskId);
  document.getElementById("taskTitle").textContent    = currentTask.title;
  document.getElementById("questionText").textContent = currentTask.question;

  // ── VIDEO ──
  const videoSection = document.getElementById("videoSection");
  const videoEl      = document.getElementById("taskVideo");

  if (currentTask.videoKey) {
    // IndexedDB dan yuklash
    try {
      const blob = await HimikoDB.get(currentTask.videoKey);
      if (blob) {
        videoEl.src = URL.createObjectURL(blob);
        videoSection.style.display = "block";
      } else {
        videoSection.style.display = "none";
      }
    } catch(e) {
      videoSection.style.display = "none";
    }
  } else if (currentTask.videoUrl) {
    videoEl.src = currentTask.videoUrl;
    videoSection.style.display = "block";
  } else {
    videoSection.style.display = "none";
    videoEl.src = "";
  }

  // ── RESURSLAR ──
  await renderResources(currentTask.resources || []);

  updateHintButton();
  document.getElementById("hintText").textContent  = "";
  document.getElementById("answerInput").value     = "";
  document.getElementById("answerInput").disabled  = false;

  startTimer(currentTask.timerHours);
}

// ── PROGRESS BAR ──
function renderProgressBar(tasks, currentId) {
  const bar      = document.getElementById("progressBar");
  const userData = HimikoData.getUser(currentUser);
  bar.innerHTML  = "";
  tasks.forEach(t => {
    const li = document.createElement("li");
    li.className = "progress-step";
    if (userData && userData.completedTasks.includes(t.id)) li.classList.add("completed");
    else if (t.id === Number(currentId)) li.classList.add("active");
    li.title = t.title;
    bar.appendChild(li);
  });
}

// ── RESURSLAR ──
async function renderResources(resources) {
  const section = document.getElementById("resourcesSection");
  const list    = document.getElementById("resourcesList");
  if (!resources || resources.length === 0) { section.style.display = "none"; return; }

  section.style.display = "block";
  list.innerHTML = "";

  const iconMap = { audio:"🎵", image:"🖼️", video:"🎬", file:"📄", txt:"📝" };

  for (const res of resources) {
    const a = document.createElement("a");
    a.className = "resource-item";

    // IndexedDB dan yuklash
    if (res.fileKey) {
      try {
        const blob = await HimikoDB.get(res.fileKey);
        if (blob) {
          a.href     = URL.createObjectURL(blob);
          a.download = res.name;
        }
      } catch(e) {
        a.href = "#";
      }
    } else if (res.url) {
      a.href     = res.url;
      a.download = res.name;
      a.target   = "_blank";
    }

    a.innerHTML = `<span class="res-icon">${iconMap[res.type] || "📎"}</span>
                   <span class="res-name">${res.name}</span>
                   <span class="res-dl">⬇ Yuklab olish</span>`;
    list.appendChild(a);
  }
}

// ── TAYMER ──
function startTimer(hours) {
  if (timerInterval) clearInterval(timerInterval);
  const userData = HimikoData.getUser(currentUser);

  if (!userData || !userData.startTime) {
    const now = Date.now();
    HimikoData.updateUser(currentUser, { startTime: now });
    endTime = now + hours * 3600 * 1000;
  } else {
    endTime = userData.startTime + hours * 3600 * 1000;
  }

  function tick() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      clearInterval(timerInterval);
      document.getElementById("countdown").textContent = "00:00:00";
      document.getElementById("countdown").style.color = "#ff4444";
      showTimeUp();
      return;
    }
    const pad = n => String(n).padStart(2, "0");
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    document.getElementById("countdown").textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    if (remaining < 3600000) document.getElementById("countdown").style.color = "#ff6b6b";
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

// ── JAVOBNI TEKSHIRISH ──
function checkAnswer() {
  const input   = document.getElementById("answerInput");
  const val     = input.value.trim().toLowerCase();
  const correct = currentTask.answer.trim().toLowerCase();

  if (!val) { showFeedback("Javobni kiriting!", "warning"); return; }

  if (val === correct) {
    playCorrectSound();
    showFeedback("✅ Togri! Keyingi bosqichga otmoqdasiz...", "success");
    input.disabled = true;

    const userData  = HimikoData.getUser(currentUser);
    const completed = userData.completedTasks || [];
    if (!completed.includes(currentTask.id)) completed.push(currentTask.id);

    const tasks    = HimikoData.getTasks();
    const nextTask = tasks.find(t => !completed.includes(t.id));

    HimikoData.updateUser(currentUser, {
      completedTasks: completed,
      currentTaskId: nextTask ? nextTask.id : null
    });

    setTimeout(() => { if (nextTask) loadTask(nextTask.id); else showCompletion(); }, 1800);

  } else {
    showFeedback("Notogri javob. Qaytadan urining.", "error");
    input.classList.add("shake");
    setTimeout(() => input.classList.remove("shake"), 600);
  }
}

// ── YORDAM ──
function getHint() {
  if (!currentTask) return;
  const maxHints = currentTask.maxHints || 3;
  const hints    = currentTask.hints || [];

  if (hintsUsed >= maxHints || hintsUsed >= hints.length) {
    showFeedback("Yordam tugadi!", "warning"); return;
  }

  hintsUsed++;
  const hintData = HimikoData.getUser(currentUser).hintsUsed || {};
  hintData[currentTask.id] = hintsUsed;
  HimikoData.updateUser(currentUser, { hintsUsed: hintData });

  showFeedback(`Yordam ${hintsUsed}/${maxHints}: ${hints[hintsUsed - 1]}`, "hint");
  updateHintButton();
}

function updateHintButton() {
  const maxHints  = currentTask ? currentTask.maxHints || 3 : 3;
  const remaining = maxHints - hintsUsed;
  const btn       = document.getElementById("hintBtn");
  if (!btn) return;
  document.getElementById("hintCount").textContent = remaining;
  btn.disabled      = remaining <= 0;
  btn.style.opacity = remaining <= 0 ? "0.4" : "1";
}

function showFeedback(msg, type) {
  const el = document.getElementById("hintText");
  el.textContent = msg;
  el.className   = `hint-msg feedback-${type}`;
  if (type === "error" || type === "warning") {
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.textContent = ""; el.className = "hint-msg"; }, 3500);
  }
}

function showTimeUp() {
  document.querySelector(".glass-card").innerHTML = `
    <div class="end-screen">
      <div class="end-icon">⏰</div>
      <h2>Vaqt tugadi!</h2>
      <p>Musobaqa vaqti yakunlandi.</p>
      <button onclick="window.location.href='index.html'" class="btn-send" style="margin-top:20px;width:100%">
        Bosh sahifaga qaytish
      </button>
    </div>`;
}

function showCompletion() {
  if (timerInterval) clearInterval(timerInterval);
  document.querySelector(".glass-card").innerHTML = `
    <div class="end-screen">
      <div class="end-icon">🏆</div>
      <h2>Tabriklaymiz!</h2>
      <p>Barcha topshiriqlarni muvaffaqiyatli bajardingiz!</p>
      <button onclick="window.location.href='index.html'" class="btn-send" style="margin-top:20px;width:100%">
        Bosh sahifaga qaytish
      </button>
    </div>`;
}