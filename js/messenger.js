/* ============================================================
   AMAMB — Messaging (admin · teacher · student)
   Table: messages(id, sender_id, audience, title, body, created_at)
   audience: 'all' | 'teachers' | 'students' | 'section:<id>' | 'user:<id>'
   message_reads(message_id, user_id, read_at) — read receipts
   ============================================================ */
const mAr = () => getLang() === 'ar';
const Messenger = {
  ar() { return mAr(); },

  labels: {
    messages: () => mAr() ? 'الرسائل' : 'Messages',
    inbox: () => mAr() ? 'الوارد' : 'Inbox',
    compose: () => mAr() ? 'إنشاء رسالة' : 'Compose',
    sent: () => mAr() ? 'المرسلة' : 'Sent',
    newMsg: () => mAr() ? 'رسالة جديدة' : 'New Message',
    audience: () => mAr() ? 'الجمهور' : 'Audience',
    audAll: () => mAr() ? 'الجميع (كل المنصة)' : 'Everyone (whole platform)',
    audTeachers: () => mAr() ? 'كل المعلمين' : 'All teachers',
    audStudents: () => mAr() ? 'كل الطلاب' : 'All students',
    audSection: () => mAr() ? 'شعبة محددة' : 'A section',
    audUser: () => mAr() ? 'شخص محدد' : 'A specific person',
    section: () => mAr() ? 'اختر الشعبة' : 'Choose section',
    pickPerson: () => mAr() ? 'ابحث باسم الشخص…' : 'Search person…',
    title: () => mAr() ? 'العنوان' : 'Title',
    body: () => mAr() ? 'نص الرسالة' : 'Message',
    send: () => mAr() ? 'إرسال' : 'Send',
    sentOk: () => mAr() ? 'تم إرسال الرسالة ✅' : 'Message sent ✅',
    audienceHint: () => mAr() ? 'من ستصله الرسالة؟' : 'Who should receive it?',
    from: () => mAr() ? 'من' : 'From',
    reads: () => mAr() ? 'قرأها' : 'Read by',
    people: () => mAr() ? 'شخص' : 'people',
    noMessages: () => mAr() ? 'لا توجد رسائل بعد' : 'No messages yet',
    markRead: () => mAr() ? 'تُفتح وتوضع كمقروءة' : 'Opening marks it as read',
    del: () => mAr() ? 'حذف الرسالة' : 'Delete message',
    unread: () => mAr() ? 'غير مقروءة' : 'Unread',
    toTeacher: () => mAr() ? 'مراسلة معلم الشعبة' : 'Message your teacher'
  },

  async mySectionContext(user) {
    const ctx = { teacherSectionIds: [], studentSectionId: null, studentRow: null, sectionsMap: {} };
    try {
      if (user.role === 'teacher' || user.role === 'admin') {
        const q = user.role === 'admin' ? 'select=id,name,grade,teacher_id&order=grade,name' : 'select=id,name,grade,teacher_id&teacher_id=eq.' + encodeURIComponent(user.id) + '&order=grade,name';
        const rows = await API.select('sections', q) || [];
        ctx.teacherSectionIds = rows.map(s => s.id);
        rows.forEach(s => { ctx.sectionsMap[s.id] = s; });
      }
      if (user.role === 'student') {
        const rows = await API.select('students', 'select=id,name,section_id&user_id=eq.' + encodeURIComponent(user.id));
        if (rows && rows.length) { ctx.studentRow = rows[0]; ctx.studentSectionId = rows[0].section_id; }
      }
    } catch (e) { console.warn('messenger ctx', e); }
    return ctx;
  },

  canSee(user, msg, ctx) {
    if (!msg) return false;
    if (msg.sender_id === user.id) return true;
    const a = String(msg.audience || '');
    if (a === 'all') return true;
    if (a === 'teachers') return user.role === 'teacher' || user.role === 'admin';
    if (a === 'students') return user.role === 'student' || user.role === 'admin';
    if (a.indexOf('section:') === 0) {
      const sid = a.slice(8);
      if (user.role === 'admin') return true;
      if (user.role === 'teacher') return ctx.teacherSectionIds.indexOf(sid) !== -1;
      return ctx.studentSectionId === sid;
    }
    if (a.indexOf('user:') === 0) return a.slice(5) === user.id;
    return false;
  },

  audienceText(msg, ctx) {
    const a = String(msg.audience || '');
    if (a === 'all') return this.labels.audAll();
    if (a === 'teachers') return this.labels.audTeachers();
    if (a === 'students') return this.labels.audStudents();
    if (a.indexOf('section:') === 0) {
      const s = ctx.sectionsMap[a.slice(8)];
      return (mAr() ? 'شعبة: ' : 'Section: ') + (s ? ((s.grade || '') + ' ' + (s.name || '')).trim() : a.slice(8));
    }
    if (a.indexOf('user:') === 0) return mAr() ? 'رسالة خاصة' : 'Direct message';
    return a;
  },

  async render(root) {
    const user = App.user();
    const ctx = await this.mySectionContext(user);
    const canCompose = user.role === 'admin' || user.role === 'teacher' || user.role === 'student';
    root.innerHTML = `
      <div class="card">
        <div class="card-head" style="gap:.5rem;flex-wrap:wrap">
          <div class="card-title">✉️ ${escapeHtml(this.labels.messages())}</div>
          <div style="display:flex;gap:.4rem;margin-inline-start:auto">
            <button class="btn primary small" data-mtab="inbox">📥 ${escapeHtml(this.labels.inbox())} <span id="msgUnreadBadge" class="pill red hidden" style="margin-inline-start:.25rem"></span></button>
            <button class="btn ghost small" data-mtab="compose">✏️ ${escapeHtml(user.role === 'student' ? this.labels.toTeacher() : this.labels.compose())}</button>
            <button class="btn ghost small" data-mtab="sent">📤 ${escapeHtml(this.labels.sent())}</button>
          </div>
        </div>
        <div id="msgPane"></div>
      </div>`;
    const pane = $('#msgPane', root);
    const tabs = $$('[data-mtab]', root);
    const show = async (name) => {
      tabs.forEach(b => b.classList.toggle('primary', b.dataset.mtab === name));
      tabs.forEach(b => b.classList.toggle('ghost', b.dataset.mtab !== name));
      pane.innerHTML = `<div class="muted">${t('loading')}</div>`;
      if (name === 'inbox') await this.renderInbox(pane, user, ctx);
      else if (name === 'compose') await this.renderCompose(pane, user, ctx, root);
      else await this.renderSent(pane, user, ctx);
    };
    tabs.forEach(b => b.addEventListener('click', () => show(b.dataset.mtab)));
    await show('inbox');
  },

  async _fetchMessages() {
    try { return await API.select('messages', 'select=*&order=created_at.desc&limit=100') || []; }
    catch (e) { console.warn('messages fetch', e); return []; }
  },
  async _profileMap(ids) {
    const map = {};
    const uniq = Array.from(new Set(ids.filter(Boolean)));
    if (!uniq.length) return map;
    try {
      const rows = await API.select('profiles', 'select=id,name,role&id=in.(' + uniq.map(encodeURIComponent).join(',') + ')') || [];
      rows.forEach(r => { map[r.id] = r; });
    } catch (e) { /* names optional */ }
    return map;
  },
  async _myReads(userId, msgIds) {
    if (!msgIds.length) return new Set();
    try {
      const rows = await API.select('message_reads', 'select=message_id&user_id=eq.' + encodeURIComponent(userId) + '&message_id=in.(' + msgIds.map(encodeURIComponent).join(',') + ')') || [];
      return new Set(rows.map(r => r.message_id));
    } catch (e) { return new Set(); }
  },

  async renderInbox(pane, user, ctx) {
    const msgs = (await this._fetchMessages()).filter(m => this.canSee(user, m, ctx) && m.sender_id !== user.id);
    const pmap = await this._profileMap(msgs.map(m => m.sender_id));
    const reads = await this._myReads(user.id, msgs.map(m => m.id));
    const unread = msgs.filter(m => !reads.has(m.id)).length;
    const badge = document.getElementById('msgUnreadBadge');
    if (badge) { if (unread) { badge.textContent = String(unread); badge.classList.remove('hidden'); } else badge.classList.add('hidden'); }
    if (!msgs.length) { pane.innerHTML = `<div class="muted text-center" style="padding:1.5rem">${escapeHtml(this.labels.noMessages())}</div>`; return; }
    pane.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.5rem">
        ${msgs.map(m => `
          <div class="card" style="margin:0;box-shadow:none;padding:.7rem .8rem;display:flex;gap:.7rem;align-items:flex-start;${reads.has(m.id) ? '' : 'border-inline-start:3px solid var(--terracotta,#c2410c)'}">
            <button class="btn ghost small" data-open="${m.id}" style="flex:1;text-align:start;white-space:normal;display:block">
              <span style="display:flex;justify-content:space-between;gap:.6rem;align-items:baseline">
                <b>${escapeHtml(m.title || '—')}</b>
                <span class="small muted" style="white-space:nowrap">${fmtDate(m.created_at)}</span>
              </span>
              <span class="small muted" style="display:block;margin-top:.15rem">${mAr() ? 'من' : 'From'}: ${escapeHtml((pmap[m.sender_id] || {}).name || '—')} · ${escapeHtml(this.audienceText(m, ctx))}</span>
              <span style="display:block;margin-top:.3rem;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:52ch">${escapeHtml(m.body || '')}</span>
            </button>
            <button class="btn ghost small" data-del="${m.id}" title="${escapeHtml(this.labels.del())}">🗑️</button>
          </div>`).join('')}
      </div>
      <p class="small muted" style="margin-top:.5rem">ℹ️ ${escapeHtml(this.labels.markRead())}</p>`;
    $$('[data-open]', pane).forEach(btn => btn.addEventListener('click', async () => {
      const m = msgs.find(x => x.id === btn.dataset.open);
      await this._markRead(m.id, user.id);
      openModal({
        title: m.title || '—', wide: true,
        bodyHtml: `<div class="small muted" style="margin-bottom:.5rem">${mAr() ? 'من' : 'From'}: ${escapeHtml((pmap[m.sender_id] || {}).name || '—')} · ${fmtDate(m.created_at)}</div>
          <div style="white-space:pre-wrap;line-height:1.8">${escapeHtml(m.body || '')}</div>`,
        footHtml: `<button class="btn primary" data-close-modal>${t('close')}</button>`
      });
      this.renderInbox(pane, user, ctx);
    }));
    $$('[data-del]', pane).forEach(btn => btn.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => { await this._deleteMessage(btn.dataset.del, user); this.renderInbox(pane, user, ctx); }, true);
    }));
  },

  async renderSent(pane, user, ctx) {
    let mine = [];
    try { mine = await API.select('messages', 'select=*&sender_id=eq.' + encodeURIComponent(user.id) + '&order=created_at.desc&limit=100') || []; }
    catch (e) { mine = []; }
    let readCounts = {}, readUsers = {};
    if (mine.length) {
      try {
        const ids = mine.map(m => m.id).join(',');
        const rows = await API.select('message_reads', 'select=message_id,user_id&message_id=in.(' + ids + ')') || [];
        rows.forEach(r => { readCounts[r.message_id] = (readCounts[r.message_id] || 0) + 1; (readUsers[r.message_id] = readUsers[r.message_id] || []).push(r.user_id); });
      } catch (e) { /* counts optional */ }
    }
    if (!mine.length) { pane.innerHTML = `<div class="muted text-center" style="padding:1.5rem">${escapeHtml(this.labels.noMessages())}</div>`; return; }
    pane.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:.5rem">
        ${mine.map(m => `
          <div class="card" style="margin:0;box-shadow:none;padding:.7rem .8rem;display:flex;gap:.7rem;align-items:flex-start">
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:baseline">
                <b>${escapeHtml(m.title || '—')}</b>
                <span class="small muted" style="white-space:nowrap">${fmtDate(m.created_at)}</span>
              </div>
              <div class="small muted" style="margin-top:.15rem">${escapeHtml(this.audienceText(m, ctx))}</div>
              <div style="margin-top:.3rem;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:56ch">${escapeHtml(m.body || '')}</div>
              <div class="small" style="margin-top:.35rem;color:var(--terracotta,#c2410c);font-weight:700">✓✓ ${escapeHtml(this.labels.reads())}: ${readCounts[m.id] || 0} ${escapeHtml(this.labels.people())}</div>
            </div>
            <button class="btn ghost small" data-delsent="${m.id}" title="${escapeHtml(this.labels.del())}">🗑️</button>
          </div>`).join('')}
      </div>`;
    $$('[data-delsent]', pane).forEach(btn => btn.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => { await this._deleteMessage(btn.dataset.delsent, user); this.renderSent(pane, user, ctx); }, true);
    }));
  },

  async _markRead(messageId, userId) {
    try {
      await API.req('message_reads', { method: 'POST', body: [{ message_id: messageId, user_id: userId }], prefer: 'resolution=merge-duplicates,return=representation' });
    } catch (e) { /* non-fatal */ }
  },
  async _deleteMessage(messageId, user) {
    try { await API.remove('message_reads', 'message_id=eq.' + encodeURIComponent(messageId)); } catch (e) { /* may not exist */ }
    await API.remove('messages', 'id=eq.' + encodeURIComponent(messageId));
    await audit('delete', 'messages', messageId, { by: user.email });
    toast(t('deleted'), 'success');
  },

  /* ---------- compose ---------- */
  async renderCompose(pane, user, ctx, pageRoot) {
    const isAdmin = user.role === 'admin';
    const isTeacher = user.role === 'teacher';
    let sectionsList = [];
    try {
      const q = isAdmin ? 'select=id,name,grade,teacher_id&order=grade,name' : isTeacher ? 'select=id,name,grade&teacher_id=eq.' + encodeURIComponent(user.id) + '&order=grade,name' : 'select=id,name,grade&id=eq.' + encodeURIComponent(ctx.studentSectionId || 'x-none');
      sectionsList = await API.select('sections', q) || [];
    } catch (e) { sectionsList = []; }

    const audienceOptions = isAdmin
      ? [['all', this.labels.audAll()], ['teachers', this.labels.audTeachers()], ['students', this.labels.audStudents()]].concat(sectionsList.map(s => ['section:' + s.id, '🏫 ' + ((s.grade || '') + ' ' + (s.name || '')).trim()])).concat([['user', this.labels.audUser()]])
      : isTeacher
        ? sectionsList.map(s => ['section:' + s.id, '🏫 ' + ((s.grade || '') + ' ' + (s.name || '')).trim()]).concat([['user', mAr() ? 'طالب بعينه' : 'A specific student']])
        : [];

    if (user.role === 'student') {
      await this._composeStudent(pane, user, ctx, pageRoot);
      return;
    }

    pane.innerHTML = `
      <div class="form-row"><div>
        <label>${escapeHtml(this.labels.audience())}</label>
        <select class="input" id="msgAudience">${audienceOptions.map(([v, l]) => `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join('')}</select>
        <p class="small muted" style="margin:.3rem 0 0">${escapeHtml(this.labels.audienceHint())}</p>
      </div></div>
      <div class="form-row hidden" id="msgUserRow"><div>
        <label>${escapeHtml(this.labels.pickPerson())}</label>
        <input class="input" id="msgUserSearch" placeholder="…" autocomplete="off">
        <div id="msgUserResults" style="display:flex;flex-direction:column;gap:.3rem;margin-top:.35rem;max-height:180px;overflow:auto"></div>
        <div class="small muted" id="msgUserChosen" style="margin-top:.3rem"></div>
      </div></div>
      <div class="form-row"><div><label>${escapeHtml(this.labels.title())} *</label><input class="input" id="msgTitle" maxlength="140"></div></div>
      <div class="form-row"><div><label>${escapeHtml(this.labels.body())} *</label><textarea class="input" id="msgBody" rows="4" style="resize:vertical"></textarea></div></div>
      <button class="btn primary" id="msgSendBtn">📨 ${escapeHtml(this.labels.send())}</button>`;

    let chosenUserId = null;
    const audSel = $('#msgAudience', pane);
    const userRow = $('#msgUserRow', pane);
    let people = [];
    try {
      if (isAdmin) people = await API.select('profiles', 'select=id,name,role&order=name') || [];
      else {
        const secIds = sectionsList.map(s => s.id);
        if (secIds.length) {
          const rows = await API.select('students', 'select=user_id,name&section_id=in.(' + secIds.join(',') + ')&user_id=not.is.null') || [];
          people = rows.filter(r => r.user_id).map(r => ({ id: r.user_id, name: r.name, role: 'student' }));
        }
      }
    } catch (e) { people = []; }

    const syncUserRow = () => {
      const v = audSel.value;
      userRow.classList.toggle('hidden', v !== 'user');
    };
    audSel.addEventListener('change', syncUserRow); syncUserRow();

    const search = $('#msgUserSearch', pane), results = $('#msgUserResults', pane), chosen = $('#msgUserChosen', pane);
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (!q) { results.innerHTML = ''; return; }
      const hits = people.filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 8);
      results.innerHTML = hits.map(p => `<button class="btn ghost small" style="text-align:start" data-pick="${p.id}">${escapeHtml(p.name)} <span class="small muted">(${escapeHtml(p.role)})</span></button>`).join('');
      $$('[data-pick]', results).forEach(b => b.addEventListener('click', () => {
        chosenUserId = b.dataset.pick;
        const p = people.find(x => x.id === chosenUserId);
        chosen.innerHTML = '✅ ' + escapeHtml(p ? p.name : chosenUserId);
        results.innerHTML = '';
        search.value = '';
      }));
    });

    $('#msgSendBtn', pane).addEventListener('click', async () => {
      const title = $('#msgTitle', pane).value.trim(), body = $('#msgBody', pane).value.trim();
      let audience = audSel.value;
      if (!title || !body) return toast(t('required'), 'error');
      if (audience === 'user') {
        if (!chosenUserId) return toast(mAr() ? 'اختر الشخص المستلم أولاً' : 'Pick the recipient first', 'error');
        audience = 'user:' + chosenUserId;
      }
      try {
        await API.insert('messages', [{ sender_id: user.id, audience, title, body }]);
        await audit('send', 'messages', null, { audience, title });
        toast(this.labels.sentOk(), 'success');
        this.renderCompose(pane, user, ctx, pageRoot);
      } catch (e) { toast(t('dbError'), 'error'); }
    });
  },

  async _composeStudent(pane, user, ctx, pageRoot) {
    let teachers = [];
    try {
      if (ctx.studentSectionId) {
        const secs = await API.select('sections', 'select=teacher_id&id=eq.' + encodeURIComponent(ctx.studentSectionId)) || [];
        const ids = secs.map(s => s.teacher_id).filter(Boolean);
        if (ids.length) teachers = await API.select('profiles', 'select=id,name,role&id=in.(' + ids.map(encodeURIComponent).join(',') + ')') || [];
      }
    } catch (e) { teachers = []; }
    if (!teachers.length) { pane.innerHTML = `<div class="muted text-center" style="padding:1.5rem">${mAr() ? 'لا يوجد معلم مرتبط بشعبتك حالياً' : 'No teacher is linked to your section yet'}</div>`; return; }
    pane.innerHTML = `
      <div class="form-row"><div><label>${mAr() ? 'إلى معلم الشعبة' : 'To section teacher'}</label>
        <select class="input" id="msgTeacherPick">${teachers.map(tch => `<option value="${tch.id}">${escapeHtml(tch.name)}</option>`).join('')}</select></div></div>
      <div class="form-row"><div><label>${escapeHtml(this.labels.title())} *</label><input class="input" id="msgTitle" maxlength="140"></div></div>
      <div class="form-row"><div><label>${escapeHtml(this.labels.body())} *</label><textarea class="input" id="msgBody" rows="4" style="resize:vertical"></textarea></div></div>
      <button class="btn primary" id="msgSendBtn">📨 ${escapeHtml(this.labels.send())}</button>`;
    $('#msgSendBtn', pane).addEventListener('click', async () => {
      const title = $('#msgTitle', pane).value.trim(), body = $('#msgBody', pane).value.trim();
      if (!title || !body) return toast(t('required'), 'error');
      const to = $('#msgTeacherPick', pane).value;
      try {
        await API.insert('messages', [{ sender_id: user.id, audience: 'user:' + to, title, body }]);
        await audit('send', 'messages', null, { audience: 'user:' + to, title });
        toast(this.labels.sentOk(), 'success');
        this._composeStudent(pane, user, ctx, pageRoot);
      } catch (e) { toast(t('dbError'), 'error'); }
    });
  }
};
