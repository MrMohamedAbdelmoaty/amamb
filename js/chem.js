/* ============================================================
   AMAMB — Chemistry toolkit
   - Periodic table browser + element CRUD (admin)
   - Constants (experimental values) CRUD (admin) / viewer
   - Equations list CRUD (admin) / viewer
   - Balance checker: parses "2H2 + O2 -> 2H2O" and verifies atoms
   ============================================================ */
const ChemPages = {
  ar() { return getLang() === 'ar'; },

  /* ---------- equation balancing engine ---------- */
  parseFormula(src) {
    // returns map of element -> count ; supports (group)2 and nested parens
    let i = 0;
    const s = String(src || '');
    const readGroup = () => {
      const counts = {};
      while (i < s.length) {
        const ch = s[i];
        if (ch === '(') {
          i++;
          const inner = readGroup();
          i++; // skip ')'
          const num = readNumber();
          for (const k in inner) counts[k] = (counts[k] || 0) + inner[k] * num;
        } else if (ch === ')') {
          break;
        } else if (/[A-Z]/.test(ch)) {
          let sym = ch; i++;
          while (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
          const num = readNumber();
          counts[sym] = (counts[sym] || 0) + num;
        } else { i++; }
      }
      return counts;
    };
    const readNumber = () => {
      let n = '';
      while (i < s.length && /[0-9]/.test(s[i])) { n += s[i]; i++; }
      return n ? parseInt(n, 10) : 1;
    };
    return readGroup();
  },
  sideAtoms(side) {
    const total = {};
    const terms = String(side || '').split('+').map(x => x.trim()).filter(Boolean);
    for (const term of terms) {
      const m = term.match(/^(\d+)?\s*(.*)$/);
      const coef = m && m[1] ? parseInt(m[1], 10) : 1;
      const counts = this.parseFormula((m && m[2]) || term);
      for (const k in counts) total[k] = (total[k] || 0) + counts[k] * coef;
    }
    return total;
  },
  checkBalance(eq) {
    const clean = String(eq || '').replace(/→/g, '->').replace(/⇌|⇋/g, '->').replace(/=>|=\u003E/g, '->');
    const parts = clean.split(/->|=/);
    if (parts.length !== 2) return { ok: false, error: this.ar() ? 'الصيغة غير مفهومة — استخدم سهم واحد مثل: 2H2 + O2 -> 2H2O' : 'Could not parse — use a single arrow, e.g. 2H2 + O2 -> 2H2O' };
    const left = this.sideAtoms(parts[0]);
    const right = this.sideAtoms(parts[1]);
    const elements = Array.from(new Set(Object.keys(left).concat(Object.keys(right))));
    if (!elements.length) return { ok: false, error: this.ar() ? 'لا توجد رموز عناصر في المعادلة' : 'No element symbols found' };
    const rows = elements.map(el => ({ el, left: left[el] || 0, right: right[el] || 0, balanced: (left[el] || 0) === (right[el] || 0) }));
    return { ok: true, rows, balanced: rows.every(r => r.balanced), left, right };
  },

  /* ---------- data ---------- */
  async loadAll() {
    const [elements, constants, equations] = await Promise.all([
      API.select('chemistry_elements', 'select=*&order=atomic_number'),
      API.select('chemistry_constants', 'select=*&order=category,position'),
      API.select('equations', 'select=*')
    ]);
    return { elements: elements || [], constants: constants || [], equations: equations || [] };
  },

  elementCategoryColor(cat) {
    const key = String(cat || '').toLowerCase();
    if (/قلو|alkali(?! earth)/.test(key)) return '#f97316';
    if (/قلوية ترابية|alkaline/.test(key)) return '#fbbf24';
    if (/انتقال|transition/.test(key)) return '#a78bfa';
    if (/هالوجين|halogen/.test(key)) return '#34d399';
    if (/نبيلة|noble/.test(key)) return '#60a5fa';
    if (/لافلز|nonmet/.test(key)) return '#f472b6';
    if (/شبه|metalloid/.test(key)) return '#2dd4bf';
    if (/فلز أساس|post/.test(key)) return '#94a3b8';
    if (/لانتان|lanthan/.test(key)) return '#c084fc';
    return '#e2b07e';
  },

  /* ---------- shared render ---------- */
  async render(root, isAdmin) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const data = await this.loadAll();
    const tabs = isAdmin
      ? [['table', this.ar() ? 'الجدول الدوري' : 'Periodic Table'], ['constants', this.ar() ? 'الثوابت والقيم' : 'Constants'], ['equations', this.ar() ? 'المعادلات' : 'Equations'], ['balance', this.ar() ? 'موازنة المعادلة' : 'Balance Checker']]
      : [['table', this.ar() ? 'الجدول الدوري' : 'Periodic Table'], ['constants', this.ar() ? 'الثوابت والقيم' : 'Constants'], ['equations', this.ar() ? 'المعادلات' : 'Equations'], ['balance', this.ar() ? 'موازنة المعادلة' : 'Balance Checker']];
    root.innerHTML = `
      <div class="card">
        <div class="card-head" style="gap:.5rem;flex-wrap:wrap">
          <div class="card-title">🧪 ${this.ar() ? 'أدوات الكيمياء' : 'Chemistry Tools'}</div>
          <div style="display:flex;gap:.4rem;margin-inline-start:auto;flex-wrap:wrap">
            ${tabs.map(([id, label], i) => `<button class="btn ${i === 0 ? 'primary' : 'ghost'} small" data-ctab="${id}">${escapeHtml(label)}</button>`).join('')}
          </div>
        </div>
        <div id="chemPane"></div>
      </div>`;
    const pane = $('#chemPane', root);
    const show = (name) => {
      $$('[data-ctab]', root).forEach(b => b.classList.toggle('primary', b.dataset.ctab === name));
      $$('[data-ctab]', root).forEach(b => b.classList.toggle('ghost', b.dataset.ctab !== name));
      if (name === 'table') this.renderTable(pane, data, isAdmin, root);
      else if (name === 'constants') this.renderConstants(pane, data, isAdmin, root);
      else if (name === 'equations') this.renderEquations(pane, data, isAdmin, root);
      else this.renderBalance(pane);
    };
    $$('[data-ctab]', root).forEach(b => b.addEventListener('click', () => show(b.dataset.ctab)));
    show('table');
  },

  /* ---------- periodic table ---------- */
  renderTable(pane, data, isAdmin, pageRoot) {
    const elements = data.elements;
    pane.innerHTML = `
      ${isAdmin ? `<div style="display:flex;justify-content:flex-end;margin-bottom:.6rem"><button class="btn primary small" id="addElementBtn">+ ${this.ar() ? 'إضافة عنصر' : 'Add element'}</button></div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:.45rem">
        ${elements.map(el => `
          <div style="border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:.4rem .35rem;text-align:center;background:${this.elementCategoryColor(el.category)}18;position:relative">
            <div style="font-size:.62rem;color:#64748b;display:flex;justify-content:space-between"><span>${escapeHtml(el.atomic_number)}</span>${isAdmin ? `<span style="display:flex;gap:.2rem"><button data-edit-el="${el.id}" style="border:none;background:none;cursor:pointer;font-size:.75rem">✏️</button><button data-del-el="${el.id}" style="border:none;background:none;cursor:pointer;font-size:.75rem">🗑️</button></span>` : ''}</div>
            <div style="font-weight:800;font-size:1.35rem;line-height:1.2;color:${this.elementCategoryColor(el.category)}">${escapeHtml(el.symbol)}</div>
            <div style="font-size:.68rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(this.ar() ? el.name_ar : el.name_en)}</div>
            <div style="font-size:.62rem;color:#64748b" dir="ltr">${escapeHtml(el.atomic_mass == null ? '' : el.atomic_mass)}</div>
          </div>`).join('') || `<div class="muted">${t('noData')}</div>`}
      </div>`;
    if (!isAdmin) return;
    $('#addElementBtn', pane).addEventListener('click', () => this.elementForm(null, pageRoot));
    $$('[data-edit-el]', pane).forEach(b => b.addEventListener('click', () => this.elementForm(elements.find(e => e.id === b.dataset.editEl), pageRoot)));
    $$('[data-del-el]', pane).forEach(b => b.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => {
        await API.remove('chemistry_elements', 'id=eq.' + b.dataset.delEl);
        await audit('delete', 'chemistry_elements', b.dataset.delEl, {});
        toast(t('deleted'), 'success'); ChemPages.render(pageRoot, true);
      }, true);
    }));
  },

  elementForm(el, pageRoot) {
    const editing = !!el;
    const categories = ['فلزات قلوية', 'قلوية ترابية', 'عناصر انتقالية', 'فلزات أساسية', 'شبه فلزية', 'لافلزات', 'هالوجينات', 'غازات نبيلة', 'لانثانيدات', 'أكتينيدات'];
    openModal({
      title: editing ? (this.ar() ? 'تعديل عنصر' : 'Edit element') : (this.ar() ? 'إضافة عنصر' : 'Add element'),
      bodyHtml: `
        <div class="form-row cols-2">
          <div><label>${this.ar() ? 'العدد الذري' : 'Atomic number'} *</label><input class="input" id="fElZ" type="number" min="1" max="118" value="${editing ? el.atomic_number : ''}"></div>
          <div><label>${this.ar() ? 'الرمز' : 'Symbol'} *</label><input class="input" id="fElSym" dir="ltr" maxlength="3" value="${editing ? escapeHtml(el.symbol) : ''}"></div>
        </div>
        <div class="form-row cols-2">
          <div><label>${this.ar() ? 'الاسم بالعربي' : 'Name (Arabic)'} *</label><input class="input" id="fElAr" value="${editing ? escapeHtml(el.name_ar || '') : ''}"></div>
          <div><label>${this.ar() ? 'الاسم بالإنجليزي' : 'Name (English)'} *</label><input class="input" id="fElEn" dir="ltr" value="${editing ? escapeHtml(el.name_en || '') : ''}"></div>
        </div>
        <div class="form-row cols-2">
          <div><label>${this.ar() ? 'الكتلة الذرية' : 'Atomic mass'}</label><input class="input" id="fElMass" dir="ltr" type="number" step="0.001" value="${editing && el.atomic_mass != null ? el.atomic_mass : ''}"></div>
          <div><label>${this.ar() ? 'التصنيف' : 'Category'}</label><input class="input" id="fElCat" list="elCatList" value="${editing ? escapeHtml(el.category || '') : ''}"><datalist id="elCatList">${categories.map(c => `<option value="${escapeHtml(c)}">`).join('')}</datalist></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveElBtn">${t('save')}</button>`,
      onOpen(mroot) {
        $('#saveElBtn', mroot).addEventListener('click', async () => {
          const z = parseInt($('#fElZ', mroot).value, 10);
          const symbol = $('#fElSym', mroot).value.trim();
          const name_ar = $('#fElAr', mroot).value.trim(), name_en = $('#fElEn', mroot).value.trim();
          const massRaw = $('#fElMass', mroot).value.trim();
          if (!z || !symbol || !name_ar || !name_en) return toast(t('required'), 'error');
          const body = { atomic_number: z, symbol, name_ar, name_en, atomic_mass: massRaw === '' ? null : Number(massRaw), category: $('#fElCat', mroot).value.trim() || null };
          try {
            if (editing) await API.update('chemistry_elements', 'id=eq.' + el.id, body);
            else await API.insert('chemistry_elements', [body]);
            await audit(editing ? 'update' : 'create', 'chemistry_elements', editing ? el.id : null, { symbol });
            closeModal(); toast(t('saved'), 'success'); ChemPages.render(pageRoot, true);
          } catch (e) { toast(t('dbError') + ' — ' + String(e.message || e).slice(0, 120), 'error'); }
        });
      }
    });
  },

  /* ---------- constants ---------- */
  renderConstants(pane, data, isAdmin, pageRoot) {
    const groups = {};
    data.constants.forEach(c => { (groups[c.category || '—'] = groups[c.category || '—'] || []).push(c); });
    pane.innerHTML = `
      ${isAdmin ? `<div style="display:flex;justify-content:flex-end;margin-bottom:.6rem"><button class="btn primary small" id="addConstBtn">+ ${this.ar() ? 'إضافة ثابت/قيمة' : 'Add constant'}</button></div>` : ''}
      ${Object.keys(groups).length ? Object.keys(groups).map(cat => `
        <div class="card" style="box-shadow:none;margin-bottom:.7rem">
          <div class="card-title" style="font-size:.95rem;margin-bottom:.4rem">📌 ${escapeHtml(cat)}</div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${this.ar() ? 'الثابت' : 'Constant'}</th><th>${this.ar() ? 'القيمة' : 'Value'}</th><th>${this.ar() ? 'الوحدة' : 'Unit'}</th>${isAdmin ? `<th>${t('actions')}</th>` : ''}</tr></thead>
            <tbody>${groups[cat].map(c => `<tr>
              <td><b>${escapeHtml(this.ar() ? c.name_ar : c.name_en)}</b><div class="small muted" dir="ltr">${escapeHtml(c.name_en || '')}</div></td>
              <td dir="ltr" style="font-family:monospace">${escapeHtml(c.value)}</td>
              <td>${escapeHtml(c.unit || '—')}</td>
              ${isAdmin ? `<td style="white-space:nowrap"><button class="btn ghost small" data-edit-const="${c.id}">✏️</button> <button class="btn ghost small" data-del-const="${c.id}">🗑️</button></td>` : ''}
            </tr>`).join('')}</tbody>
          </table></div>
        </div>`).join('') : emptyState()}`;
    if (!isAdmin) return;
    $('#addConstBtn', pane).addEventListener('click', () => this.constantForm(null, pageRoot));
    $$('[data-edit-const]', pane).forEach(b => b.addEventListener('click', () => this.constantForm(data.constants.find(c => c.id === b.dataset.editConst), pageRoot)));
    $$('[data-del-const]', pane).forEach(b => b.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => {
        await API.remove('chemistry_constants', 'id=eq.' + b.dataset.delConst);
        await audit('delete', 'chemistry_constants', b.dataset.delConst, {});
        toast(t('deleted'), 'success'); ChemPages.render(pageRoot, true);
      }, true);
    }));
  },

  constantForm(c, pageRoot) {
    const editing = !!c;
    openModal({
      title: editing ? (this.ar() ? 'تعديل ثابت' : 'Edit constant') : (this.ar() ? 'إضافة ثابت/قيمة' : 'Add constant'),
      bodyHtml: `
        <div class="form-row cols-2">
          <div><label>${this.ar() ? 'الاسم بالعربي' : 'Name (AR)'} *</label><input class="input" id="fCAr" value="${editing ? escapeHtml(c.name_ar || '') : ''}"></div>
          <div><label>${this.ar() ? 'الاسم بالإنجليزي' : 'Name (EN)'}</label><input class="input" id="fCEn" dir="ltr" value="${editing ? escapeHtml(c.name_en || '') : ''}"></div>
        </div>
        <div class="form-row cols-2">
          <div><label>${this.ar() ? 'القيمة' : 'Value'} *</label><input class="input" id="fCVal" dir="ltr" value="${editing ? escapeHtml(c.value || '') : ''}"></div>
          <div><label>${this.ar() ? 'الوحدة' : 'Unit'}</label><input class="input" id="fCUnit" dir="ltr" value="${editing ? escapeHtml(c.unit || '') : ''}"></div>
        </div>
        <div class="form-row cols-2">
          <div><label>${this.ar() ? 'التصنيف' : 'Category'}</label><input class="input" id="fCCat" list="constCatList" value="${editing ? escapeHtml(c.category || '') : ''}"><datalist id="constCatList"><option value="الذرة"><option value="العناصر"><option value="الأحماض"><option value="القواعد"><option value="التكافؤ"><option value="الغازات"><option value="الطاقة"></datalist></div>
          <div><label>${this.ar() ? 'الترتيب' : 'Position'}</label><input class="input" id="fCPos" type="number" value="${editing ? (c.position || 0) : 0}"></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveConstBtn">${t('save')}</button>`,
      onOpen(mroot) {
        $('#saveConstBtn', mroot).addEventListener('click', async () => {
          const name_ar = $('#fCAr', mroot).value.trim(), value = $('#fCVal', mroot).value.trim();
          if (!name_ar || !value) return toast(t('required'), 'error');
          const body = { name_ar, name_en: $('#fCEn', mroot).value.trim() || null, value, unit: $('#fCUnit', mroot).value.trim() || null, category: $('#fCCat', mroot).value.trim() || null, position: parseInt($('#fCPos', mroot).value, 10) || 0 };
          try {
            if (editing) await API.update('chemistry_constants', 'id=eq.' + c.id, body);
            else await API.insert('chemistry_constants', [body]);
            await audit(editing ? 'update' : 'create', 'chemistry_constants', editing ? c.id : null, { name_ar });
            closeModal(); toast(t('saved'), 'success'); ChemPages.render(pageRoot, true);
          } catch (e) { toast(t('dbError'), 'error'); }
        });
      }
    });
  },

  /* ---------- equations ---------- */
  renderEquations(pane, data, isAdmin, pageRoot) {
    pane.innerHTML = `
      ${isAdmin ? `<div style="display:flex;justify-content:flex-end;margin-bottom:.6rem"><button class="btn primary small" id="addEqBtn">+ ${this.ar() ? 'إضافة معادلة' : 'Add equation'}</button></div>` : ''}
      <div style="display:flex;flex-direction:column;gap:.5rem">
        ${data.equations.map(eq => `
          <div class="card" style="margin:0;box-shadow:none;padding:.6rem .8rem;display:flex;gap:.7rem;align-items:center">
            <div style="flex:1">
              <div dir="ltr" style="font-family:monospace;font-size:1rem;text-align:start">${escapeHtml(eq.equation)}</div>
              ${(eq.note_ar || eq.note_en) ? `<div class="small muted" style="margin-top:.25rem">${escapeHtml(this.ar() ? (eq.note_ar || '') : (eq.note_en || eq.note_ar || ''))}</div>` : ''}
            </div>
            <button class="btn ghost small" data-check-eq="${escapeHtml(eq.equation)}" title="${this.ar() ? 'فحص الاتزان' : 'Check balance'}">⚖️</button>
            ${isAdmin ? `<button class="btn ghost small" data-edit-eq="${eq.id}">✏️</button><button class="btn ghost small" data-del-eq="${eq.id}">🗑️</button>` : ''}
          </div>`).join('') || emptyState()}
      </div>
      <div id="eqBalanceResult" style="margin-top:.6rem"></div>`;
    $$('[data-check-eq]', pane).forEach(b => b.addEventListener('click', () => {
      const res = this.checkBalance(b.dataset.checkEq);
      $('#eqBalanceResult', pane).innerHTML = this._balanceResultHtml(res, b.dataset.checkEq);
    }));
    if (!isAdmin) return;
    $('#addEqBtn', pane).addEventListener('click', () => this.equationForm(null, pageRoot));
    $$('[data-edit-eq]', pane).forEach(b => b.addEventListener('click', () => this.equationForm(data.equations.find(e => e.id === b.dataset.editEq), pageRoot)));
    $$('[data-del-eq]', pane).forEach(b => b.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => {
        await API.remove('equations', 'id=eq.' + b.dataset.delEq);
        await audit('delete', 'equations', b.dataset.delEq, {});
        toast(t('deleted'), 'success'); ChemPages.render(pageRoot, true);
      }, true);
    }));
  },

  equationForm(eq, pageRoot) {
    const editing = !!eq;
    openModal({
      title: editing ? (this.ar() ? 'تعديل معادلة' : 'Edit equation') : (this.ar() ? 'إضافة معادلة' : 'Add equation'),
      bodyHtml: `
        <div class="form-row"><div><label>${this.ar() ? 'المعادلة (استخدم -> للسهم)' : 'Equation (use -> for the arrow)'} *</label><input class="input" id="fEqText" dir="ltr" style="font-family:monospace" placeholder="2H2 + O2 -> 2H2O" value="${editing ? escapeHtml(eq.equation) : ''}"></div></div>
        <div id="fEqLiveCheck" class="small" style="margin:-.2rem 0 .4rem"></div>
        <div class="form-row cols-2">
          <div><label>${this.ar() ? 'ملاحظة بالعربي' : 'Note (AR)'}</label><input class="input" id="fEqNoteAr" value="${editing ? escapeHtml(eq.note_ar || '') : ''}"></div>
          <div><label>${this.ar() ? 'ملاحظة بالإنجليزي' : 'Note (EN)'}</label><input class="input" id="fEqNoteEn" dir="ltr" value="${editing ? escapeHtml(eq.note_en || '') : ''}"></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveEqBtn">${t('save')}</button>`,
      onOpen(mroot) {
        const live = $('#fEqLiveCheck', mroot);
        const check = () => {
          const v = $('#fEqText', mroot).value.trim();
          if (!v) { live.innerHTML = ''; return; }
          const res = ChemPages.checkBalance(v);
          live.innerHTML = res.ok
            ? (res.balanced ? '<span style="color:#16a34a;font-weight:700">✓ ' + (ChemPages.ar() ? 'المعادلة متزنة' : 'Balanced') + '</span>'
                            : '<span style="color:#d97706;font-weight:700">⚠ ' + (ChemPages.ar() ? 'غير متزنة — راجع الذرات' : 'Not balanced — check atom counts') + '</span>')
            : '<span style="color:#dc2626">' + escapeHtml(res.error || '') + '</span>';
        };
        $('#fEqText', mroot).addEventListener('input', check); check();
        $('#saveEqBtn', mroot).addEventListener('click', async () => {
          const equation = $('#fEqText', mroot).value.trim();
          if (!equation) return toast(t('required'), 'error');
          const body = { equation, note_ar: $('#fEqNoteAr', mroot).value.trim() || null, note_en: $('#fEqNoteEn', mroot).value.trim() || null };
          try {
            if (editing) await API.update('equations', 'id=eq.' + eq.id, body);
            else await API.insert('equations', [body]);
            await audit(editing ? 'update' : 'create', 'equations', editing ? eq.id : null, { equation });
            closeModal(); toast(t('saved'), 'success'); ChemPages.render(pageRoot, true);
          } catch (e) { toast(t('dbError'), 'error'); }
        });
      }
    });
  },

  /* ---------- balance checker tab ---------- */
  renderBalance(pane) {
    const cur = this.ar();
    pane.innerHTML = `
      <p class="muted" style="margin-top:0">${cur ? 'اكتب المعادلة واستخدم الموازين المناسبة — مثال: 2H2 + O2 -> 2H2O' : 'Type the equation with coefficients — e.g. 2H2 + O2 -> 2H2O'}</p>
      <div class="form-row"><div><label>${cur ? 'المعادلة' : 'Equation'}</label><input class="input" id="balInput" dir="ltr" style="font-family:monospace;font-size:1.05rem" placeholder="2H2 + O2 -> 2H2O" value="2H2 + O2 -> 2H2O"></div></div>
      <button class="btn primary" id="balCheckBtn">⚖️ ${cur ? 'افحص الاتزان' : 'Check balance'}</button>
      <div id="balResult" style="margin-top:.7rem"></div>`;
    $('#balCheckBtn', pane).addEventListener('click', () => {
      const eq = $('#balInput', pane).value.trim();
      $('#balResult', pane).innerHTML = this._balanceResultHtml(this.checkBalance(eq), eq);
    });
  },
  _balanceResultHtml(res, eq) {
    if (!res.ok) return `<div class="card" style="border-inline-start:3px solid #dc2626">⚠️ ${escapeHtml(res.error || '')}</div>`;
    return `
      <div class="card" style="box-shadow:none;border-inline-start:3px solid ${res.balanced ? '#16a34a' : '#d97706'}">
        <div style="font-weight:800;font-size:1.05rem;color:${res.balanced ? '#16a34a' : '#d97706'}">${res.balanced ? (this.ar() ? '✓ المعادلة متزنة' : '✓ Equation is balanced') : (this.ar() ? '⚠ المعادلة غير متزنة' : '⚠ Equation is NOT balanced')}</div>
        <div class="table-wrap" style="margin-top:.5rem"><table class="tbl">
          <thead><tr><th>${this.ar() ? 'العنصر' : 'Element'}</th><th>${this.ar() ? 'المتفاعلات' : 'Reactants'}</th><th>${this.ar() ? 'النواتج' : 'Products'}</th><th>${t('status')}</th></tr></thead>
          <tbody>${res.rows.map(r => `<tr><td dir="ltr"><b>${escapeHtml(r.el)}</b></td><td>${r.left}</td><td>${r.right}</td><td>${r.balanced ? '✅' : '❌'}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  }
};
