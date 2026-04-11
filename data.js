// ============================================================
//  HIMIKO — Ma'lumotlar qatlami (data.js)
//  Kichik ma'lumotlar: localStorage
//  Katta fayllar (video, audio): IndexedDB
// ============================================================

// ── IndexedDB yordamchi ──
const HimikoDB = {
  _db: null,

  open() {
    return new Promise((resolve, reject) => {
      if (this._db) return resolve(this._db);
      const req = indexedDB.open("HimikoDB", 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files");
        }
      };
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror   = e => reject(e.target.error);
    });
  },

  async set(key, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
    });
  },

  async get(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction("files", "readonly");
      const req = tx.objectStore("files").get(key);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror   = e => reject(e.target.error);
    });
  },

  async delete(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
    });
  }
};

// ============================================================
const HimikoData = {

  defaultTasks: [
    {
      id: 1,
      title: "1-Topshiriq",
      question: "Toglar orasidagi sirlarni ochishga tayyormisiz? Birinchi kalit sozni kiriting.",
      answer: "himiko",
      hints: [
        "Kalit soz loyiha nomi bilan bir xil.",
        "6 ta harfdan iborat, yapon ismi.",
        "h-i-m-i-k-o"
      ],
      maxHints: 3,
      videoKey: "",      // IndexedDB kalit
      videoUrl: "",      // URL (agar URL orqali kiritilgan bo'lsa)
      resources: [],     // [{name, type, fileKey, url}]
      timerHours: 172
    }
  ],

  getTasks() {
    const raw = localStorage.getItem("himiko_tasks");
    if (!raw) { this.saveTasks(this.defaultTasks); return this.defaultTasks; }
    return JSON.parse(raw);
  },

  saveTasks(tasks) {
    localStorage.setItem("himiko_tasks", JSON.stringify(tasks));
  },

  getTaskById(id) {
    return this.getTasks().find(t => t.id === Number(id)) || null;
  },

  upsertTask(task) {
    const tasks = this.getTasks();
    const idx   = tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) tasks[idx] = task; else tasks.push(task);
    this.saveTasks(tasks);
  },

  deleteTask(id) {
    this.saveTasks(this.getTasks().filter(t => t.id !== Number(id)));
  },

  // ── FOYDALANUVCHILAR ──
  getUsers() {
    const raw = localStorage.getItem("himiko_users");
    return raw ? JSON.parse(raw) : {};
  },

  saveUsers(u) { localStorage.setItem("himiko_users", JSON.stringify(u)); },

  ensureUser(username) {
    const users = this.getUsers();
    if (!users[username]) {
      users[username] = {
        username, currentTaskId: 1,
        completedTasks: [], hintsUsed: {},
        startTime: null, blocked: false, lastSeen: Date.now()
      };
      this.saveUsers(users);
    }
    return users[username];
  },

  getUser(username)        { return this.getUsers()[username] || null; },
  updateUser(username, data) {
    const users = this.getUsers();
    if (users[username]) {
      users[username] = { ...users[username], ...data, lastSeen: Date.now() };
      this.saveUsers(users);
    }
  },
  blockUser(username, blocked = true) { this.updateUser(username, { blocked }); },

  // ── SESSION ──
  getCurrentUser() { return localStorage.getItem("himiko_session") || null; },
  setCurrentUser(u){ localStorage.setItem("himiko_session", u); },
  clearSession()   { localStorage.removeItem("himiko_session"); },
  isAdmin()        { return localStorage.getItem("himiko_admin") === "true"; },
  setAdmin(v)      { localStorage.setItem("himiko_admin", v ? "true" : "false"); }
};