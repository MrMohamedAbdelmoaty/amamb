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
          await audit('delete', 'schools', b.dataset.delSchool, {});
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
            await audit(editing ? 'update' : 'create', 'schools', editing ? school.id : null, { name });
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
              <button class="btn ghost small" data-link-secs="${tch.id}" title="${getLang() === 'ar' ? 'ربط الشعب' : 'Link sections'}">🔗</button>
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

    $$('[data-link-secs]', root).forEach(b => b.addEventListener('click', async () => {
      const tch = teachers.find(x => x.id === b.dataset.linkSecs);
      if (!tch.school_id) return toast(getLang() === 'ar' ? 'عيّن مدرسة للمعلم أولاً' : 'Assign a school to this teacher first', 'error');
      const schoolSections = (await API.select('sections', 'select=id,grade,name,teacher_id&school_id=eq.' + encodeURIComponent(tch.school_id) + '&order=grade,name')) || [];
      openModal({
        title: (getLang() === 'ar' ? 'ربط الشعب بالمعلم: ' : 'Link sections to: ') + tch.name,
        bodyHtml: `<p class="small muted">${getLang() === 'ar' ? 'حدد الشعب التي يدرّسها هذا المعلم' : 'Check the sections this teacher teaches'}</p>
          <div style="display:flex;flex-direction:column;gap:.35rem;max-height:50vh;overflow:auto">
            ${schoolSections.map(s => `<label class="card" style="margin:0;box-shadow:none;padding:.45rem .6rem;display:flex;gap:.55rem;align-items:center;cursor:pointer"><input type="checkbox" class="link-sec-pick" value="${s.id}" ${s.teacher_id === tch.id ? 'checked' : ''}> <span><b>${escapeHtml(((s.grade || '') + ' ' + (s.name || '')).trim())}</b>${s.teacher_id && s.teacher_id !== tch.id ? ' <span class="small muted">(' + (getLang() === 'ar' ? 'مرتبط بمعلم آخر' : 'linked to another teacher') + ')</span>' : ''}</span></label>`).join('') || `<div class="muted">${getLang() === 'ar' ? 'لا توجد شعب في هذه المدرسة' : 'No sections in this school'}</div>`}
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveLinkSecsBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveLinkSecsBtn', mroot).addEventListener('click', async () => {
            const picked = new Set($$('.link-sec-pick', mroot).filter(x => x.checked).map(x => x.value));
            try {
              for (const s of schoolSections) {
                const shouldHave = picked.has(s.id);
                const has = s.teacher_id === tch.id;
                if (shouldHave && !has) await API.update('sections', 'id=eq.' + s.id, { teacher_id: tch.id });
                else if (!shouldHave && has) await API.update('sections', 'id=eq.' + s.id, { teacher_id: null });
              }
              await audit('link-sections', 'sections', null, { teacher: tch.email, sections: Array.from(picked) });
              closeModal(); toast(t('saved'), 'success'); AdminPages.teachers(root);
            } catch (e) { toast(t('dbError'), 'error'); }
          });
        }
      });
    }));

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

  /* ========== 4) Students (all schools) — full CRUD ========== */
  async students(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [schools, sections, students] = await Promise.all([
      API.select('schools', 'select=id,name&order=name'),
      API.select('sections', 'select=id,grade,name,school_id&order=grade,name'),
      API.select('students', 'select=*&order=name')
    ]);
    const schoolName = id => (schools.find(s => s.id === id) || {}).name || '—';
    const sectionLabel = id => { const s = sections.find(x => x.id === id); return s ? ((s.grade || '') + ' ' + (s.name || '')).trim() : '—'; };
    const render = () => {
      root.innerHTML = `
        <div class="card">
          <div class="card-head"><div class="card-title">🎒 ${t('navStudents')} (${(students || []).length})</div>
            <button class="btn primary" id="addStudentBtn">+ ${getLang() === 'ar' ? 'إضافة طالب' : 'Add student'}</button></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('name')}</th><th>${t('assignSchool')}</th><th>${t('section')}</th><th>PIN</th><th>WhatsApp</th><th>${t('actions')}</th></tr></thead>
            <tbody>${(students || []).map(s => `<tr>
              <td><b>${escapeHtml(s.name)}</b>${s.user_id ? ' <span class="pill blue small">🔑 ' + (getLang() === 'ar' ? 'له حساب' : 'login') + '</span>' : ''}</td>
              <td>${escapeHtml(schoolName(s.school_id))}</td>
              <td>${escapeHtml(sectionLabel(s.section_id))}</td>
              <td dir="ltr">${escapeHtml(s.pin || '—')}</td>
              <td dir="ltr">${escapeHtml(s.parent_whatsapp || '—')}</td>
              <td style="white-space:nowrap">
                <button class="btn ghost small" data-edit-student="${s.id}">✏️</button>
                <button class="btn ghost small" data-login-student="${s.id}" title="${getLang() === 'ar' ? 'حساب دخول' : 'Login account'}">🔑</button>
                <button class="btn ghost small" data-del-student="${s.id}">🗑️</button>
              </td>
            </tr>`).join('') || `<tr><td colspan="6" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>`;

      const sectionOptions = (selSchool, selected) => {
        const list = (sections || []).filter(s => !selSchool || s.school_id === selSchool);
        return `<option value="">${getLang() === 'ar' ? 'بدون شعبة' : 'No section'}</option>` +
          list.map(s => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${escapeHtml(((s.grade || '') + ' ' + (s.name || '')).trim())} — ${escapeHtml(schoolName(s.school_id))}</option>`).join('');
      };

      $('#addStudentBtn', root).addEventListener('click', () => {
        openModal({
          title: getLang() === 'ar' ? 'إضافة طالب' : 'Add student',
          bodyHtml: `
            <div class="form-row"><div><label>${t('name')} *</label><input class="input" id="fStuName"></div></div>
            <div class="form-row cols-2">
              <div><label>PIN</label><input class="input" id="fStuPin" dir="ltr" inputmode="numeric" maxlength="8"></div>
              <div><label>WhatsApp</label><input class="input" id="fStuWa" dir="ltr" placeholder="9665xxxxxxxx"></div>
            </div>
            <div class="form-row"><div><label>${t('section')}</label><select class="input" id="fStuSection">${sectionOptions('', '')}</select></div></div>`,
          footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveStuBtn">${t('save')}</button>`,
          onOpen(mroot) {
            $('#saveStuBtn', mroot).addEventListener('click', async () => {
              const name = $('#fStuName', mroot).value.trim();
              if (!name) return toast(t('required'), 'error');
              const sectionId = $('#fStuSection', mroot).value || null;
              const sec = (sections || []).find(s => s.id === sectionId);
              try {
                const out = await API.insert('students', [{ name, pin: $('#fStuPin', mroot).value.trim() || null, parent_whatsapp: $('#fStuWa', mroot).value.replace(/[^\d]/g, '') || null, section_id: sectionId, school_id: sec ? sec.school_id : ((schools && schools[0]) || {}).id || null }]);
                await audit('create', 'students', out && out[0] ? out[0].id : null, { name });
                closeModal(); toast(t('saved'), 'success'); AdminPages.students(root);
              } catch (e) { toast(t('dbError'), 'error'); }
            });
          }
        });
      });

      $$('[data-edit-student]', root).forEach(b => b.addEventListener('click', () => {
        const s = students.find(x => x.id === b.dataset.editStudent);
        openModal({
          title: (getLang() === 'ar' ? 'تعديل الطالب: ' : 'Edit student: ') + s.name,
          bodyHtml: `
            <div class="form-row"><div><label>${t('name')} *</label><input class="input" id="fStuName" value="${escapeHtml(s.name)}"></div></div>
            <div class="form-row cols-2">
              <div><label>PIN</label><input class="input" id="fStuPin" dir="ltr" value="${escapeHtml(s.pin || '')}"></div>
              <div><label>WhatsApp</label><input class="input" id="fStuWa" dir="ltr" value="${escapeHtml(s.parent_whatsapp || '')}"></div>
            </div>
            <div class="form-row"><div><label>${t('section')}</label><select class="input" id="fStuSection">${sectionOptions('', s.section_id || '')}</select></div></div>`,
          footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveStuEditBtn">${t('save')}</button>`,
          onOpen(mroot) {
            $('#saveStuEditBtn', mroot).addEventListener('click', async () => {
              const name = $('#fStuName', mroot).value.trim();
              if (!name) return toast(t('required'), 'error');
              const sectionId = $('#fStuSection', mroot).value || null;
              const sec = (sections || []).find(x => x.id === sectionId);
              await API.update('students', 'id=eq.' + s.id, { name, pin: $('#fStuPin', mroot).value.trim() || null, parent_whatsapp: $('#fStuWa', mroot).value.replace(/[^\d]/g, '') || null, section_id: sectionId, school_id: sec ? sec.school_id : s.school_id });
              await audit('update', 'students', s.id, { name });
              closeModal(); toast(t('saved'), 'success'); AdminPages.students(root);
            });
          }
        });
      }));

      $$('[data-login-student]', root).forEach(b => b.addEventListener('click', () => {
        const s = students.find(x => x.id === b.dataset.loginStudent);
        if (s.user_id) {
          // Has an account — offer password reset
          openModal({
            title: (getLang() === 'ar' ? 'إعادة تعيين كلمة مرور حساب: ' : 'Reset password for: ') + s.name,
            bodyHtml: `<div class="form-row"><div><label>${t('newPassword')} *</label><input class="input" id="fStuNewPass" dir="ltr" type="text" placeholder="min 6 chars"></div></div>`,
            footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="doStuPassBtn">${t('save')}</button>`,
            onOpen(mroot) {
              $('#doStuPassBtn', mroot).addEventListener('click', async () => {
                const pass = $('#fStuNewPass', mroot).value;
                if (pass.length < 6) return toast(t('required') + ' (≥6)', 'error');
                await API.update('profiles', 'id=eq.' + s.user_id, { password_hash: sha256Sync(pass) });
                await audit('reset-password', 'profiles', s.user_id, { student: s.name });
                closeModal(); toast(t('saved'), 'success');
              });
            }
          });
          return;
        }
        openModal({
          title: (getLang() === 'ar' ? 'إنشاء حساب دخول للطالب: ' : 'Create login for: ') + s.name,
          bodyHtml: `
            <div class="form-row"><div><label>${t('email')} *</label><input class="input" id="fStuEmail" dir="ltr" type="email" placeholder="student@school.com"></div></div>
            <div class="form-row"><div><label>${t('password')} *</label><input class="input" id="fStuPass" dir="ltr" type="text" placeholder="min 6 chars"></div></div>
            <p class="small muted">${getLang() === 'ar' ? 'سيتم ربط الحساب ببطاقة الطالب تلقائياً.' : 'The account will be linked to this student record automatically.'}</p>`,
          footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="createStuLoginBtn">${t('save')}</button>`,
          onOpen(mroot) {
            $('#createStuLoginBtn', mroot).addEventListener('click', async () => {
              const email = $('#fStuEmail', mroot).value.trim().toLowerCase(), pass = $('#fStuPass', mroot).value;
              if (!email || pass.length < 6) return toast(t('required') + ' (≥6)', 'error');
              try {
                const out = await API.insert('profiles', [{ name: s.name, email, password_hash: sha256Sync(pass), role: 'student', school_id: s.school_id || null }]);
                const newId = out && out[0] ? out[0].id : null;
                if (newId) await API.update('students', 'id=eq.' + s.id, { user_id: newId });
                await audit('create', 'profiles', newId, { student: s.name, email });
                closeModal(); toast(t('saved'), 'success'); AdminPages.students(root);
              } catch (e) { toast(String(e.message || e).includes('duplicate') ? 'Email exists' : t('dbError'), 'error'); }
            });
          }
        });
      }));

      $$('[data-del-student]', root).forEach(b => b.addEventListener('click', () => {
        const s = students.find(x => x.id === b.dataset.delStudent);
        confirmModal(t('confirmDelete') + ' ' + s.name + (s.user_id ? (getLang() === 'ar' ? ' (وسيُحذف حساب الدخول المرتبط أيضاً)' : ' (linked login account will also be deleted)') : ''), async () => {
          if (s.user_id) { try { await API.remove('profiles', 'id=eq.' + s.user_id); } catch (e) {} }
          await API.remove('students', 'id=eq.' + s.id);
          await audit('delete', 'students', s.id, { name: s.name });
          toast(t('deleted'), 'success'); AdminPages.students(root);
        }, true);
      }));
    };
    render();
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
        await audit('subscription', 'schools', b.dataset.id, { subscription_status: b.dataset.subSet });
        toast(t('saved'), 'success'); render();
      }));
    };
    render();
  }
};
