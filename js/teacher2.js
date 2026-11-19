/* ============================================================
   AMAMB — Teacher module (part 2): gradebook, attendance, behavior
   ============================================================ */

/* ---------- shared: per-quiz/ticket score grid ---------- */
function scoreGridHtml(item, students, key) {
  const max = Number(item.max) || 10;
  return `
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>${t('student')}</th><th>${t('maxScore')}</th><th>${getLang() === 'ar' ? 'العلامة' : 'Score'}</th><th>%</th></tr></thead>
      <tbody>${students.map(s => {
        const v = item.scores && item.scores[s.id] !== undefined ? item.scores[s.id] : '';
        const p = v !== '' ? pct1((Number(v) / max) * 100) + '%' : '—';
        return `<tr><td><b>${escapeHtml(s.name)}</b></td><td>${max}</td>
          <td><input type="number" class="input score-inp" style="width:84px" data-student="${s.id}" min="0" max="${max}" step="0.5" value="${escapeHtml(v)}"></td>
          <td class="score-pct">${p}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
}
function collectScores(root) {
  const scores = {};
  $$('.score-inp', root).forEach(inp => {
    const v = inp.value.trim();
    if (v !== '' && !isNaN(Number(v))) scores[inp.dataset.student] = Number(v);
  });
  return scores;
}
function bindScoreGridLivePct(root, max) {
  $$('.score-inp', root).forEach(inp => inp.addEventListener('input', () => {
    const cell = inp.closest('tr').querySelector('.score-pct');
    const v = inp.value.trim();
    cell.textContent = v !== '' && !isNaN(Number(v)) ? pct1((Number(v) / max) * 100) + '%' : '—';
  }));
}
function itemChipsHtml(items, selectedId, labelFn) {
  if (!items.length) return `<div class="muted small" style="padding:.4rem .2rem">${t('noData')}</div>`;
  return `<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.7rem">${items.map(it =>
    `<button class="btn ${it.id === selectedId ? 'primary' : 'ghost'} small" data-item="${it.id}">${escapeHtml(labelFn(it))}</button>`).join('')}</div>`;
}

Object.assign(TeacherPages, {

  /* ========== Gradebook (tabs: quick checks / periodic tests / homework) ========== */
  async gradebook(root, initialTab) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    if (initialTab !== undefined) TeacherUI.gradebookTab = initialTab;
    const tab = TeacherUI.gradebookTab;

    const tabsHtml = `
      <div class="tabs" id="gbTabs">
        <button class="tab ${tab === 0 ? 'active' : ''}" data-tab="0">🎟️ ${t('exitTickets')}</button>
        <button class="tab ${tab === 1 ? 'active' : ''}" data-tab="1">📝 ${t('quarterQuizzes')} / ${t('quarterFinal')}</button>
        <button class="tab ${tab === 2 ? 'active' : ''}" data-tab="2">📚 ${t('navHomework')}</button>
      </div>
      <div id="gradebookPanel"></div>`;
    root.innerHTML = tabsHtml;
    $$('#gbTabs .tab', root).forEach(b => b.addEventListener('click', () => {
      TeacherUI.gradebookTab = Number(b.dataset.tab);
      TeacherPages.gradebook(root);
    }));
    const panel = $('#gradebookPanel', root);
    if (tab === 0) this._scoreTab(panel, {
      items: data.exitTickets, students: data.students, table: 'exit_tickets',
      itemLabel: it => `${it.title || t('exitTickets')} · ${fmtDate(it.date)}`,
      onNew: () => this._newExitTicket(section, root),
      newLabel: t('newExitTicket')
    });
    else if (tab === 1) this._scoreTab(panel, {
      items: data.quizzes, students: data.students, table: 'quizzes',
      itemLabel: it => `${it.title || (it.kind === 'final' ? t('finalExam') : t('quarterQuizzes'))} · ${fmtDate(it.date)}`,
      onNew: () => this._newQuiz(section, root),
      newLabel: t('newQuiz')
    });
    else this._homeworkTab(panel, section, data, root);
  },

  async _scoreTab(panel, opts) {
    const selKey = opts.table;
    let selectedId = TeacherUI.selectedItem[selKey];
    if (!opts.items.find(i => i.id === selectedId)) selectedId = opts.items.length ? opts.items[opts.items.length - 1].id : null;
    TeacherUI.selectedItem[selKey] = selectedId;
    const item = opts.items.find(i => i.id === selectedId) || null;

    panel.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title">${opts.table === 'quizzes' ? '📝' : '🎟️'} ${opts.newLabel}</div>
          <div style="display:flex;gap:.4rem">
            ${item ? `<button class="btn ghost small" id="delItemBtn">🗑️ ${t('delete')}</button>` : ''}
            <button class="btn primary" id="newItemBtn">+ ${opts.newLabel}</button>
          </div>
        </div>
        ${itemChipsHtml(opts.items, selectedId, opts.itemLabel)}
        <div id="scoreGridWrap">${item ? scoreGridHtml(item, opts.students, selKey) : emptyState(t('noData'))}</div>
        ${item ? `<div style="display:flex;justify-content:flex-end;margin-top:.8rem"><button class="btn primary lg" id="saveScoresBtn">💾 ${t('saveScores')}</button></div>` : ''}
      </div>`;

    $('#newItemBtn', panel).addEventListener('click', opts.onNew);
    $$('[data-item]', panel).forEach(b => b.addEventListener('click', () => { TeacherUI.selectedItem[selKey] = b.dataset.item; TeacherPages.gradebook($('#page')); }));
    if (!item) return;
    const max = Number(item.max) || 10;
    bindScoreGridLivePct(panel, max);
    $('#saveScoresBtn', panel).addEventListener('click', async () => {
      const scores = collectScores(panel);
      try {
        await API.update(opts.table, 'id=eq.' + item.id, { scores });
        toast(t('scoresSaved'), 'success');
      } catch (e) { toast(t('dbError'), 'error'); }
    });
    $('#delItemBtn', panel).addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => {
        await API.remove(opts.table, 'id=eq.' + item.id);
        TeacherUI.selectedItem[selKey] = null;
        toast(t('deleted'), 'success'); TeacherPages.gradebook($('#page'));
      }, true);
    });
  },

  _newExitTicket(section, root) {
    openModal({
      title: t('newExitTicket'),
      bodyHtml: `
        <div class="form-row"><div><label>${TR('العنوان', 'Title')} *</label><input class="input" id="fEtTitle" placeholder="${TR('مثال: الدرس 7 — الكسور', 'e.g. Lesson 7 — Fractions')}"></div></div>
        <div class="form-row cols-2">
          <div><label>${t('date')}</label><input class="input" id="fEtDate" type="date" value="${todayISO()}"></div>
          <div><label>${t('maxScore')}</label><input class="input" id="fEtMax" type="number" min="1" value="10"></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveEtBtn">${t('save')}</button>`,
      onOpen(mroot) {
        $('#saveEtBtn', mroot).addEventListener('click', async () => {
          const title = $('#fEtTitle', mroot).value.trim();
          if (!title) return toast(t('required'), 'error');
          const rows = await API.insert('exit_tickets', [{ section_id: section.id, title, date: $('#fEtDate', mroot).value || todayISO(), max: Number($('#fEtMax', mroot).value) || 10, scores: {} }]);
          if (rows && rows[0]) TeacherUI.selectedItem['exit_tickets'] = rows[0].id;
          closeModal(); toast(t('added'), 'success'); TeacherPages.gradebook($('#page'));
        });
      }
    });
  },

  _newQuiz(section, root) {
    openModal({
      title: t('newQuiz'),
      bodyHtml: `
        <div class="form-row cols-2">
          <div><label>${t('kind')}</label><select class="input" id="fQzKind">
            <option value="q1">${t('q1')}</option><option value="q2">${t('q2')}</option><option value="final">${t('finalExam')}</option>
          </select></div>
          <div><label>${t('quarter')}</label><select class="input" id="fQzQuarter">${[1,2,3,4].map(q => `<option value="${q}">${t('quarter')} ${q}</option>`).join('')}</select></div>
        </div>
        <div class="form-row"><div><label>${TR('العنوان', 'Title')}</label><input class="input" id="fQzTitle" placeholder="${t('quarterQuizzes')}"></div></div>
        <div class="form-row cols-2">
          <div><label>${t('date')}</label><input class="input" id="fQzDate" type="date" value="${todayISO()}"></div>
          <div><label>${t('maxScore')}</label><input class="input" id="fQzMax" type="number" min="1" value="20"></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveQzBtn">${t('save')}</button>`,
      onOpen(mroot) {
        $('#fQzKind', mroot).addEventListener('change', e => {
          $('#fQzMax', mroot).value = e.target.value === 'final' ? 40 : 20;
        });
        $('#saveQzBtn', mroot).addEventListener('click', async () => {
          const kind = $('#fQzKind', mroot).value;
          const title = $('#fQzTitle', mroot).value.trim() || (kind === 'final' ? t('finalExam') : kind === 'q1' ? t('q1') : t('q2'));
          const rows = await API.insert('quizzes', [{ section_id: section.id, quarter: Number($('#fQzQuarter', mroot).value) || 1, kind, title, date: $('#fQzDate', mroot).value || todayISO(), max: Number($('#fQzMax', mroot).value) || (kind === 'final' ? 40 : 20), scores: {} }]);
          if (rows && rows[0]) TeacherUI.selectedItem['quizzes'] = rows[0].id;
          closeModal(); toast(t('added'), 'success'); TeacherPages.gradebook($('#page'));
        });
      }
    });
  },

  async _homeworkTab(panel, section, data, root) {
    let selectedId = TeacherUI.selectedItem['homework'];
    if (!data.homework.find(h => h.id === selectedId)) selectedId = data.homework.length ? data.homework[data.homework.length - 1].id : null;
    TeacherUI.selectedItem['homework'] = selectedId;
    const item = data.homework.find(h => h.id === selectedId) || null;

    panel.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title">📚 ${t('navHomework')}</div>
          <div style="display:flex;gap:.4rem">
            ${item ? `<button class="btn ghost small" id="delHwBtn">🗑️ ${t('delete')}</button>` : ''}
            <button class="btn primary" id="newHwBtn">+ ${t('addHomework')}</button>
          </div>
        </div>
        ${itemChipsHtml(data.homework, selectedId, it => `${it.title || t('navHomework')} · ${fmtDate(it.due_date)}`)}
        ${item ? `
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('student')}</th><th>${t('dueDate')}: ${fmtDate(item.due_date)}</th></tr></thead>
            <tbody>${data.students.map(s => {
              const v = (item.status && item.status[s.id]) || '';
              return `<tr><td><b>${escapeHtml(s.name)}</b></td>
                <td><select class="input hw-status" data-student="${s.id}" style="width:150px">
                  <option value="" ${v === '' ? 'selected' : ''}>—</option>
                  <option value="submitted" ${v === 'submitted' ? 'selected' : ''}>✅ ${t('submitted')}</option>
                  <option value="missing" ${v === 'missing' ? 'selected' : ''}>❌ ${t('missing')}</option>
                </select></td></tr>`;
            }).join('')}</tbody>
          </table></div>
          <div style="display:flex;justify-content:flex-end;margin-top:.8rem"><button class="btn primary lg" id="saveHwBtn">💾 ${t('save')}</button></div>`
        : emptyState(t('noData'))}
      </div>`;

    $('#newHwBtn', panel).addEventListener('click', () => {
      openModal({
        title: t('addHomework'),
        bodyHtml: `
          <div class="form-row"><div><label>${t('hwTitle')} *</label><input class="input" id="fHwTitle"></div></div>
          <div class="form-row"><div><label>${t('dueDate')}</label><input class="input" id="fHwDue" type="date" value="${todayISO()}"></div></div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveHwModalBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveHwModalBtn', mroot).addEventListener('click', async () => {
            const title = $('#fHwTitle', mroot).value.trim();
            if (!title) return toast(t('required'), 'error');
            const rows = await API.insert('homework', [{ section_id: section.id, title, due_date: $('#fHwDue', mroot).value || todayISO(), status: {} }]);
            if (rows && rows[0]) TeacherUI.selectedItem['homework'] = rows[0].id;
            closeModal(); toast(t('added'), 'success'); TeacherPages.gradebook($('#page'));
          });
        }
      });
    });
    $$('[data-item]', panel).forEach(b => b.addEventListener('click', () => { TeacherUI.selectedItem['homework'] = b.dataset.item; TeacherPages.gradebook($('#page')); }));
    if (item) {
      $('#saveHwBtn', panel).addEventListener('click', async () => {
        const status = {};
        $$('.hw-status', panel).forEach(sel => { if (sel.value) status[sel.dataset.student] = sel.value; });
        await API.update('homework', 'id=eq.' + item.id, { status });
        toast(t('saved'), 'success');
      });
      $('#delHwBtn', panel).addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => {
          await API.remove('homework', 'id=eq.' + item.id);
          TeacherUI.selectedItem['homework'] = null;
          toast(t('deleted'), 'success'); TeacherPages.gradebook($('#page'));
        }, true);
      });
    }
  },

  /* ========== Attendance with QR ========== */
  async attendance(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const openSession = data.attendance.find(a => a.is_open);
    const appUrl = location.origin + location.pathname;

    const statusBtn = (sid, cur, s, label, cls) =>
      `<button class="btn ${cur === s ? cls : 'ghost'} small att-status" data-student="${sid}" data-status="${s}" style="padding:.28rem .55rem">${label}</button>`;

    const renderTable = (sess) => `
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>${t('student')}</th><th>${t('status')}</th><th>${t('participation')}</th><th>${TR('عبر', 'Via')}</th></tr></thead>
        <tbody>${data.students.map(st => {
          const rec = (sess.records && sess.records[st.id]) || {};
          return `<tr><td><b>${escapeHtml(st.name)}</b></td>
            <td style="white-space:nowrap">${statusBtn(st.id, rec.status, 'present', '✅', 'green')} ${statusBtn(st.id, rec.status, 'late', '⏰', 'amber')} ${statusBtn(st.id, rec.status, 'absent', '❌', 'red')} ${statusBtn(st.id, rec.status, 'excused', '📝', 'ghost')}</td>
            <td><select class="input att-part" data-student="${st.id}" style="width:80px">${['',1,2,3,4,5].map(p => `<option value="${p}" ${String(rec.participation ?? '') === String(p) ? 'selected' : ''}>${p || '—'}</option>`).join('')}</select></td>
            <td>${rec.via === 'qr' ? '<span class="pill teal">QR</span>' : rec.via ? '<span class="pill gray">' + TR('يدوي','Manual') + '</span>' : '—'}</td></tr>`;
        }).join('')}</tbody>
      </table></div>`;

    if (openSession) {
      const checkUrl = appUrl + '?checkin=' + openSession.id + '&code=' + openSession.code;
      const presentCount = Object.values(openSession.records || {}).filter(r => r.status === 'present' || r.status === 'late').length;
      root.innerHTML = `
        <div class="grid cols-3" style="align-items:start">
          <div class="card text-center">
            <div class="card-head" style="justify-content:center"><div class="card-title">📱 ${t('sessionOpen')}</div></div>
            <div class="qr-box">
              <div class="qr-canvas-wrap"><div id="qrCanvas"></div></div>
              <div class="small muted">${t('scanToCheckIn')}</div>
              <div class="qr-code-text" dir="ltr">${escapeHtml(openSession.code || '')}</div>
              <button class="btn ghost small" id="copyCheckinLink">🔗 ${t('shareLink')}</button>
            </div>
            <div class="stat-value" id="livePresentCount" style="margin-top:.6rem">${presentCount} / ${data.students.length}</div>
            <div class="small muted">${t('present')}</div>
            <button class="btn red block" id="closeSessionBtn" style="margin-top:.8rem">⏹ ${t('closeSession')}</button>
          </div>
          <div class="card" style="grid-column:span 2">
            <div class="card-head"><div class="card-title">✅ ${t('manualMark')}</div></div>
            <div id="attTableWrap">${renderTable(openSession)}</div>
          </div>
        </div>`;
      try { new QRCode($('#qrCanvas', root), { text: checkUrl, width: 176, height: 176, correctLevel: QRCode.CorrectLevel.M }); } catch (e) { /* qr lib missing */ }
      $('#copyCheckinLink', root).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(checkUrl); toast('🔗 ' + t('saved'), 'success'); }
        catch (e) { toast(checkUrl, 'success'); }
      });
      $('#closeSessionBtn', root).addEventListener('click', async () => {
        await API.update('attendance', 'id=eq.' + openSession.id, { is_open: false, end_ts: new Date().toISOString() });
        toast(t('sessionClosed'), 'success'); TeacherPages.attendance(root);
      });
      this._bindAttendanceTable(root, openSession, data);
      this._pollAttendance(root, openSession.id, data.students.length);
    } else {
      const history = data.attendance.slice().reverse();
      root.innerHTML = `
        <div class="card text-center" style="padding:1.6rem">
          <div style="font-size:2.4rem">📱</div>
          <h3 style="margin:.4rem 0">${t('qrCheckin')}</h3>
          <p class="muted">${TR('افتح جلسة، اعرض الـ QR للطلاب على السبورة، وسيسجل حضورهم تلقائياً', 'Open a session, project the QR on the board, and students check in automatically')}</p>
          <button class="btn primary lg" id="openSessionBtn" style="margin-top:.6rem">🚀 ${t('openSession')}</button>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">🗓️ ${t('navAttendance')}</div></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('date')}</th><th>${t('present')}</th><th>${t('late')}</th><th>${t('absent')}</th><th>${t('excused')}</th><th>${t('participation')}</th><th>${t('status')}</th><th></th></tr></thead>
            <tbody>${history.map(sess => {
              const recs = Object.values(sess.records || {});
              const c = st => recs.filter(r => r.status === st).length;
              const parts = recs.map(r => Number(r.participation)).filter(p => !isNaN(p) && p > 0);
              return `<tr><td><b>${fmtDate(sess.date)}</b></td><td>${c('present')}</td><td>${c('late')}</td><td>${c('absent')}</td><td>${c('excused')}</td><td>${parts.length ? pct1(avg(parts)) : '—'}</td><td>${sess.is_open ? `<span class="pill green">${t('sessionOpen')}</span>` : `<span class="pill gray">${t('sessionClosed')}</span>`}</td><td><button class="btn ghost small" data-del-att="${sess.id}">🗑️</button></td></tr>`;
            }).join('') || `<tr><td colspan="8" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>`;
      $('#openSessionBtn', root).addEventListener('click', async () => {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await API.insert('attendance', [{ section_id: section.id, date: todayISO(), start_ts: new Date().toISOString(), is_open: true, code, records: {} }]);
        toast(t('sessionOpen'), 'success'); TeacherPages.attendance(root);
      });
      $$('[data-del-att]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => { await API.remove('attendance', 'id=eq.' + b.dataset.delAtt); toast(t('deleted'), 'success'); TeacherPages.attendance(root); }, true);
      }));
    }
  },

  _bindAttendanceTable(root, session, data) {
    const update = async (studentId, patch) => {
      const fresh = await API.select('attendance', 'select=records&id=eq.' + session.id);
      const records = (fresh && fresh[0] && fresh[0].records) || {};
      records[studentId] = Object.assign({}, records[studentId] || {}, patch, { via: (records[studentId] && records[studentId].via) || 'manual' });
      await API.update('attendance', 'id=eq.' + session.id, { records });
      // refresh row visuals
      TeacherPages.attendance($('#page'));
    };
    $$('.att-status', root).forEach(btn => btn.addEventListener('click', () => update(btn.dataset.student, { status: btn.dataset.status })));
    $$('.att-part', root).forEach(sel => sel.addEventListener('change', () => update(sel.dataset.student, { participation: sel.value ? Number(sel.value) : null })));
  },

  _pollAttendance(root, sessionId, total) {
    clearInterval(window.__attPoll);
    window.__attPoll = setInterval(async () => {
      if (!document.body.contains(root) || !$('#livePresentCount')) { clearInterval(window.__attPoll); return; }
      try {
        const fresh = await API.select('attendance', 'select=records,is_open&id=eq.' + sessionId);
        if (!fresh || !fresh.length) return;
        if (!fresh[0].is_open) { clearInterval(window.__attPoll); TeacherPages.attendance($('#page')); return; }
        const recs = Object.values(fresh[0].records || {});
        const n = recs.filter(r => r.status === 'present' || r.status === 'late').length;
        const lbl = $('#livePresentCount'); if (lbl) lbl.textContent = n + ' / ' + total;
      } catch (e) { /* transient network error — keep polling */ }
    }, 5000);
  },

  /* ========== Behavior ========== */
  async behavior(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const byId = Object.fromEntries(data.students.map(s => [s.id, s]));
    const typePill = t => t === 'positive' ? '<span class="pill green">😊 ' + t_type(t) + '</span>' : t === 'negative' ? '<span class="pill red">🙁 ' + t_type(t) + '</span>' : '<span class="pill amber">🎒 ' + t_type(t) + '</span>';
    const t_type = x => x === 'positive' ? t('positive') : x === 'negative' ? t('negative') : t('supplies');

    root.innerHTML = `
      <div class="grid cols-3" style="align-items:start">
        <div class="card">
          <div class="card-head"><div class="card-title">➕ ${t('addNote')}</div></div>
          <div class="form-row"><div><label>${t('student')}</label><select class="input" id="behavStudent">${data.students.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></div></div>
          <div class="form-row"><div><label>${t('type')}</label><select class="input" id="behavType"><option value="positive">😊 ${t('positive')}</option><option value="negative">🙁 ${t('negative')}</option><option value="supplies">🎒 ${t('supplies')}</option></select></div></div>
          <div class="form-row"><div><label>${t('noteText')}</label><input class="input" id="behavText" placeholder="${TR('اكتب الملاحظة…', 'Write the note…')}"></div></div>
          <button class="btn primary block" id="addBehavBtn">+ ${t('add')}</button>
        </div>
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">📋 ${t('behaviorLog')}</div></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('date')}</th><th>${t('student')}</th><th>${t('type')}</th><th>${t('notes')}</th><th></th></tr></thead>
            <tbody>${data.behavior.slice(0, 60).map(n => `<tr>
              <td>${fmtDate(n.date)}</td>
              <td><b>${escapeHtml((byId[n.student_id] || {}).name || '—')}</b></td>
              <td>${typePill(n.type)}</td>
              <td>${escapeHtml(n.text || '')}</td>
              <td><button class="btn ghost small" data-del-note="${n.id}">🗑️</button></td></tr>`).join('') || `<tr><td colspan="5" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>
      </div>`;

    $('#addBehavBtn', root).addEventListener('click', async () => {
      const student_id = $('#behavStudent', root).value;
      const text = $('#behavText', root).value.trim();
      if (!student_id || !text) return toast(t('required'), 'error');
      await API.insert('behavior', [{ student_id, section_id: section.id, type: $('#behavType', root).value, text, date: todayISO() }]);
      toast(t('added'), 'success'); TeacherPages.behavior(root);
    });
    $$('[data-del-note]', root).forEach(b => b.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => { await API.remove('behavior', 'id=eq.' + b.dataset.delNote); toast(t('deleted'), 'success'); TeacherPages.behavior(root); }, true);
    }));
  }
});
