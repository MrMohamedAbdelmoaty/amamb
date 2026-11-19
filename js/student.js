/* ============================================================
   AMAMB — Student module (full access)
   ============================================================ */
const StudentCtx = {
  async load() {
    const user = App.user();
    return Data.myStudentData(user);
  }
};

const StudentPages = {

  _shell(root, inner) { root.innerHTML = inner; },

  /* ---------- helpers ---------- */
  noLinkedStudent(root) {
    root.innerHTML = `<div class="card text-center" style="padding:2.5rem 1rem"><div style="font-size:2.4rem">🔗</div><h3>${TR('حسابك غير مرتبط بطالب', 'Your account is not linked to a student record')}</h3><p class="muted">${TR('تواصل مع معلمك أو إدارة المدرسة لربط حسابك', 'Contact your teacher or school admin to link your account')}</p></div>`;
  },
  myMetrics(ctx) {
    const me = ctx.data.students.find(s => s.id === ctx.student.id) || ctx.student;
    const rows = Scoring.computeClass(ctx.data.students, ctx.data);
    return { me, rows, mine: rows.find(r => r.student.id === me.id) };
  },

  /* ========== 1) Dashboard ========== */
  async dashboard(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const { me, mine, rows } = this.myMetrics(ctx);
    const m = mine.m;
    const section = ctx.section;
    const upcomingHw = ctx.data.homework.filter(hw => !hw.status || !hw.status[me.id] || hw.status[me.id] === 'missing');
    const myRank = mine.rank;

    root.innerHTML = `
      <div class="card" style="background:var(--brand-grad);color:#fff;border:none;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
        <div>
          <div style="font-size:1.25rem;font-weight:800">${TR('أهلاً', 'Welcome')}، ${escapeHtml(me.name)} 👋</div>
          <div style="opacity:.9;font-size:.85rem">${escapeHtml((section && (section.grade || '') + ' ' + (section.name || '')) || '')} · ${escapeHtml((section && section.schools && section.schools.name) || '')}</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,.18);border-radius:14px;padding:.5rem 1.2rem"><div style="font-size:1.6rem;font-weight:800">#${myRank}</div><div style="font-size:.72rem;opacity:.9">${t('rank')}</div></div>
      </div>
      <div class="grid cols-4" style="margin-top:1rem">
        <div class="stat-card teal"><div class="stat-label">📈 ${t('overall')}</div><div class="stat-value">${m.overallPct === null ? '—' : pct1(m.overallPct) + '%'}</div><div class="stat-foot"><bdi>${m.grade}</bdi></div></div>
        <div class="stat-card"><div class="stat-label">⭐ ${t('points')}</div><div class="stat-value">${m.totalPoints}</div><div class="stat-foot">/ 100</div></div>
        <div class="stat-card green"><div class="stat-label">🗓️ ${t('avgAttendance')}</div><div class="stat-value">${m.attendanceRate === null ? '—' : pct1(m.attendanceRate * 100) + '%'}</div><div class="stat-foot">${m.attendanceSessions} ${TR('جلسة', 'sessions')}</div></div>
        <div class="stat-card gold"><div class="stat-label">🧭 ${TR('السلوك', 'Behavior')}</div><div class="stat-value">${m.behaviorPoints}</div><div class="stat-foot">/ 3</div></div>
      </div>
      <div class="grid cols-3" style="margin-top:1rem;align-items:start">
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">📊 ${TR('أدائي في كل عنصر', 'My performance by item')}</div></div>
          <div class="chart-box"><canvas id="stuPerfChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">📚 ${t('navMyHomework')}</div><button class="btn ghost small" data-goto="myHomework">${TR('الكل', 'All')} ←</button></div>
          ${upcomingHw.length ? upcomingHw.slice(0, 4).map(hw => `<div style="display:flex;justify-content:space-between;gap:.5rem;padding:.45rem .1rem;border-bottom:1px solid var(--line)"><span>${escapeHtml(hw.title || '')}</span><span class="small muted">${fmtDate(hw.due_date)}</span></div>`).join('') : `<div class="muted small" style="padding:.5rem .1rem">🎉 ${TR('لا توجد واجبات معلقة', 'No pending homework')}</div>`}
        </div>
      </div>`;
    $$('[data-goto]', root).forEach(b => b.addEventListener('click', () => App.go(b.dataset.goto)));

    const labels = [t('exitTickets'), t('quarterQuizzes'), t('quarterFinal'), t('navHomework')];
    const pct = k => m.ratios[k] === null ? 0 : pct1(m.ratios[k] * 100);
    renderChart('stuPerfChart', {
      type: 'bar',
      data: { labels, datasets: [{ label: '%', data: [pct('exit'), pct('quiz'), pct('final'), pct('homework')], backgroundColor: ['#d97706', '#ea580c', '#c2410c', '#166534'], borderRadius: 8 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, scales: { x: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
    });
  },

  /* ========== 2) My grades ========== */
  async grades(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const me = ctx.student.id;
    const { data } = ctx;
    const row = (title, date, score, max) => {
      const p = score === null || score === undefined ? null : pct1((score / max) * 100);
      return `<tr><td>${fmtDate(date)}</td><td>${escapeHtml(title)}</td><td>${score === null || score === undefined ? '—' : score} / ${max}</td><td>${p === null ? '—' : `<div style="display:flex;align-items:center;gap:.4rem"><div class="progress ${p >= 80 ? 'green' : p >= 60 ? '' : 'red'}" style="width:90px"><div style="width:${p}%"></div></div><b>${p}%</b></div>`}</td></tr>`;
    };
    root.innerHTML = `
      <div class="card"><div class="card-head"><div class="card-title">🎟️ ${t('exitTickets')}</div></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('date')}</th><th>${t('lesson')}</th><th>${t('points')}</th><th>%</th></tr></thead>
        <tbody>${data.exitTickets.map(x => row(x.title, x.date, Scoring.num(x.scores, me), Number(x.max) || 10)).join('') || `<tr><td colspan="4" class="muted text-center">${t('noData')}</td></tr>`}</tbody></table></div></div>
      <div class="card"><div class="card-head"><div class="card-title">📝 ${t('quarterQuizzes')} / ${t('quarterFinal')}</div></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('date')}</th><th>${t('item')}</th><th>${t('points')}</th><th>%</th></tr></thead>
        <tbody>${data.quizzes.map(x => row(x.title, x.date, Scoring.num(x.scores, me), Number(x.max) || 20)).join('') || `<tr><td colspan="4" class="muted text-center">${t('noData')}</td></tr>`}</tbody></table></div></div>`;
  },

  /* ========== 3) My attendance ========== */
  async attendance(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const me = ctx.student.id;
    const hist = ctx.data.attendance.map(sess => ({ date: sess.date, rec: sess.records && sess.records[me] })).filter(x => x.rec).reverse();
    const c = { present: 0, late: 0, absent: 0, excused: 0 };
    hist.forEach(x => { if (c[x.rec.status] !== undefined) c[x.rec.status]++; });
    const denom = c.present + c.late + c.absent;
    const rate = denom ? Math.round(((c.present + 0.75 * c.late) / denom) * 1000) / 10 : null;
    root.innerHTML = `
      <div class="grid cols-4" style="margin-bottom:1rem">
        <div class="stat-card green"><div class="stat-label">✅ ${t('present')}</div><div class="stat-value">${c.present}</div></div>
        <div class="stat-card amber"><div class="stat-label">⏰ ${t('late')}</div><div class="stat-value">${c.late}</div></div>
        <div class="stat-card red"><div class="stat-label">❌ ${t('absent')}</div><div class="stat-value">${c.absent}</div></div>
        <div class="stat-card teal"><div class="stat-label">📈 ${TR('نسبة الحضور', 'Attendance rate')}</div><div class="stat-value">${rate === null ? '—' : rate + '%'}</div></div>
      </div>
      <div class="card"><div class="card-head"><div class="card-title">🗓️ ${t('navMyAttendance')}</div></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('date')}</th><th>${t('status')}</th><th>${t('participation')}</th><th>${TR('عبر', 'Via')}</th></tr></thead>
        <tbody>${hist.map(x => `<tr><td>${fmtDate(x.date)}</td><td>${x.rec.status === 'present' ? '<span class="pill green">✅ ' + t('present') + '</span>' : x.rec.status === 'late' ? '<span class="pill amber">⏰ ' + t('late') + '</span>' : x.rec.status === 'absent' ? '<span class="pill red">❌ ' + t('absent') + '</span>' : '<span class="pill gray">📝 ' + t('excused') + '</span>'}</td><td>${x.rec.participation ?? '—'} / 5</td><td>${x.rec.via === 'qr' ? '<span class="pill teal">QR</span>' : '<span class="pill gray">' + TR('يدوي', 'Manual') + '</span>'}</td></tr>`).join('') || `<tr><td colspan="4" class="muted text-center">${t('noData')}</td></tr>`}</tbody></table></div></div>`;
  },

  /* ========== 4) My homework ========== */
  async homework(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const me = ctx.student.id;
    root.innerHTML = `<div class="card"><div class="card-head"><div class="card-title">📚 ${t('navMyHomework')}</div></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('hwTitle')}</th><th>${t('dueDate')}</th><th>${t('status')}</th></tr></thead>
      <tbody>${ctx.data.homework.slice().reverse().map(hw => { const v = hw.status && hw.status[me]; return `<tr><td><b>${escapeHtml(hw.title || '')}</b></td><td>${fmtDate(hw.due_date)}</td><td>${v === 'submitted' || v === 'late' ? '<span class="pill green">✅ ' + t('submitted') + '</span>' : '<span class="pill red">❌ ' + t('missing') + '</span>'}</td></tr>`; }).join('') || `<tr><td colspan="3" class="muted text-center">${t('noData')}</td></tr>`}</tbody></table></div></div>`;
  },

  /* ========== 5) My rank (full class leaderboard, me highlighted) ========== */
  async rank(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const { me, rows } = this.myMetrics(ctx);
    root.innerHTML = `<div class="card"><div class="card-head"><div class="card-title">🏆 ${t('navLeaderboard')}</div></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('rank')}</th><th>${t('student')}</th><th>${t('overall')}</th><th>${t('points')} /100</th><th></th></tr></thead>
      <tbody>${rows.map(r => { const isMe = r.student.id === me.id; return `<tr style="${isMe ? 'background:#fdf0e0;font-weight:700' : ''}"><td><span class="rank-badge ${r.rank <= 3 ? 'r' + r.rank : ''}">${r.rank}</span></td><td>${escapeHtml(r.student.name)}${isMe ? ' 👈' : ''}</td><td>${r.m.overallPct === null ? '—' : pct1(r.m.overallPct) + '%'}</td><td>${r.m.totalPoints}</td><td>${isMe ? '<span class="pill purple">' + TR('أنت', 'You') + '</span>' : ''}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  },

  /* ========== 6) My report (printable) ========== */
  async report(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const { me, mine } = this.myMetrics(ctx);
    const m = mine.m;
    const section = ctx.section;
    const schoolName = (section && section.schools && section.schools.name) || '';
    const user = App.user();
    const bar = (label, ratio, maxPts, w) => {
      const p = ratio === null ? null : pct1(ratio * 100);
      return `<tr><td>${label}</td><td>${w}</td><td>${p === null ? '—' : p + '%'}</td><td>${ratio === null ? 0 : pct1(ratio * maxPts)} / ${maxPts}</td></tr>`;
    };
    const buildHtml = () => `
      <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#3b2417">
        <div style="display:flex;justify-content:space-between;border-bottom:3px solid #c2410c;padding-bottom:10px"><div><div style="font-size:26px;font-weight:800;color:#c2410c">AMAMB</div><div style="font-size:12px;color:#96785f">${escapeHtml(schoolName)}</div></div><div style="text-align:end"><div style="font-size:18px;font-weight:800">${escapeHtml(t('studentReport'))}</div><div style="font-size:12px;color:#96785f">${fmtDate(new Date())}</div></div></div>
        <h2 style="margin:14px 0 2px">${escapeHtml(me.name)}</h2><div style="color:#96785f">${escapeHtml((section && (section.grade || '') + ' ' + (section.name || '')) || '')} · ${t('rank')}: #${mine.rank} · ${m.totalPoints}/100 ${t('points')}</div>
        <h3 style="color:#c2410c">${t('academic')}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px" border="1" cellpadding="6"><thead style="background:#f6ebe0"><tr><th>${t('item')}</th><th>${TR('الوزن', 'Weight')}</th><th>%</th><th>${t('points')}</th></tr></thead><tbody>${bar(t('quarterFinal'), m.ratios.final, 40, 40)}${bar(t('quarterQuizzes'), m.ratios.quiz, 25, 25)}${bar(t('exitTickets'), m.ratios.exit, 15, 15)}${bar(t('navHomework'), m.ratios.homework, 10, 10)}</tbody></table>
        <h3 style="color:#c2410c">${t('attendanceSummary')} · ${t('behaviorSummary')}</h3>
        <p style="font-size:13px">🗓️ ${m.attendanceRate === null ? '—' : pct1(m.attendanceRate * 100) + '%'} (${m.attendanceRate === null ? '—' : m.attendancePoints + '/4'}) · ${t('participation')} ${m.participationAvg ?? '—'}/5 (${m.participationAvg === null ? '—' : m.participationPoints + '/3'}) · 😊 ${m.behaviorCounts.pos} / 🙁 ${m.behaviorCounts.neg} / 🎒 ${m.behaviorCounts.sup} → ${m.behaviorPoints}/3</p>
        <div style="margin-top:30px;font-size:12px;color:#96785f">AMAMB © 2026 · ${escapeHtml(user.name)}</div>
      </div>`;
    root.innerHTML = `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
        <div><div class="card-title">📄 ${t('navMyReport')}</div><div class="small muted">${TR('تقريرك الشخصي — يمكن طباعته أو حفظه PDF', 'Your personal report — printable / save as PDF')}</div></div>
        <button class="btn primary lg" id="printMyReport">🖨️ ${t('printSavePdf')}</button>
      </div>
      <div class="grid cols-4">
        <div class="stat-card teal"><div class="stat-label">${t('overall')}</div><div class="stat-value">${m.overallPct === null ? '—' : pct1(m.overallPct) + '%'}</div></div>
        <div class="stat-card"><div class="stat-label">${t('points')}</div><div class="stat-value">${m.totalPoints}</div></div>
        <div class="stat-card green"><div class="stat-label">${t('attendanceSummary')}</div><div class="stat-value">${m.attendanceRate === null ? '—' : pct1(m.attendanceRate * 100) + '%'}</div></div>
        <div class="stat-card gold"><div class="stat-label">${t('rank')}</div><div class="stat-value">#${mine.rank}</div></div>
      </div>`;
    $('#printMyReport', root).addEventListener('click', () => printHtml(buildHtml()));
  },

  /* ========== 7) Timetable ========== */
  async timetable(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const dayNames = [t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), TR('الجمعة', 'Friday'), TR('السبت', 'Saturday')];
    const byDay = {};
    ctx.data.schedule.forEach(r => { (byDay[r.day_of_week] = byDay[r.day_of_week] || []).push(r); });
    root.innerHTML = `<div class="card"><div class="card-head"><div class="card-title">🗓️ ${t('navTimetable')}</div></div>
      <div class="grid cols-2">${[0,1,2,3,4,5,6].filter(d => byDay[d]).map(d => `<div class="card" style="margin:0;box-shadow:none"><div style="font-weight:800;color:var(--brand);margin-bottom:.4rem">${dayNames[d]}</div>${(byDay[d] || []).sort((a, b) => (a.period || 0) - (b.period || 0)).map(r => `<div style="display:flex;justify-content:space-between;gap:.6rem;padding:.35rem .2rem;border-bottom:1px solid var(--line)"><span><b>${escapeHtml(r.subject || '')}</b></span><span class="small muted" dir="ltr">${escapeHtml(r.time_start || '')}–${escapeHtml(r.time_end || '')}</span></div>`).join('')}</div>`).join('') || emptyState(t('noData'))}</div></div>`;
  },

  /* ========== 8) QR Check-in ========== */
  async checkin(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const me = ctx.student.id;
    const openSessions = ctx.data.attendance.filter(a => a.is_open);

    const doCheckin = async (sess, code) => {
      if (sess.code && code && sess.code !== code) return { ok: false, reason: 'code' };
      const records = sess.records || {};
      if (records[me] && (records[me].status === 'present' || records[me].status === 'late')) return { ok: false, reason: 'already' };
      records[me] = Object.assign({}, records[me] || {}, { status: 'present', via: 'qr', ts: new Date().toISOString() });
      await API.update('attendance', 'id=eq.' + sess.id, { records });
      return { ok: true };
    };

    // Auto check-in from scanned QR (URL params stashed at boot)
    let pending = null;
    try { pending = JSON.parse(sessionGet('amamb_pending_checkin') || 'null'); } catch (e) { pending = null; }

    root.innerHTML = `
      <div class="card text-center" style="padding:1.6rem">
        <div style="font-size:2.6rem">📲</div>
        <h3 style="margin:.3rem 0">${t('navCheckin')}</h3>
        ${openSessions.length ? `
          <p class="muted">${TR('جلسة مفتوحة الآن — اضغط للتسجيل', 'A session is open now — tap to check in')}</p>
          ${openSessions.map(sess => {
            const mineRec = sess.records && sess.records[me];
            const done = mineRec && (mineRec.status === 'present' || mineRec.status === 'late');
            return `<button class="btn ${done ? 'ghost' : 'primary'} lg block checkin-now-btn" data-session="${sess.id}" style="margin:.4rem auto;max-width:340px" ${done ? 'disabled' : ''}>${done ? '✅ ' + t('alreadyCheckedIn') : '✅ ' + t('checkInNow')}</button>`;
          }).join('')}` : `
          <p class="muted">${TR('لا توجد جلسة مفتوحة حالياً. اطلب من معلمك فتح الجلسة.', 'No open session right now. Ask your teacher to open one.')}</p>
          <div class="qr-box" style="max-width:380px;margin:1rem auto">
            <div class="small muted">${t('sessionCode')}</div>
            <div style="display:flex;gap:.4rem"><input class="input" id="manualCode" dir="ltr" inputmode="numeric" maxlength="6" placeholder="000000" style="text-align:center;letter-spacing:4px;font-weight:800"><button class="btn primary" id="manualCodeBtn">${t('checkInNow')}</button></div>
          </div>`}
        <div id="checkinResult"></div>
      </div>`;

    const showResult = (ok, msg) => {
      $('#checkinResult', root).innerHTML = `<div style="margin-top:.8rem;padding:.7rem;border-radius:12px;background:${ok ? '#e8f9ee' : '#fdeaea'};color:${ok ? '#15803d' : '#b91c1c'};font-weight:700">${escapeHtml(msg)}</div>`;
      if (ok) StudentPages.checkin(root);
    };

    if (pending && pending.id) {
      sessionRemove('amamb_pending_checkin');
      const sess = openSessions.find(s => s.id === pending.id) || (await API.select('attendance', 'select=*&id=eq.' + encodeURIComponent(pending.id)))[0];
      if (sess && sess.is_open) {
        const res = await doCheckin(sess, pending.code);
        showResult(res.ok, res.ok ? t('attendanceMarked') : (res.reason === 'already' ? t('alreadyCheckedIn') : TR('الرمز غير صحيح', 'Wrong code')));
      } else {
        showResult(false, TR('الجلسة مغلقة أو غير موجودة', 'Session is closed or does not exist'));
      }
      return;
    }

    $$('.checkin-now-btn', root).forEach(b => b.addEventListener('click', async () => {
      const sess = openSessions.find(s => s.id === b.dataset.session);
      if (!sess) return;
      const res = await doCheckin(sess, null);
      showResult(res.ok, res.ok ? t('attendanceMarked') : t('alreadyCheckedIn'));
    }));
    const manualBtn = $('#manualCodeBtn', root);
    if (manualBtn) manualBtn.addEventListener('click', async () => {
      const code = $('#manualCode', root).value.trim();
      if (code.length !== 6) return toast(t('required'), 'error');
      const fresh = await API.select('attendance', 'select=*&section_id=eq.' + ctx.student.section_id + '&is_open=eq.true&code=eq.' + code);
      if (fresh && fresh.length) { const res = await doCheckin(fresh[0], code); showResult(res.ok, res.ok ? t('attendanceMarked') : t('alreadyCheckedIn')); }
      else showResult(false, TR('لا توجد جلسة بهذا الرمز', 'No session with this code'));
    });
  },

  /* ========== 9) My behavior notes ========== */
  async behavior(root) {
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const ctx = await StudentCtx.load();
    if (!ctx.student) return this.noLinkedStudent(root);
    const mine = ctx.data.behavior.filter(n => n.student_id === ctx.student.id);
    root.innerHTML = `<div class="card"><div class="card-head"><div class="card-title">🧭 ${t('navMyBehavior')}</div></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('date')}</th><th>${t('type')}</th><th>${t('notes')}</th></tr></thead>
      <tbody>${mine.map(n => `<tr><td>${fmtDate(n.date)}</td><td>${n.type === 'positive' ? '<span class="pill green">😊 ' + t('positive') + '</span>' : n.type === 'negative' ? '<span class="pill red">🙁 ' + t('negative') + '</span>' : '<span class="pill amber">🎒 ' + t('supplies') + '</span>'}</td><td>${escapeHtml(n.text || '')}</td></tr>`).join('') || `<tr><td colspan="3" class="muted text-center">${t('noData')}</td></tr>`}</tbody></table></div></div>`;
  }
};
