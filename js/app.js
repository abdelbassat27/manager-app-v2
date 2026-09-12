/* Manager ERP — static GitHub Pages edition (v2) */
const MODULES_META = [
  { id: 'shops', label: 'محلات ومخزون + POS', desc: 'منتجات، مبيعات، تنبيهات نفاذ' },
  { id: 'livestock', label: 'تربية المواشي', desc: 'بطاقة صحية، تطعيمات، أعلاف' },
  { id: 'construction', label: 'المقاولات', desc: 'مشاريع ومخطط جانت' },
  { id: 'finance', label: 'الإدارة المالية', desc: 'مداخيل ومصاريف وتقارير' },
];

const SYMPTOMS = [
  { id: 'neck_twist', label: 'التواء الرقبة' },
  { id: 'circling_left', label: 'دوران نحو اليسار' },
  { id: 'circling_right', label: 'دوران نحو اليمين' },
  { id: 'anorexia', label: 'فقدان الشهية' },
  { id: 'fever', label: 'حمى' },
  { id: 'lameness', label: 'عرج' },
  { id: 'diarrhea', label: 'إسهال' },
  { id: 'cough', label: 'سعال' },
  { id: 'lethargy', label: 'خمول' },
];

const CHART_COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#db2777', '#65a30d'];

const App = {
  view: 'dashboard',
  cart: {},
  shopsTab: 'products',
  financeTab: 'transactions',
  settingsTab: 'modules',
  tableState: {},

  init() {
    this.bindTheme();
    AUTH.ensureUsers();
    if (!AUTH.isLoggedIn()) {
      this.showAuth();
      return;
    }
    if (!AUTH.getModules() || !AUTH.getModules().length) {
      this.showSpecialty();
      return;
    }
    this.showApp();
  },

  getTableState(key, defaults) {
    if (!this.tableState[key]) this.tableState[key] = { ...defaults };
    return this.tableState[key];
  },
  setTableState(key, val) {
    this.tableState[key] = val;
  },

  bindTheme() {
    const saved = localStorage.getItem('merp_theme');
    const theme =
      saved ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('merp_theme', next);
  },

  showAuth() {
    UI.qs('#screen-auth').classList.remove('hidden');
    UI.qs('#screen-specialty').classList.add('hidden');
    UI.qs('#screen-app').classList.add('hidden');
    UI.qs('#login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = UI.qs('#login-email').value;
      const pass = UI.qs('#login-pass').value;
      const btn = UI.qs('#login-btn');
      btn.disabled = true;
      try {
        await AUTH.login(email, pass);
        UI.toast('تم الدخول بنجاح', 'success');
        if (!AUTH.getModules()?.length) this.showSpecialty();
        else this.showApp();
      } catch (err) {
        UI.toast(err.message || 'فشل الدخول', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  },

  showSpecialty() {
    UI.qs('#screen-auth').classList.add('hidden');
    UI.qs('#screen-app').classList.add('hidden');
    const sc = UI.qs('#screen-specialty');
    sc.classList.remove('hidden');
    const grid = UI.qs('#specialty-grid');
    const selected = new Set(AUTH.getModules() || ['finance']);
    grid.innerHTML = MODULES_META.map(
      (m) => `
      <button type="button" class="module-tile ${selected.has(m.id) ? 'selected' : ''}" data-id="${m.id}">
        <strong>${m.label}</strong>
        <span class="muted" style="font-size:12.5px">${m.desc}</span>
      </button>`,
    ).join('');
    grid.onclick = (e) => {
      const btn = e.target.closest('.module-tile');
      if (!btn) return;
      btn.classList.toggle('selected');
    };
    UI.qs('#specialty-save').onclick = () => {
      const ids = UI.qsa('#specialty-grid .module-tile.selected').map((el) => el.dataset.id);
      if (!ids.length) {
        UI.toast('اختر اختصاصاً واحداً على الأقل', 'error');
        return;
      }
      AUTH.setModules(ids);
      UI.toast('تم حفظ الاختصاصات', 'success');
      this.showApp();
    };
  },

  showApp() {
    UI.qs('#screen-auth').classList.add('hidden');
    UI.qs('#screen-specialty').classList.add('hidden');
    UI.qs('#screen-app').classList.remove('hidden');
    const biz = AUTH.getBusiness();
    UI.qs('#brand-sub').textContent = biz.name || 'منشأتي';
    this.renderSidebarUser();
    this.renderNav();
    this.navigate(this.view || 'dashboard');
    UI.qs('#btn-theme').onclick = () => this.toggleTheme();
    UI.qs('#btn-logout').onclick = () => {
      AUTH.logout();
      location.reload();
    };
    UI.qs('#btn-menu')?.addEventListener('click', () => {
      UI.qs('.sidebar').classList.toggle('open');
      UI.qs('#sidebar-overlay').classList.toggle('show');
    });
    UI.qs('#sidebar-overlay')?.addEventListener('click', () => {
      UI.qs('.sidebar').classList.remove('open');
      UI.qs('#sidebar-overlay').classList.remove('show');
    });
    this.bindNotifBell();
  },

  renderSidebarUser() {
    const u = AUTH.currentUser();
    const slot = UI.qs('#sidebar-user');
    if (!slot || !u) return;
    slot.innerHTML = `<b>${UI.escape(u.name || u.username)}</b><span class="role-pill">${u.role === 'owner' ? 'مالك' : 'موظف'}</span>`;
  },

  renderNav() {
    const mods = AUTH.getModules() || [];
    const isOwner = AUTH.isOwner();
    const links = [
      { id: 'dashboard', label: 'لوحة القيادة' },
      { id: 'shops', label: 'المحلات / POS', mod: 'shops' },
      { id: 'livestock', label: 'تربية المواشي', mod: 'livestock' },
      { id: 'construction', label: 'المقاولات', mod: 'construction' },
      { id: 'finance', label: 'المالية', mod: 'finance' },
      { id: 'backup', label: 'نسخ احتياطي', ownerOnly: true },
      { id: 'settings', label: 'الإعدادات', ownerOnly: true },
    ].filter((l) => (!l.mod || mods.includes(l.mod)) && (!l.ownerOnly || isOwner));

    UI.qs('#nav').innerHTML =
      '<div class="nav-section">القائمة</div>' +
      links
        .map(
          (l) =>
            `<button type="button" class="nav-link" data-view="${l.id}">${l.label}</button>`,
        )
        .join('');
    UI.qs('#nav').onclick = (e) => {
      const b = e.target.closest('[data-view]');
      if (!b) return;
      this.navigate(b.dataset.view);
      UI.qs('.sidebar')?.classList.remove('open');
      UI.qs('#sidebar-overlay')?.classList.remove('show');
    };
  },

  navigate(view) {
    this.view = view;
    UI.qsa('#nav .nav-link').forEach((el) => {
      el.classList.toggle('active', el.dataset.view === view);
    });
    const titles = {
      dashboard: 'لوحة التحكم',
      shops: 'المحلات / نقطة البيع',
      livestock: 'تربية المواشي',
      construction: 'المقاولات',
      finance: 'الإدارة المالية',
      backup: 'نسخ احتياطي',
      settings: 'الإعدادات',
    };
    const titleEl = UI.qs('#topbar-title');
    if (titleEl) titleEl.textContent = titles[view] || 'Manager ERP';
    const root = UI.qs('#view-root');
    const map = {
      dashboard: () => this.viewDashboard(),
      shops: () => this.viewShops(),
      livestock: () => this.viewLivestock(),
      construction: () => this.viewConstruction(),
      finance: () => this.viewFinance(),
      backup: () => this.viewBackup(),
      settings: () => this.viewSettings(),
    };
    root.innerHTML = (map[view] || map.dashboard)();
    this.bindViewHandlers(view);
    this.refreshNotifications();
  },

  /* ========== NOTIFICATIONS ========== */
  buildNotifications() {
    const mods = AUTH.getModules() || [];
    const list = [];
    const now = Date.now();

    if (mods.includes('shops')) {
      const products = DB.get('products', []);
      products
        .filter((p) => p.minQuantity > 0 && p.quantity <= p.minQuantity)
        .forEach((p) =>
          list.push({
            level: 'danger',
            text: `منتج منخفض: ${p.name} (متبقي ${p.quantity})`,
            view: 'shops',
          }),
        );
    }

    if (mods.includes('livestock')) {
      const animals = DB.get('animals', []);
      animals.forEach((a) => {
        if (!a.nextVaccine) return;
        const d = new Date(a.nextVaccine).getTime();
        if (d < now) {
          list.push({ level: 'danger', text: `تطعيم متأخر: ${a.tag}`, view: 'livestock' });
        } else if (d <= now + 7 * 86400000) {
          list.push({ level: 'warn', text: `تطعيم قريب: ${a.tag} — ${UI.date(a.nextVaccine)}`, view: 'livestock' });
        }
      });
    }

    if (mods.includes('construction')) {
      const tasks = DB.get('tasks', []);
      tasks.forEach((t) => {
        if ((t.progress || 0) >= 100) return;
        if (new Date(t.endDate).getTime() < now) {
          list.push({ level: 'warn', text: `مهمة متأخرة: ${t.title}`, view: 'construction' });
        }
      });
    }

    if (mods.includes('finance')) {
      const debts = DB.get('debts', []);
      debts
        .filter((d) => !d.settled)
        .forEach((d) => {
          const due = d.dueDate ? new Date(d.dueDate).getTime() : null;
          if (due != null && due < now) {
            list.push({
              level: 'danger',
              text: `دين متأخر (${d.type === 'receivable' ? 'لنا' : 'علينا'}): ${d.party} — ${UI.money(d.amount)}`,
              view: 'finance',
              tab: 'debts',
            });
          } else if (due != null && due <= now + 7 * 86400000) {
            list.push({
              level: 'warn',
              text: `دين يقترب أجله: ${d.party} — ${UI.money(d.amount)}`,
              view: 'finance',
              tab: 'debts',
            });
          }
        });
    }

    return list;
  },

  bindNotifBell() {
    const btn = UI.qs('#btn-notif');
    const panel = UI.qs('#notif-panel');
    if (!btn || !panel) return;
    btn.onclick = (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
    };
    panel.onclick = (e) => e.stopPropagation();
    document.addEventListener('click', () => panel.classList.add('hidden'));
    this.refreshNotifications();
  },

  refreshNotifications() {
    const badge = UI.qs('#notif-badge');
    const panel = UI.qs('#notif-panel');
    if (!badge || !panel) return;
    const items = this.buildNotifications();
    badge.textContent = items.length > 9 ? '9+' : String(items.length);
    badge.classList.toggle('hidden', items.length === 0);
    panel.innerHTML =
      `<div class="notif-title">التنبيهات (${items.length})</div>` +
      (items.length
        ? items
            .map(
              (n, i) => `
        <button type="button" class="notif-item" data-idx="${i}">
          <span class="notif-dot ${n.level}"></span>
          <span>${UI.escape(n.text)}</span>
        </button>`,
            )
            .join('')
        : '<div class="notif-empty">لا توجد تنبيهات حالياً 👍</div>');
    UI.qsa('.notif-item', panel).forEach((btn) => {
      btn.onclick = () => {
        const n = items[Number(btn.dataset.idx)];
        panel.classList.add('hidden');
        if (n.tab === 'debts') this.financeTab = 'debts';
        this.navigate(n.view);
      };
    });
  },

  /* ========== HELPERS: CHARTS ========== */
  groupByCategory(tx, type) {
    const map = {};
    tx.filter((t) => t.type === type).forEach((t) => {
      const cat = t.category?.trim() || 'غير مصنف';
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  },

  monthlySeries(tx, months = 6) {
    const out = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      let inc = 0,
        exp = 0;
      tx.forEach((t) => {
        if (String(t.date).slice(0, 7) === ym) {
          if (t.type === 'IN') inc += Number(t.amount);
          else exp += Number(t.amount);
        }
      });
      out.push({ label: d.toLocaleDateString('ar-DZ', { month: 'short' }), income: inc, expense: exp });
    }
    return out;
  },

  /* ========== DASHBOARD ========== */
  viewDashboard() {
    const mods = AUTH.getModules() || [];
    const tx = DB.get('transactions', []);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let income = 0,
      expense = 0;
    tx.forEach((t) => {
      if (new Date(t.date).getTime() < monthStart) return;
      if (t.type === 'IN') income += Number(t.amount);
      else expense += Number(t.amount);
    });
    const animals = DB.get('animals', []);
    const soon = animals.filter((a) => {
      if (!a.nextVaccine) return false;
      const d = new Date(a.nextVaccine).getTime();
      return d <= Date.now() + 7 * 86400000;
    });
    const products = DB.get('products', []);
    const low = products.filter((p) => p.minQuantity > 0 && p.quantity <= p.minQuantity);
    const debts = DB.get('debts', []).filter((d) => !d.settled);
    const receivable = debts.filter((d) => d.type === 'receivable').reduce((s, d) => s + Number(d.amount), 0);
    const payable = debts.filter((d) => d.type === 'payable').reduce((s, d) => s + Number(d.amount), 0);
    const tasks = DB.get('tasks', []);
    const overdueTasks = tasks.filter((t) => (t.progress || 0) < 100 && new Date(t.endDate).getTime() < Date.now());

    // 7 day series
    const series = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      let inc = 0,
        exp = 0;
      tx.forEach((t) => {
        if (String(t.date).slice(0, 10) === iso) {
          if (t.type === 'IN') inc += Number(t.amount);
          else exp += Number(t.amount);
        }
      });
      series.push({ day: iso, income: inc, expense: exp });
    }
    const max = Math.max(...series.map((s) => s.income + s.expense), 1);

    return `
      <div class="page-head">
        <div>
          <h2>مرحباً 👋</h2>
          <p class="muted">نظرة عامة على منشأتك</p>
        </div>
      </div>
      <div class="grid-stats">
        ${
          mods.includes('finance')
            ? `
          <div class="stat"><div class="label">مداخيل الشهر</div><div class="value" style="color:var(--success)">${UI.money(income)}</div></div>
          <div class="stat"><div class="label">مصاريف الشهر</div><div class="value" style="color:var(--danger)">${UI.money(expense)}</div></div>
          <div class="stat"><div class="label">الصافي</div><div class="value">${UI.money(income - expense)}</div></div>
          <div class="stat"><div class="label">ديون لنا</div><div class="value" style="color:var(--success)">${UI.money(receivable)}</div></div>
          <div class="stat"><div class="label">ديون علينا</div><div class="value" style="color:var(--danger)">${UI.money(payable)}</div></div>`
            : ''
        }
        ${mods.includes('livestock') ? `<div class="stat"><div class="label">تطعيمات قريبة</div><div class="value">${soon.length}</div></div>` : ''}
        ${mods.includes('shops') ? `<div class="stat"><div class="label">منتجات منخفضة</div><div class="value">${low.length}</div></div>` : ''}
        ${mods.includes('livestock') ? `<div class="stat"><div class="label">عدد الرؤوس</div><div class="value">${animals.length}</div></div>` : ''}
        ${mods.includes('construction') ? `<div class="stat"><div class="label">مهام متأخرة</div><div class="value" style="color:var(--danger)">${overdueTasks.length}</div></div>` : ''}
      </div>
      ${
        mods.includes('finance')
          ? `<div class="card" style="margin-bottom:16px">
        <h3 style="margin-top:0">آخر 7 أيام</h3>
        <div class="chart-bars">
          ${series
            .map(
              (s) => `
            <div class="chart-col">
              <div class="chart-bars-inner">
                <div class="bar-in" style="height:${(s.income / max) * 100}px" title="مدخول ${s.income}"></div>
                <div class="bar-out" style="height:${(s.expense / max) * 100}px" title="مصروف ${s.expense}"></div>
              </div>
              <small class="muted">${s.day.slice(5)}</small>
            </div>`,
            )
            .join('')}
        </div>
      </div>`
          : ''
      }
      ${
        low.length
          ? `<div class="card" style="margin-bottom:16px"><h3 style="margin-top:0">تنبيه مخزون</h3>
        <ul>${low.map((p) => `<li><strong>${UI.escape(p.name)}</strong> — المتبقي ${p.quantity}</li>`).join('')}</ul></div>`
          : ''
      }
      ${
        soon.length
          ? `<div class="card" style="margin-bottom:16px"><h3 style="margin-top:0">تطعيمات خلال 7 أيام</h3>
        <ul>${soon.map((a) => `<li><strong>${UI.escape(a.tag)}</strong> — ${UI.date(a.nextVaccine)}</li>`).join('')}</ul></div>`
          : ''
      }
      ${
        overdueTasks.length
          ? `<div class="card"><h3 style="margin-top:0">مهام متأخرة</h3>
        <ul>${overdueTasks.map((t) => `<li><strong>${UI.escape(t.title)}</strong> — كان يجب إنهاؤها ${UI.date(t.endDate)}</li>`).join('')}</ul></div>`
          : ''
      }
    `;
  },

  /* ========== SHOPS ========== */
  viewShops() {
    return `
      <div class="page-head">
        <div>
          <h2>المحلات / نقطة البيع</h2>
          <p class="muted">المخزون والمبيعات</p>
        </div>
      </div>
      <div class="tabs">
        <button type="button" class="tab-btn ${this.shopsTab === 'products' ? 'active' : ''}" data-tabgroup="shops" data-tab="products">المنتجات</button>
        <button type="button" class="tab-btn ${this.shopsTab === 'sales' ? 'active' : ''}" data-tabgroup="shops" data-tab="sales">سجل المبيعات</button>
      </div>
      ${this.shopsTab === 'sales' ? this.viewShopsSales() : this.viewShopsProducts()}
      <div id="health-modal-slot"></div>
    `;
  },

  viewShopsProducts() {
    const all = DB.get('products', []);
    const state = this.getTableState('products', { q: '', sortKey: '', sortDir: 'asc' });
    let products = UI.search(all, ['name', 'category'], state.q);
    if (state.sortKey) products = UI.sortList(products, state.sortKey, state.sortDir);
    const cartTotal = Object.entries(this.cart).reduce((sum, [id, qty]) => {
      const p = all.find((x) => x.id === id);
      return sum + (p ? p.price * qty : 0);
    }, 0);
    return `
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-top:0">إضافة منتج</h3>
        <form id="product-form" class="form-row cols-5">
          <input class="input" name="name" placeholder="اسم المنتج" required />
          <input class="input" name="category" placeholder="التصنيف (اختياري)" />
          <input class="input" name="quantity" type="number" step="any" placeholder="كمية" value="0" />
          <input class="input" name="price" type="number" step="any" placeholder="السعر" value="0" />
          <input class="input" name="minQuantity" type="number" step="any" placeholder="حد أدنى" value="0" />
          <button class="btn btn-primary" type="submit">إضافة</button>
        </form>
      </div>
      ${UI.toolbar({
        id: 'products-tb',
        q: state.q,
        sortOptions: [
          { key: 'name', label: 'الاسم' },
          { key: 'quantity', label: 'الكمية' },
          { key: 'price', label: 'السعر' },
        ],
        sortKey: state.sortKey,
        sortDir: state.sortDir,
        placeholder: 'ابحث عن منتج أو تصنيف...',
      })}
      <div class="card table-wrap" style="margin-bottom:14px">
        <table>
          <thead><tr><th>المنتج</th><th>التصنيف</th><th>الكمية</th><th>السعر</th><th>الحالة</th><th>السلة</th><th></th></tr></thead>
          <tbody>
            ${
              products.length === 0
                ? '<tr><td colspan="7" class="empty">لا منتجات مطابقة</td></tr>'
                : products
                    .map((p) => {
                      const low = p.minQuantity > 0 && p.quantity <= p.minQuantity;
                      return `<tr>
                        <td><strong>${UI.escape(p.name)}</strong></td>
                        <td>${UI.escape(p.category || '—')}</td>
                        <td>${p.quantity} ${UI.escape(p.unit || '')}</td>
                        <td>${UI.money(p.price)}</td>
                        <td>${low ? '<span class="badge badge-danger">منخفض</span>' : '<span class="badge badge-ok">متوفر</span>'}</td>
                        <td><input class="input cart-qty" data-id="${p.id}" type="number" min="0" style="width:80px" value="${this.cart[p.id] || 0}" /></td>
                        <td class="row-actions"><button type="button" class="btn btn-ghost btn-sm del-product" data-id="${p.id}">حذف</button></td>
                      </tr>`;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="form-group" style="max-width:280px">
          <label>اسم العميل (اختياري)</label>
          <input class="input" id="pos-customer" placeholder="زبون عابر" />
        </div>
        <div class="row-actions" style="justify-content:space-between;align-items:center">
          <div class="pos-total" style="margin:0">إجمالي السلة: ${UI.money(cartTotal)}</div>
          <button type="button" class="btn btn-primary" id="pos-checkout">إتمام البيع</button>
        </div>
      </div>
    `;
  },

  viewShopsSales() {
    const all = DB.get('sales', []);
    const state = this.getTableState('sales', { q: '', sortKey: 'createdAt', sortDir: 'desc' });
    let sales = UI.search(all, ['customer'], state.q);
    if (state.sortKey) sales = UI.sortList(sales, state.sortKey, state.sortDir);
    return `
      ${UI.toolbar({
        id: 'sales-tb',
        q: state.q,
        sortOptions: [
          { key: 'createdAt', label: 'التاريخ' },
          { key: 'total', label: 'المبلغ' },
        ],
        sortKey: state.sortKey,
        sortDir: state.sortDir,
        placeholder: 'ابحث باسم العميل...',
      })}
      <div class="card table-wrap">
        <table>
          <thead><tr><th>التاريخ</th><th>العميل</th><th>عدد المنتجات</th><th>الإجمالي</th><th></th></tr></thead>
          <tbody>
            ${
              sales.length === 0
                ? '<tr><td colspan="5" class="empty">لا مبيعات مسجّلة بعد</td></tr>'
                : sales
                    .map(
                      (s) => `<tr>
                <td>${UI.datetime(s.createdAt)}</td>
                <td>${UI.escape(s.customer || 'زبون عابر')}</td>
                <td>${(s.items || []).length}</td>
                <td style="font-weight:700">${UI.money(s.total)}</td>
                <td class="row-actions"><button type="button" class="btn btn-ghost btn-sm print-invoice" data-id="${s.id}">طباعة الفاتورة</button></td>
              </tr>`,
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    `;
  },

  printInvoice(saleId) {
    const sale = DB.get('sales', []).find((s) => s.id === saleId);
    if (!sale) return;
    const biz = AUTH.getBusiness();
    const rows = (sale.items || [])
      .map(
        (it) =>
          `<tr><td>${UI.escape(it.name)}</td><td>${it.qty}</td><td>${UI.money(it.price)}</td><td>${UI.money(it.sub)}</td></tr>`,
      )
      .join('');
    const body = `
      <div class="doc-head">
        <div>
          <h1>${UI.escape(biz.name || 'منشأتي')}</h1>
          <p class="muted">${UI.escape(biz.phone || '')} ${biz.phone && biz.address ? '·' : ''} ${UI.escape(biz.address || '')}</p>
        </div>
        <div style="text-align:end">
          <h2 style="margin:0">فاتورة بيع</h2>
          <p class="muted">${UI.datetime(sale.createdAt)}</p>
        </div>
      </div>
      <p><strong>العميل:</strong> ${UI.escape(sale.customer || 'زبون عابر')}</p>
      <table>
        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total-row">الإجمالي: ${UI.money(sale.total)}</div>
    `;
    UI.printHTML('فاتورة بيع', body);
  },

  /* ========== LIVESTOCK ========== */
  viewLivestock() {
    const allAnimals = DB.get('animals', []);
    const health = DB.get('health', []);
    const state = this.getTableState('animals', { q: '', sortKey: '', sortDir: 'asc' });
    let animals = UI.search(allAnimals, ['tag', 'breed'], state.q);
    if (state.sortKey) animals = UI.sortList(animals, state.sortKey, state.sortDir);

    const breedData = (() => {
      const map = {};
      allAnimals.forEach((a) => {
        const b = a.breed?.trim() || 'غير محدد';
        map[b] = (map[b] || 0) + 1;
      });
      return Object.entries(map).map(([label, value], i) => ({
        label,
        value,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));
    })();

    return `
      <div class="page-head">
        <div>
          <h2>تربية المواشي</h2>
          <p class="muted">بطاقة صحية + تطعيمات + حاسبة أعلاف</p>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <form id="animal-form" class="form-row cols-4">
          <input class="input" name="tag" placeholder="رقم الوسم" required />
          <input class="input" name="breed" placeholder="السلالة" />
          <input class="input" name="nextVaccine" type="date" title="موعد التطعيم" />
          <button class="btn btn-primary" type="submit">إضافة رأس</button>
        </form>
      </div>
      ${UI.toolbar({
        id: 'animals-tb',
        q: state.q,
        sortOptions: [
          { key: 'tag', label: 'الوسم' },
          { key: 'breed', label: 'السلالة' },
          { key: 'nextVaccine', label: 'موعد التطعيم' },
        ],
        sortKey: state.sortKey,
        sortDir: state.sortDir,
        placeholder: 'ابحث بالوسم أو السلالة...',
      })}
      <div class="card table-wrap" style="margin-bottom:14px">
        <table>
          <thead><tr><th>الوسم</th><th>السلالة</th><th>تطعيم</th><th>آخر أعراض</th><th></th></tr></thead>
          <tbody>
            ${
              animals.length === 0
                ? '<tr><td colspan="5" class="empty">لا مواشي مطابقة</td></tr>'
                : animals
                    .map((a) => {
                      const logs = health
                        .filter((h) => h.animalId === a.id)
                        .sort((x, y) => (y.recordedAt || '').localeCompare(x.recordedAt || ''));
                      const last = logs[0];
                      const labels = last
                        ? (last.symptoms || [])
                            .map((id) => SYMPTOMS.find((s) => s.id === id)?.label || id)
                            .join('، ')
                        : '—';
                      return `<tr>
                        <td><strong>${UI.escape(a.tag)}</strong></td>
                        <td>${UI.escape(a.breed || '—')}</td>
                        <td>${UI.date(a.nextVaccine)}</td>
                        <td>${UI.escape(labels)}</td>
                        <td class="row-actions">
                          <button type="button" class="btn btn-ghost btn-sm health-btn" data-id="${a.id}">سجل صحي</button>
                          <button type="button" class="btn btn-ghost btn-sm del-animal" data-id="${a.id}">حذف</button>
                        </td>
                      </tr>`;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
      <div class="report-grid" style="margin-bottom:14px">
        <div class="card">
          <h3 style="margin-top:0">توزيع السلالات</h3>
          ${UI.donut(breedData, 120, (n) => n + ' رأس')}
        </div>
        <div class="card">
          <h3 style="margin-top:0">حاسبة الأعلاف</h3>
          <div class="form-row cols-4">
            <input class="input" id="feed-heads" type="number" value="10" title="عدد الرؤوس" placeholder="رؤوس" />
            <input class="input" id="feed-kg" type="number" step="0.1" value="1.5" title="كغ/رأس/يوم" placeholder="كغ/يوم" />
            <input class="input" id="feed-bag" type="number" value="50" title="وزن الكيس" placeholder="وزن الكيس" />
            <input class="input" id="feed-price" type="number" value="4000" title="سعر الكيس" placeholder="سعر الكيس" />
          </div>
          <button type="button" class="btn btn-primary" id="feed-calc">احسب</button>
          <p id="feed-result" class="muted" style="margin-top:12px"></p>
        </div>
      </div>
      <div id="health-modal-slot"></div>
    `;
  },

  /* ========== CONSTRUCTION ========== */
  viewConstruction() {
    const projects = DB.get('projects', []);
    const allTasks = DB.get('tasks', []);
    let min = Infinity,
      max = -Infinity;
    allTasks.forEach((t) => {
      min = Math.min(min, new Date(t.startDate).getTime());
      max = Math.max(max, new Date(t.endDate).getTime());
    });
    if (!isFinite(min)) {
      min = Date.now();
      max = Date.now() + 30 * 86400000;
    }
    const span = Math.max(max - min, 86400000);

    const tState = this.getTableState('tasks', { q: '', sortKey: 'endDate', sortDir: 'asc' });
    const withProjectName = allTasks.map((t) => ({
      ...t,
      projectName: projects.find((p) => p.id === t.projectId)?.name || '—',
    }));
    let tasks = UI.search(withProjectName, ['title', 'projectName'], tState.q);
    if (tState.sortKey) tasks = UI.sortList(tasks, tState.sortKey, tState.sortDir);

    return `
      <div class="page-head">
        <div>
          <h2>المقاولات</h2>
          <p class="muted">مشاريع + مخطط جانت + مهام</p>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <form id="project-form" style="display:flex;gap:10px;flex-wrap:wrap">
          <input class="input" name="name" placeholder="اسم المشروع" required style="flex:1;min-width:180px" />
          <button class="btn btn-primary" type="submit">مشروع جديد</button>
        </form>
      </div>
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-top:0">مخطط جانت</h3>
        ${
          allTasks.length === 0
            ? '<p class="empty">لا مهام بعد — أنشئ مشروعاً</p>'
            : allTasks
                .map((t) => {
                  const left = ((new Date(t.startDate).getTime() - min) / span) * 100;
                  const width = Math.max(
                    ((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / span) * 100,
                    4,
                  );
                  return `<div class="gantt-row">
                    <div style="font-size:13px">${UI.escape(t.title)}</div>
                    <div class="gantt-track">
                      <div class="gantt-bar" style="inset-inline-start:${left}%;width:${width}%">${t.progress || 0}%</div>
                    </div>
                  </div>`;
                })
                .join('')
        }
      </div>
      <div class="card table-wrap" style="margin-bottom:14px">
        <table>
          <thead><tr><th>المشروع</th><th>المهام</th><th>التقدم</th><th></th></tr></thead>
          <tbody>
            ${
              projects.length === 0
                ? '<tr><td colspan="4" class="empty">لا مشاريع</td></tr>'
                : projects
                    .map((p) => {
                      const pts = allTasks.filter((t) => t.projectId === p.id);
                      const prog =
                        pts.length === 0
                          ? 0
                          : Math.round(pts.reduce((s, t) => s + (t.progress || 0), 0) / pts.length);
                      return `<tr>
                        <td><strong>${UI.escape(p.name)}</strong></td>
                        <td>${pts.length}</td>
                        <td>${prog}%</td>
                        <td class="row-actions">
                          <button type="button" class="btn btn-ghost btn-sm add-task" data-id="${p.id}">مهمة</button>
                          <button type="button" class="btn btn-ghost btn-sm print-project" data-id="${p.id}">تقرير</button>
                          <button type="button" class="btn btn-ghost btn-sm del-project" data-id="${p.id}">حذف</button>
                        </td>
                      </tr>`;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3 style="margin-top:0">كل المهام</h3>
        ${UI.toolbar({
          id: 'tasks-tb',
          q: tState.q,
          sortOptions: [
            { key: 'title', label: 'المهمة' },
            { key: 'endDate', label: 'الموعد النهائي' },
            { key: 'progress', label: 'التقدم' },
          ],
          sortKey: tState.sortKey,
          sortDir: tState.sortDir,
          placeholder: 'ابحث عن مهمة أو مشروع...',
        })}
        <div class="table-wrap">
          <table>
            <thead><tr><th>المهمة</th><th>المشروع</th><th>الموعد النهائي</th><th style="min-width:180px">التقدم</th><th></th></tr></thead>
            <tbody>
              ${
                tasks.length === 0
                  ? '<tr><td colspan="5" class="empty">لا مهام مطابقة</td></tr>'
                  : tasks
                      .map(
                        (t) => `<tr>
                  <td>${UI.escape(t.title)}</td>
                  <td>${UI.escape(t.projectName)}</td>
                  <td>${new Date(t.endDate).getTime() < Date.now() && (t.progress || 0) < 100 ? '<span class="badge badge-danger">' + UI.date(t.endDate) + '</span>' : UI.date(t.endDate)}</td>
                  <td>
                    <div class="task-progress-row">
                      <input type="range" min="0" max="100" step="5" value="${t.progress || 0}" class="task-range" data-id="${t.id}" />
                      <output>${t.progress || 0}%</output>
                    </div>
                  </td>
                  <td><button type="button" class="btn btn-ghost btn-sm del-task" data-id="${t.id}">حذف</button></td>
                </tr>`,
                      )
                      .join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  printProjectReport(projectId) {
    const project = DB.get('projects', []).find((p) => p.id === projectId);
    if (!project) return;
    const tasks = DB.get('tasks', []).filter((t) => t.projectId === projectId);
    const prog = tasks.length
      ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length)
      : 0;
    const biz = AUTH.getBusiness();
    const rows = tasks
      .map(
        (t) =>
          `<tr><td>${UI.escape(t.title)}</td><td>${UI.date(t.startDate)}</td><td>${UI.date(t.endDate)}</td><td>${t.progress || 0}%</td></tr>`,
      )
      .join('');
    const body = `
      <div class="doc-head">
        <div><h1>${UI.escape(biz.name || 'منشأتي')}</h1><p class="muted">تقرير مشروع</p></div>
        <div style="text-align:end"><h2 style="margin:0">${UI.escape(project.name)}</h2><p class="muted">نسبة الإنجاز الكلية: ${prog}%</p></div>
      </div>
      <table>
        <thead><tr><th>المهمة</th><th>البداية</th><th>النهاية</th><th>التقدم</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">لا مهام</td></tr>'}</tbody>
      </table>
    `;
    UI.printHTML('تقرير مشروع - ' + project.name, body);
  },

  /* ========== FINANCE ========== */
  viewFinance() {
    return `
      <div class="page-head">
        <div>
          <h2>الإدارة المالية</h2>
          <p class="muted">مداخيل، مصاريف، ديون وتقارير</p>
        </div>
      </div>
      <div class="tabs">
        <button type="button" class="tab-btn ${this.financeTab === 'transactions' ? 'active' : ''}" data-tabgroup="finance" data-tab="transactions">العمليات</button>
        <button type="button" class="tab-btn ${this.financeTab === 'debts' ? 'active' : ''}" data-tabgroup="finance" data-tab="debts">الديون والذمم</button>
        <button type="button" class="tab-btn ${this.financeTab === 'reports' ? 'active' : ''}" data-tabgroup="finance" data-tab="reports">التقارير</button>
      </div>
      ${
        this.financeTab === 'debts'
          ? this.viewFinanceDebts()
          : this.financeTab === 'reports'
            ? this.viewFinanceReports()
            : this.viewFinanceTransactions()
      }
    `;
  },

  viewFinanceTransactions() {
    const all = DB.get('transactions', []);
    const state = this.getTableState('tx', { q: '', sortKey: 'date', sortDir: 'desc' });
    let rows = UI.search(all, ['description', 'category'], state.q);
    if (state.sortKey) rows = UI.sortList(rows, state.sortKey, state.sortDir);
    return `
      <div class="card" style="margin-bottom:14px">
        <form id="tx-form" class="form-row cols-5">
          <select class="select" name="type">
            <option value="IN">مدخول</option>
            <option value="OUT">مصروف</option>
          </select>
          <input class="input" name="amount" type="number" step="any" placeholder="المبلغ" required />
          <input class="input" name="description" placeholder="البيان" />
          <input class="input" name="category" placeholder="التصنيف" />
          <button class="btn btn-primary" type="submit">حفظ</button>
        </form>
      </div>
      ${UI.toolbar({
        id: 'tx-tb',
        q: state.q,
        sortOptions: [
          { key: 'date', label: 'التاريخ' },
          { key: 'amount', label: 'المبلغ' },
        ],
        sortKey: state.sortKey,
        sortDir: state.sortDir,
        placeholder: 'ابحث بالبيان أو التصنيف...',
      })}
      <div class="card table-wrap">
        <table>
          <thead><tr><th>النوع</th><th>البيان</th><th>التصنيف</th><th>التاريخ</th><th>المبلغ</th><th></th></tr></thead>
          <tbody>
            ${
              rows.length === 0
                ? '<tr><td colspan="6" class="empty">لا عمليات مطابقة</td></tr>'
                : rows
                    .map(
                      (r) => `<tr>
              <td><span class="badge ${r.type === 'IN' ? 'badge-ok' : 'badge-danger'}">${r.type === 'IN' ? 'مدخول' : 'مصروف'}</span></td>
              <td>${UI.escape(r.description || '—')}</td>
              <td>${UI.escape(r.category || '—')}</td>
              <td>${UI.date(r.date)}</td>
              <td style="font-weight:700;color:${r.type === 'IN' ? 'var(--success)' : 'var(--danger)'}">
                ${r.type === 'IN' ? '+' : '−'} ${UI.money(r.amount)}
              </td>
              <td><button type="button" class="btn btn-ghost btn-sm del-tx" data-id="${r.id}">حذف</button></td>
            </tr>`,
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    `;
  },

  viewFinanceDebts() {
    const all = DB.get('debts', []);
    const state = this.getTableState('debts', { q: '', sortKey: 'dueDate', sortDir: 'asc' });
    let debts = UI.search(all, ['party', 'note'], state.q);
    if (state.sortKey) debts = UI.sortList(debts, state.sortKey, state.sortDir);
    const receivable = all.filter((d) => !d.settled && d.type === 'receivable').reduce((s, d) => s + Number(d.amount), 0);
    const payable = all.filter((d) => !d.settled && d.type === 'payable').reduce((s, d) => s + Number(d.amount), 0);
    return `
      <div class="grid-stats" style="margin-bottom:14px">
        <div class="stat"><div class="label">ديون لنا (غير مسواة)</div><div class="value" style="color:var(--success)">${UI.money(receivable)}</div></div>
        <div class="stat"><div class="label">ديون علينا (غير مسواة)</div><div class="value" style="color:var(--danger)">${UI.money(payable)}</div></div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <form id="debt-form" class="form-row cols-5">
          <select class="select" name="type">
            <option value="receivable">دين لنا (لدى عميل)</option>
            <option value="payable">دين علينا (لمورد)</option>
          </select>
          <input class="input" name="party" placeholder="الاسم" required />
          <input class="input" name="amount" type="number" step="any" placeholder="المبلغ" required />
          <input class="input" name="dueDate" type="date" title="تاريخ الاستحقاق" />
          <button class="btn btn-primary" type="submit">إضافة</button>
        </form>
      </div>
      ${UI.toolbar({
        id: 'debts-tb',
        q: state.q,
        sortOptions: [
          { key: 'party', label: 'الاسم' },
          { key: 'dueDate', label: 'تاريخ الاستحقاق' },
          { key: 'amount', label: 'المبلغ' },
        ],
        sortKey: state.sortKey,
        sortDir: state.sortDir,
        placeholder: 'ابحث بالاسم...',
      })}
      <div class="card table-wrap">
        <table>
          <thead><tr><th>النوع</th><th>الاسم</th><th>المبلغ</th><th>الاستحقاق</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            ${
              debts.length === 0
                ? '<tr><td colspan="6" class="empty">لا ديون مسجّلة</td></tr>'
                : debts
                    .map((d) => {
                      const overdue = !d.settled && d.dueDate && new Date(d.dueDate).getTime() < Date.now();
                      return `<tr class="debt-row">
                    <td><span class="badge ${d.type === 'receivable' ? 'badge-ok' : 'badge-danger'}">${d.type === 'receivable' ? 'لنا' : 'علينا'}</span></td>
                    <td>${UI.escape(d.party)}</td>
                    <td>${UI.money(d.amount)}</td>
                    <td class="${overdue ? 'overdue' : ''}">${UI.date(d.dueDate)}</td>
                    <td>${d.settled ? '<span class="badge badge-ok">مسواة</span>' : overdue ? '<span class="badge badge-danger">متأخرة</span>' : '<span class="badge badge-warn">جارية</span>'}</td>
                    <td class="row-actions">
                      ${!d.settled ? `<button type="button" class="btn btn-ghost btn-sm settle-debt" data-id="${d.id}">تسوية</button>` : ''}
                      <button type="button" class="btn btn-ghost btn-sm del-debt" data-id="${d.id}">حذف</button>
                    </td>
                  </tr>`;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
    `;
  },

  viewFinanceReports() {
    const tx = DB.get('transactions', []);
    const expenseByCat = this.groupByCategory(tx, 'OUT');
    const incomeByCat = this.groupByCategory(tx, 'IN');
    const months = this.monthlySeries(tx, 6);
    const maxMonth = Math.max(...months.map((m) => m.income + m.expense), 1);
    return `
      <div class="report-grid" style="margin-bottom:14px">
        <div class="card">
          <h3 style="margin-top:0">المصاريف حسب التصنيف</h3>
          ${UI.donut(expenseByCat, 120)}
        </div>
        <div class="card">
          <h3 style="margin-top:0">المداخيل حسب التصنيف</h3>
          ${UI.donut(incomeByCat, 120)}
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-top:0">آخر 6 أشهر</h3>
        <div class="chart-bars">
          ${months
            .map(
              (m) => `
            <div class="chart-col">
              <div class="chart-bars-inner">
                <div class="bar-in" style="height:${(m.income / maxMonth) * 100}px" title="مدخول ${m.income}"></div>
                <div class="bar-out" style="height:${(m.expense / maxMonth) * 100}px" title="مصروف ${m.expense}"></div>
              </div>
              <small class="muted">${m.label}</small>
            </div>`,
            )
            .join('')}
        </div>
      </div>
      <div class="card">
        <button type="button" class="btn btn-primary" id="btn-print-finance">طباعة التقرير المالي</button>
      </div>
    `;
  },

  printFinanceReport() {
    const tx = DB.get('transactions', []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const income = tx.filter((t) => t.type === 'IN').reduce((s, t) => s + Number(t.amount), 0);
    const expense = tx.filter((t) => t.type === 'OUT').reduce((s, t) => s + Number(t.amount), 0);
    const biz = AUTH.getBusiness();
    const rows = tx
      .map(
        (r) =>
          `<tr><td>${r.type === 'IN' ? 'مدخول' : 'مصروف'}</td><td>${UI.escape(r.description || '—')}</td><td>${UI.escape(r.category || '—')}</td><td>${UI.date(r.date)}</td><td>${UI.money(r.amount)}</td></tr>`,
      )
      .join('');
    const body = `
      <div class="doc-head">
        <div><h1>${UI.escape(biz.name || 'منشأتي')}</h1><p class="muted">التقرير المالي</p></div>
        <div style="text-align:end"><p class="muted">${UI.date(new Date())}</p></div>
      </div>
      <p><strong>إجمالي المداخيل:</strong> ${UI.money(income)} &nbsp; | &nbsp; <strong>إجمالي المصاريف:</strong> ${UI.money(expense)} &nbsp; | &nbsp; <strong>الصافي:</strong> ${UI.money(income - expense)}</p>
      <table>
        <thead><tr><th>النوع</th><th>البيان</th><th>التصنيف</th><th>التاريخ</th><th>المبلغ</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">لا عمليات</td></tr>'}</tbody>
      </table>
    `;
    UI.printHTML('التقرير المالي', body);
  },

  /* ========== BACKUP ========== */
  viewBackup() {
    return `
      <div class="page-head">
        <div>
          <h2>نسخ احتياطي</h2>
          <p class="muted">تصدير واستيراد كل بياناتك (LocalStorage)</p>
        </div>
      </div>
      <div class="card">
        <p>احفظ نسخة JSON على جهازك، أو استعد من ملف سابق. مفيد قبل مسح المتصفح أو عند تغيير الجهاز.</p>
        <div class="row-actions" style="justify-content:flex-start;margin-top:12px">
          <button type="button" class="btn btn-primary" id="btn-export">تصدير البيانات</button>
          <label class="btn btn-ghost" style="cursor:pointer">
            استيراد
            <input type="file" id="import-file" accept="application/json,.json" hidden />
          </label>
        </div>
      </div>
    `;
  },

  /* ========== SETTINGS ========== */
  viewSettings() {
    if (!AUTH.isOwner()) {
      return `<div class="card"><p class="muted">هذه الصفحة مخصصة لحساب المالك فقط.</p></div>`;
    }
    return `
      <div class="page-head">
        <div>
          <h2>الإعدادات</h2>
          <p class="muted">${UI.escape(AUTH.currentUser()?.username || '')}</p>
        </div>
      </div>
      <div class="tabs">
        <button type="button" class="tab-btn ${this.settingsTab === 'modules' ? 'active' : ''}" data-tabgroup="settings" data-tab="modules">الوحدات</button>
        <button type="button" class="tab-btn ${this.settingsTab === 'business' ? 'active' : ''}" data-tabgroup="settings" data-tab="business">الملف التجاري</button>
        <button type="button" class="tab-btn ${this.settingsTab === 'users' ? 'active' : ''}" data-tabgroup="settings" data-tab="users">المستخدمون</button>
        <button type="button" class="tab-btn ${this.settingsTab === 'danger' ? 'active' : ''}" data-tabgroup="settings" data-tab="danger">بيانات خطرة</button>
      </div>
      ${
        this.settingsTab === 'business'
          ? this.viewSettingsBusiness()
          : this.settingsTab === 'users'
            ? this.viewSettingsUsers()
            : this.settingsTab === 'danger'
              ? this.viewSettingsDanger()
              : this.viewSettingsModules()
      }
    `;
  },

  viewSettingsModules() {
    const selected = new Set(AUTH.getModules() || []);
    return `
      <div class="card">
        <h3 style="margin-top:0">اختصاصات المنشأة</h3>
        <div class="module-grid" id="settings-modules">
          ${MODULES_META.map(
            (m) => `
            <button type="button" class="module-tile ${selected.has(m.id) ? 'selected' : ''}" data-id="${m.id}">
              <strong>${m.label}</strong>
              <span class="muted" style="font-size:12.5px">${m.desc}</span>
            </button>`,
          ).join('')}
        </div>
        <button type="button" class="btn btn-primary" id="save-modules" style="margin-top:12px">حفظ</button>
      </div>
    `;
  },

  viewSettingsBusiness() {
    const b = AUTH.getBusiness();
    return `
      <div class="card" style="max-width:480px">
        <h3 style="margin-top:0">الملف التجاري</h3>
        <p class="muted">تظهر هذه المعلومات في رأس الفواتير والتقارير المطبوعة.</p>
        <form id="business-form">
          <div class="form-group"><label>اسم المنشأة</label><input class="input" name="name" value="${UI.escape(b.name || '')}" /></div>
          <div class="form-group"><label>الهاتف</label><input class="input" name="phone" value="${UI.escape(b.phone || '')}" /></div>
          <div class="form-group"><label>العنوان</label><input class="input" name="address" value="${UI.escape(b.address || '')}" /></div>
          <div class="form-group"><label>رمز العملة</label><input class="input" name="currency" value="${UI.escape(b.currency || 'دج')}" /></div>
          <button class="btn btn-primary" type="submit">حفظ</button>
        </form>
      </div>
    `;
  },

  viewSettingsUsers() {
    const users = AUTH.listUsers();
    const me = AUTH.currentUser();
    return `
      <div class="card" style="margin-bottom:14px">
        <h3 style="margin-top:0">إضافة مستخدم</h3>
        <form id="user-form" class="form-row cols-4">
          <input class="input" name="name" placeholder="الاسم" required />
          <input class="input" name="username" placeholder="اسم المستخدم / البريد" required />
          <input class="input" name="password" type="password" placeholder="كلمة المرور" required />
          <select class="select" name="role">
            <option value="staff">موظف</option>
            <option value="owner">مالك</option>
          </select>
          <button class="btn btn-primary" type="submit" style="grid-column:1/-1">إضافة مستخدم</button>
        </form>
      </div>
      <div class="card">
        <h3 style="margin-top:0">المستخدمون (${users.length})</h3>
        ${users
          .map(
            (u) => `
          <div class="user-row ${u.active === false ? 'inactive' : ''}">
            <div>
              <strong>${UI.escape(u.name)}</strong>
              <span class="role-pill" style="background:var(--bg-soft);color:var(--text-soft)">${u.role === 'owner' ? 'مالك' : 'موظف'}</span>
              <div class="muted" style="font-size:12.5px">${UI.escape(u.username)} ${u.active === false ? '· معطّل' : ''}</div>
            </div>
            <div class="row-actions">
              <button type="button" class="btn btn-ghost btn-sm reset-pass" data-id="${u.id}">كلمة مرور جديدة</button>
              <button type="button" class="btn btn-ghost btn-sm toggle-user" data-id="${u.id}">${u.active === false ? 'تفعيل' : 'تعطيل'}</button>
              ${u.id !== me?.id ? `<button type="button" class="btn btn-ghost btn-sm del-user" data-id="${u.id}">حذف</button>` : ''}
            </div>
          </div>`,
          )
          .join('')}
      </div>
    `;
  },

  viewSettingsDanger() {
    return `
      <div class="card">
        <h3 style="margin-top:0">بيانات خطرة</h3>
        <p class="muted">مسح كل المنتجات والمواشي والمشاريع والمعاملات والديون (يبقى الحساب والمستخدمون).</p>
        <button type="button" class="btn btn-danger" id="clear-data">مسح بيانات العمل</button>
      </div>
    `;
  },

  /* ========== SHARED TAB BINDER ========== */
  bindTabs() {
    UI.qsa('[data-tabgroup]').forEach((btn) => {
      btn.onclick = () => {
        const group = btn.dataset.tabgroup;
        const tab = btn.dataset.tab;
        if (group === 'shops') this.shopsTab = tab;
        if (group === 'finance') this.financeTab = tab;
        if (group === 'settings') this.settingsTab = tab;
        this.navigate(this.view);
      };
    });
  },

  bindViewHandlers(view) {
    this.bindTabs();

    if (view === 'shops') {
      UI.bindToolbar('products-tb', this.getTableState('products', {}), (s) => {
        this.setTableState('products', s);
        this.navigate('shops');
      });
      UI.bindToolbar('sales-tb', this.getTableState('sales', {}), (s) => {
        this.setTableState('sales', s);
        this.navigate('shops');
      });

      UI.qs('#product-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const products = DB.get('products', []);
        products.push({
          id: DB.uid(),
          name: String(fd.get('name') || '').trim(),
          category: String(fd.get('category') || '').trim(),
          quantity: Number(fd.get('quantity')) || 0,
          price: Number(fd.get('price')) || 0,
          minQuantity: Number(fd.get('minQuantity')) || 0,
          unit: 'وحدة',
        });
        DB.set('products', products);
        UI.toast('تمت إضافة المنتج', 'success');
        this.navigate('shops');
      });
      UI.qsa('.cart-qty').forEach((inp) => {
        inp.addEventListener('change', () => {
          this.cart[inp.dataset.id] = Number(inp.value) || 0;
          this.navigate('shops');
        });
      });
      UI.qsa('.del-product').forEach((btn) => {
        btn.addEventListener('click', () => {
          DB.set(
            'products',
            DB.get('products', []).filter((p) => p.id !== btn.dataset.id),
          );
          delete this.cart[btn.dataset.id];
          UI.toast('حُذف المنتج', 'success');
          this.navigate('shops');
        });
      });
      UI.qs('#pos-checkout')?.addEventListener('click', () => {
        const products = DB.get('products', []);
        const items = [];
        let total = 0;
        for (const [id, qty] of Object.entries(this.cart)) {
          if (!qty) continue;
          const p = products.find((x) => x.id === id);
          if (!p) continue;
          if (p.quantity < qty) {
            UI.toast(`كمية غير كافية: ${p.name}`, 'error');
            return;
          }
          p.quantity -= qty;
          const sub = p.price * qty;
          total += sub;
          items.push({ productId: id, name: p.name, qty, price: p.price, sub });
        }
        if (!items.length) {
          UI.toast('السلة فارغة', 'error');
          return;
        }
        DB.set('products', products);
        const customer = UI.qs('#pos-customer')?.value.trim() || 'زبون عابر';
        const sales = DB.get('sales', []);
        sales.push({
          id: DB.uid(),
          items,
          total,
          customer,
          createdAt: new Date().toISOString(),
        });
        DB.set('sales', sales);
        const tx = DB.get('transactions', []);
        tx.push({
          id: DB.uid(),
          type: 'IN',
          amount: total,
          description: 'بيع POS - ' + customer,
          category: 'مبيعات',
          date: new Date().toISOString(),
        });
        DB.set('transactions', tx);
        this.cart = {};
        UI.toast(`تم البيع — ${UI.money(total)}`, 'success');
        this.navigate('shops');
      });
      UI.qsa('.print-invoice').forEach((btn) => {
        btn.addEventListener('click', () => this.printInvoice(btn.dataset.id));
      });
    }

    if (view === 'livestock') {
      UI.bindToolbar('animals-tb', this.getTableState('animals', {}), (s) => {
        this.setTableState('animals', s);
        this.navigate('livestock');
      });
      UI.qs('#animal-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const tag = String(fd.get('tag') || '').trim();
        const animals = DB.get('animals', []);
        if (animals.some((a) => a.tag === tag)) {
          UI.toast('رقم الوسم مستخدم', 'error');
          return;
        }
        animals.push({
          id: DB.uid(),
          tag,
          breed: String(fd.get('breed') || '').trim(),
          nextVaccine: fd.get('nextVaccine') || null,
          createdAt: new Date().toISOString(),
        });
        DB.set('animals', animals);
        UI.toast('تمت الإضافة', 'success');
        this.navigate('livestock');
      });
      UI.qsa('.del-animal').forEach((btn) => {
        btn.addEventListener('click', () => {
          DB.set(
            'animals',
            DB.get('animals', []).filter((a) => a.id !== btn.dataset.id),
          );
          DB.set(
            'health',
            DB.get('health', []).filter((h) => h.animalId !== btn.dataset.id),
          );
          this.navigate('livestock');
        });
      });
      UI.qsa('.health-btn').forEach((btn) => {
        btn.addEventListener('click', () => this.openHealthModal(btn.dataset.id));
      });
      UI.qs('#feed-calc')?.addEventListener('click', () => {
        const heads = Number(UI.qs('#feed-heads').value) || 0;
        const kg = Number(UI.qs('#feed-kg').value) || 0;
        const bagKg = Number(UI.qs('#feed-bag').value) || 50;
        const bagPrice = Number(UI.qs('#feed-price').value) || 0;
        const dailyKg = heads * kg;
        const monthlyKg = dailyKg * 30;
        const bagsMonth = bagKg ? monthlyKg / bagKg : 0;
        const costMonth = bagsMonth * bagPrice;
        UI.qs('#feed-result').textContent = `شهرياً ≈ ${bagsMonth.toFixed(1)} كيس — تكلفة ${UI.money(
          Math.round(costMonth),
        )} (≈ ${UI.money(heads ? Math.round(costMonth / heads) : 0)} / رأس)`;
      });
    }

    if (view === 'construction') {
      UI.bindToolbar('tasks-tb', this.getTableState('tasks', {}), (s) => {
        this.setTableState('tasks', s);
        this.navigate('construction');
      });
      UI.qs('#project-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const projects = DB.get('projects', []);
        const id = DB.uid();
        projects.push({
          id,
          name: String(fd.get('name') || '').trim(),
          startDate: new Date().toISOString(),
          progress: 0,
        });
        DB.set('projects', projects);
        const tasks = DB.get('tasks', []);
        tasks.push({
          id: DB.uid(),
          projectId: id,
          title: 'مرحلة أولى',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          progress: 0,
        });
        DB.set('tasks', tasks);
        UI.toast('تم إنشاء المشروع', 'success');
        this.navigate('construction');
      });
      UI.qsa('.add-task').forEach((btn) => {
        btn.addEventListener('click', () => {
          const title = prompt('عنوان المهمة');
          if (!title) return;
          const tasks = DB.get('tasks', []);
          tasks.push({
            id: DB.uid(),
            projectId: btn.dataset.id,
            title,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            progress: 0,
          });
          DB.set('tasks', tasks);
          this.navigate('construction');
        });
      });
      UI.qsa('.del-project').forEach((btn) => {
        btn.addEventListener('click', () => {
          DB.set(
            'projects',
            DB.get('projects', []).filter((p) => p.id !== btn.dataset.id),
          );
          DB.set(
            'tasks',
            DB.get('tasks', []).filter((t) => t.projectId !== btn.dataset.id),
          );
          this.navigate('construction');
        });
      });
      UI.qsa('.print-project').forEach((btn) => {
        btn.addEventListener('click', () => this.printProjectReport(btn.dataset.id));
      });
      UI.qsa('.del-task').forEach((btn) => {
        btn.addEventListener('click', () => {
          DB.set(
            'tasks',
            DB.get('tasks', []).filter((t) => t.id !== btn.dataset.id),
          );
          this.navigate('construction');
        });
      });
      UI.qsa('.task-range').forEach((range) => {
        const output = range.parentElement.querySelector('output');
        range.addEventListener('input', () => {
          output.textContent = range.value + '%';
        });
        range.addEventListener('change', () => {
          const tasks = DB.get('tasks', []);
          const t = tasks.find((x) => x.id === range.dataset.id);
          if (t) {
            t.progress = Number(range.value);
            DB.set('tasks', tasks);
            UI.toast('تم تحديث التقدم', 'success');
          }
          this.navigate('construction');
        });
      });
    }

    if (view === 'finance') {
      UI.bindToolbar('tx-tb', this.getTableState('tx', {}), (s) => {
        this.setTableState('tx', s);
        this.navigate('finance');
      });
      UI.bindToolbar('debts-tb', this.getTableState('debts', {}), (s) => {
        this.setTableState('debts', s);
        this.navigate('finance');
      });

      UI.qs('#tx-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const tx = DB.get('transactions', []);
        tx.push({
          id: DB.uid(),
          type: fd.get('type'),
          amount: Number(fd.get('amount')) || 0,
          description: String(fd.get('description') || ''),
          category: String(fd.get('category') || ''),
          date: new Date().toISOString(),
        });
        DB.set('transactions', tx);
        UI.toast('تم الحفظ', 'success');
        this.navigate('finance');
      });
      UI.qsa('.del-tx').forEach((btn) => {
        btn.addEventListener('click', () => {
          DB.set(
            'transactions',
            DB.get('transactions', []).filter((t) => t.id !== btn.dataset.id),
          );
          this.navigate('finance');
        });
      });

      UI.qs('#debt-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const debts = DB.get('debts', []);
        debts.push({
          id: DB.uid(),
          type: fd.get('type'),
          party: String(fd.get('party') || '').trim(),
          amount: Number(fd.get('amount')) || 0,
          dueDate: fd.get('dueDate') || null,
          settled: false,
          createdAt: new Date().toISOString(),
        });
        DB.set('debts', debts);
        UI.toast('تمت إضافة الدين', 'success');
        this.navigate('finance');
      });
      UI.qsa('.settle-debt').forEach((btn) => {
        btn.addEventListener('click', () => {
          const debts = DB.get('debts', []);
          const d = debts.find((x) => x.id === btn.dataset.id);
          if (d) d.settled = true;
          DB.set('debts', debts);
          UI.toast('تمت التسوية', 'success');
          this.navigate('finance');
        });
      });
      UI.qsa('.del-debt').forEach((btn) => {
        btn.addEventListener('click', () => {
          DB.set(
            'debts',
            DB.get('debts', []).filter((d) => d.id !== btn.dataset.id),
          );
          this.navigate('finance');
        });
      });

      UI.qs('#btn-print-finance')?.addEventListener('click', () => this.printFinanceReport());
    }

    if (view === 'backup') {
      UI.qs('#btn-export')?.addEventListener('click', () => {
        const data = DB.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `manager-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        UI.toast('تم التصدير', 'success');
      });
      UI.qs('#import-file')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          DB.importAll(data);
          UI.toast('تم الاستيراد', 'success');
          this.renderNav();
          this.navigate('dashboard');
        } catch {
          UI.toast('فشل قراءة الملف', 'error');
        }
      });
    }

    if (view === 'settings') {
      UI.qs('#settings-modules')?.addEventListener('click', (e) => {
        const t = e.target.closest('.module-tile');
        if (t) t.classList.toggle('selected');
      });
      UI.qs('#save-modules')?.addEventListener('click', () => {
        const ids = UI.qsa('#settings-modules .module-tile.selected').map((el) => el.dataset.id);
        if (!ids.length) {
          UI.toast('اختر وحدة واحدة على الأقل', 'error');
          return;
        }
        AUTH.setModules(ids);
        UI.toast('تم الحفظ', 'success');
        this.renderNav();
        this.navigate('dashboard');
      });
      UI.qs('#business-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        AUTH.setBusiness({
          name: String(fd.get('name') || '').trim() || 'منشأتي',
          phone: String(fd.get('phone') || '').trim(),
          address: String(fd.get('address') || '').trim(),
          currency: String(fd.get('currency') || 'دج').trim() || 'دج',
        });
        UI.toast('تم حفظ الملف التجاري', 'success');
        UI.qs('#brand-sub').textContent = AUTH.getBusiness().name;
        this.navigate('settings');
      });
      UI.qs('#user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await AUTH.addUser({
            name: fd.get('name'),
            username: fd.get('username'),
            password: fd.get('password'),
            role: fd.get('role'),
          });
          UI.toast('تمت إضافة المستخدم', 'success');
          this.navigate('settings');
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });
      UI.qsa('.reset-pass').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const pass = prompt('كلمة المرور الجديدة (6 خانات على الأقل):');
          if (!pass) return;
          try {
            await AUTH.setPassword(btn.dataset.id, pass);
            UI.toast('تم تحديث كلمة المرور', 'success');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      });
      UI.qsa('.toggle-user').forEach((btn) => {
        btn.addEventListener('click', () => {
          try {
            AUTH.toggleUserActive(btn.dataset.id);
            this.navigate('settings');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      });
      UI.qsa('.del-user').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!confirm('حذف هذا المستخدم؟')) return;
          try {
            AUTH.removeUser(btn.dataset.id);
            UI.toast('تم الحذف', 'success');
            this.navigate('settings');
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        });
      });
      UI.qs('#clear-data')?.addEventListener('click', () => {
        if (!confirm('مسح كل بيانات العمل؟')) return;
        DB.clearBusinessData();
        this.cart = {};
        UI.toast('تم المسح', 'success');
        this.navigate('dashboard');
      });
    }
  },

  openHealthModal(animalId) {
    const slot = UI.qs('#health-modal-slot');
    if (!slot) return;
    let picked = new Set();
    const history = DB.get('health', [])
      .filter((h) => h.animalId === animalId)
      .sort((a, b) => (b.recordedAt || '').localeCompare(a.recordedAt || ''));
    slot.innerHTML = `
      <div class="modal-backdrop" id="health-backdrop">
        <div class="modal">
          <h3 style="margin-top:0">تسجيل أعراض</h3>
          <div id="sym-chips">
            ${SYMPTOMS.map((s) => `<button type="button" class="chip" data-id="${s.id}">${s.label}</button>`).join('')}
          </div>
          <div class="form-group" style="margin-top:12px">
            <label>ملاحظات</label>
            <textarea class="textarea" id="health-notes" rows="2"></textarea>
          </div>
          <div class="row-actions" style="justify-content:flex-start;margin-top:12px">
            <button type="button" class="btn btn-primary" id="health-save">حفظ</button>
            <button type="button" class="btn btn-ghost" id="health-cancel">إلغاء</button>
          </div>
          ${
            history.length
              ? `<hr style="border-color:var(--border);margin:16px 0" />
            <h4 style="margin:0 0 8px">السجل السابق</h4>
            <div style="max-height:160px;overflow:auto">
              ${history
                .map(
                  (h) => `
                <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
                  <strong>${UI.date(h.recordedAt)}</strong> —
                  ${(h.symptoms || []).map((id) => SYMPTOMS.find((s) => s.id === id)?.label || id).join('، ') || '—'}
                  ${h.notes ? `<div class="muted">${UI.escape(h.notes)}</div>` : ''}
                </div>`,
                )
                .join('')}
            </div>`
              : ''
          }
        </div>
      </div>`;
    UI.qs('#sym-chips').onclick = (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      c.classList.toggle('on');
      if (c.classList.contains('on')) picked.add(c.dataset.id);
      else picked.delete(c.dataset.id);
    };
    UI.qs('#health-cancel').onclick = () => {
      slot.innerHTML = '';
    };
    UI.qs('#health-backdrop').onclick = (e) => {
      if (e.target.id === 'health-backdrop') slot.innerHTML = '';
    };
    UI.qs('#health-save').onclick = () => {
      const health = DB.get('health', []);
      health.push({
        id: DB.uid(),
        animalId,
        symptoms: [...picked],
        notes: UI.qs('#health-notes').value,
        recordedAt: new Date().toISOString(),
      });
      DB.set('health', health);
      slot.innerHTML = '';
      UI.toast('سُجّل السجل الصحي', 'success');
      this.navigate('livestock');
    };
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
