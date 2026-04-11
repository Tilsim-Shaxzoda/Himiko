// ============================================================
//  HIMIKO — Login Sahifasi Logikasi (script.js)
// ============================================================

// Sahifa ochilganda: agar user allaqachon login bo'lgan bo'lsa
window.addEventListener("DOMContentLoaded", () => {
  const user = HimikoData.getCurrentUser();
  if (user && !HimikoData.isAdmin()) {
    const userData = HimikoData.getUser(user);
    if (userData && !userData.blocked) {
      window.location.href = "task.html";
    }
  }
});

// ── KIRISH ──
function doLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  // Admin tekshiruvi
  if (username === "admin" && password === "admin123") {
    HimikoData.setAdmin(true);
    HimikoData.setCurrentUser("admin");
    window.location.href = "admin.html";
    return;
  }

  if (!username) { alert("Foydalanuvchi nomini kiriting!"); return; }

  const user = HimikoData.getUser(username);
  if (!user) { alert("Bunday foydalanuvchi topilmadi. Ro'yxatdan o'ting."); return; }
  if (user.blocked) { alert("Sizning hisobingiz bloklangan."); return; }

  HimikoData.setCurrentUser(username);
  HimikoData.setAdmin(false);
  window.location.href = "task.html";
}

// ── RO'YXATDAN O'TISH ──
function showRegister() {
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("registerBox").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("registerBox").classList.add("hidden");
  document.getElementById("termsBox").classList.add("hidden");
  document.getElementById("loginBox").classList.remove("hidden");
}

function showTerms() {
  const name = document.getElementById("regName").value.trim();
  const user = document.getElementById("regUser").value.trim();
  const pass = document.getElementById("regPass").value.trim();

  if (!name || !user || !pass) { alert("Barcha maydonlarni to'ldiring!"); return; }
  if (HimikoData.getUser(user)) { alert("Bu foydalanuvchi nomi band. Boshqa nom tanlang."); return; }

  // Ma'lumotlarni vaqtincha saqlash
  sessionStorage.setItem("reg_name", name);
  sessionStorage.setItem("reg_user", user);
  sessionStorage.setItem("reg_pass", pass);

  document.getElementById("registerBox").classList.add("hidden");
  document.getElementById("termsBox").classList.remove("hidden");
}

function startGame() {
  const username = sessionStorage.getItem("reg_user");
  if (!username) { showLogin(); return; }

  // Foydalanuvchini yaratish
  HimikoData.ensureUser(username);
  HimikoData.setCurrentUser(username);
  HimikoData.setAdmin(false);

  sessionStorage.removeItem("reg_name");
  sessionStorage.removeItem("reg_user");
  sessionStorage.removeItem("reg_pass");

  window.location.href = "task.html";
}