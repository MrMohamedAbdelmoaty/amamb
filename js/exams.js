/* ============================================================
   AMAMB — Exams: builder (admin) · attempts + essay grading · student taking
   Tables: exams, exam_questions, exam_attempts
   ============================================================ */
const ExamPages = {
  ar() { return getLang() === 'ar'; },

  /* ================= ADMIN: builder + attempts ================= */
  async admin(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const [curricula, sections, exams, examQuestions, attempts] = await Promise.all([
      API.select('curricula', 'select=id,name_ar,name_en&order=position'),
      API.select('sections', 'select=id,grade,name,school_id&order=grade,name'),
      API.select('exams', 'select=*&order=created_at.desc'),
      API.select('exam_questions', 'select=*'),
      API.select('exam_attempts', 'select=*&order=created_at.desc')
    ]);
    const cName = id => { const c = (curricula || []).find(x => x.id === id); return c ? (ExamPages.ar() ? c.name_ar : c.name_en) : '—'; };
    const sName = id => { const s = (sections || []).find(x => x.id === id); return s ? ((s.grade || '') + ' ' + (s.name || '')).trim() : (ExamPages.ar() ? 'كل الشعب' : 'All sections'); };
    const render = () => {
      const list = exams || [];
      root.innerHTML = `
        <div class="card">
          <div class="card-head"><div class="card-title">📝 ${ExamPages.ar() ? 'الاختبارات' : 'Exams'}</div>
            <button class="btn primary" id="addExamBtn">+ ${ExamPages.ar() ? 'اختبار جديد' : 'New exam'}</button></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${ExamPages.ar() ? 'العنوان' : 'Title'}</th><th>${ExamPages.ar() ? 'المنهج' : 'Curriculum'}</th><th>${ExamPages.ar() ? 'الشعبة' : 'Section'}</th><th>⏱️</th><th>${ExamPages.ar() ? 'محاولات' : 'Attempts'}</th><th>${t('status')}</th><th>${t('actions')}</th></tr></thead>
            <tbody>${list.map(ex => {
              const qCount = (examQuestions || []).filter(eq => eq.exam_id === ex.id).length;
              const aCount = (attempts || []).filter(a => a.exam_id === ex.id).length;
              return `<tr>
                <td><b>${escapeHtml(ex.title)}</b><div class="small muted">${qCount} ${ExamPages.ar() ? 'سؤال' : 'questions'}</div></td>
                <td>${escapeHtml(cName(ex.curriculum_id))}</td>
                <td>${escapeHtml(sName(ex.section_id))}</td>
                <td dir="ltr">${ex.time_limit_min || '—'}m</td>
                <td>${aCount} / ${ex.max_attempts || 1}</td>
                <td><button class="btn ${ex.is_active ? 'green' : 'ghost'} small" data-toggle-exam="${ex.id}">${ex.is_active ? (ExamPages.ar() ? 'مفعّل' : 'Active') : (ExamPages.ar() ? 'موقوف' : 'Off')}</button></td>
                <td style="white-space:nowrap">
                  <button class="btn ghost small" data-qs-exam="${ex.id}">🧩 ${ExamPages.ar() ? 'الأسئلة' : 'Questions'}</button>
                  <button class="btn ghost small" data-res-exam="${ex.id}">📊 ${ExamPages.ar() ? 'النتائج' : 'Results'}</button>
                  <button class="btn ghost small" data-edit-exam="${ex.id}">✏️</button>
                  <button class="btn ghost small" data-del-exam="${ex.id}">🗑️</button>
                </td></tr>`;
            }).join('') || `<tr><td colspan="7" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>`;
      $('#addExamBtn', root).addEventListener('click', () => examForm(null));
      $$('[data-toggle-exam]', root).forEach(b => b.addEventListener('click', async () => {
        const ex = list.find(x => x.id === b.dataset.toggleExam);
        await API.update('exams', 'id=eq.' + ex.id, { is_active: !ex.is_active });
        await audit('toggle', 'exams', ex.id, { is_active: !ex.is_active });
        ExamPages.admin(root);
      }));
      $$('[data-edit-exam]', root).forEach(b => b.addEventListener('click', () => examForm(list.find(x => x.id === b.dataset.editExam))));
      $$('[data-del-exam]', root).forEach(b => b.addEventListener('click', () => {
        confirmModal(t('confirmDelete'), async () => {
          await API.remove('exam_questions', 'exam_id=eq.' + b.dataset.delExam);
          await API.remove('exam_attempts', 'exam_id=eq.' + b.dataset.delExam);
          await API.remove('exams', 'id=eq.' + b.dataset.delExam);
          await audit('delete', 'exams', b.dataset.delExam, {});
          toast(t('deleted'), 'success'); ExamPages.admin(root);
        }, true);
      }));
      $$('[data-qs-exam]', root).forEach(b => b.addEventListener('click', () => manageQuestions(list.find(x => x.id === b.dataset.qsExam))));
      $$('[data-res-exam]', root).forEach(b => b.addEventListener('click', () => showResults(list.find(x => x.id === b.dataset.resExam))));
    };

    const examForm = (ex) => {
      const editing = !!ex;
      openModal({
        title: editing ? (ExamPages.ar() ? 'تعديل الاختبار' : 'Edit exam') : (ExamPages.ar() ? 'اختبار جديد' : 'New exam'),
        bodyHtml: `
          <div class="form-row"><div><label>${ExamPages.ar() ? 'العنوان' : 'Title'} *</label><input class="input" id="fExTitle" value="${editing ? escapeHtml(ex.title) : ''}"></div></div>
          <div class="form-row cols-2">
            <div><label>${ExamPages.ar() ? 'المنهج' : 'Curriculum'}</label><select class="input" id="fExCurr"><option value="">—</option>${(curricula || []).map(c => `<option value="${c.id}" ${editing && ex.curriculum_id === c.id ? 'selected' : ''}>${escapeHtml(ExamPages.ar() ? c.name_ar : c.name_en)}</option>`).join('')}</select></div>
            <div><label>${ExamPages.ar() ? 'الشعبة' : 'Section'}</label><select class="input" id="fExSec"><option value="">${ExamPages.ar() ? 'كل الشعب' : 'All sections'}</option>${(sections || []).map(s => `<option value="${s.id}" ${editing && ex.section_id === s.id ? 'selected' : ''}>${escapeHtml(((s.grade || '') + ' ' + (s.name || '')).trim())}</option>`).join('')}</select></div>
          </div>
          <div class="form-row cols-2">
            <div><label>${ExamPages.ar() ? 'المدة (دقيقة)' : 'Time limit (min)'}</label><input class="input" id="fExTime" type="number" min="1" value="${editing ? (ex.time_limit_min || 30) : 30}"></div>
            <div><label>${ExamPages.ar() ? 'عدد المحاولات' : 'Max attempts'}</label><input class="input" id="fExAttempts" type="number" min="1" value="${editing ? (ex.max_attempts || 1) : 1}"></div>
          </div>
          <label class="small" style="display:flex;gap:.4rem;align-items:center;cursor:pointer"><input type="checkbox" id="fExActive" ${editing && ex.is_active ? 'checked' : ''}> ${ExamPages.ar() ? 'تفعيل الاختبار للطلاب' : 'Activate for students'}</label>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveExamBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveExamBtn', mroot).addEventListener('click', async () => {
            const title = $('#fExTitle', mroot).value.trim();
            if (!title) return toast(t('required'), 'error');
            const body = {
              title,
              curriculum_id: $('#fExCurr', mroot).value || null,
              section_id: $('#fExSec', mroot).value || null,
              time_limit_min: parseInt($('#fExTime', mroot).value, 10) || 30,
              max_attempts: parseInt($('#fExAttempts', mroot).value, 10) || 1,
              is_active: $('#fExActive', mroot).checked,
              created_by: App.user().id
            };
            try {
              if (editing) await API.update('exams', 'id=eq.' + ex.id, body);
              else await API.insert('exams', [body]);
              await audit(editing ? 'update' : 'create', 'exams', editing ? ex.id : null, { title });
              closeModal(); toast(t('saved'), 'success'); ExamPages.admin(root);
            } catch (e) { toast(t('dbError'), 'error'); }
          });
        }
      });
    };

    const manageQuestions = async (exam) => {
      const pool = await API.select('questions', 'select=*&is_active=eq.true' + (exam.curriculum_id ? '&curriculum_id=eq.' + encodeURIComponent(exam.curriculum_id) : '') + '&order=position,created_at') || [];
      const linked = (examQuestions || []).filter(eq => eq.exam_id === exam.id);
      const linkedIds = new Set(linked.map(l => l.question_id));
      openModal({
        title: (ExamPages.ar() ? 'أسئلة: ' : 'Questions: ') + exam.title, wide: true,
        bodyHtml: `
          <p class="small muted">${ExamPages.ar() ? 'اختر الأسئلة المدرجة في الاختبار' : 'Pick the questions included in this exam'}</p>
          <div style="max-height:55vh;overflow:auto;display:flex;flex-direction:column;gap:.35rem">
            ${pool.map(q => `<label class="card" style="margin:0;box-shadow:none;padding:.5rem .7rem;display:flex;gap:.6rem;align-items:center;cursor:pointer">
              <input type="checkbox" class="eq-pick" value="${q.id}" ${linkedIds.has(q.id) ? 'checked' : ''}>
              <span style="flex:1"><span class="pill gray small">${escapeHtml(q.type)}</span> <span class="pill amber small">${'★'.repeat(q.difficulty || 1)}</span> ${escapeHtml((ExamPages.ar() ? q.prompt_ar : q.prompt_en) || q.prompt_ar || '')}</span>
              <span class="small muted" dir="ltr">${q.points || 1}p</span></label>`).join('') || `<div class="muted">${ExamPages.ar() ? 'لا توجد أسئلة في بنك الأسئلة لهذا المنهج' : 'No questions in the bank for this curriculum'}</div>`}
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveExamQsBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveExamQsBtn', mroot).addEventListener('click', async () => {
            const picked = $$('.eq-pick', mroot).filter(x => x.checked).map(x => x.value);
            try {
              await API.remove('exam_questions', 'exam_id=eq.' + exam.id);
              if (picked.length) await API.insert('exam_questions', picked.map((qid, i) => ({ exam_id: exam.id, question_id: qid, position: i + 1 })));
              await audit('update', 'exam_questions', exam.id, { count: picked.length });
              closeModal(); toast(t('saved'), 'success'); ExamPages.admin(root);
            } catch (e) { toast(t('dbError'), 'error'); }
          });
        }
      });
    };

    const showResults = async (exam) => {
      const examQs = (await API.select('exam_questions', 'select=question_id&exam_id=eq.' + encodeURIComponent(exam.id)) || []);
      const qIds = examQs.map(x => x.question_id);
      const questions = qIds.length ? await API.select('questions', 'select=*&id=in.(' + qIds.map(encodeURIComponent).join(',') + ')') : [];
      const atts = (attempts || []).filter(a => a.exam_id === exam.id);
      const studentIds = Array.from(new Set(atts.map(a => a.student_id).filter(Boolean)));
      const roster = studentIds.length ? await API.select('students', 'select=id,name&id=in.(' + studentIds.map(encodeURIComponent).join(',') + ')') : [];
      const nameOf = id => (roster.find(r => r.id === id) || {}).name || '—';
      const essayQs = (questions || []).filter(q => q.type === 'essay');
      openModal({
        title: (ExamPages.ar() ? 'نتائج: ' : 'Results: ') + exam.title, wide: true,
        bodyHtml: `
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('student')}</th><th>${t('date')}</th><th>${ExamPages.ar() ? 'الدرجة' : 'Score'}</th><th>${ExamPages.ar() ? 'مقالي' : 'Essay'}</th><th>${t('actions')}</th></tr></thead>
            <tbody>${atts.map(a => {
              const essaysPending = essayQs.length && !(a.essay_scores && Object.keys(a.essay_scores).length);
              return `<tr><td><b>${escapeHtml(nameOf(a.student_id))}</b></td><td>${fmtDate(a.submitted_at || a.created_at)}</td>
                <td dir="ltr">${a.score == null ? '—' : a.score} / ${a.max_score == null ? '—' : a.max_score}</td>
                <td>${essayQs.length ? (essaysPending ? '<span class="pill amber">pending</span>' : '<span class="pill green">✓</span>') : '—'}</td>
                <td><button class="btn ghost small" data-review="${a.id}">🔍</button></td></tr>`;
            }).join('') || `<tr><td colspan="5" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('close')}</button>`,
        onOpen(mroot) {
          $$('[data-review]', mroot).forEach(b => b.addEventListener('click', () => reviewAttempt(b.dataset.review, atts.find(a => a.id === b.dataset.review), questions, nameOf)));
        }
      });
    };

    const reviewAttempt = (attemptId, attempt, questions, nameOf) => {
      const a = attempt || {};
      const answers = a.answers || {};
      openModal({
        title: (ExamPages.ar() ? 'تصحيح إجابات: ' : 'Review: ') + nameOf(a.student_id), wide: true,
        bodyHtml: `
          <div style="display:flex;flex-direction:column;gap:.6rem;max-height:60vh;overflow:auto">
            ${(questions || []).map(q => {
              const resp = answers[q.id];
              const r = Grader.grade(q, resp);
              const isEssay = q.type === 'essay';
              const savedEssay = (a.essay_scores && a.essay_scores[q.id] != null) ? a.essay_scores[q.id] : '';
              return `<div class="card" style="margin:0;box-shadow:none;padding:.6rem .7rem">
                <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><span class="pill gray">${escapeHtml(q.type)}</span><b>${escapeHtml((ExamPages.ar() ? q.prompt_ar : q.prompt_en) || '')}</b>
                  <span style="margin-inline-start:auto">${isEssay ? '🖊️' : (r.correct ? '✅' : '❌') + ' ' + (r.score != null ? r.score : '') + '/' + (Number(q.points) || 1)}</span></div>
                <div class="small muted" style="margin-top:.35rem" dir="auto">${ExamPages.ar() ? 'إجابة الطالب' : 'Student answer'}: ${escapeHtml(typeof resp === 'boolean' ? String(resp) : JSON.stringify(resp == null ? null : resp))}</div>
                ${q.answer && q.answer.reference ? `<div class="small" style="margin-top:.25rem" dir="auto"><b>${ExamPages.ar() ? 'الإجابة النموذجية' : 'Reference'}:</b> ${escapeHtml(q.answer.reference)}</div>` : ''}
                ${isEssay ? `<div class="form-row cols-2" style="margin-top:.4rem"><div><label>${ExamPages.ar() ? 'درجة المقالي' : 'Essay score'} (≤ ${Number(q.points) || 1})</label><input class="input" type="number" min="0" max="${Number(q.points) || 1}" step="0.5" class="essay-score" data-qid="${q.id}" value="${savedEssay}"></div></div>` : ''}
              </div>`;
            }).join('')}
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('close')}</button><button class="btn primary" id="saveEssayBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveEssayBtn', mroot).addEventListener('click', async () => {
            const essayScores = {};
            $$('.essay-score', mroot).forEach(inp => { if (inp.value.trim() !== '') essayScores[inp.dataset.qid] = Number(inp.value); });
            const auto = Grader.autoScore(questions, answers);
            const essaySum = Object.keys(essayScores).reduce((s, k) => s + (Number(essayScores[k]) || 0), 0);
            const score = pct1(auto.score + essaySum);
            try {
              await API.update('exam_attempts', 'id=eq.' + a.id, { essay_scores: essayScores, score });
              await audit('grade', 'exam_attempts', a.id, { score });
              closeModal(); toast(t('saved'), 'success');
            } catch (e) { toast(t('dbError'), 'error'); }
          });
        }
      });
    };

    render();
  },

  /* ================= STUDENT: list + take + history ================= */
  async student(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const user = App.user();
    const rosterRows = await API.select('students', 'select=id,name,section_id&user_id=eq.' + encodeURIComponent(user.id));
    const roster = rosterRows && rosterRows.length ? rosterRows[0] : null;
    if (!roster) { root.innerHTML = `<div class="card text-center muted" style="padding:2rem">${ExamPages.ar() ? 'حسابك غير مرتبط بسجل طالب — راجع إدارة المدرسة' : 'Your account is not linked to a student record — contact your school admin'}</div>`; return; }
    const [exams, attempts] = await Promise.all([
      API.select('exams', 'select=*&is_active=eq.true&order=created_at.desc'),
      API.select('exam_attempts', 'select=*&student_id=eq.' + encodeURIComponent(roster.id) + '&order=created_at.desc')
    ]);
    const visible = (exams || []).filter(e => !e.section_id || e.section_id === roster.section_id);
    const attemptsFor = id => (attempts || []).filter(a => a.exam_id === id);
    root.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:.6rem">📝 ${ExamPages.ar() ? 'الاختبارات المتاحة' : 'Available Exams'}</div>
        <div style="display:flex;flex-direction:column;gap:.55rem">
          ${visible.map(ex => {
            const used = attemptsFor(ex.id).length;
            const left = Math.max(0, (ex.max_attempts || 1) - used);
            const best = attemptsFor(ex.id).reduce((m, a) => Math.max(m, Number(a.score) || 0), 0);
            return `<div class="card" style="margin:0;box-shadow:none;padding:.7rem .8rem;display:flex;gap:.8rem;align-items:center;flex-wrap:wrap">
              <div style="flex:1;min-width:200px">
                <b>${escapeHtml(ex.title)}</b>
                <div class="small muted" style="margin-top:.2rem">⏱️ ${ex.time_limit_min || 30} ${ExamPages.ar() ? 'دقيقة' : 'min'} · ${ExamPages.ar() ? 'المحاولات المتبقية' : 'attempts left'}: ${left}/${ex.max_attempts || 1}${used ? ' · ' + (ExamPages.ar() ? 'أفضل نتيجة' : 'best') + ': ' + pct1(best) : ''}</div>
              </div>
              ${left > 0 ? `<button class="btn primary" data-take-exam="${ex.id}">▶️ ${ExamPages.ar() ? 'ابدأ الاختبار' : 'Start'}</button>` : `<span class="pill gray">${ExamPages.ar() ? 'انتهت المحاولات' : 'No attempts left'}</span>`}
            </div>`;
          }).join('') || `<div class="muted text-center" style="padding:1.5rem">${ExamPages.ar() ? 'لا توجد اختبارات مفعّلة الآن' : 'No active exams right now'}</div>`}
        </div>
      </div>
      ${attempts && attempts.length ? `<div class="card"><div class="card-title" style="margin-bottom:.6rem">📊 ${ExamPages.ar() ? 'سجل محاولاتي' : 'My Attempts'}</div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>${ExamPages.ar() ? 'الاختبار' : 'Exam'}</th><th>${t('date')}</th><th>${ExamPages.ar() ? 'الدرجة' : 'Score'}</th></tr></thead>
        <tbody>${attempts.map(a => { const ex = (exams || []).find(e => e.id === a.exam_id); return `<tr><td>${escapeHtml(ex ? ex.title : '—')}</td><td>${fmtDate(a.submitted_at || a.created_at)}</td><td dir="ltr">${a.score == null ? '—' : a.score} / ${a.max_score == null ? '—' : a.max_score}</td></tr>`; }).join('')}</tbody></table></div>
      </div>` : ''}`;
    $$('[data-take-exam]', root).forEach(b => b.addEventListener('click', () => this.takeExam(b.dataset.takeExam, root)));
  },

  async takeExam(examId, backRoot) {
    const root = backRoot;
    const user = App.user();
    const rosterRows = await API.select('students', 'select=id,section_id&user_id=eq.' + encodeURIComponent(user.id));
    const roster = rosterRows && rosterRows.length ? rosterRows[0] : null;
    if (!roster) return;
    const examRows = await API.select('exams', 'select=*&id=eq.' + encodeURIComponent(examId));
    const exam = examRows && examRows[0];
    if (!exam) return;
    const links = await API.select('exam_questions', 'select=*&exam_id=eq.' + encodeURIComponent(examId) + '&order=position') || [];
    const qIds = links.map(l => l.question_id);
    const questions = qIds.length ? (await API.select('questions', 'select=*&id=in.(' + qIds.map(encodeURIComponent).join(',') + ')') || [])
      .sort((a, b) => qIds.indexOf(a.id) - qIds.indexOf(b.id)) : [];
    if (!questions.length) { root.innerHTML = `<div class="card">${ExamPages.ar() ? 'هذا الاختبار لا يحتوي على أسئلة بعد' : 'This exam has no questions yet'}</div>`; return; }

    const state = { answers: {}, submitted: false, remaining: (exam.time_limit_min || 30) * 60 };
    const L = ExamPages.ar();
    root.innerHTML = `
      <div class="card">
        <div class="card-head"><div class="card-title">📝 ${escapeHtml(exam.title)}</div>
          <div class="pill ${'red'}" id="examTimer" dir="ltr" style="font-size:1.05rem;font-weight:800">${Math.floor(state.remaining / 60)}:${String(state.remaining % 60).padStart(2, '0')}</div></div>
        <div style="display:flex;flex-direction:column;gap:.9rem" id="examQuestions">
          ${questions.map((q, i) => this._questionHtml(q, i, L)).join('')}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:1rem"><button class="btn primary lg" id="submitExamBtn">${L ? 'تسليم الإجابات' : 'Submit answers'}</button></div>
      </div>`;

    // Wire interactive bits (order ↑↓ buttons, tf toggles)
    const orderState = {};
    questions.forEach(q => { if (q.type === 'order') orderState[q.id] = this._shuffledIndices(((q.options || {}).steps || []).length); });
    const renderOrder = (qid) => {
      const q = questions.find(x => x.id === qid);
      const steps = (q.options || {}).steps || [];
      const box = document.getElementById('order-' + q.id);
      if (!box) return;
      box.innerHTML = orderState[q.id].map((idx, pos) => `
        <div style="display:flex;gap:.5rem;align-items:center;padding:.35rem .5rem;border:1px solid rgba(0,0,0,.12);border-radius:8px;background:#fff">
          <b dir="ltr">${pos + 1}.</b><span style="flex:1">${escapeHtml(steps[idx])}</span>
          <button class="btn ghost small" data-up="${q.id}:${pos}" ${pos === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn ghost small" data-down="${q.id}:${pos}" ${pos === orderState[q.id].length - 1 ? 'disabled' : ''}>↓</button>
        </div>`).join('');
      $$('[data-up]', box).forEach(b => b.addEventListener('click', () => { const [id, p] = b.dataset.up.split(':'); const arr = orderState[id]; const i = Number(p); [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; renderOrder(id); }));
      $$('[data-down]', box).forEach(b => b.addEventListener('click', () => { const [id, p] = b.dataset.down.split(':'); const arr = orderState[id]; const i = Number(p); [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; renderOrder(id); }));
    };
    questions.forEach(q => { if (q.type === 'order') renderOrder(q.id); });

    const timerEl = $('#examTimer', root);
    const interval = setInterval(() => {
      state.remaining -= 1;
      if (timerEl) {
        timerEl.textContent = Math.floor(Math.max(0, state.remaining) / 60) + ':' + String(Math.max(0, state.remaining) % 60).padStart(2, '0');
        timerEl.classList.toggle('red', state.remaining <= 60);
      }
      if (state.remaining <= 0) { clearInterval(interval); submit(); }
    }, 1000);
    window.__examTimer = interval;

    const collect = () => {
      questions.forEach(q => {
        if (q.type === 'mcq') { const sel = $('input[name="q_' + q.id + '"]:checked', root); state.answers[q.id] = sel ? Number(sel.value) : null; }
        else if (q.type === 'tf') { const sel = $('input[name="q_' + q.id + '"]:checked', root); state.answers[q.id] = sel ? sel.value === 'true' : null; }
        else if (q.type === 'multi') { state.answers[q.id] = $$('input[name="q_' + q.id + '"]:checked', root).map(x => Number(x.value)); }
        else if (q.type === 'fill' || q.type === 'short' || q.type === 'essay') { const inp = $('#ans_' + q.id, root); state.answers[q.id] = inp ? inp.value : ''; }
        else if (q.type === 'order') { state.answers[q.id] = orderState[q.id].slice(); }
        else if (q.type === 'match') { state.answers[q.id] = $$('select[data-match-q="' + q.id + '"]', root).map(sel => Number(sel.value)); }
      });
      return state.answers;
    };

    const submit = async () => {
      if (state.submitted) return;
      state.submitted = true;
      clearInterval(interval);
      const answers = collect();
      const graded = Grader.autoScore(questions, answers);
      const maxScore = graded.max;
      try {
        await API.insert('exam_attempts', [{ exam_id: exam.id, student_id: roster.id, answers, score: graded.score, max_score: maxScore, essay_scores: {}, submitted_at: new Date().toISOString() }]);
        await audit('attempt', 'exams', exam.id, { score: graded.score, maxScore });
        const pctOf = maxScore ? Math.round((graded.score / maxScore) * 100) : 0;
        root.innerHTML = `
          <div class="card text-center" style="padding:2.5rem 1rem">
            <div style="font-size:3rem">${pctOf >= 60 ? '🎉' : '💪'}</div>
            <h2 style="margin:.4rem 0">${L ? 'تم تسليم الاختبار' : 'Exam submitted'}</h2>
            <div class="stat-value" style="font-size:2.4rem" dir="ltr">${graded.score} / ${maxScore}</div>
            <p class="muted">${pctOf}%${graded.pending ? ' · ' + (L ? 'بانتظار تصحيح سؤال مقالي' : 'pending essay review') : ''}</p>
            <button class="btn primary" id="backToExamsBtn">${t('back')}</button>
          </div>`;
        $('#backToExamsBtn', root).addEventListener('click', () => ExamPages.student(root));
      } catch (e) {
        state.submitted = false;
        toast(t('dbError'), 'error');
      }
    };
    $('#submitExamBtn', root).addEventListener('click', submit);
  },

  _shuffledIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    if (arr.length > 1 && arr.every((v, i) => v === i)) { const t = arr[0]; arr[0] = arr[arr.length - 1]; arr[arr.length - 1] = t; }
    return arr;
  },
  _shuffleCopy(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },

  _questionHtml(q, i, L) {
    const pts = Number(q.points) || 1;
    const head = `<div style="display:flex;gap:.5rem;align-items:baseline;flex-wrap:wrap"><b>${i + 1}.</b><span style="flex:1;font-weight:700">${escapeHtml((L ? q.prompt_ar : q.prompt_en) || q.prompt_ar || '')}</span><span class="small muted" dir="ltr">${pts}p</span></div>`;
    const name = 'q_' + q.id;
    let body = '';
    if (q.type === 'mcq') {
      body = (q.options || []).map((opt, j) => `<label style="display:flex;gap:.5rem;align-items:center;padding:.4rem .6rem;border:1px solid rgba(0,0,0,.12);border-radius:8px;cursor:pointer;background:#fff"><input type="radio" name="${name}" value="${j}"> ${escapeHtml(opt)}</label>`).join('');
    } else if (q.type === 'multi') {
      body = (q.options || []).map((opt, j) => `<label style="display:flex;gap:.5rem;align-items:center;padding:.4rem .6rem;border:1px solid rgba(0,0,0,.12);border-radius:8px;cursor:pointer;background:#fff"><input type="checkbox" name="${name}" value="${j}"> ${escapeHtml(opt)}</label>`).join('');
      body = `<div class="small muted" style="margin-bottom:.3rem">${L ? 'اختر كل الإجابات الصحيحة' : 'Select all correct answers'}</div>` + body;
    } else if (q.type === 'tf') {
      body = ['true', 'false'].map(v => `<label style="display:inline-flex;gap:.5rem;align-items:center;padding:.4rem 1rem;border:1px solid rgba(0,0,0,.12);border-radius:8px;cursor:pointer;background:#fff;margin-inline-end:.5rem"><input type="radio" name="${name}" value="${v}"> ${v === 'true' ? (L ? 'صح' : 'True') : (L ? 'خطأ' : 'False')}</label>`).join('');
    } else if (q.type === 'fill' || q.type === 'short') {
      body = `<input class="input" id="ans_${q.id}" dir="auto" style="max-width:420px">`;
    } else if (q.type === 'essay') {
      body = `<textarea class="input" id="ans_${q.id}" rows="3" dir="auto" style="resize:vertical"></textarea>`;
    } else if (q.type === 'order') {
      body = `<div class="small muted" style="margin-bottom:.3rem">${L ? 'رتب الخطوات بالترتيب الصحيح (↑↓)' : 'Arrange the steps in the correct order (↑↓)'}</div><div id="order-${q.id}" style="display:flex;flex-direction:column;gap:.35rem"></div>`;
    } else if (q.type === 'match') {
      const pairs = (q.options && q.options.pairs) || [];
      const bItems = this._shuffleCopy(pairs.map((p, idx) => ({ text: p.b, idx })));
      body = `<div class="small muted" style="margin-bottom:.3rem">${L ? 'اربط كل عبارة بما يقابلها' : 'Match each item to its pair'}</div>
        ${pairs.map((p, ai) => `<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.35rem"><span style="flex:1;min-width:180px;padding:.35rem .6rem;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:8px">${escapeHtml(p.a)}</span> <span>↔</span>
          <select class="input" data-match-q="${q.id}" style="flex:1;min-width:200px">${bItems.map(b => `<option value="${b.idx}">${escapeHtml(b.text)}</option>`).join('')}</select></div>`).join('')}`;
    }
    return `<div class="card" style="margin:0;box-shadow:none;padding:.7rem .8rem">${head}<div style="display:flex;flex-direction:column;gap:.4rem;margin-top:.45rem">${body}</div></div>`;
  }
};
