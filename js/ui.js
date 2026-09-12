const UI = {
  toast(message, type = 'info') {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  },

  escape(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  money(n) {
    const cur = (AUTH.getBusiness && AUTH.getBusiness().currency) || 'دج';
    return Number(n || 0).toLocaleString('ar-DZ') + ' ' + cur;
  },

  date(d) {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('ar-DZ');
    } catch {
      return '—';
    }
  },

  datetime(d) {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('ar-DZ');
    } catch {
      return '—';
    }
  },

  qs(sel, root = document) {
    return root.querySelector(sel);
  },

  qsa(sel, root = document) {
    return [...root.querySelectorAll(sel)];
  },

  debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  /* ---------- generic list search / sort ---------- */
  search(list, fields, q) {
    const query = String(q || '').trim().toLowerCase();
    if (!query) return list;
    return list.filter((item) =>
      fields.some((f) => String(item[f] ?? '').toLowerCase().includes(query)),
    );
  },

  sortList(list, key, dir = 'asc') {
    if (!key) return list;
    const arr = [...list];
    arr.sort((a, b) => {
      let av = a[key],
        bv = b[key];
      if (typeof av === 'string' && !isNaN(Date.parse(av)) && /\d{4}-\d{2}-\d{2}/.test(av)) {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else if (typeof av === 'string') {
        av = av.toLowerCase();
        bv = String(bv ?? '').toLowerCase();
      } else {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  },

  /** Renders a search box + sort dropdown toolbar. Returns HTML string. */
  toolbar({ id, q = '', sortOptions = [], sortKey = '', sortDir = 'asc', placeholder = 'بحث...' }) {
    return `
      <div class="table-toolbar" id="${id}">
        <input class="input tb-search" type="search" placeholder="${placeholder}" value="${this.escape(q)}" />
        ${
          sortOptions.length
            ? `<select class="select tb-sort">
                <option value="">ترتيب...</option>
                ${sortOptions
                  .map(
                    (o) =>
                      `<option value="${o.key}" ${sortKey === o.key ? 'selected' : ''}>${o.label}</option>`,
                  )
                  .join('')}
              </select>
              <button type="button" class="btn btn-ghost btn-sm tb-dir" data-dir="${sortDir}" title="اتجاه الترتيب">${sortDir === 'asc' ? '↑' : '↓'}</button>`
            : ''
        }
      </div>`;
  },

  /** Wires toolbar events; onChange({q,sortKey,sortDir}) is called on any change. */
  bindToolbar(id, state, onChange) {
    const root = this.qs('#' + id);
    if (!root) return;
    const search = this.qs('.tb-search', root);
    const sort = this.qs('.tb-sort', root);
    const dir = this.qs('.tb-dir', root);
    search?.addEventListener(
      'input',
      this.debounce((e) => onChange({ ...state, q: e.target.value }), 200),
    );
    sort?.addEventListener('change', (e) => onChange({ ...state, sortKey: e.target.value }));
    dir?.addEventListener('click', () => {
      const next = state.sortDir === 'asc' ? 'desc' : 'asc';
      onChange({ ...state, sortDir: next });
    });
  },

  /* ---------- tiny charts (no external libs) ---------- */
  /** data: [{label, value, color}] -> CSS conic-gradient donut + legend.
   *  formatter formats the numeric value shown in the hole & legend (defaults to money). */
  donut(data, size = 130, formatter) {
    const fmt = formatter || this.money.bind(this);
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1;
    let acc = 0;
    const stops = data
      .map((d) => {
        const from = (acc / total) * 360;
        acc += Number(d.value) || 0;
        const to = (acc / total) * 360;
        return `${d.color} ${from}deg ${to}deg`;
      })
      .join(', ');
    const gradient = data.length ? `conic-gradient(${stops})` : 'conic-gradient(var(--border) 0deg 360deg)';
    const legend = data
      .map(
        (d) =>
          `<div class="legend-row"><span class="legend-dot" style="background:${d.color}"></span>${this.escape(
            d.label,
          )}<b>${fmt(d.value)}</b></div>`,
      )
      .join('');
    return `
      <div class="donut-wrap">
        <div class="donut" style="width:${size}px;height:${size}px;background:${gradient}">
          <div class="donut-hole">${fmt(total)}</div>
        </div>
        <div class="legend">${legend || '<span class="muted">لا بيانات</span>'}</div>
      </div>`;
  },

  /** data: [{label, value}] -> horizontal bar list, scaled to max */
  hbars(data, colorVar = '--primary') {
    const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
    return `
      <div class="hbars">
        ${data
          .map(
            (d) => `
          <div class="hbar-row">
            <span class="hbar-label">${this.escape(d.label)}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${(d.value / max) * 100}%;background:var(${colorVar})"></div></div>
            <span class="hbar-value">${this.money(d.value)}</span>
          </div>`,
          )
          .join('') || '<p class="empty">لا بيانات كافية</p>'}
      </div>`;
  },

  /* ---------- print / "PDF" (uses browser print-to-PDF) ---------- */
  printHTML(title, bodyHtml) {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
    if (!w) {
      this.toast('الرجاء السماح بالنوافذ المنبثقة للطباعة', 'error');
      return;
    }
    w.document.write(`<!DOCTYPE html>
      <html lang="ar" dir="rtl"><head><meta charset="UTF-8" />
      <title>${this.escape(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Cairo', system-ui, sans-serif; padding: 32px; color: #0f172a; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .muted { color: #64748b; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13.5px; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #dde3ef; text-align: start; }
        th { background: #f0f3fa; font-size: 12px; }
        .doc-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 14px; margin-bottom: 14px; }
        .total-row { font-weight: 800; font-size: 17px; text-align: end; margin-top: 14px; }
        .badge { display: inline-flex; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #e7f7ed; color: #16a34a; }
        @media print { .no-print { display: none; } }
      </style></head>
      <body>
        ${bodyHtml}
        <div class="no-print" style="margin-top:24px;text-align:center">
          <button onclick="window.print()" style="padding:10px 22px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-family:inherit;font-weight:700;cursor:pointer">
            طباعة / حفظ PDF
          </button>
        </div>
        <script>window.onload = () => setTimeout(() => window.print(), 350);</script>
      </body></html>`);
    w.document.close();
  },
};

window.UI = UI;
