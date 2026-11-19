/* ============================================================
   AMAMB — Admin module (platform owner)
   ============================================================ */
const AdminPages = {

  /* ---------- helpers ---------- */
  schoolOptions(schools, selected) {
    return schools.map(s => `<option value="${escapeHtml(s.id)}" ${s.id === selected ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
  },
  planLabel(p) { return t('plan_' + (p || 'basic')); },
  statusPill(s) {
    const map = { active: 'green', suspended: 'red', trial: 'amber' };
    return `<span class="pill ${map[s] || 'gray'}">${t(s) || escapeHtml(s)}</span>`;
  },

  /* ========== 1) Platform dashboard ========== */
  async dashboard(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { schools, profiles, students } = await Data.platformStats();
    const teachers = profiles.filter(p => p.role === 'teacher');
    const admins = profiles.filter(p => p.role === 'admin');
    const countFor = (sid, list) => list.filter(x => x.school_id === sid).length;

    root.innerHTML = `
      <div class="grid cols-4" style="margin-bottom:1rem">
        <div class="stat-card"><div class="stat-label">🏫 ${t('schools')}</div><div class="stat-value">${schools.length}</div><div class="stat-foot">${schools.filter(s => s.subscription_status === 'active').length} ${t('active')}</div></div>
        <div class="stat-card teal"><div class="stat-label">🧑‍🏫 ${t('teachers')}</div><div class="stat-value">${teachers.length}</div><div class="stat-foot">${admins.length} ${t('admins')}</div></div>
        <div class="stat-card gold"><div class="stat-label">🎒 ${t('students')}</div><div class="stat-value">${students.length}</div><div class="stat-foot">${escapeHtml(t('platformStats'))}</div></div>
        <div class="stat-card ${schools.some(s => s.subscription_status === 'suspended') ? 'red' : 'green'}"><div class="stat-label">💳 ${t('navSubscriptions')}</div><div class="stat-value">${schools.filter(s => s.subscription_status === 'suspended').length}</div><div class="stat-foot">${t('suspended')}</div></div>
      </div>

      <div class="grid cols-3" style="align-items:start">
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">🏫 ${t('schools')}</div></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('schoolName')}</th><th>${t('plan')}</th><th>${t('subStatus')}</th><th>${t('teachers')}</th><th>${t('students')}</th></tr></thead>
            <tbody>${schools.map(s => `<tr>
              <td><b>${escapeHtml(s.name)}</b><div class="small muted">${escapeHtml(s.code || '')}</div></td>
              <td>${this.planLabel(s.plan)}</td>
              <td>${this.statusPill(s.subscription_status)}</td>
              <td>${countFor(s.id, teachers)}</td>
              <td>${countFor(s.id, students)}</td>
            </tr>`).join('') || `<tr><td colspan="5" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">📊 ${t('subStatus')}</div></div>
          <div class="chart-box sm"><canvas id="adminSubChart"></canvas></div>
        </div>
      </div>`;

    const counts = { active: 0, suspended: 0, trial: 0 };
    schools.forEach(s => { counts[s.subscription_status] = (counts[s.subscription_status] || 0) + 1; });
    renderChart('adminSubChart', {
      type: 'doughnut',
      data: {
        labels: [t('active'), t('suspended'), t('trial')],
        datasets: [{ data: [counts.active, counts.suspended, counts.trial], backgroundColor: ['#16a34a', '#dc2626', '#d97706'], borderWidth: 2 }]
      },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  },

  /* ========== 2) Schools CRUD ========== */
  async schools(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const schools = await API.select('schools', 'select=*&order=created_at');
    const render = () => {
      root.innerHTML = `
        <div class="card">
          <div class="card-head">
            <div class="card-title">🏫 ${t('navSchools')}</div>
            <button class="btn primary" id="addSchoolBtn">+ ${t('addSchool')}</button>
          </div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('schoolName')}</th><th>${t('schoolCode')}</th><th>${t('plan')}</th><th>${t('subStatus')}</th><th>${t('actions')}</th></tr></thead>
            <tbody>${(schools || []).map(s => `<tr>
              <td><b>${escapeHtml(s.name)}</b></td>
              <td dir="ltr">${escapeHtml(s.code || '—')}</td>
              <td>${this.planLabel(s.plan)}</td>
              <td>${this.statusPill(s.subscription_status)}</td>
              <td style="white-space:nowrap">
                <button class="btn ghost small" data-edit-school="${s.id}">✏️ ${t('edit')}</button>
                <button class="btn ghost small" data-del-school="${s.id}">🗑️</button>
              </td></tr>`).join('') || `<tr><td colspan="5" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>`;
      $('#addSchoolBtn', root).addEventListener('click', () => this.schoolForm());
      $$('[data-edit-school]', root).forEach(b => b.addEventListener('click', () => {
        const s = schools.find(x => x.id === b.dataset.editSchool);
        this.schoolForm(s);
      }));
      $$('[data-del-school]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => {
          await API.remove('schools', 'id=eq.' + b.dataset.delSchool);
          toast(t('deleted'), 'success');
          this.schools(root);
        }, true);
      }));
    };
    render();

    this.schoolForm = (school) => {
      const editing = !!school;
      openModal({
        title: editing ? t('editSchool') : t('addSchool'),
        bodyHtml: `
          <div class="form-row"><div><label>${t('schoolName')} *</label><input class="input" id="fSchoolName" value="${editing ? escapeHtml(school.name) : ''}"></div></div>
          <div class="form-row cols-2">
            <div><label>${t('schoolCode')}</label><input class="input" id="fSchoolCode" dir="ltr" value="${editing ? escapeHtml(school.code || '') : ''}"></div>
            <div><label>${t('plan')}</label><select class="input" id="fSchoolPlan">
              ${['basic', 'pro', 'premium'].map(p => `<option value="${p}" ${editing && school.plan === p ? 'selected' : ''}>${this.planLabel(p)}</option>`).join('')}
            </select></div>
          </div>
          <div class="form-row"><div><label>${t('subStatus')}</label><select class="input" id="fSchoolStatus">
            ${['active', 'trial', 'suspended'].map(s => `<option value="${s}" ${editing && school.subscription_status === s ? 'selected' : ''}>${t(s)}</option>`).join('')}
          </select></div></div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveSchoolBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveSchoolBtn', mroot).addEventListener('click', async () => {
            const name = $('#fSchoolName', mroot).value.trim();
            if (!name) return toast(t('required'), 'error');
            const body = { name, code: $('#fSchoolCode', mroot).value.trim() || null, plan: $('#fSchoolPlan', mroot).value, subscription_status: $('#fSchoolStatus', mroot).value };
            if (editing) await API.update('schools', 'id=eq.' + school.id, body);
            else await API.insert('schools', [body]);
            closeModal(); toast(t('saved'), 'success'); AdminPages.schools(root);
          });
        }
      });
    };
  },

  /* ========== 3) Teachers ========== */
  async teachers(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [schools, teachers] = await Promise.all([
      API.select('schools', 'select=id,name&order=name'),
      API.select('profiles', 'select=*&role=eq.teacher&order=created_at')
    ]);
    const schoolName = id => (schools.find(s => s.id === id) || {}).name || '—';
    root.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title">🧑‍🏫 ${t('navTeachers')}</div>
          <button class="btn primary" id="addTeacherBtn">+ ${t('createTeacher')}</button>
        </div>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>${t('name')}</th><th>${t('email')}</th><th>${t('assignSchool')}</th><th>${t('actions')}</th></tr></thead>
          <tbody>${(teachers || []).map(tch => `<tr>
            <td><div class="user-chip" style="background:transparent;padding:0"><div class="avatar" style="width:36px;height:36px;font-size:.85rem;border-radius:10px">${escapeHtml(initials(tch.name))}</div><b>${escapeHtml(tch.name)}</b></div></td>
            <td dir="ltr">${escapeHtml(tch.email)}</td>
            <td>${escapeHtml(schoolName(tch.school_id))}</td>
            <td style="white-space:nowrap">
              <button class="btn ghost small" data-reset="${tch.id}">🔑 ${t('resetPassword')}</button>
              <button class="btn ghost small" data-del-teacher="${tch.id}">🗑️</button>
            </td></tr>`).join('') || `<tr><td colspan="4" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
        </table></div>
      </div>`;

    $('#addTeacherBtn', root).addEventListener('click', () => {
      openModal({
        title: t('createTeacher'),
        bodyHtml: `
          <div class="form-row"><div><label>${t('name')} *</label><input class="input" id="fTName"></div></div>
          <div class="form-row"><div><label>${t('email')} *</label><input class="input" id="fTEmail" dir="ltr" type="email" placeholder="teacher@school.com"></div></div>
          <div class="form-row cols-2">
            <div><label>${t('password')} *</label><input class="input" id="fTPass" dir="ltr" type="text" placeholder="min 6 chars"></div>
            <div><label>${t('assignSchool')}</label><select class="input" id="fTSchool">${this.schoolOptions(schools || [])}</select></div>
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveTeacherBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveTeacherBtn', mroot).addEventListener('click', async () => {
            const name = $('#fTName', mroot).value.trim(), email = $('#fTEmail', mroot).value.trim().toLowerCase(), pass = $('#fTPass', mroot).value;
            if (!name || !email || pass.length < 6) return toast(t('required') + ' (≥6)', 'error');
            try {
              await API.insert('profiles', [{ name, email, password_hash: sha256Sync(pass), role: 'teacher', school_id: $('#fTSchool', mroot).value || null }]);
              closeModal(); toast(t('saved'), 'success'); AdminPages.teachers(root);
            } catch (e) { toast(String(e.message || e).includes('duplicate') ? 'Email exists' : t('dbError'), 'error'); }
          });
        }
      });
    });

    $$('[data-reset]', root).forEach(b => b.addEventListener('click', () => {
      openModal({
        title: t('resetPassword'),
        bodyHtml: `<div class="form-row"><div><label>${t('newPassword')} *</label><input class="input" id="fResetPass" dir="ltr" type="text" placeholder="min 6 chars"></div></div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="doResetBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#doResetBtn', mroot).addEventListener('click', async () => {
            const pass = $('#fResetPass', mroot).value;
            if (pass.length < 6) return toast(t('required') + ' (≥6)', 'error');
            await API.update('profiles', 'id=eq.' + b.dataset.reset, { password_hash: sha256Sync(pass) });
            closeModal(); toast(t('saved'), 'success');
          });
        }
      });
    }));

    $$('[data-del-teacher]', root).forEach(b => b.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => {
        await API.remove('profiles', 'id=eq.' + b.dataset.delTeacher);
        toast(t('deleted'), 'success'); AdminPages.teachers(root);
      }, true);
    }));
  },

  /* ========== 4) Students (all schools) ========== */
  async students(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [schools, sections, students] = await Promise.all([
      API.select('schools', 'select=id,name&order=name'),
      API.select('sections', 'select=id,grade,name,school_id'),
      API.select('students', 'select=*&order=name')
    ]);
    const schoolName = id => (schools.find(s => s.id === id) || {}).name || '—';
    const sectionLabel = id => { const s = sections.find(x => x.id === id); return s ? `${s.grade || ''} ${s.name || ''}`.trim() : '—'; };

    root.innerHTML = `
      <div class="card">
        <div class="card-head"><div class="card-title">🎒 ${t('navStudents')} (${(students || []).length})</div></div>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>${t('name')}</th><th>${t('assignSchool')}</th><th>${t('section')}</th><th>PIN</th><th>WhatsApp</th></tr></thead>
          <tbody>${(students || []).map(s => `<tr>
            <td><b>${escapeHtml(s.name)}</b></td>
            <td>${escapeHtml(schoolName(s.school_id))}</td>
            <td>${escapeHtml(sectionLabel(s.section_id))}</td>
            <td dir="ltr">${escapeHtml(s.pin || '—')}</td>
            <td dir="ltr">${escapeHtml(s.parent_whatsapp || '—')}</td>
          </tr>`).join('') || `<tr><td colspan="5" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
        </table></div>
      </div>`;
  },

  /* ========== 5) Subscriptions ========== */
  async subscriptions(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const schools = await API.select('schools', 'select=*&order=name');
    const render = () => {
      root.innerHTML = `
        <div class="card">
          <div class="card-head"><div class="card-title">💳 ${t('navSubscriptions')}</div></div>
          <div class="grid cols-2">
            ${(schools || []).map(s => `
              <div class="card" style="margin:0;box-shadow:none">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.6rem">
                  <div>
                    <div style="font-weight:800;font-size:1.02rem">🏫 ${escapeHtml(s.name)}</div>
                    <div class="small muted" dir="ltr">${escapeHtml(s.code || '')} · ${this.planLabel(s.plan)}</div>
                    <div style="margin-top:.4rem">${this.statusPill(s.subscription_status)}</div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:.35rem">
                    ${s.subscription_status !== 'active' ? `<button class="btn green small" data-sub-set="active" data-id="${s.id}">✅ ${t('active')}</button>` : ''}
                    ${s.subscription_status !== 'trial' ? `<button class="btn amber small" data-sub-set="trial" data-id="${s.id}">🧪 ${t('trial')}</button>` : ''}
                    ${s.subscription_status !== 'suspended' ? `<button class="btn red small" data-sub-set="suspended" data-id="${s.id}">⛔ ${t('suspended')}</button>` : ''}
                  </div>
                </div>
              </div>`).join('') || emptyState()}
          </div>
          <p class="small muted" style="margin-top:.8rem">ℹ️ ${getLang() === 'ar' ? 'تعليق مدرسة يمنع معلميها وطلابها من تسجيل الدخول فوراً.' : 'Suspending a school blocks its teachers and students from signing in immediately.'}</p>
        </div>`;
      $$('[data-sub-set]', root).forEach(b => b.addEventListener('click', async () => {
        await API.update('schools', 'id=eq.' + b.dataset.id, { subscription_status: b.dataset.subSet });
        toast(t('saved'), 'success'); render();
      }));
    };
    render();
  }
};
