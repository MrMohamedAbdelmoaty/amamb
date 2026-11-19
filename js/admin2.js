/* ============================================================
   AMAMB — Admin suite (part 2): curricula · lessons · question bank
   · sections & roster · audit log · roles & approvals
   ============================================================ */
const AdminPages2 = {
  ar() { return getLang() === 'ar'; },

  /* ================= CURRICULA + UNITS ================= */
  async curricula(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [curricula, units] = await Promise.all([
      API.select('curricula', 'select=*&order=position,created_at'),
      API.select('curriculum_units', 'select=*&order=position,created_at')
    ]);
    const render = () => {
      const list = curricula || [];
      root.innerHTML = `
        <div class="card">
          <div class="card-head"><div class="card-title">📚 ${AdminPages2.ar() ? 'المناهج والوحدات' : 'Curricula & Units'}</div>
            <button class="btn primary" id="addCurrBtn">+ ${AdminPages2.ar() ? 'منهج جديد' : 'New curriculum'}</button></div>
          <div style="display:flex;flex-direction:column;gap:.6rem">
            ${list.map(c => {
              const myUnits = (units || []).filter(u => u.curriculum_id === c.id);
              return `<div class="card" style="margin:0;box-shadow:none">
                <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
                  <div style="flex:1;min-width:220px">
                    <b>${escapeHtml(AdminPages2.ar() ? c.name_ar : c.name_en)}</b>
                    <div class="small muted" dir="ltr">${escapeHtml(c.subject || '')} · ${escapeHtml(c.grade || '')}</div>
                  </div>
                  <span class="pill ${c.is_active ? 'green' : 'gray'}">${c.is_active ? (AdminPages2.ar() ? 'مفعّل' : 'Active') : (AdminPages2.ar() ? 'موقوف' : 'Off')}</span>
                  <button class="btn ghost small" data-toggle-curr="${c.id}">${c.is_active ? '⏸️' : '▶️'}</button>
                  <button class="btn ghost small" data-edit-curr="${c.id}">✏️</button>
                  <button class="btn ghost small" data-del-curr="${c.id}">🗑️</button>
                </div>
                <div style="margin-top:.5rem;border-top:1px dashed rgba(0,0,0,.15);padding-top:.5rem">
                  <div class="small" style="font-weight:800;margin-bottom:.3rem">📦 ${AdminPages2.ar() ? 'الوحدات' : 'Units'} (${myUnits.length})</div>
                  <div style="display:flex;flex-direction:column;gap:.3rem">
                    ${myUnits.map(u => `<div style="display:flex;gap:.5rem;align-items:center;padding:.3rem .5rem;border:1px solid rgba(0,0,0,.1);border-radius:8px">
                      <span style="flex:1"><b dir="ltr" style="color:#94a3b8">${u.position || ''}.</b> ${escapeHtml(AdminPages2.ar() ? u.title_ar : u.title_en)}</span>
                      <span class="pill ${u.is_active ? 'green' : 'gray'} small">${u.is_active ? '✓' : 'off'}</span>
                      <button class="btn ghost small" data-toggle-unit="${u.id}">${u.is_active ? '⏸️' : '▶️'}</button>
                      <button class="btn ghost small" data-edit-unit="${u.id}">✏️</button>
                      <button class="btn ghost small" data-del-unit="${u.id}">🗑️</button>
                    </div>`).join('') || `<div class="small muted">${AdminPages2.ar() ? 'لا توجد وحدات بعد' : 'No units yet'}</div>`}
                  </div>
                  <button class="btn ghost small" style="margin-top:.4rem" data-add-unit="${c.id}">+ ${AdminPages2.ar() ? 'إضافة وحدة' : 'Add unit'}</button>
                </div>
              </div>`;
            }).join('') || emptyState()}
          </div>
        </div>`;
      $('#addCurrBtn', root).addEventListener('click', () => currForm(null));
      const toggle = async (table, id, val) => { await API.update(table, 'id=eq.' + id, { is_active: val }); await audit('toggle', table, id, { is_active: val }); };
      $$('[data-toggle-curr]', root).forEach(b => b.addEventListener('click', async () => { const c = list.find(x => x.id === b.dataset.toggleCurr); await toggle('curricula', c.id, !c.is_active); AdminPages2.curricula(root); }));
      $$('[data-edit-curr]', root).forEach(b => b.addEventListener('click', () => currForm(list.find(x => x.id === b.dataset.editCurr))));
      $$('[data-del-curr]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => {
          await API.remove('curricula', 'id=eq.' + b.dataset.delCurr);
          await audit('delete', 'curricula', b.dataset.delCurr, {});
          toast(t('deleted'), 'success'); AdminPages2.curricula(root);
        }, true);
      }));
      $$('[data-add-unit]', root).forEach(b => b.addEventListener('click', () => unitForm(null, b.dataset.addUnit)));
      $$('[data-edit-unit]', root).forEach(b => b.addEventListener('click', () => unitForm((units || []).find(u => u.id === b.dataset.editUnit), null)));
      $$('[data-toggle-unit]', root).forEach(b => b.addEventListener('click', async () => { const u = (units || []).find(x => x.id === b.dataset.toggleUnit); await toggle('curriculum_units', u.id, !u.is_active); AdminPages2.curricula(root); }));
      $$('[data-del-unit]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => {
          await API.remove('curriculum_units', 'id=eq.' + b.dataset.delUnit);
          await audit('delete', 'curriculum_units', b.dataset.delUnit, {});
          toast(t('deleted'), 'success'); AdminPages2.curricula(root);
        }, true);
      }));
    };
    const currForm = (c) => {
      const editing = !!c;
      openModal({
        title: editing ? (AdminPages2.ar() ? 'تعديل المنهج' : 'Edit curriculum') : (AdminPages2.ar() ? 'منهج جديد' : 'New curriculum'),
        bodyHtml: `
          <div class="form-row cols-2">
            <div><label>${AdminPages2.ar() ? 'الاسم بالعربي' : 'Name (AR)'} *</label><input class="input" id="fCurrAr" value="${editing ? escapeHtml(c.name_ar || '') : ''}"></div>
            <div><label>${AdminPages2.ar() ? 'الاسم بالإنجليزي' : 'Name (EN)'}</label><input class="input" id="fCurrEn" dir="ltr" value="${editing ? escapeHtml(c.name_en || '') : ''}"></div>
          </div>
          <div class="form-row cols-2">
            <div><label>${AdminPages2.ar() ? 'المادة' : 'Subject'}</label><input class="input" id="fCurrSub" value="${editing ? escapeHtml(c.subject || '') : 'chemistry'}"></div>
            <div><label>${AdminPages2.ar() ? 'الصف' : 'Grade'}</label><input class="input" id="fCurrGrade" value="${editing ? escapeHtml(c.grade || '') : 'Grade 12'}"></div>
          </div>
          <div class="form-row cols-2">
            <div><label>${AdminPages2.ar() ? 'الترتيب' : 'Position'}</label><input class="input" id="fCurrPos" type="number" value="${editing ? (c.position || 0) : 0}"></div>
            <div><label>&nbsp;</label><label class="small" style="display:flex;gap:.4rem;align-items:center;margin-top:.45rem;cursor:pointer"><input type="checkbox" id="fCurrActive" ${!editing || c.is_active ? 'checked' : ''}> ${AdminPages2.ar() ? 'مفعّل' : 'Active'}</label></div>
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveCurrBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveCurrBtn', mroot).addEventListener('click', async () => {
            const name_ar = $('#fCurrAr', mroot).value.trim();
            if (!name_ar) return toast(t('required'), 'error');
            const body = { name_ar, name_en: $('#fCurrEn', mroot).value.trim() || null, subject: $('#fCurrSub', mroot).value.trim() || null, grade: $('#fCurrGrade', mroot).value.trim() || null, position: parseInt($('#fCurrPos', mroot).value, 10) || 0, is_active: $('#fCurrActive', mroot).checked };
            if (editing) await API.update('curricula', 'id=eq.' + c.id, body);
            else await API.insert('curricula', [body]);
            await audit(editing ? 'update' : 'create', 'curricula', editing ? c.id : null, { name_ar });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.curricula(root);
          });
        }
      });
    };
    const unitForm = (u, curriculumId) => {
      const editing = !!u;
      const currId = editing ? u.curriculum_id : curriculumId;
      openModal({
        title: editing ? (AdminPages2.ar() ? 'تعديل الوحدة' : 'Edit unit') : (AdminPages2.ar() ? 'وحدة جديدة' : 'New unit'),
        bodyHtml: `
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'العنوان بالعربي' : 'Title (AR)'} *</label><input class="input" id="fUnitAr" value="${editing ? escapeHtml(u.title_ar || '') : ''}"></div></div>
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'العنوان بالإنجليزي' : 'Title (EN)'}</label><input class="input" id="fUnitEn" dir="ltr" value="${editing ? escapeHtml(u.title_en || '') : ''}"></div></div>
          <div class="form-row cols-2">
            <div><label>${AdminPages2.ar() ? 'الترتيب' : 'Position'}</label><input class="input" id="fUnitPos" type="number" value="${editing ? (u.position || 0) : 0}"></div>
            <div><label>&nbsp;</label><label class="small" style="display:flex;gap:.4rem;align-items:center;margin-top:.45rem;cursor:pointer"><input type="checkbox" id="fUnitActive" ${!editing || u.is_active ? 'checked' : ''}> ${AdminPages2.ar() ? 'مفعّلة' : 'Active'}</label></div>
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveUnitBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveUnitBtn', mroot).addEventListener('click', async () => {
            const title_ar = $('#fUnitAr', mroot).value.trim();
            if (!title_ar) return toast(t('required'), 'error');
            const body = { curriculum_id: currId, title_ar, title_en: $('#fUnitEn', mroot).value.trim() || null, position: parseInt($('#fUnitPos', mroot).value, 10) || 0, is_active: $('#fUnitActive', mroot).checked };
            if (editing) await API.update('curriculum_units', 'id=eq.' + u.id, body);
            else await API.insert('curriculum_units', [body]);
            await audit(editing ? 'update' : 'create', 'curriculum_units', editing ? u.id : null, { title_ar });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.curricula(root);
          });
        }
      });
    };
    render();
  },

  /* ================= LESSONS + ASSIGNMENTS ================= */
  async lessons(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [curricula, units, lessons, assignments] = await Promise.all([
      API.select('curricula', 'select=*&order=position,created_at'),
      API.select('curriculum_units', 'select=*&order=position,created_at'),
      API.select('lessons', 'select=*&order=position,created_at'),
      API.select('lesson_assignments', 'select=*&order=created_at')
    ]);
    const state = { curriculumId: (curricula && curricula[0] && curricula[0].id) || '' };
    const render = () => {
      const cUnits = (units || []).filter(u => u.curriculum_id === state.curriculumId);
      const unitIds = cUnits.map(u => u.id);
      const cLessons = (lessons || []).filter(l => unitIds.indexOf(l.unit_id) !== -1);
      root.innerHTML = `
        <div class="card">
          <div class="card-head" style="gap:.5rem;flex-wrap:wrap">
            <div class="card-title">📖 ${AdminPages2.ar() ? 'الدروس والمرفقات' : 'Lessons & Materials'}</div>
            <select class="input" id="lessonCurrPicker" style="width:auto;min-width:220px">${(curricula || []).map(c => `<option value="${c.id}" ${c.id === state.curriculumId ? 'selected' : ''}>${escapeHtml(AdminPages2.ar() ? c.name_ar : c.name_en)}</option>`).join('')}</select>
            <button class="btn primary" id="addLessonBtn" ${cUnits.length ? '' : 'disabled'}>+ ${AdminPages2.ar() ? 'درس جديد' : 'New lesson'}</button>
          </div>
          ${!cUnits.length ? `<p class="muted">${AdminPages2.ar() ? 'أنشئ وحدات لهذا المنهج أولاً من صفحة المناهج' : 'Create units for this curriculum first (Curricula page)'}</p>` : cUnits.map(u => {
            const uLessons = cLessons.filter(l => l.unit_id === u.id);
            return `<div class="card" style="box-shadow:none;margin-bottom:.7rem">
              <div class="card-title" style="font-size:.95rem">📦 ${escapeHtml(AdminPages2.ar() ? u.title_ar : u.title_en)} <span class="small muted">(${uLessons.length} ${AdminPages2.ar() ? 'درس' : 'lessons'})</span></div>
              <div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.4rem">
                ${uLessons.map(l => {
                  const asg = (assignments || []).filter(a => a.lesson_id === l.id);
                  return `<div style="border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:.5rem .7rem">
                    <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
                      <div style="flex:1;min-width:220px"><b dir="ltr" style="color:#94a3b8">${l.position || ''}.</b> ${escapeHtml(AdminPages2.ar() ? l.title_ar : l.title_en)} ${l.video_url ? `<a class="pill blue" dir="ltr" href="${escapeHtml(l.video_url)}" target="_blank" rel="noopener">▶ video</a>` : ''}</div>
                      <button class="btn ghost small" data-edit-lesson="${l.id}">✏️</button>
                      <button class="btn ghost small" data-del-lesson="${l.id}">🗑️</button>
                    </div>
                    ${(AdminPages2.ar() ? l.content_ar : l.content_en) ? `<div class="small muted" style="margin-top:.3rem">${escapeHtml((AdminPages2.ar() ? l.content_ar : l.content_en) || '').slice(0, 160)}</div>` : ''}
                    <div style="display:flex;gap:.35rem;flex-wrap:wrap;align-items:center;margin-top:.4rem">
                      ${asg.map(a => `<span class="pill ${a.kind === 'homework' ? 'amber' : 'blue'}">📎 ${escapeHtml(a.title)}<button data-del-asg="${a.id}" style="border:none;background:none;cursor:pointer;margin-inline-start:.3rem">✕</button></span>`).join('')}
                      <button class="btn ghost small" data-add-asg="${l.id}">+ ${AdminPages2.ar() ? 'مرفق/وظيفة' : 'Attachment/Task'}</button>
                    </div>
                  </div>`;
                }).join('') || `<div class="small muted">${AdminPages2.ar() ? 'لا توجد دروس في هذه الوحدة' : 'No lessons in this unit'}</div>`}
              </div>
            </div>`;
          }).join('')}
        </div>`;
      $('#lessonCurrPicker', root).addEventListener('change', e => { state.curriculumId = e.target.value; render(); });
      $('#addLessonBtn', root).addEventListener('click', () => lessonForm(null));
      $$('[data-edit-lesson]', root).forEach(b => b.addEventListener('click', () => lessonForm(cLessons.find(l => l.id === b.dataset.editLesson))));
      $$('[data-del-lesson]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => {
          await API.remove('lesson_assignments', 'lesson_id=eq.' + b.dataset.delLesson);
          await API.remove('lessons', 'id=eq.' + b.dataset.delLesson);
          await audit('delete', 'lessons', b.dataset.delLesson, {});
          toast(t('deleted'), 'success'); AdminPages2.lessons(root);
        }, true);
      }));
      $$('[data-add-asg]', root).forEach(b => b.addEventListener('click', () => assignmentForm(b.dataset.addAsg)));
      $$('[data-del-asg]', root).forEach(b => b.addEventListener('click', async () => {
        await API.remove('lesson_assignments', 'id=eq.' + b.dataset.delAsg);
        await audit('delete', 'lesson_assignments', b.dataset.delAsg, {});
        AdminPages2.lessons(root);
      }));
    };
    const lessonForm = (l) => {
      const editing = !!l;
      const cUnitsAll = (units || []).filter(u => u.curriculum_id === state.curriculumId);
      openModal({
        title: editing ? (AdminPages2.ar() ? 'تعديل الدرس' : 'Edit lesson') : (AdminPages2.ar() ? 'درس جديد' : 'New lesson'), wide: true,
        bodyHtml: `
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'الوحدة' : 'Unit'} *</label><select class="input" id="fLessonUnit">${cUnitsAll.map(u => `<option value="${u.id}" ${editing && l.unit_id === u.id ? 'selected' : ''}>${escapeHtml(AdminPages2.ar() ? u.title_ar : u.title_en)}</option>`).join('')}</select></div></div>
          <div class="form-row cols-2">
            <div><label>${AdminPages2.ar() ? 'العنوان بالعربي' : 'Title (AR)'} *</label><input class="input" id="fLessonAr" value="${editing ? escapeHtml(l.title_ar || '') : ''}"></div>
            <div><label>${AdminPages2.ar() ? 'العنوان بالإنجليزي' : 'Title (EN)'}</label><input class="input" id="fLessonEn" dir="ltr" value="${editing ? escapeHtml(l.title_en || '') : ''}"></div>
          </div>
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'المحتوى بالعربي' : 'Content (AR)'}</label><textarea class="input" id="fLessonCAr" rows="2">${editing ? escapeHtml(l.content_ar || '') : ''}</textarea></div></div>
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'المحتوى بالإنجليزي' : 'Content (EN)'}</label><textarea class="input" id="fLessonCEn" rows="2" dir="ltr">${editing ? escapeHtml(l.content_en || '') : ''}</textarea></div></div>
          <div class="form-row cols-2">
            <div><label>Video URL</label><input class="input" id="fLessonVideo" dir="ltr" placeholder="https://youtube.com/watch?v=…" value="${editing ? escapeHtml(l.video_url || '') : ''}"></div>
            <div><label>${AdminPages2.ar() ? 'الترتيب' : 'Position'}</label><input class="input" id="fLessonPos" type="number" value="${editing ? (l.position || 0) : 0}"></div>
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveLessonBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveLessonBtn', mroot).addEventListener('click', async () => {
            const title_ar = $('#fLessonAr', mroot).value.trim();
            if (!title_ar) return toast(t('required'), 'error');
            const body = { unit_id: $('#fLessonUnit', mroot).value, title_ar, title_en: $('#fLessonEn', mroot).value.trim() || null, content_ar: $('#fLessonCAr', mroot).value.trim() || null, content_en: $('#fLessonCEn', mroot).value.trim() || null, video_url: $('#fLessonVideo', mroot).value.trim() || null, position: parseInt($('#fLessonPos', mroot).value, 10) || 0 };
            if (editing) await API.update('lessons', 'id=eq.' + l.id, body);
            else await API.insert('lessons', [body]);
            await audit(editing ? 'update' : 'create', 'lessons', editing ? l.id : null, { title_ar });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.lessons(root);
          });
        }
      });
    };
    const assignmentForm = (lessonId) => {
      openModal({
        title: AdminPages2.ar() ? 'مرفق / وظيفة للدرس' : 'Lesson attachment / task',
        bodyHtml: `
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'العنوان' : 'Title'} *</label><input class="input" id="fAsgTitle"></div></div>
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'النوع' : 'Kind'}</label><select class="input" id="fAsgKind"><option value="homework">${AdminPages2.ar() ? 'وظيفة منزلية' : 'Homework'}</option><option value="reading">${AdminPages2.ar() ? 'قراءة' : 'Reading'}</option><option value="activity">${AdminPages2.ar() ? 'نشاط' : 'Activity'}</option><option value="file">${AdminPages2.ar() ? 'ملف/رابط' : 'File/Link'}</option></select></div></div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveAsgBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveAsgBtn', mroot).addEventListener('click', async () => {
            const title = $('#fAsgTitle', mroot).value.trim();
            if (!title) return toast(t('required'), 'error');
            await API.insert('lesson_assignments', [{ lesson_id: lessonId, title, kind: $('#fAsgKind', mroot).value }]);
            await audit('create', 'lesson_assignments', lessonId, { title });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.lessons(root);
          });
        }
      });
    };
    render();
  }
};

/* ================= QUESTION BANK (8 types) ================= */
AdminPages2.questionTypes = [
  { id: 'mcq', ar: 'اختيار من متعدد', en: 'Multiple choice' },
  { id: 'multi', ar: 'اختيار متعدد (أكثر من إجابة)', en: 'Multi-select' },
  { id: 'tf', ar: 'صح / خطأ', en: 'True / False' },
  { id: 'fill', ar: 'أكمل الفراغ', en: 'Fill in the blank' },
  { id: 'short', ar: 'إجابة قصيرة', en: 'Short answer' },
  { id: 'order', ar: 'ترتيب خطوات', en: 'Ordering' },
  { id: 'match', ar: 'توصيل', en: 'Matching' },
  { id: 'essay', ar: 'مقالي', en: 'Essay' }
];

Object.assign(AdminPages2, {
  async questions(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [curricula, units, questions] = await Promise.all([
      API.select('curricula', 'select=id,name_ar,name_en&order=position'),
      API.select('curriculum_units', 'select=id,title_ar,title_en,curriculum_id&order=position'),
      API.select('questions', 'select=*&order=created_at.desc')
    ]);
    const state = { curriculumId: '', unitId: '', type: '', difficulty: '', search: '' };

    const filtered = () => (questions || []).filter(q => {
      if (state.curriculumId && q.curriculum_id !== state.curriculumId) return false;
      if (state.unitId && q.unit_id !== state.unitId) return false;
      if (state.type && q.type !== state.type) return false;
      if (state.difficulty && String(q.difficulty) !== String(state.difficulty)) return false;
      if (state.search) {
        const hay = ((q.prompt_ar || '') + ' ' + (q.prompt_en || '')).toLowerCase();
        if (hay.indexOf(state.search) === -1) return false;
      }
      return true;
    });

    const render = () => {
      const list = filtered();
      const unitOptions = (units || []).filter(u => !state.curriculumId || u.curriculum_id === state.curriculumId);
      const cName = q => { const c = (curricula || []).find(x => x.id === q.curriculum_id); return c ? (AdminPages2.ar() ? c.name_ar : c.name_en) : '—'; };
      const uName = q => { const u = (units || []).find(x => x.id === q.unit_id); return u ? (AdminPages2.ar() ? u.title_ar : u.title_en) : '—'; };
      const typeLabel = id => { const ty = AdminPages2.questionTypes.find(x => x.id === id); return ty ? (AdminPages2.ar() ? ty.ar : ty.en) : id; };
      root.innerHTML = `
        <div class="card">
          <div class="card-head" style="gap:.5rem;flex-wrap:wrap">
            <div class="card-title">🧩 ${AdminPages2.ar() ? 'بنك الأسئلة' : 'Question Bank'} <span class="small muted">(${list.length})</span></div>
            <button class="btn primary" id="addQuestionBtn" style="margin-inline-start:auto">+ ${AdminPages2.ar() ? 'سؤال جديد' : 'New question'}</button>
          </div>
          <div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:.7rem">
            <select class="input" id="qFilterCurr" style="width:auto"><option value="">${AdminPages2.ar() ? 'كل المناهج' : 'All curricula'}</option>${(curricula || []).map(c => `<option value="${c.id}" ${state.curriculumId === c.id ? 'selected' : ''}>${escapeHtml(AdminPages2.ar() ? c.name_ar : c.name_en)}</option>`).join('')}</select>
            <select class="input" id="qFilterUnit" style="width:auto"><option value="">${AdminPages2.ar() ? 'كل الوحدات' : 'All units'}</option>${unitOptions.map(u => `<option value="${u.id}" ${state.unitId === u.id ? 'selected' : ''}>${escapeHtml(AdminPages2.ar() ? u.title_ar : u.title_en)}</option>`).join('')}</select>
            <select class="input" id="qFilterType" style="width:auto"><option value="">${AdminPages2.ar() ? 'كل الأنواع' : 'All types'}</option>${AdminPages2.questionTypes.map(ty => `<option value="${ty.id}" ${state.type === ty.id ? 'selected' : ''}>${AdminPages2.ar() ? ty.ar : ty.en}</option>`).join('')}</select>
            <select class="input" id="qFilterDiff" style="width:auto"><option value="">${AdminPages2.ar() ? 'كل الصعوبات' : 'All levels'}</option><option value="1" ${state.difficulty === '1' ? 'selected' : ''}>★ ${AdminPages2.ar() ? 'سهل' : 'Easy'}</option><option value="2" ${state.difficulty === '2' ? 'selected' : ''}>★★ ${AdminPages2.ar() ? 'متوسط' : 'Medium'}</option><option value="3" ${state.difficulty === '3' ? 'selected' : ''}>★★★ ${AdminPages2.ar() ? 'صعب' : 'Hard'}</option></select>
            <input class="input" id="qFilterSearch" style="width:auto;min-width:160px" placeholder="${t('search')}" value="${escapeHtml(state.search)}">
          </div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${AdminPages2.ar() ? 'النوع' : 'Type'}</th><th>${AdminPages2.ar() ? 'السؤال' : 'Prompt'}</th><th>${AdminPages2.ar() ? 'الوحدة' : 'Unit'}</th><th>${AdminPages2.ar() ? 'الصعوبة' : 'Diff.'}</th><th>${AdminPages2.ar() ? 'درجة' : 'Pts'}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead>
            <tbody>${list.map(q => `<tr>
              <td><span class="pill blue">${escapeHtml(typeLabel(q.type))}</span></td>
              <td style="max-width:340px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml((AdminPages2.ar() ? q.prompt_ar : q.prompt_en) || q.prompt_ar || '')}</div><div class="small muted">${escapeHtml(cName(q))}</div></td>
              <td class="small">${escapeHtml(uName(q))}</td>
              <td>${'★'.repeat(q.difficulty || 1)}</td>
              <td dir="ltr">${q.points || 1}</td>
              <td><button class="btn ${q.is_active ? 'green' : 'ghost'} small" data-toggle-q="${q.id}">${q.is_active ? '✓' : 'off'}</button></td>
              <td style="white-space:nowrap"><button class="btn ghost small" data-edit-q="${q.id}">✏️</button> <button class="btn ghost small" data-del-q="${q.id}">🗑️</button></td>
            </tr>`).join('') || `<tr><td colspan="7" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>`;
      $('#qFilterCurr', root).addEventListener('change', e => { state.curriculumId = e.target.value; state.unitId = ''; render(); });
      $('#qFilterUnit', root).addEventListener('change', e => { state.unitId = e.target.value; render(); });
      $('#qFilterType', root).addEventListener('change', e => { state.type = e.target.value; render(); });
      $('#qFilterDiff', root).addEventListener('change', e => { state.difficulty = e.target.value; render(); });
      $('#qFilterSearch', root).addEventListener('input', e => { state.search = e.target.value.trim().toLowerCase(); render(); });
      $('#addQuestionBtn', root).addEventListener('click', () => this.questionForm(null, curricula, units, root));
      $$('[data-toggle-q]', root).forEach(b => b.addEventListener('click', async () => { const q = list.find(x => x.id === b.dataset.toggleQ); await API.update('questions', 'id=eq.' + q.id, { is_active: !q.is_active }); await audit('toggle', 'questions', q.id, { is_active: !q.is_active }); AdminPages2.questions(root); }));
      $$('[data-edit-q]', root).forEach(b => b.addEventListener('click', () => this.questionForm(list.find(x => x.id === b.dataset.editQ), curricula, units, root)));
      $$('[data-del-q]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => {
          await API.remove('exam_questions', 'question_id=eq.' + b.dataset.delQ);
          await API.remove('questions', 'id=eq.' + b.dataset.delQ);
          await audit('delete', 'questions', b.dataset.delQ, {});
          toast(t('deleted'), 'success'); AdminPages2.questions(root);
        }, true);
      }));
    };
    render();
  },

  questionForm(q, curricula, units, pageRoot) {
    const editing = !!q;
    const type = editing ? q.type : 'mcq';
    const opts = () => editing ? (q.options || {}) : {};
    const ans = () => editing ? (q.answer || {}) : {};
    const optionsArr = Array.isArray(editing ? q.options : null) ? q.options : ['', ''];
    const stepsArr = (opts() && opts().steps) || ['', ''];
    const pairsArr = (opts() && opts().pairs) || [{ a: '', b: '' }, { a: '', b: '' }];
    const acceptArr = (ans() && ans().accept) || [''];
    const correctArr = (ans() && ans().correct);

    const typeSpecificHtml = (ty) => {
      if (ty === 'mcq' || ty === 'multi') {
        return `<div class="form-row"><div><label>${AdminPages2.ar() ? 'الخيارات (سطر لكل خيار)' : 'Options (one per line)'} *</label><textarea class="input" id="fQOptions" rows="4">${escapeHtml(optionsArr.join('\n'))}</textarea></div></div>
          <div class="form-row"><div><label>${ty === 'mcq' ? (AdminPages2.ar() ? 'رقم الخيار الصحيح (يبدأ من 1)' : 'Correct option number (1-based)') : (AdminPages2.ar() ? 'أرقام الخيارات الصحيحة مفصولة بفواصل' : 'Correct option numbers, comma-separated')} *</label>
            <input class="input" id="fQCorrect" dir="ltr" placeholder="${ty === 'mcq' ? '1' : '1,3'}" value="${ty === 'mcq' ? (typeof correctArr === 'number' ? correctArr + 1 : '') : (Array.isArray(correctArr) ? correctArr.map(n => n + 1).join(',') : '')}"></div></div>`;
      }
      if (ty === 'tf') {
        const cur = ans() && ans().correct;
        return `<div class="form-row"><div><label>${AdminPages2.ar() ? 'الإجابة الصحيحة' : 'Correct answer'} *</label><select class="input" id="fQTf"><option value="true" ${cur === true ? 'selected' : ''}>${AdminPages2.ar() ? 'صح' : 'True'}</option><option value="false" ${cur === false ? 'selected' : ''}>${AdminPages2.ar() ? 'خطأ' : 'False'}</option></select></div></div>`;
      }
      if (ty === 'fill' || ty === 'short') {
        return `<div class="form-row"><div><label>${AdminPages2.ar() ? 'الإجابات المقبولة (سطر لكل صيغة)' : 'Accepted answers (one per line)'} *</label><textarea class="input" id="fQAccept" rows="3">${escapeHtml(acceptArr.join('\n'))}</textarea></div></div>
          <div class="form-row"><div><label>${AdminPages2.ar() ? 'الإجابة النموذجية (تُعرض للطالب بعد التصحيح)' : 'Reference answer (shown after review)'}</label><input class="input" id="fQReference" value="${escapeHtml((ans() && ans().reference) || '')}"></div></div>`;
      }
      if (ty === 'order') {
        return `<div class="form-row"><div><label>${AdminPages2.ar() ? 'الخطوات بالترتيب الصحيح (سطر لكل خطوة)' : 'Steps in CORRECT order (one per line)'} *</label><textarea class="input" id="fQSteps" rows="4">${escapeHtml(stepsArr.join('\n'))}</textarea></div></div>`;
      }
      if (ty === 'match') {
        return `<div class="form-row"><div><label>${AdminPages2.ar() ? 'الأزواج المطابقة — سطر لكل زوج بالصيغة: عبارة => المقابل' : 'Matching pairs — one per line: item => pair'} *</label><textarea class="input" id="fQPairs" rows="4" dir="auto" placeholder="ثابت الاتزان Kc => نواتج على متفاعل عند الاتزان">${escapeHtml(pairsArr.map(p => (p.a || '') + ' => ' + (p.b || '')).join('\n'))}</textarea></div></div>`;
      }
      if (ty === 'essay') {
        return `<div class="form-row"><div><label>${AdminPages2.ar() ? 'الإجابة النموذجية / معايير التصحيح' : 'Model answer / grading rubric'}</label><textarea class="input" id="fQReference" rows="3">${escapeHtml((ans() && ans().reference) || '')}</textarea></div></div>`;
      }
      return '';
    };

    openModal({
      title: editing ? (AdminPages2.ar() ? 'تعديل السؤال' : 'Edit question') : (AdminPages2.ar() ? 'سؤال جديد' : 'New question'), wide: true,
      bodyHtml: `
        <div class="form-row cols-2">
          <div><label>${AdminPages2.ar() ? 'المنهج' : 'Curriculum'}</label><select class="input" id="fQCurr"><option value="">—</option>${(curricula || []).map(c => `<option value="${c.id}" ${editing && q.curriculum_id === c.id ? 'selected' : ''}>${escapeHtml(AdminPages2.ar() ? c.name_ar : c.name_en)}</option>`).join('')}</select></div>
          <div><label>${AdminPages2.ar() ? 'الوحدة' : 'Unit'}</label><select class="input" id="fQUnit"><option value="">—</option>${(units || []).map(u => `<option value="${u.id}" ${editing && q.unit_id === u.id ? 'selected' : ''}>${escapeHtml(AdminPages2.ar() ? u.title_ar : u.title_en)}</option>`).join('')}</select></div>
        </div>
        <div class="form-row cols-2">
          <div><label>${AdminPages2.ar() ? 'النوع' : 'Type'} *</label><select class="input" id="fQType">${AdminPages2.questionTypes.map(ty => `<option value="${ty.id}" ${type === ty.id ? 'selected' : ''}>${AdminPages2.ar() ? ty.ar : ty.en}</option>`).join('')}</select></div>
          <div><label>${AdminPages2.ar() ? 'الصعوبة' : 'Difficulty'}</label><select class="input" id="fQDiff"><option value="1" ${(editing ? q.difficulty : 2) === 1 ? 'selected' : ''}>★ ${AdminPages2.ar() ? 'سهل' : 'Easy'}</option><option value="2" ${(editing ? q.difficulty : 2) === 2 ? 'selected' : ''}>★★ ${AdminPages2.ar() ? 'متوسط' : 'Medium'}</option><option value="3" ${(editing ? q.difficulty : 2) === 3 ? 'selected' : ''}>★★★ ${AdminPages2.ar() ? 'صعب' : 'Hard'}</option></select></div>
        </div>
        <div class="form-row"><div><label>${AdminPages2.ar() ? 'السؤال بالعربي' : 'Prompt (AR)'} *</label><textarea class="input" id="fQPromptAr" rows="2">${editing ? escapeHtml(q.prompt_ar || '') : ''}</textarea></div></div>
        <div class="form-row"><div><label>${AdminPages2.ar() ? 'السؤال بالإنجليزي' : 'Prompt (EN)'}</label><textarea class="input" id="fQPromptEn" rows="2" dir="ltr">${editing ? escapeHtml(q.prompt_en || '') : ''}</textarea></div></div>
        <div id="qTypeFields">${typeSpecificHtml(type)}</div>
        <div class="form-row cols-2">
          <div><label>${AdminPages2.ar() ? 'الدرجة' : 'Points'}</label><input class="input" id="fQPoints" type="number" min="0.5" step="0.5" value="${editing ? (q.points || 1) : 1}"></div>
          <div><label>&nbsp;</label><label class="small" style="display:flex;gap:.4rem;align-items:center;margin-top:.45rem;cursor:pointer"><input type="checkbox" id="fQActive" ${!editing || q.is_active ? 'checked' : ''}> ${AdminPages2.ar() ? 'مفعّل' : 'Active'}</label></div>
        </div>`,
      footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveQBtn">${t('save')}</button>`,
      onOpen(mroot) {
        $('#fQType', mroot).addEventListener('change', e => {
          $('#qTypeFields', mroot).innerHTML = typeSpecificHtml(e.target.value);
        });
        $('#saveQBtn', mroot).addEventListener('click', async () => {
          const ty = $('#fQType', mroot).value;
          const prompt_ar = $('#fQPromptAr', mroot).value.trim();
          if (!prompt_ar) return toast(t('required'), 'error');
          const body = {
            curriculum_id: $('#fQCurr', mroot).value || null,
            unit_id: $('#fQUnit', mroot).value || null,
            type: ty,
            difficulty: parseInt($('#fQDiff', mroot).value, 10) || 2,
            prompt_ar, prompt_en: $('#fQPromptEn', mroot).value.trim() || null,
            points: Number($('#fQPoints', mroot).value) || 1,
            is_active: $('#fQActive', mroot).checked
          };
          const val = (sel) => { const el = $(sel, mroot); return el ? el.value : ''; };
          try {
            if (ty === 'mcq' || ty === 'multi') {
              const options = val('#fQOptions').split('\n').map(s => s.trim()).filter(Boolean);
              if (options.length < 2) return toast(AdminPages2.ar() ? 'أضف خيارين على الأقل' : 'Add at least 2 options', 'error');
              if (ty === 'mcq') {
                const n = parseInt(val('#fQCorrect'), 10);
                if (!n || n < 1 || n > options.length) return toast(AdminPages2.ar() ? 'رقم الخيار الصحيح غير صالح' : 'Correct option number is out of range', 'error');
                body.options = options; body.answer = { correct: n - 1 };
              } else {
                const nums = val('#fQCorrect').split(/[,،\s]+/).map(s => parseInt(s, 10)).filter(n => n >= 1 && n <= options.length).map(n => n - 1);
                if (!nums.length) return toast(AdminPages2.ar() ? 'أدخل أرقام الخيارات الصحيحة' : 'Enter the correct option numbers', 'error');
                body.options = options; body.answer = { correct: Array.from(new Set(nums)).sort((a, b) => a - b) };
              }
            } else if (ty === 'tf') {
              body.options = null; body.answer = { correct: val('#fQTf') === 'true' };
            } else if (ty === 'fill' || ty === 'short') {
              const accept = val('#fQAccept').split('\n').map(s => s.trim()).filter(Boolean);
              if (!accept.length) return toast(AdminPages2.ar() ? 'أدخل إجابة مقبولة واحدة على الأقل' : 'Enter at least one accepted answer', 'error');
              body.options = null; body.answer = { accept, reference: val('#fQReference').trim() || null };
            } else if (ty === 'order') {
              const steps = val('#fQSteps').split('\n').map(s => s.trim()).filter(Boolean);
              if (steps.length < 2) return toast(AdminPages2.ar() ? 'أدخل خطوتين على الأقل' : 'Add at least 2 steps', 'error');
              body.options = { steps }; body.answer = { order: steps.map((_, i) => i) };
            } else if (ty === 'match') {
              const pairs = val('#fQPairs').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
                const i = line.indexOf('=>');
                return i === -1 ? null : { a: line.slice(0, i).trim(), b: line.slice(i + 2).trim() };
              }).filter(p => p && p.a && p.b);
              if (pairs.length < 2) return toast(AdminPages2.ar() ? 'أدخل زوجين صحيحين على الأقل (عبارة => المقابل)' : 'Add at least 2 pairs (item => pair)', 'error');
              body.options = { pairs }; body.answer = {};
            } else if (ty === 'essay') {
              body.options = null; body.answer = { reference: val('#fQReference').trim() || null };
            }
            if (editing) await API.update('questions', 'id=eq.' + q.id, body);
            else await API.insert('questions', [body]);
            await audit(editing ? 'update' : 'create', 'questions', editing ? q.id : null, { type: ty, prompt_ar: prompt_ar.slice(0, 60) });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.questions(pageRoot);
          } catch (e) { toast(t('dbError') + ' — ' + String(e.message || e).slice(0, 140), 'error'); }
        });
      }
    });
  }
});

/* ================= SECTIONS CRUD + ROSTER ================= */
Object.assign(AdminPages2, {
  async sections(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [schools, sections, teachers, students] = await Promise.all([
      API.select('schools', 'select=id,name&order=name'),
      API.select('sections', 'select=*&order=grade,name'),
      API.select('profiles', 'select=id,name,role&role=eq.teacher&order=name'),
      API.select('students', 'select=id,name,section_id,school_id&order=name')
    ]);
    const state = { schoolId: '' };
    const schoolName = id => (schools.find(s => s.id === id) || {}).name || '—';
    const teacherName = id => (teachers.find(t => t.id === id) || {}).name || '—';
    const rosterCount = id => (students || []).filter(s => s.section_id === id).length;

    const render = () => {
      const list = (sections || []).filter(s => !state.schoolId || s.school_id === state.schoolId);
      root.innerHTML = `
        <div class="card">
          <div class="card-head" style="gap:.5rem;flex-wrap:wrap">
            <div class="card-title">🏫 ${AdminPages2.ar() ? 'الشعب' : 'Sections'} (${list.length})</div>
            <select class="input" id="secSchoolFilter" style="width:auto;min-width:180px;margin-inline-start:auto"><option value="">${t('allSchools')}</option>${(schools || []).map(s => `<option value="${s.id}" ${state.schoolId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select>
            <button class="btn primary" id="addSectionBtn">+ ${AdminPages2.ar() ? 'شعبة جديدة' : 'New section'}</button>
          </div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${AdminPages2.ar() ? 'الشعبة' : 'Section'}</th><th>${t('assignSchool')}</th><th>🧑‍🏫</th><th>🎒</th><th>${t('actions')}</th></tr></thead>
            <tbody>${list.map(s => `<tr>
              <td><b>${escapeHtml(((s.grade || '') + ' ' + (s.name || '')).trim())}</b></td>
              <td>${escapeHtml(schoolName(s.school_id))}</td>
              <td>${escapeHtml(teacherName(s.teacher_id))}</td>
              <td>${rosterCount(s.id)}</td>
              <td style="white-space:nowrap">
                <button class="btn ghost small" data-roster="${s.id}">👥 ${AdminPages2.ar() ? 'الطلاب' : 'Roster'}</button>
                <button class="btn ghost small" data-edit-sec="${s.id}">✏️</button>
                <button class="btn ghost small" data-del-sec="${s.id}">🗑️</button>
              </td></tr>`).join('') || `<tr><td colspan="5" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>`;
      $('#secSchoolFilter', root).addEventListener('change', e => { state.schoolId = e.target.value; render(); });
      $('#addSectionBtn', root).addEventListener('click', () => sectionForm(null));
      $$('[data-edit-sec]', root).forEach(b => b.addEventListener('click', () => sectionForm(list.find(s => s.id === b.dataset.editSec))));
      $$('[data-del-sec]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(AdminPages2.ar() ? 'حذف الشعبة وإخراج طلابها منها؟ (سجلات الطلاب تُحذف معها سلوكياً)' : 'Delete this section and unassign its students?', async () => {
          await API.remove('sections', 'id=eq.' + b.dataset.delSec);
          await audit('delete', 'sections', b.dataset.delSec, {});
          toast(t('deleted'), 'success'); AdminPages2.sections(root);
        }, true);
      }));
      $$('[data-roster]', root).forEach(b => b.addEventListener('click', () => rosterModal(list.find(s => s.id === b.dataset.roster))));
    };

    const sectionForm = (s) => {
      const editing = !!s;
      openModal({
        title: editing ? (AdminPages2.ar() ? 'تعديل الشعبة' : 'Edit section') : (AdminPages2.ar() ? 'شعبة جديدة' : 'New section'),
        bodyHtml: `
          <div class="form-row"><div><label>${t('assignSchool')} *</label><select class="input" id="fSecSchool">${(schools || []).map(sc => `<option value="${sc.id}" ${editing && s.school_id === sc.id ? 'selected' : ''}>${escapeHtml(sc.name)}</option>`).join('')}</select></div></div>
          <div class="form-row cols-2">
            <div><label>${AdminPages2.ar() ? 'الصف' : 'Grade'}</label><input class="input" id="fSecGrade" value="${editing ? escapeHtml(s.grade || '') : 'Grade 12'}"></div>
            <div><label>${AdminPages2.ar() ? 'اسم/رقم الشعبة' : 'Section name'} *</label><input class="input" id="fSecName" value="${editing ? escapeHtml(s.name || '') : ''}"></div>
          </div>
          <div class="form-row"><div><label>🧑‍🏫 ${AdminPages2.ar() ? 'المعلم' : 'Teacher'}</label><select class="input" id="fSecTeacher"><option value="">—</option>${(teachers || []).map(tch => `<option value="${tch.id}" ${editing && s.teacher_id === tch.id ? 'selected' : ''}>${escapeHtml(tch.name)}</option>`).join('')}</select></div></div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveSecBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveSecBtn', mroot).addEventListener('click', async () => {
            const name = $('#fSecName', mroot).value.trim();
            if (!name) return toast(t('required'), 'error');
            const body = { school_id: $('#fSecSchool', mroot).value, grade: $('#fSecGrade', mroot).value.trim() || null, name, teacher_id: $('#fSecTeacher', mroot).value || null };
            if (editing) await API.update('sections', 'id=eq.' + s.id, body);
            else await API.insert('sections', [body]);
            await audit(editing ? 'update' : 'create', 'sections', editing ? s.id : null, { name });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.sections(root);
          });
        }
      });
    };

    const rosterModal = (section) => {
      const myStudents = (students || []).filter(s => s.section_id === section.id);
      const pool = (students || []).filter(s => s.section_id !== section.id && (!section.school_id || s.school_id === section.school_id));
      const otherSections = (sections || []).filter(s => s.id !== section.id && s.school_id === section.school_id);
      openModal({
        title: (AdminPages2.ar() ? 'قائمة الطلاب: ' : 'Roster: ') + ((section.grade || '') + ' ' + (section.name || '')).trim(), wide: true,
        bodyHtml: `
          <p class="small muted">${AdminPages2.ar() ? 'أضف طالباً للشعبة أو أخرجه منها / انقله لشعبة أخرى' : 'Add a student, remove them, or move them to another section'}</p>
          <div style="max-height:40vh;overflow:auto;display:flex;flex-direction:column;gap:.35rem;margin-bottom:.7rem">
            ${myStudents.map(s => `<div style="display:flex;gap:.5rem;align-items:center;padding:.35rem .5rem;border:1px solid rgba(0,0,0,.12);border-radius:8px">
              <span style="flex:1"><b>${escapeHtml(s.name)}</b></span>
              <select class="input" style="width:auto" data-move-student="${s.id}"><option value="">${AdminPages2.ar() ? 'نقل إلى…' : 'Move to…'}</option>${otherSections.map(os => `<option value="${os.id}">${escapeHtml(((os.grade || '') + ' ' + (os.name || '')).trim())}</option>`).join('')}</select>
              <button class="btn ghost small" data-remove-student="${s.id}" title="${AdminPages2.ar() ? 'إخراج من الشعبة' : 'Remove from section'}">🚪</button>
            </div>`).join('') || `<div class="muted small">${AdminPages2.ar() ? 'لا يوجد طلاب في هذه الشعبة' : 'No students in this section'}</div>`}
          </div>
          <div class="form-row cols-2">
            <div><label>${AdminPages2.ar() ? 'إضافة طالب موجود' : 'Add existing student'}</label>
              <select class="input" id="fRosterAdd"><option value="">—</option>${pool.map(s => `<option value="${s.id}">${escapeHtml(s.name)}${s.section_id ? ' (' + (AdminPages2.ar() ? 'من شعبة أخرى' : 'from another section') + ')' : ''}</option>`).join('')}</select></div>
            <div><label>&nbsp;</label><button class="btn primary" id="addToRosterBtn" style="margin-top:.35rem">${t('add')}</button></div>
          </div>`,
        footHtml: `<button class="btn primary" data-close-modal>${t('close')}</button>`,
        onOpen(mroot) {
          $('#addToRosterBtn', mroot).addEventListener('click', async () => {
            const sid = $('#fRosterAdd', mroot).value;
            if (!sid) return;
            await API.update('students', 'id=eq.' + sid, { section_id: section.id, school_id: section.school_id || null });
            await audit('update', 'students', sid, { section_id: section.id });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.sections(root);
          });
          $$('[data-move-student]', mroot).forEach(sel => sel.addEventListener('change', async () => {
            if (!sel.value) return;
            await API.update('students', 'id=eq.' + sel.dataset.moveStudent, { section_id: sel.value });
            await audit('update', 'students', sel.dataset.moveStudent, { section_id: sel.value });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.sections(root);
          }));
          $$('[data-remove-student]', mroot).forEach(b => b.addEventListener('click', async () => {
            await API.update('students', 'id=eq.' + b.dataset.removeStudent, { section_id: null });
            await audit('update', 'students', b.dataset.removeStudent, { section_id: null });
            closeModal(); toast(t('saved'), 'success'); AdminPages2.sections(root);
          }));
        }
      });
    };
    render();
  }
});

/* ================= AUDIT LOG VIEWER ================= */
Object.assign(AdminPages2, {
  async auditLog(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    let rows = [];
    try { rows = await API.select('audit_log', 'select=*&order=created_at.desc&limit=300') || []; }
    catch (e) { rows = []; }
    const state = { entity: '', search: '' };
    const entities = Array.from(new Set(rows.map(r => r.entity).filter(Boolean)));
    const render = () => {
      const list = rows.filter(r => {
        if (state.entity && r.entity !== state.entity) return false;
        if (state.search) {
          const hay = (JSON.stringify(r.details || {}) + ' ' + (r.action || '') + ' ' + (r.actor_email || '') + ' ' + (r.entity || '')).toLowerCase();
          if (hay.indexOf(state.search) === -1) return false;
        }
        return true;
      });
      root.innerHTML = `
        <div class="card">
          <div class="card-head" style="gap:.5rem;flex-wrap:wrap">
            <div class="card-title">🕵️ ${AdminPages2.ar() ? 'سجل الأنشطة (من غيّر ماذا)' : 'Audit Log (who changed what)'}</div>
            <div style="display:flex;gap:.45rem;margin-inline-start:auto;flex-wrap:wrap">
              <select class="input" id="auditEntityFilter" style="width:auto"><option value="">${AdminPages2.ar() ? 'كل الأنواع' : 'All entities'}</option>${entities.map(e => `<option value="${escapeHtml(e)}" ${state.entity === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}</select>
              <input class="input" id="auditSearch" style="width:auto;min-width:180px" placeholder="${t('search')}" value="${escapeHtml(state.search)}">
            </div>
          </div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${AdminPages2.ar() ? 'الوقت' : 'Time'}</th><th>${AdminPages2.ar() ? 'الفاعل' : 'Actor'}</th><th>${AdminPages2.ar() ? 'الإجراء' : 'Action'}</th><th>${AdminPages2.ar() ? 'العنصر' : 'Entity'}</th><th>${AdminPages2.ar() ? 'التفاصيل' : 'Details'}</th></tr></thead>
            <tbody>${list.map(r => `<tr>
              <td class="small" style="white-space:nowrap" dir="ltr">${new Date(r.created_at).toLocaleString(AdminPages2.ar() ? 'ar-SA-u-ca-gregory' : 'en-GB')}</td>
              <td dir="ltr" class="small">${escapeHtml(r.actor_email || '—')}</td>
              <td><span class="pill gray">${escapeHtml(r.action || '—')}</span></td>
              <td dir="ltr" class="small">${escapeHtml(r.entity || '—')}</td>
              <td class="small" style="max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" dir="auto">${escapeHtml(r.details ? JSON.stringify(r.details) : '')}</td>
            </tr>`).join('') || `<tr><td colspan="5" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
          <p class="small muted" style="margin-top:.5rem">ℹ️ ${AdminPages2.ar() ? 'يُسجَّل تلقائياً كل إنشاء/تعديل/حذف/تصدير من المنصة.' : 'Every create/update/delete/export on the platform is recorded here automatically.'}</p>
        </div>`;
      $('#auditEntityFilter', root).addEventListener('change', e => { state.entity = e.target.value; render(); });
      $('#auditSearch', root).addEventListener('input', e => { state.search = e.target.value.trim().toLowerCase(); render(); });
    };
    render();
  }
});

/* ================= ROLES & APPROVALS ================= */
Object.assign(AdminPages2, {
  async roles(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [schools, profiles] = await Promise.all([
      API.select('schools', 'select=id,name&order=name'),
      API.select('profiles', 'select=id,email,name,role,school_id,status,phone,created_at&order=created_at')
    ]);
    const me = App.user();
    const schoolName = id => (schools.find(s => s.id === id) || {}).name || '—';
    const activeAdmins = (profiles || []).filter(p => p.role === 'admin' && (p.status || 'active') === 'active');
    const render = () => {
      const list = profiles || [];
      const rolePill = r => r === 'admin' ? '<span class="pill red">admin</span>' : r === 'teacher' ? '<span class="pill blue">teacher</span>' : '<span class="pill green">student</span>';
      const statusPill = s => (s || 'active') === 'active' ? '<span class="pill green">active</span>' : '<span class="pill amber">pending</span>';
      root.innerHTML = `
        <div class="card">
          <div class="card-head"><div class="card-title">🛡️ ${AdminPages2.ar() ? 'التحكم بالصلاحيات' : 'Role Control'}</div>
            <button class="btn primary" id="addAccountBtn" style="margin-inline-start:auto">+ ${AdminPages2.ar() ? 'حساب جديد' : 'New account'}</button></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('name')}</th><th>${t('email')}</th><th>${t('role')}</th><th>${t('assignSchool')}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead>
            <tbody>${list.map(p => `<tr>
              <td><b>${escapeHtml(p.name)}</b>${p.id === me.id ? ' <span class="small muted">(' + (AdminPages2.ar() ? 'أنت' : 'you') + ')</span>' : ''}</td>
              <td dir="ltr" class="small">${escapeHtml(p.email)}</td>
              <td>${rolePill(p.role)}</td>
              <td class="small">${escapeHtml(schoolName(p.school_id))}</td>
              <td>${statusPill(p.status)}</td>
              <td style="white-space:nowrap">
                ${(p.status || 'active') !== 'active' ? `<button class="btn green small" data-approve="${p.id}">✅ ${AdminPages2.ar() ? 'قبول' : 'Approve'}</button>` : `<button class="btn amber small" data-suspend="${p.id}">⏸️</button>`}
                <button class="btn ghost small" data-role="${p.id}">🔁 ${t('role')}</button>
                <button class="btn ghost small" data-pass="${p.id}">🔑</button>
                <button class="btn ghost small" data-del-user="${p.id}">🗑️</button>
              </td></tr>`).join('') || `<tr><td colspan="6" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
          <p class="small muted" style="margin-top:.5rem">ℹ️ ${AdminPages2.ar() ? 'لا يمكن إيقاف أو حذف نفسك أو آخر مدير نشط في المنصة.' : 'You cannot suspend or delete yourself or the last active admin.'}</p>
        </div>`;
      const guard = (p) => {
        if (p.id === me.id) { toast(AdminPages2.ar() ? 'لا يمكنك تنفيذ هذا على حسابك' : 'You cannot do this to your own account', 'error'); return false; }
        if (p.role === 'admin' && activeAdmins.length <= 1 && (p.status || 'active') === 'active') { toast(AdminPages2.ar() ? 'لا يمكن إيقاف/حذف آخر مدير' : 'Cannot remove the last active admin', 'error'); return false; }
        return true;
      };
      $('#addAccountBtn', root).addEventListener('click', () => accountForm());
      $$('[data-approve]', root).forEach(b => b.addEventListener('click', async () => {
        await API.update('profiles', 'id=eq.' + b.dataset.approve, { status: 'active' });
        await audit('approve', 'profiles', b.dataset.approve, {});
        toast(t('saved'), 'success'); AdminPages2.roles(root);
      }));
      $$('[data-suspend]', root).forEach(b => b.addEventListener('click', async () => {
        const p = list.find(x => x.id === b.dataset.suspend);
        if (!guard(p)) return;
        await API.update('profiles', 'id=eq.' + p.id, { status: 'pending' });
        await audit('suspend', 'profiles', p.id, {});
        toast(t('saved'), 'success'); AdminPages2.roles(root);
      }));
      $$('[data-role]', root).forEach(b => b.addEventListener('click', () => {
        const p = list.find(x => x.id === b.dataset.role);
        if (!guard(p)) return;
        openModal({
          title: (AdminPages2.ar() ? 'تغيير الدور: ' : 'Change role: ') + p.name,
          bodyHtml: `<div class="form-row"><div><label>${t('role')}</label><select class="input" id="fNewRole">${['admin', 'teacher', 'student'].map(r => `<option value="${r}" ${p.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div></div>
            <p class="small muted">${AdminPages2.ar() ? 'الترقية/الإنزال بين مدرس ↔ مدير ↔ طالب. يُنطبق فوراً عند الدخول التالي.' : 'Promote / demote between teacher ↔ admin ↔ student. Applies at next sign-in.'}</p>`,
          footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="doRoleBtn">${t('save')}</button>`,
          onOpen(mroot) {
            $('#doRoleBtn', mroot).addEventListener('click', async () => {
              const role = $('#fNewRole', mroot).value;
              await API.update('profiles', 'id=eq.' + p.id, { role });
              await audit('role-change', 'profiles', p.id, { from: p.role, to: role });
              closeModal(); toast(t('saved'), 'success'); AdminPages2.roles(root);
            });
          }
        });
      }));
      $$('[data-pass]', root).forEach(b => b.addEventListener('click', () => {
        const p = list.find(x => x.id === b.dataset.pass);
        openModal({
          title: t('resetPassword') + ' — ' + p.name,
          bodyHtml: `<div class="form-row"><div><label>${t('newPassword')} *</label><input class="input" id="fRolePass" dir="ltr" type="text" placeholder="min 6 chars"></div></div>`,
          footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="doRolePassBtn">${t('save')}</button>`,
          onOpen(mroot) {
            $('#doRolePassBtn', mroot).addEventListener('click', async () => {
              const pass = $('#fRolePass', mroot).value;
              if (pass.length < 6) return toast(t('required') + ' (≥6)', 'error');
              await API.update('profiles', 'id=eq.' + p.id, { password_hash: sha256Sync(pass) });
              await audit('reset-password', 'profiles', p.id, {});
              closeModal(); toast(t('saved'), 'success');
            });
          }
        });
      }));
      $$('[data-del-user]', root).forEach(b => b.addEventListener('click', () => {
        const p = list.find(x => x.id === b.dataset.delUser);
        if (!guard(p)) return;
        confirmModal(t('confirmDelete') + ' ' + p.email, async () => {
          await API.remove('profiles', 'id=eq.' + p.id);
          await audit('delete', 'profiles', p.id, { email: p.email });
          toast(t('deleted'), 'success'); AdminPages2.roles(root);
        }, true);
      }));
    };
    const accountForm = () => {
      openModal({
        title: AdminPages2.ar() ? 'حساب جديد' : 'New account',
        bodyHtml: `
          <div class="form-row"><div><label>${t('name')} *</label><input class="input" id="fAccName"></div></div>
          <div class="form-row"><div><label>${t('email')} *</label><input class="input" id="fAccEmail" dir="ltr" type="email"></div></div>
          <div class="form-row cols-2">
            <div><label>${t('password')} *</label><input class="input" id="fAccPass" dir="ltr" type="text" placeholder="min 6 chars"></div>
            <div><label>${t('role')}</label><select class="input" id="fAccRole"><option value="teacher">teacher</option><option value="student">student</option><option value="admin">admin</option></select></div>
          </div>
          <div class="form-row cols-2">
            <div><label>${t('assignSchool')}</label><select class="input" id="fAccSchool"><option value="">—</option>${(schools || []).map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></div>
            <div><label>${t('status')}</label><select class="input" id="fAccStatus"><option value="active">active</option><option value="pending">pending (${AdminPages2.ar() ? 'بانتظار القبول' : 'awaiting approval'})</option></select></div>
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveAccBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveAccBtn', mroot).addEventListener('click', async () => {
            const name = $('#fAccName', mroot).value.trim(), email = $('#fAccEmail', mroot).value.trim().toLowerCase(), pass = $('#fAccPass', mroot).value;
            if (!name || !email || pass.length < 6) return toast(t('required') + ' (≥6)', 'error');
            try {
              const role = $('#fAccRole', mroot).value;
              await API.insert('profiles', [{ name, email, password_hash: sha256Sync(pass), role, school_id: $('#fAccSchool', mroot).value || null, status: $('#fAccStatus', mroot).value }]);
              await audit('create', 'profiles', null, { email, role });
              closeModal(); toast(t('saved'), 'success'); AdminPages2.roles(root);
            } catch (e) { toast(String(e.message || e).includes('duplicate') ? 'Email exists' : t('dbError'), 'error'); }
          });
        }
      });
    };
    render();
  }
});
