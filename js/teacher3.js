/* ============================================================
   AMAMB — Teacher module (part 3):
   leaderboard · reports · analysis · plans · certificates · schedule · export
   ============================================================ */
Object.assign(TeacherPages, {

  /* ========== Leaderboard ========== */
  async leaderboard(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const rows = Scoring.computeClass(data.students, data);
    const podium = rows.slice(0, 3);
    const podiumHtml = `<div class="podium">${[1, 0, 2].map(idx => {
      const r = podium[idx]; if (!r) return '';
      const pos = idx + 1;
      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
      return `<div class="podium-col"><div style="font-size:1.6rem">${medal}</div><div class="podium-name">${escapeHtml(r.student.name)}</div><div class="small muted">${r.m.totalPoints} ${t('points')}</div><div class="podium-bar podium-${pos}"><span style="font-size:1.5rem">${pos}</span></div></div>`;
    }).join('')}</div>`;

    root.innerHTML = `
      <div class="card">${podium.length ? podiumHtml : emptyState()}</div>
      <div class="card">
        <div class="card-head"><div class="card-title">🏆 ${t('navLeaderboard')}</div><button class="btn ghost small" id="exportXlsxLeaderboard">📥 ${t('export')}</button></div>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>${t('rank')}</th><th>${t('student')}</th><th>${t('academic')} /90</th><th>${TR('السلوك', 'Behavior')} /3</th><th>${t('attendanceSummary')} /4</th><th>${t('participation')} /3</th><th>${t('overall')}</th><th>${t('points')} /100</th><th>${TR('التقدير', 'Grade')}</th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td><span class="rank-badge ${r.rank <= 3 ? 'r' + r.rank : ''}">${r.rank}</span></td>
            <td><b>${escapeHtml(r.student.name)}</b></td>
            <td>${r.m.academicPoints}</td><td>${r.m.behaviorPoints}</td><td>${r.m.attendancePoints}</td><td>${r.m.participationPoints}</td>
            <td>${r.m.overallPct === null ? '—' : pct1(r.m.overallPct) + '%'}</td>
            <td><b>${r.m.totalPoints}</b></td>
            <td><span class="pill ${r.m.overallPct >= 87 ? 'green' : r.m.overallPct >= 60 ? 'teal' : r.m.overallPct >= 50 ? 'amber' : 'red'}"><bdi>${r.m.grade}</bdi></span></td></tr>`).join('') || `<tr><td colspan="9" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
        </table></div>
      </div>`;
    $('#exportXlsxLeaderboard', root).addEventListener('click', () => TeacherPages.exportExcel());
  },

  /* ========== Reports (per student + class) ========== */
  async reports(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const user = App.user();
    const metrics = Object.fromEntries(Scoring.computeClass(data.students, data).map(r => [r.student.id, r]));

    root.innerHTML = `
      <div class="grid cols-3" style="align-items:start">
        <div class="card">
          <div class="card-head"><div class="card-title">📄 ${t('studentReport')}</div></div>
          <div class="form-row"><div><label>${t('student')}</label><select class="input" id="reportStudent">${data.students.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select></div></div>
          <div class="form-row"><div><label>${t('period')}</label><select class="input" id="reportPeriod"><option value="weekly">${t('weekly')}</option><option value="monthly" selected>${t('monthly')}</option><option value="quarterly">${t('quarterly')}</option></select></div></div>
          <div class="form-row"><div><label>${t('teacherComment')}</label><textarea class="input" id="reportComment" rows="3" placeholder="${TR('اكتب تعليقاً لولي الأمر…', 'Write a comment for the parent…')}"></textarea></div></div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn primary" id="printStudentReport">🖨️ ${t('printSavePdf')}</button>
            <button class="btn green" id="waStudentReport">💬 ${t('sendWhatsapp')}</button>
          </div>
        </div>
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">🖨️ ${t('classReport')}</div><button class="btn primary" id="printClassReport">🖨️ ${t('printSavePdf')}</button></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('student')}</th><th>${t('overall')}</th><th>${t('attendanceSummary')}</th><th>${t('points')}</th><th>${t('rank')}</th></tr></thead>
            <tbody>${data.students.map(s => { const r = metrics[s.id]; return `<tr><td><b>${escapeHtml(s.name)}</b></td><td>${r.m.overallPct === null ? '—' : pct1(r.m.overallPct) + '%'}</td><td>${r.m.attendanceRate === null ? '—' : pct1(r.m.attendanceRate * 100) + '%'}</td><td>${r.m.totalPoints}</td><td>${r.rank}</td></tr>`; }).join('')}</tbody>
          </table></div>
        </div>
      </div>`;

    const buildReportHtml = (st, r, comment, period) => {
      const attCounts = { present: 0, late: 0, absent: 0, excused: 0 };
      data.attendance.forEach(sess => { const rec = sess.records && sess.records[st.id]; if (rec && rec.status) attCounts[rec.status] = (attCounts[rec.status] || 0) + 1; });
      const beh = r.m.behaviorCounts;
      const ratioRow = (label, ratio, maxPts, w) => {
        const p = ratio === null ? null : pct1(ratio * 100);
        const pts = ratio === null ? 0 : pct1(ratio * maxPts);
        return `<tr><td>${label}</td><td>${w}</td><td>${p === null ? '—' : p + '%'}</td><td>${pts} / ${maxPts}</td></tr>`;
      };
      const strengths = [], improvements = [];
      const map = [['final', t('quarterFinal')], ['quiz', t('quarterQuizzes')], ['exit', t('exitTickets')], ['homework', t('navHomework')]];
      for (const [k, label] of map) {
        const ratio = r.m.ratios[k];
        if (ratio === null) continue;
        if (ratio >= 0.8) strengths.push(label); else if (ratio < 0.6) improvements.push(label);
      }
      return `
      <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#3b2417">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #c2410c;padding-bottom:12px">
          <div><div style="font-size:26px;font-weight:800;color:#c2410c">AMAMB</div><div style="font-size:12px;color:#96785f">${escapeHtml((section.schools && section.schools.name) || user.school_name || '')}</div></div>
          <div style="text-align:end"><div style="font-size:18px;font-weight:800">${escapeHtml(t('studentReport'))}</div><div style="font-size:12px;color:#96785f">${humanPeriod(period)} · ${fmtDate(new Date())}</div></div>
        </div>
        <div style="margin:16px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div><b style="font-size:20px">${escapeHtml(st.name)}</b><div style="color:#96785f">${escapeHtml((section.grade || '') + ' ' + (section.name || ''))} · PIN ${escapeHtml(st.pin || '')}</div></div>
          <div style="text-align:center;background:#fdf0e0;border-radius:12px;padding:8px 18px"><div style="font-size:30px;font-weight:800;color:#c2410c">${r.m.overallPct === null ? '—' : pct1(r.m.overallPct) + '%'}</div><div style="font-size:11px;color:#96785f">${t('overall')} · <bdi>${r.m.grade}</bdi></div></div>
        </div>
        <h3 style="color:#c2410c;font-size:15px;border-bottom:1px solid #eddccf;padding-bottom:4px">${t('academic')}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px" border="1" cellpadding="6">
          <thead style="background:#f6ebe0"><tr><th>${t('item')}</th><th>${TR('الوزن', 'Weight')}</th><th>%</th><th>${t('points')}</th></tr></thead>
          <tbody>${ratioRow(t('quarterFinal'), r.m.ratios.final, 40, 40)}${ratioRow(t('quarterQuizzes'), r.m.ratios.quiz, 25, 25)}${ratioRow(t('exitTickets'), r.m.ratios.exit, 15, 15)}${ratioRow(t('navHomework'), r.m.ratios.homework, 10, 10)}</tbody>
          <tfoot><tr><th colspan="3">${TR('النقاط الأكاديمية', 'Academic points')}</th><th>${r.m.academicPoints} / ${r.m.academicMax}</th></tr></tfoot>
        </table>
        <h3 style="color:#c2410c;font-size:15px;border-bottom:1px solid #eddccf;padding-bottom:4px;margin-top:14px">${t('attendanceSummary')}</h3>
        <p style="font-size:13px">✅ ${t('present')}: <b>${attCounts.present}</b> &nbsp; ⏰ ${t('late')}: <b>${attCounts.late}</b> &nbsp; ❌ ${t('absent')}: <b>${attCounts.absent}</b> &nbsp; 📝 ${t('excused')}: <b>${attCounts.excused}</b> &nbsp;→&nbsp; ${r.m.attendanceRate === null ? TR('لا توجد جلسات', 'No sessions') : pct1(r.m.attendanceRate * 100) + '%'} (${r.m.attendanceRate === null ? '—' : r.m.attendancePoints + ' / 4'}) · ${t('participation')}: ${r.m.participationAvg ?? '—'} / 5 (${r.m.participationAvg === null ? '—' : r.m.participationPoints + ' / 3'})</p>
        <h3 style="color:#c2410c;font-size:15px;border-bottom:1px solid #eddccf;padding-bottom:4px;margin-top:14px">${t('behaviorSummary')}</h3>
        <p style="font-size:13px">😊 ${t('positive')}: <b>${beh.pos}</b> &nbsp; 🙁 ${t('negative')}: <b>${beh.neg}</b> &nbsp; 🎒 ${t('supplies')}: <b>${beh.sup}</b> &nbsp;→&nbsp; ${r.m.behaviorPoints} / 3</p>
        <h3 style="color:#c2410c;font-size:15px;border-bottom:1px solid #eddccf;padding-bottom:4px;margin-top:14px">${t('strengths')} / ${t('improvements')}</h3>
        <p style="font-size:13px">💪 ${strengths.length ? strengths.join(' · ') : '—'}<br>🎯 ${improvements.length ? improvements.join(' · ') : '—'}</p>
        ${comment ? `<h3 style="color:#c2410c;font-size:15px;border-bottom:1px solid #eddccf;padding-bottom:4px;margin-top:14px">${t('teacherComment')}</h3><p style="font-size:13px;background:#f6ebe0;border-radius:8px;padding:10px">${escapeHtml(comment)}</p>` : ''}
        <div style="display:flex;justify-content:space-between;margin-top:36px;font-size:12px;color:#96785f"><div>${escapeHtml(user.name)} — ${TR('توقيع المعلم', 'Teacher signature')} __________________</div><div>AMAMB © 2026</div></div>
      </div>`;
    };
    const humanPeriod = p => p === 'weekly' ? t('weekly') : p === 'quarterly' ? t('quarterly') : t('monthly');
    const selected = () => {
      const st = data.students.find(s => s.id === $('#reportStudent', root).value);
      return { st, r: metrics[st.id], comment: $('#reportComment', root).value.trim(), period: $('#reportPeriod', root).value };
    };
    $('#printStudentReport', root).addEventListener('click', () => {
      const { st, r, comment, period } = selected();
      printHtml(buildReportHtml(st, r, comment, period));
    });
    $('#waStudentReport', root).addEventListener('click', () => {
      const { st, r, comment, period } = selected();
      if (!st.parent_whatsapp) { toast(TR('لا يوجد رقم واتساب مسجل لولي الأمر', 'No parent WhatsApp number on file'), 'error'); return; }
      const msg = `AMAMB — ${t('studentReport')}\n${st.name} · ${(section.grade || '')} ${(section.name || '')}\n${t('overall')}: ${r.m.overallPct === null ? '—' : pct1(r.m.overallPct) + '%'} (${r.m.grade}) · ${t('points')}: ${r.m.totalPoints}/100 · ${t('rank')}: #${r.rank}\n${t('attendanceSummary')}: ${r.m.attendanceRate === null ? '—' : pct1(r.m.attendanceRate * 100) + '%'}${comment ? '\n' + comment : ''}`;
      window.open(waLink(st.parent_whatsapp, msg), '_blank', 'noopener');
    });
    $('#printClassReport', root).addEventListener('click', () => {
      const html = `<div style="font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#3b2417">
        <h2 style="color:#c2410c">AMAMB — ${t('classReport')} · ${escapeHtml((section.grade || '') + ' ' + (section.name || ''))}</h2>
        <div style="color:#96785f;margin-bottom:10px">${fmtDate(new Date())}</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px" border="1" cellpadding="6">
          <thead style="background:#f6ebe0"><tr><th>#</th><th>${t('student')}</th><th>${t('overall')}</th><th>${t('attendanceSummary')}</th><th>${t('points')}</th><th>${t('rank')}</th></tr></thead>
          <tbody>${Object.entries(metrics).sort((a, b) => a[1].rank - b[1].rank).map(([id, r]) => `<tr><td>${r.rank}</td><td>${escapeHtml((data.students.find(s => s.id === id) || {}).name || '')}</td><td>${r.m.overallPct === null ? '—' : pct1(r.m.overallPct) + '%'}</td><td>${r.m.attendanceRate === null ? '—' : pct1(r.m.attendanceRate * 100) + '%'}</td><td>${r.m.totalPoints}</td><td>${r.rank}</td></tr>`).join('')}</tbody>
        </table></div>`;
      printHtml(html);
    });
  },

  /* ========== Analysis ========== */
  async analysis(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const students = data.students;
    const items = [];
    data.exitTickets.filter(x => Scoring.hasAny(x.scores)).forEach(x => items.push({ label: (x.title || t('exitTickets')).slice(0, 26), kind: t('exitTickets'), max: Number(x.max) || 10, scores: x.scores }));
    data.quizzes.filter(x => Scoring.hasAny(x.scores)).forEach(x => items.push({ label: (x.title || t('quarterQuizzes')).slice(0, 26), kind: x.kind === 'final' ? t('quarterFinal') : t('quarterQuizzes'), max: Number(x.max) || 20, scores: x.scores }));
    const itemRows = items.map(it => {
      const vals = students.map(s => Scoring.num(it.scores, s.id)).filter(v => v !== null);
      const pcts = vals.map(v => (v / it.max) * 100);
      const mastery = pcts.filter(p => p >= 80).length;
      return { ...it, avg: pcts.length ? avg(pcts) : null, high: pcts.length ? Math.max(...pcts) : null, low: pcts.length ? Math.min(...pcts) : null, mastery: pcts.length ? (mastery / pcts.length) * 100 : null, n: vals.length };
    });

    root.innerHTML = `
      <div class="card">
        <div class="card-head"><div class="card-title">📊 ${t('itemAnalysis')}</div></div>
        <div class="table-wrap"><table class="tbl">
          <thead><tr><th>${t('item')}</th><th>${t('kind')}</th><th>n</th><th>${t('avg')}</th><th>${t('highest')}</th><th>${t('lowest')}</th><th>${t('mastery')} ≥80%</th></tr></thead>
          <tbody>${itemRows.map(r => `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.kind)}</td><td>${r.n}</td>
            <td><b>${r.avg === null ? '—' : pct1(r.avg) + '%'}</b></td><td>${r.high === null ? '—' : pct1(r.high) + '%'}</td><td>${r.low === null ? '—' : pct1(r.low) + '%'}</td>
            <td><span class="pill ${r.mastery >= 70 ? 'green' : r.mastery >= 40 ? 'amber' : 'red'}">${r.mastery === null ? '—' : pct1(r.mastery) + '%'}</span></td></tr>`).join('') || `<tr><td colspan="7" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="card"><div class="card-head"><div class="card-title">📈 ${t('avg')} %</div></div><div class="chart-box"><canvas id="analysisChart"></canvas></div></div>`;

    renderChart('analysisChart', {
      type: 'bar',
      data: { labels: itemRows.map(r => r.label), datasets: [{ label: t('avg') + ' %', data: itemRows.map(r => r.avg === null ? 0 : pct1(r.avg)), backgroundColor: '#ea580c', borderRadius: 6 }] },
      options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 }, x: { ticks: { maxRotation: 45, minRotation: 30, autoSkip: false, font: { size: 10 } } } }, plugins: { legend: { display: false } } }
    });
  },

  /* ========== Intervention & Enrichment Plans ========== */
  async plans(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const rows = Scoring.computeClass(data.students, data);
    const intervention = rows.filter(r => r.m.overallPct !== null && r.m.overallPct < 60);
    const enrichment = rows.filter(r => r.m.overallPct !== null && r.m.overallPct >= 90);
    const isAr = getLang() === 'ar';
    const planCard = (r, kind) => `
      <div class="card" style="margin:0;box-shadow:none;border-inline-start:4px solid ${kind === 'int' ? '#dc2626' : '#16a34a'}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem"><b>${escapeHtml(r.student.name)}</b><span class="pill ${kind === 'int' ? 'red' : 'green'}">${pct1(r.m.overallPct)}%</span></div>
        <ul style="margin:.5rem 0 0;padding-inline-start:1.2rem;font-size:.85rem;color:var(--ink-soft)">
          ${kind === 'int'
            ? (isAr ? ['جلسات تدخل فردية/جماعية قصيرة ٣ مرات أسبوعياً', 'تقسيم المهام إلى خطوات صغيرة ومراجعة فورية', 'بطاقات فهم تشخيصية بعد كل درس', 'تواصل أسبوعي مع ولي الأمر', 'متابعة خاصة للواجبات مع تغذية راجعة'] : ['Short 1:1/small-group intervention 3× per week', 'Break tasks into small chunks with immediate review', 'Diagnostic quick check after every lesson', 'Weekly parent communication', 'Homework supervision with feedback']).map(x => `<li>${x}</li>`).join('')
            : (isAr ? ['مشاريع إثرائية وتحديات تطبيقية متقدمة', 'دور "المعلم الصغير" / إرشاد الأقران', 'قراءات ومصادر إضافية معروضة', 'المشاركة في المسابقات والأنشطة المدرسية', 'أهداف تعلم ذاتية يحددها الطالب'] : ['Enrichment projects & advanced applied challenges', 'Peer-tutor / "student ambassador" role', 'Curated extension readings & resources', 'Competitions and school activities', 'Self-set learning goals with mentor check-ins']).map(x => `<li>${x}</li>`).join('')}
        </ul>
      </div>`;

    root.innerHTML = `
      <div class="card">
        <div class="card-head"><div class="card-title">📋 ${t('navPlans')}</div><button class="btn primary" id="printPlansBtn">🖨️ ${t('printPlan')}</button></div>
        <h3 style="color:#b91c1c;margin:.4rem 0">🔴 ${t('interventionPlan')} — ${t('below60')} (${intervention.length})</h3>
        <div class="grid cols-2" style="margin-bottom:1rem">${intervention.length ? intervention.map(r => planCard(r, 'int')).join('') : `<div class="muted">${TR('لا يوجد طلاب دون ٦٠٪ حالياً', 'No students below 60% right now')}</div>`}</div>
        <h3 style="color:#15803d;margin:.4rem 0">🟢 ${t('enrichmentPlan')} — ${t('above90')} (${enrichment.length})</h3>
        <div class="grid cols-2">${enrichment.length ? enrichment.map(r => planCard(r, 'enr')).join('') : `<div class="muted">${TR('لا يوجد طلاب فوق ٩٠٪ حالياً', 'No students above 90% right now')}</div>`}</div>
      </div>`;

    $('#printPlansBtn', root).addEventListener('click', () => {
      const html = `<div style="font-family:'Segoe UI',Tahoma,sans-serif;padding:24px;color:#3b2417">
        <h2 style="color:#c2410c">AMAMB — ${escapeHtml(t('navPlans'))} · ${escapeHtml((section.grade || '') + ' ' + (section.name || ''))}</h2>
        <div style="color:#96785f">${fmtDate(new Date())}</div>
        <h3 style="color:#b91c1c">${t('interventionPlan')} (${t('below60')})</h3>
        <ol>${intervention.map(r => `<li><b>${escapeHtml(r.student.name)}</b> — ${pct1(r.m.overallPct)}% · ${TR('نقاط', 'pts')} ${r.m.totalPoints}</li>`).join('') || '<li>—</li>'}</ol>
        <h3 style="color:#15803d">${t('enrichmentPlan')} (${t('above90')})</h3>
        <ol>${enrichment.map(r => `<li><b>${escapeHtml(r.student.name)}</b> — ${pct1(r.m.overallPct)}% · ${TR('نقاط', 'pts')} ${r.m.totalPoints}</li>`).join('') || '<li>—</li>'}</ol>
        <h3>${t('suggestedActions')}</h3><p style="font-size:13px">${(isAr ? ['تدخل: جلسات قصيرة متكررة، تجزئة المهام، تغذية راجعة فورية، إشراك ولي الأمر.', 'إثراء: مشاريع متقدمة، إرشاد الأقران، مصادر إضافية، مسابقات.'] : ['Intervention: short frequent sessions, chunking, immediate feedback, parent involvement.', 'Enrichment: advanced projects, peer mentoring, extension resources, competitions.']).join('<br>')}</p></div>`;
      printHtml(html);
    });
  },

  /* ========== Certificates ========== */
  async certificates(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const user = App.user();
    const rows = Scoring.computeClass(data.students, data);

    root.innerHTML = `
      <div class="grid cols-3" style="align-items:start">
        <div class="card">
          <div class="card-head"><div class="card-title">🎓 ${t('navCertificates')}</div></div>
          <div class="form-row"><div><label>${t('student')}</label><select class="input" id="certStudent">${rows.map(r => `<option value="${r.student.id}">${escapeHtml(r.student.name)} — ${r.m.totalPoints} ${t('points')}</option>`).join('')}</select></div></div>
          <div class="form-row"><div><label>${t('type')}</label><select class="input" id="certType"><option value="topOfClass">🥇 ${t('topOfClass')}</option><option value="perfectAttendance">🗓️ ${t('perfectAttendance')}</option><option value="mostImproved">📈 ${t('mostImproved')}</option></select></div></div>
          <div class="form-row"><div><label>${TR('مخصص (اختياري)', 'Custom (optional)')}</label><input class="input" id="certCustom" placeholder="${TR('سبب آخر للتقدير…', 'Another reason…')}"></div></div>
          <button class="btn gold block lg" id="printCertBtn">🖨️ ${t('printCert')}</button>
        </div>
        <div class="card" style="grid-column:span 2"><div id="certPreview"></div></div>
      </div>`;

    const buildCert = () => {
      const st = data.students.find(s => s.id === $('#certStudent', root).value) || data.students[0];
      const custom = $('#certCustom', root).value.trim();
      const type = $('#certType', root).value;
      const reason = custom || t(type);
      const schoolName = (section.schools && section.schools.name) || user.school_name || 'AMAMB School';
      return `
      <div class="certificate">
        <div style="font-size:.8rem;letter-spacing:4px;color:#92400e;font-weight:700">${escapeHtml(schoolName)}</div>
        <h2 style="margin-top:.3rem">${escapeHtml(t('certTitle')).toUpperCase()}</h2>
        <div style="font-size:.85rem;color:#78350f">${escapeHtml(t('certBody'))}</div>
        <div class="cert-name">${escapeHtml(st.name)}</div>
        <div style="font-size:.85rem;color:#78350f">${escapeHtml(t('certReason'))}</div>
        <div style="font-size:1.05rem;font-weight:800;color:#92400e;margin:.15rem 0">${escapeHtml(reason)}</div>
        <div class="cert-seal"><svg viewBox="0 0 64 64" style="width:44px;height:44px" aria-hidden="true"><g fill="none" stroke="#b45309" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M25 8h14"/><path d="M28 8v19L16.5 46.5A6.2 6.2 0 0 0 22 56h20a6.2 6.2 0 0 0 5.5-9.5L36 27V8"/></g><path d="M25.5 38.5h13L43 49a3.4 3.4 0 0 1-3 5H24a3.4 3.4 0 0 1-3-5l4.5-10.5z" fill="#d97706" fill-opacity=".9"/></svg></div>
        <div style="display:flex;justify-content:space-between;width:100%;margin-top:.6rem;font-size:.72rem;color:#92400e"><div>${fmtDate(new Date())}</div><div>${escapeHtml(user.name)} · ${TR('توقيع المعلم', 'Teacher signature')} ____________</div></div>
      </div>`;
    };
    const refresh = () => { $('#certPreview', root).innerHTML = buildCert(); };
    ['certStudent', 'certType', 'certCustom'].forEach(id => $('#' + id, root).addEventListener('input', refresh));
    if (data.students.length) refresh();
    $('#printCertBtn', root).addEventListener('click', () => printHtml(buildCert()));
  },

  /* ========== Weekly schedule ========== */
  async schedule(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), TR('الجمعة', 'Friday'), TR('السبت', 'Saturday')];
    const byDay = {};
    data.schedule.forEach(r => { (byDay[r.day_of_week] = byDay[r.day_of_week] || []).push(r); });

    root.innerHTML = `
      <div class="card">
        <div class="card-head"><div class="card-title">🗓️ ${t('navSchedule')}</div><button class="btn primary" id="addScheduleRowBtn">+ ${t('add')}</button></div>
        ${[0,1,2,3,4,5,6].filter(d => byDay[d]).map(d => `
          <div style="margin-bottom:.7rem"><div style="font-weight:800;color:var(--brand);margin-bottom:.3rem">${dayNames[d]}</div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>${t('periodCol')}</th><th>${t('subject')}</th><th>${t('time')}</th><th></th></tr></thead>
              <tbody>${(byDay[d] || []).sort((a, b) => (a.period || 0) - (b.period || 0)).map(r => `<tr><td>${r.period ?? ''}</td><td><b>${escapeHtml(r.subject || '')}</b></td><td dir="ltr">${escapeHtml(r.time_start || '')}–${escapeHtml(r.time_end || '')}</td><td><button class="btn ghost small" data-del-sched="${r.id}">🗑️</button></td></tr>`).join('')}</tbody>
            </table></div></div>`).join('') || emptyState(t('noData'))}
      </div>`;

    $('#addScheduleRowBtn', root).addEventListener('click', () => {
      openModal({
        title: t('navSchedule'),
        bodyHtml: `
          <div class="form-row cols-2">
            <div><label>${t('dayOfWeek')}</label><select class="input" id="fSchDay">${[0,1,2,3,4,5,6].map(d => `<option value="${d}">${dayNames[d]}</option>`).join('')}</select></div>
            <div><label>${t('periodCol')}</label><input class="input" id="fSchPeriod" type="number" min="1" max="12" value="1"></div>
          </div>
          <div class="form-row"><div><label>${t('subject')} *</label><input class="input" id="fSchSubject"></div></div>
          <div class="form-row cols-2">
            <div><label>${TR('من', 'From')}</label><input class="input" id="fSchStart" type="time" value="08:00"></div>
            <div><label>${TR('إلى', 'To')}</label><input class="input" id="fSchEnd" type="time" value="08:45"></div>
          </div>`,
        footHtml: `<button class="btn ghost" data-close-modal>${t('cancel')}</button><button class="btn primary" id="saveSchedBtn">${t('save')}</button>`,
        onOpen(mroot) {
          $('#saveSchedBtn', mroot).addEventListener('click', async () => {
            const subject = $('#fSchSubject', mroot).value.trim();
            if (!subject) return toast(t('required'), 'error');
            await API.insert('schedule', [{ section_id: section.id, day_of_week: Number($('#fSchDay', mroot).value), period: Number($('#fSchPeriod', mroot).value) || 1, subject, time_start: $('#fSchStart', mroot).value, time_end: $('#fSchEnd', mroot).value }]);
            closeModal(); toast(t('added'), 'success'); TeacherPages.schedule(root);
          });
        }
      });
    });
    $$('[data-del-sched]', root).forEach(b => b.addEventListener('click', () => {
      confirmModal(t('confirmDelete'), async () => { await API.remove('schedule', 'id=eq.' + b.dataset.delSched); toast(t('deleted'), 'success'); TeacherPages.schedule(root); }, true);
    }));
  },

  /* ========== Excel export ========== */
  async exportPage(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const { section, data } = await TeacherCtx.load();
    if (!section) return TeacherCtx.emptyNoSection(root);
    root.innerHTML = `
      <div class="card text-center" style="padding:2.2rem 1rem">
        <div style="font-size:3rem">📊</div>
        <h3 style="margin:.4rem 0">${t('exportExcel')}</h3>
        <p class="muted" style="max-width:520px;margin:0 auto">${t('exportDesc')}</p>
        <button class="btn primary lg" id="doExportBtn" style="margin-top:1rem">📥 ${t('exportExcel')}</button>
      </div>`;
    $('#doExportBtn', root).addEventListener('click', () => TeacherPages.exportExcel(section, data));
  },

  async exportExcel(section, data) {
    if (!section || !data) {
      const ctx = await TeacherCtx.load();
      section = ctx.section; data = ctx.data;
      if (!section) return;
    }
    const rows = Scoring.computeClass(data.students, data);
    const wb = XLSX.utils.book_new();

    // Summary
    const sumAoa = [['AMAMB — ' + ((section.grade || '') + ' ' + (section.name || ''))], [fmtDate(new Date())], [],
      [t('rank'), t('student'), t('overall') + ' %', 'Academic /90', 'Behavior /3', 'Attendance /4', 'Participation /3', 'Total /100', 'Grade']];
    rows.forEach(r => sumAoa.push([r.rank, r.student.name, r.m.overallPct === null ? '' : pct1(r.m.overallPct), r.m.academicPoints, r.m.behaviorPoints, r.m.attendancePoints, r.m.participationPoints, r.m.totalPoints, r.m.grade]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumAoa), 'Summary');

    const matrixSheet = (items, isHw) => {
      const aoa = [[t('student')].concat(items.map(it => (it.is_open !== undefined ? fmtDate(it.date) : (it.title || '')) + (it.max ? ` (/${it.max})` : '')))];
      data.students.forEach(s => aoa.push([s.name].concat(items.map(it => {
        if (isHw) { const v = it.status && it.status[s.id]; return v === 'submitted' || v === 'late' ? 1 : 0; }
        const v = it.scores && it.scores[s.id]; return v === undefined ? '' : Number(v);
      }))));
      return XLSX.utils.aoa_to_sheet(aoa);
    };
    if (data.exitTickets.length) XLSX.utils.book_append_sheet(wb, matrixSheet(data.exitTickets, false), 'Quick Checks');
    if (data.quizzes.length) XLSX.utils.book_append_sheet(wb, matrixSheet(data.quizzes, false), 'Quizzes & Final');
    if (data.homework.length) XLSX.utils.book_append_sheet(wb, matrixSheet(data.homework, true), 'Homework');

    const attAoa = [[t('date'), t('student'), t('status'), t('participation'), TR('عبر', 'Via')]];
    data.attendance.forEach(sess => data.students.forEach(s => { const rec = sess.records && sess.records[s.id]; if (rec) attAoa.push([sess.date, s.name, rec.status || '', rec.participation ?? '', rec.via || '']); }));
    if (attAoa.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(attAoa), 'Attendance');

    const behAoa = [[t('date'), t('student'), t('type'), t('notes')]];
    const byId = Object.fromEntries(data.students.map(s => [s.id, s.name]));
    data.behavior.forEach(n => behAoa.push([n.date, byId[n.student_id] || '', n.type, n.text || '']));
    if (behAoa.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(behAoa), 'Behavior');

    XLSX.writeFile(wb, 'AMAMB_' + ((section.grade || 'class') + '_' + (section.name || 'section')).replace(/\s+/g, '_') + '.xlsx');
    toast(t('exported'), 'success');
  }
});
