/** LocalStorage database layer */
const DB = {
  PREFIX: 'merp_v1_',

  key(name) {
    return this.PREFIX + name;
  },

  get(name, fallback) {
    try {
      const raw = localStorage.getItem(this.key(name));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(name, value) {
    localStorage.setItem(this.key(name), JSON.stringify(value));
  },

  remove(name) {
    localStorage.removeItem(this.key(name));
  },

  /** Full app state keys */
  KEYS: [
    'session',
    'profile',
    'business',
    'modules',
    'users',
    'products',
    'sales',
    'animals',
    'health',
    'projects',
    'tasks',
    'transactions',
    'debts',
    'invoices',
  ],

  exportAll() {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      payload: {},
    };
    this.KEYS.forEach((k) => {
      const v = localStorage.getItem(this.key(k));
      if (v != null) data.payload[k] = JSON.parse(v);
    });
    return data;
  },

  importAll(data) {
    if (!data || !data.payload) throw new Error('ملف غير صالح');
    Object.entries(data.payload).forEach(([k, v]) => {
      if (this.KEYS.includes(k)) this.set(k, v);
    });
  },

  clearBusinessData() {
    ['products', 'sales', 'animals', 'health', 'projects', 'tasks', 'transactions', 'debts', 'invoices'].forEach(
      (k) => this.set(k, []),
    );
  },

  uid() {
    return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  },
};

window.DB = DB;
