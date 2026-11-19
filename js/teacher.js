/* ============================================================
   AMAMB — Teacher module (part 1): dashboard, roster, gradebook
   ============================================================ */
const TR = (ar, en) => (getLang() === 'ar' ? ar : en);

const TeacherCtx = {
  async load() {
    const user = App.user();
    const sections = await Data.mySections(user);
    let sid = App.currentSectionId();
    if (!sid || !(sections || []).find(s => s.id === sid)) sid = (sections && sections[0]) ? sections[0].id : null;
    App.setCurrentSectionId(sid);
    if (!sid) return { sections: sections || [], section: null, data: null };
    const data = await Data.sectionData(sid);
    const section = (sections || []).find(s => s.id === sid);
    return { sections: sections || [], section, data };
  },
  emptyNoSection(root) {
    root.innerHTML = `
      <div class="card text-center" style="padding:2.5rem 1rem">
        <div style="font-size:2.6rem">🏫</div>
        <h3 style="margin:.5rem 0">${TR('لا توجد شعب بعد', 'No sections yet')}</h3>
        <p class="muted">${TR('أنشئ شعبتك الأولى للبدء', 'Create your first section to get started')}</p>
        <button class="btn primary" id="createFirstSection" style="margin-top:.8rem">+ ${TR('إضافة شعبة', 'Add section')}</button>
      </div>`;
    $('#createFirstSection', root).addEventListener('click', () => TeacherPages.sectionForm());
  }
};

const TeacherUI = { gradebookTab: 0, selectedItem: {} };

const TeacherPages = {

  /* ---------- Section create/edit modal (shared) ---------- */
  sectionForm(existing) {
    const user = App.user();
    openModal({
      title: existing ? TR('تعديل الشعبة', 'Edit section') : TR('إضافة شعبة', 'Add section'),
      bodyHtml: `
        <div class="form-row cols-2">
          <div><label>${TR('الصف', 'Grade')} *</label><input class="input" id="fSecGrade" placeholder="${TR('مثال: الصف الثالث', 'e.g. Grade 3')}" value="${existing ? escapeHtml(existing.grade || '') : ''}"></div>
          <div><label>${TR('الشعبة', 'Section')} *</label><input class="input" id="fSecName" placeholder="A" value="${existing ? escapeHtml(existing.name || '') : ''}"></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveSectionBtn">${t('save')}</button>`,
      onOpen(mroot) {
        $('#saveSectionBtn', mroot).addEventListener('click', async () => {
          const grade = $('#fSecGrade', mroot).value.trim(), name = $('#fSecName', mroot).value.trim();
          if (!grade || !name) return toast(t('required'), 'error');
          if (existing) {
            await API.update('sections', 'id=eq.' + existing.id, { grade, name });
          } else {
            const rows = await API.insert('sections', [{ grade, name, teacher_id: user.id, school_id: user.school_id || null }]);
            if (rows && rows[0]) App.setCurrentSectionId(rows[0].id);
          }
          closeModal(); toast(t('saved'), 'success');
          App.refreshTopbar(); App.renderCurrent();
        });
      }
    });
  },

  /* ========== 1) Teacher dashboard ========== */
  async dashboard(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);

    const rows = Scoring.computeClass(data.students, data);
    const n = data.students.length;
    const overalls = rows.map(r => r.m.overallPct).filter(v => v !== null);
    const avgOverall = overalls.length ? avg(overalls) : null;
    const attRates = rows.map(r => r.m.attendanceRate).filter(v => v !== null);
    const avgAtt = attRates.length ? avg(attRates) * 100 : null;
    const avgPoints = n ? avg(rows.map(r => r.m.totalPoints)) : 0;
    const pendingHw = data.homework.reduce((acc, hw) => acc + data.students.filter(s => !(hw.status && (hw.status[s.id] === 'submitted' || hw.status[s.id] === 'late'))).length, 0);
    const top = rows[0];
    const support = rows.filter(r => r.m.overallPct !== null && r.m.overallPct < 60);
    const user = App.user();

    root.innerHTML = `
      <div class="card" style="background:var(--brand-grad);color:#fff;border:none;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
        <div>
          <div style="font-size:1.25rem;font-weight:800">${TR('أهلاً', 'Welcome')}، ${escapeHtml(user.name)} 👋</div>
          <div style="opacity:.9;font-size:.85rem">${escapeHtml((section.grade || '') + ' ' + (section.name || ''))} · ${escapeHtml((section.schools && section.schools.name) || user.school_name || '')} · ${new Date().toLocaleDateString(getLang() === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <button class="btn gold" id="quickAttendanceBtn">📱 ${t('openSession')}</button>
      </div>

      <div class="grid cols-4" style="margin-top:1rem">
        <div class="stat-card"><div class="stat-label">🎒 ${t('totalStudents')}</div><div class="stat-value">${n}</div><div class="stat-foot">${t('section')}: ${escapeHtml((section.grade || '') + ' ' + (section.name || ''))}</div></div>
        <div class="stat-card teal"><div class="stat-label">📈 ${t('avgOverall')}</div><div class="stat-value">${avgOverall === null ? '—' : pct1(avgOverall) + '%'}</div><div class="stat-foot">${t('academic')}</div></div>
        <div class="stat-card green"><div class="stat-label">🗓️ ${t('avgAttendance')}</div><div class="stat-value">${avgAtt === null ? '—' : pct1(avgAtt) + '%'}</div><div class="stat-foot">${t('attendanceSummary')}</div></div>
        <div class="stat-card amber"><div class="stat-label">📚 ${t('pendingHw')}</div><div class="stat-value">${pendingHw}</div><div class="stat-foot">${t('navHomework')}</div></div>
      </div>

      <div class="grid cols-3" style="margin-top:1rem;align-items:start">
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">📊 ${t('classPerformance')}</div></div>
          <div class="chart-box"><canvas id="perfChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">🏅 ${t('gradeDist')}</div></div>
          <div class="chart-box"><canvas id="distChart"></canvas></div>
        </div>
      </div>

      <div class="grid cols-3" style="margin-top:1rem;align-items:start">
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">🏆 ${TR('أوائل الطلاب', 'Top students')}</div><button class="btn ghost small" data-goto="leaderboard">${TR('الكل', 'View all')} ←</button></div>
          <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('rank')}</th><th>${t('student')}</th><th>${t('overall')}</th><th>${t('points')}</th></tr></thead>
            <tbody>${rows.slice(0, 5).map(r => `<tr>
              <td><span class="rank-badge ${r.rank <= 3 ? 'r' + r.rank : ''}">${r.rank}</span></td>
              <td><b>${escapeHtml(r.student.name)}</b></td>
              <td>${r.m.overallPct === null ? '—' : pct1(r.m.overallPct) + '%'}</td>
              <td><b>${r.m.totalPoints}</b></td></tr>`).join('') || `<tr><td colspan="4" class="muted text-center">${t('noData')}</td></tr>`}</tbody></table></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">🆘 ${t('needsSupport')}</div></div>
          ${support.length ? support.map(r => `<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.45rem .2rem;border-bottom:1px solid var(--line)"><span>${escapeHtml(r.student.name)}</span><span class="pill red">${pct1(r.m.overallPct)}%</span></div>`).join('') : `<div class="muted small" style="padding:.6rem .2rem">🎉 ${TR('لا يوجد طلاب متعثرون حالياً', 'No struggling students right now')}</div>`}
          ${top ? `<div style="margin-top:.7rem;padding:.6rem;border-radius:12px;background:linear-gradient(135deg,#fef3c7,#fde68a);text-align:center"><div style="font-size:1.5rem">👑</div><div class="small" style="color:#92400e;font-weight:800">${escapeHtml(top.student.name)}</div><div class="small" style="color:#92400e">${top.m.totalPoints} ${t('points')}</div></div>` : ''}
        </div>
      </div>`;

    $('#quickAttendanceBtn', root).addEventListener('click', () => App.go('attendance'));
    $$('[data-goto]', root).forEach(b => b.addEventListener('click', () => App.go(b.dataset.goto)));

    // Charts
    const itemLabels = [], itemAvgs = [];
    const exitG = data.exitTickets.filter(x => Scoring.hasAny(x.scores));
    if (exitG.length) {
      itemLabels.push(t('exitTickets'));
      itemAvgs.push(pct1(avg(exitG.map(x => avg(Object.values(x.scores).map(Number)) / (x.max || 10))) * 100));
    }
    const quizG = data.quizzes.filter(x => x.kind !== 'final' && Scoring.hasAny(x.scores));
    if (quizG.length) {
      itemLabels.push(t('quarterQuizzes'));
      itemAvgs.push(pct1(avg(quizG.map(x => avg(Object.values(x.scores).map(Number)) / (x.max || 20))) * 100));
    }
    const finalG = data.quizzes.filter(x => x.kind === 'final' && Scoring.hasAny(x.scores));
    if (finalG.length) {
      itemLabels.push(t('quarterFinal'));
      itemAvgs.push(pct1(avg(finalG.map(x => avg(Object.values(x.scores).map(Number)) / (x.max || 40))) * 100));
    }
    if (data.homework.length) {
      const rates = data.homework.map(hw => {
        const done = data.students.filter(s => hw.status && (hw.status[s.id] === 'submitted' || hw.status[s.id] === 'late')).length;
        return data.students.length ? done / data.students.length : 0;
      });
      itemLabels.push(t('navHomework'));
      itemAvgs.push(pct1(avg(rates) * 100));
    }
    renderChart('perfChart', {
      type: 'bar',
      data: { labels: itemLabels, datasets: [{ label: t('avg') + ' %', data: itemAvgs, backgroundColor: ['#d97706', '#ea580c', '#c2410c', '#166534'], borderRadius: 8 }] },
      options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
    });

    const buckets = { 'A+/A': 0, 'B+/B': 0, 'C+/C': 0, 'D': 0, 'F': 0 };
    overalls.forEach(p => { if (p >= 87) buckets['A+/A']++; else if (p >= 73) buckets['B+/B']++; else if (p >= 60) buckets['C+/C']++; else if (p >= 50) buckets['D']++; else buckets['F']++; });
    renderChart('distChart', {
      type: 'doughnut',
      data: { labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets), backgroundColor: ['#15803d', '#65a30d', '#d97706', '#ea580c', '#dc2626'], borderWidth: 2 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  },

  /* ========== 2) Roster (students management) ========== */
  async roster(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const rows = Scoring.computeClass(data.students, data);
    const byId = Object.fromEntries(rows.map(r => [r.student.id, r]));

    root.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div class="card-title">🎒 ${t('navStudents')} — ${escapeHtml((section.grade || '') + ' ' + (section.name || ''))}</div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap">
            <button class="btn ghost small" id="editSectionBtn">✏️ ${TR('الشعبة', 'Section')}</button>
            <button class="btn primary" id="addStudentBtn">+ ${TR('إضافة طالب', 'Add student')}</button>
          </div>
        </div>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>${t('name')}</th><th>PIN</th><th>WhatsApp</th><th>${t('overall')}</th><th>${t('rank')}</th><th>${TR('الحساب', 'Account')}</th><th>${t('actions')}</th></tr></thead>
          <tbody>${data.students.map(s => { const r = byId[s.id]; return `<tr>
            <td><b>${escapeHtml(s.name)}</b></td>
            <td dir="ltr">${escapeHtml(s.pin || '—')}</td>
            <td dir="ltr">${s.parent_whatsapp ? `<a href="${waLink(s.parent_whatsapp, '')}" target="_blank" rel="noopener">${escapeHtml(s.parent_whatsapp)}</a>` : '—'}</td>
            <td>${r && r.m.overallPct !== null ? pct1(r.m.overallPct) + '%' : '—'}</td>
            <td>${r ? r.rank : '—'}</td>
            <td>${s.user_id ? '<span class="pill green">✓</span>' : `<button class="btn ghost small" data-create-account="${s.id}">🔑 ${TR('حساب', 'Account')}</button>`}</td>
            <td style="white-space:nowrap">
              <button class="btn ghost small" data-edit-student="${s.id}">✏️</button>
              <button class="btn ghost small" data-del-student="${s.id}">🗑️</button>
            </td></tr>`; }).join('') || `<tr><td colspan="7" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
        </table></div>
      </div>`;

    $('#editSectionBtn', root).addEventListener('click', () => this.sectionForm(section));
    $('#addStudentBtn', root).addEventListener('click', () => this.studentForm(section));
    $$('[data-edit-student]', root).forEach(b => b.addEventListener('click', () => {
      this.studentForm(section, data.students.find(s => s.id === b.dataset.editStudent));
    }));
    $$('[data-del-student]', root).forEach(b => b.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => {
        await API.remove('students', 'id=eq.' + b.dataset.delStudent);
        toast(t('deleted'), 'success'); TeacherPages.roster(root);
      }, true);
    }));
    $$('[data-create-account]', root).forEach(b => b.addEventListener('click', () => {
      const st = data.students.find(s => s.id === b.dataset.createAccount);
      openModal({
        title: TR('إنشاء حساب طالب', 'Create student account'),
        bodyHtml: `
          <p class="small muted" style="margin-bottom:.5rem">${escapeHtml(st.name)}</p>
          <div class="form-row"><div><label>${t('email')} *</label><input class="input" id="fStuEmail" dir="ltr" type="email"></div></div>
          <div class="form-row"><div><label>${t('password')} *</label><input class="input" id="fStuPass" dir="ltr" type="text" placeholder="min 6 chars"></div></div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="createStuAccBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#createStuAccBtn', mroot).addEventListener('click', async () => {
            const email = $('#fStuEmail', mroot).value.trim().toLowerCase(), pass = $('#fStuPass', mroot).value;
            if (!email || pass.length < 6) return toast(t('required') + ' (≥6)', 'error');
            try {
              const prof = await API.insert('profiles', [{ name: st.name, email, password_hash: sha256Sync(pass), role: 'student', school_id: st.school_id }]);
              await API.update('students', 'id=eq.' + st.id, { user_id: prof[0].id });
              closeModal(); toast(t('saved'), 'success'); TeacherPages.roster(root);
            } catch (e) { toast(String(e.message || e).includes('duplicate') ? 'Email exists' : t('dbError'), 'error'); }
          });
        }
      });
    }));
  },

  studentForm(section, student) {
    const editing = !!student;
    openModal({
      title: editing ? t('edit') : TR('إضافة طالب', 'Add student'),
      bodyHtml: `
        <div class="form-row"><div><label>${t('name')} *</label><input class="input" id="fStuName" value="${editing ? escapeHtml(student.name) : ''}"></div></div>
        <div class="form-row cols-2">
          <div><label>PIN (4 ${TR('أرقام', 'digits')})</label><input class="input" id="fStuPin" dir="ltr" maxlength="6" value="${editing ? escapeHtml(student.pin || '') : String(Math.floor(1000 + Math.random() * 9000))}"></div>
          <div><label>WhatsApp</label><input class="input" id="fStuWa" dir="ltr" placeholder="9665xxxxxxxx" value="${editing ? escapeHtml(student.parent_whatsapp || '') : ''}"></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveStudentBtn">${t('save')}</button>`,
      onOpen(mroot) {
        $('#saveStudentBtn', mroot).addEventListener('click', async () => {
          const name = $('#fStuName', mroot).value.trim();
          if (!name) return toast(t('required'), 'error');
          const body = { name, pin: $('#fStuPin', mroot).value.trim() || null, parent_whatsapp: $('#fStuWa', mroot).value.trim() || null };
          if (editing) await API.update('students', 'id=eq.' + student.id, body);
          else await API.insert('students', [Object.assign(body, { section_id: section.id, school_id: section.school_id || App.user().school_id || null })]);
          closeModal(); toast(t('saved'), 'success'); App.renderCurrent();
        });
      }
    });
  }
};
