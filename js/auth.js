/** Client-side auth for static GitHub Pages deploy — multi-user, shared business data */
const AUTH = {
  // Default owner account created on first run. Change the password from
  // الإعدادات → المستخدمون after logging in for the first time.
  DEFAULT_USERNAME: 'abdoukhadouma10@gmail.com',
  DEFAULT_PASS_HASH: '72a022e9ebb8f40300814158f4024ea23e1076c47fb1833bf8ba57302e1e4bfe',

  async sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  /** Creates the default owner account on first run, or migrates an old single-user setup. */
  ensureUsers() {
    let users = DB.get('users', null);
    if (!users || !users.length) {
      users = [
        {
          id: 'owner',
          username: this.DEFAULT_USERNAME,
          passHash: this.DEFAULT_PASS_HASH,
          role: 'owner',
          name: 'المالك',
          active: true,
          createdAt: new Date().toISOString(),
        },
      ];
      DB.set('users', users);
    }
    return users;
  },

  findUser(username) {
    const u = (username || '').trim().toLowerCase();
    return this.ensureUsers().find((x) => x.username.toLowerCase() === u);
  },

  async login(username, password) {
    const user = this.findUser(username);
    if (!user || user.active === false) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    const hash = await this.sha256(password);
    if (hash !== user.passHash) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    const session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      loggedInAt: new Date().toISOString(),
    };
    DB.set('session', session);
    if (!DB.get('profile')) {
      DB.set('profile', { email: user.username, name: user.name });
    }
    if (!DB.get('business')) {
      DB.set('business', { name: 'منشأتي', phone: '', address: '', currency: 'دج' });
    }
    return session;
  },

  logout() {
    DB.remove('session');
  },

  session() {
    return DB.get('session', null);
  },

  isLoggedIn() {
    const s = this.session();
    if (!s) return false;
    // session stays valid as long as the referenced user still exists & is active
    const user = this.ensureUsers().find((u) => u.id === s.userId);
    return !!user && user.active !== false;
  },

  currentUser() {
    const s = this.session();
    if (!s) return null;
    return this.ensureUsers().find((u) => u.id === s.userId) || null;
  },

  isOwner() {
    return this.currentUser()?.role === 'owner';
  },

  can(action) {
    // staff accounts can operate every module but can't touch settings/users/backup/danger zone
    const restricted = ['manageUsers', 'manageModules', 'clearData', 'businessProfile'];
    if (restricted.includes(action)) return this.isOwner();
    return true;
  },

  listUsers() {
    return this.ensureUsers();
  },

  async addUser({ username, password, role, name }) {
    const users = this.ensureUsers();
    const u = (username || '').trim();
    if (!u || !password) throw new Error('البريد وكلمة المرور مطلوبان');
    if (users.some((x) => x.username.toLowerCase() === u.toLowerCase())) {
      throw new Error('اسم المستخدم مستخدم بالفعل');
    }
    const passHash = await this.sha256(password);
    users.push({
      id: DB.uid(),
      username: u,
      passHash,
      role: role === 'owner' ? 'owner' : 'staff',
      name: (name || u).trim(),
      active: true,
      createdAt: new Date().toISOString(),
    });
    DB.set('users', users);
    return users;
  },

  async setPassword(id, password) {
    if (!password) throw new Error('كلمة مرور غير صالحة');
    const users = this.ensureUsers();
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('المستخدم غير موجود');
    u.passHash = await this.sha256(password);
    DB.set('users', users);
  },

  toggleUserActive(id) {
    const users = this.ensureUsers();
    const u = users.find((x) => x.id === id);
    if (!u) return;
    if (u.role === 'owner' && u.active !== false) {
      const activeOwners = users.filter((x) => x.role === 'owner' && x.active !== false);
      if (activeOwners.length <= 1) throw new Error('لا يمكن تعطيل آخر حساب مالك');
    }
    u.active = u.active === false ? true : false;
    DB.set('users', users);
  },

  removeUser(id) {
    const users = this.ensureUsers();
    const target = users.find((x) => x.id === id);
    if (!target) return;
    if (target.role === 'owner') {
      const owners = users.filter((x) => x.role === 'owner');
      if (owners.length <= 1) throw new Error('لا يمكن حذف آخر حساب مالك');
    }
    DB.set('users', users.filter((x) => x.id !== id));
  },

  getModules() {
    return DB.get('modules', null);
  },

  setModules(list) {
    DB.set('modules', list);
  },

  getBusiness() {
    return DB.get('business', { name: 'منشأتي', phone: '', address: '', currency: 'دج' });
  },

  setBusiness(b) {
    DB.set('business', b);
  },
};

window.AUTH = AUTH;
