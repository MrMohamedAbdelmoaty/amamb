/* ============================================================
   AMAMB — Teacher tracking: pass-rate per assessment item,
   weak-point analysis, attendance statistics (all live from DB)
   ============================================================ */
const TrackingPages = {
  ar() { return getLang() === 'ar'; },
  PASS: 0.6, // 60% pass threshold

  async passRate(root) {
    const sectionId = App.currentSectionId();
    if (!sectionId) { root.innerHTML = `<div class="card">${t('selectSection')}</div>`; return; }
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    const data = await Data.sectionData(sectionId);
    const students = data.students || [];
    const items = []
      .concat((data.exitTickets || []).map(x => ({ kind: 'quickCheck', title: x.title, date: x.date, max: Number(x.max) || 10, scores: x.scores || {} })))
      .concat((data.quizzes || []).map(x => ({ kind: x.kind || 'quiz', title: x.title, date: x.date, max: Number(x.max) || 20, scores: x.scores || {} })));

    const rows = items.map(it => {
      const vals = students.map(s => it.scores[s.id]).filter(v => v !== undefined && v !== null && v !== '');
      const n = vals.length;
      const avgVal = n ? avg(vals) : 0;
      const passN = vals.filter(v => (Number(v) / it.max) >= this.PASS).length;
      const passRate = n ? (passN / n) * 100 : 0;
      return { ...it, n, avg: avgVal, avgPct: n ? (avgVal / it.max) * 100 : 0, passN, passRate };
    });

    // Weak points: students under 60% average across all items
    const studentStats = students.map(s => {
      const pcts = items.map(it => {
        const v = it.scores[s.id];
        return v === undefined || v === null || v === '' ? null : (Number(v) / it.max) * 100;
      }).filter(v => v !== null);
      return { student: s, avgPct: pcts.length ? avg(pcts) : null, n: pcts.length };
    });
    const weakStudents = studentStats.filter(x => x.avgPct !== null && x.avgPct < 60).sort((a, b) => a.avgPct - b.avgPct);
    const weakestItems = rows.slice().sort((a, b) => a.passRate - b.passRate).slice(0, 5);
    const overallAvg = rows.length ? avg(rows.map(r => r.avgPct)) : 0;
    const overallPass = rows.length ? avg(rows.map(r => r.passRate)) : 0;

    // Attendance stats
    const att = data.attendance || [];
    const attStats = students.map(s => {
      const c = { present: 0, late: 0, absent: 0, excused: 0 };
      att.forEach(session => {
        const rec = (session.records || {})[s.id];
        if (rec && rec.status && c[rec.status] !== undefined) c[rec.status]++;
      });
      const total = c.present + c.late + c.absent + c.excused;
      const rate = total ? ((c.present + c.late) / total) * 100 : null; // late counts toward attendance
      return { student: s, ...c, total, rate };
    });
    const sectionAttRate = (() => {
      const tot = attStats.reduce((a, s) => a + s.total, 0);
      const good = attStats.reduce((a, s) => a + s.present + s.late, 0);
      return tot ? (good / tot) * 100 : 0;
    })();

    root.innerHTML = `
      <div class="grid cols-4" style="margin-bottom:1rem">
        <div class="stat-card"><div class="stat-label">🧮 ${this.ar() ? 'متوسط أداء الفصل' : 'Class average'}</div><div class="stat-value" dir="ltr">${pct1(overallAvg)}%</div></div>
        <div class="stat-card green"><div class="stat-label">✅ ${this.ar() ? 'نسبة النجاح العامة' : 'Overall pass rate'}</div><div class="stat-value" dir="ltr">${pct1(overallPass)}%</div></div>
        <div class="stat-card ${weakStudents.length ? 'red' : 'green'}"><div class="stat-label">🆘 ${this.ar() ? 'طلاب دون ٦٠٪' : 'Students < 60%'}</div><div class="stat-value">${weakStudents.length}</div></div>
        <div class="stat-card teal"><div class="stat-label">📅 ${this.ar() ? 'متوسط الحضور' : 'Attendance rate'}</div><div class="stat-value" dir="ltr">${pct1(sectionAttRate)}%</div></div>
      </div>

      <div class="grid cols-2" style="align-items:start">
        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">📊 ${this.ar() ? 'نسبة النجاح لكل عنصر تقييم' : 'Pass rate per assessment item'}</div></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${this.ar() ? 'عنصر التقييم' : 'Item'}</th><th>${t('date')}</th><th>${this.ar() ? 'صُحِّح' : 'Graded'}</th><th>${this.ar() ? 'المتوسط' : 'Avg'}</th><th>${this.ar() ? 'نسبة النجاح ≥٦٠٪' : 'Pass rate ≥60%'}</th><th></th></tr></thead>
            <tbody>${rows.map(r => `<tr>
              <td><b>${escapeHtml(r.title || '—')}</b><div class="small muted">${escapeHtml(r.kind)}</div></td>
              <td class="small">${fmtDate(r.date)}</td>
              <td>${r.n}</td>
              <td dir="ltr">${pct1(r.avgPct)}%</td>
              <td dir="ltr"><b style="color:${r.passRate >= 60 ? '#16a34a' : '#dc2626'}">${pct1(r.passRate)}%</b> (${r.passN}/${r.n})</td>
              <td><div style="height:8px;width:120px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.min(100, r.passRate)}%;background:${r.passRate >= 60 ? '#16a34a' : '#dc2626'}"></div></div></td>
            </tr>`).join('') || `<tr><td colspan="6" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
          ${rows.length ? '<div class="chart-box sm" style="margin-top:.8rem"><canvas id="passRateChart"></canvas></div>' : ''}
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title">🆘 ${this.ar() ? 'نقاط الضعف — طلاب يحتاجون دعماً' : 'Weak points — students needing support'}</div></div>
          ${weakStudents.length ? `<div style="display:flex;flex-direction:column;gap:.4rem">${weakStudents.map(w => `
            <div style="display:flex;gap:.6rem;align-items:center;padding:.4rem .5rem;border:1px solid rgba(0,0,0,.12);border-radius:8px">
              <span class="avatar" style="width:34px;height:34px;font-size:.75rem;border-radius:9px">${escapeHtml(initials(w.student.name))}</span>
              <span style="flex:1"><b>${escapeHtml(w.student.name)}</b><div class="small muted">${w.n} ${this.ar() ? 'عنصر' : 'items'}</div></span>
              <span class="pill red" dir="ltr">${pct1(w.avgPct)}%</span>
            </div>`).join('')}</div>
            <p class="small muted" style="margin-top:.5rem">💡 ${this.ar() ? 'راجع صفحة «خطط التدخل والإثراء» لإنشاء خطة مخصصة لكل طالب.' : 'See “Intervention & Enrichment Plans” for per-student actions.'}</p>` : `<div class="text-center muted" style="padding:1.2rem">✅ ${this.ar() ? 'لا يوجد طلاب تحت ٦٠٪ حالياً' : 'No students below 60% right now'}</div>`}
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title">🎯 ${this.ar() ? 'أضعف عناصر التقييم (الأكثر تعثراً)' : 'Weakest assessment items'}</div></div>
          ${weakestItems.length ? `<div style="display:flex;flex-direction:column;gap:.4rem">${weakestItems.map(wItem => `
            <div style="display:flex;gap:.6rem;align-items:center;padding:.4rem .5rem;border:1px solid rgba(0,0,0,.12);border-radius:8px">
              <span style="flex:1"><b>${escapeHtml(wItem.title || '—')}</b><div class="small muted">${escapeHtml(wItem.kind)} · ${fmtDate(wItem.date)}</div></span>
              <span class="pill ${wItem.passRate >= 60 ? 'green' : 'red'}" dir="ltr">${pct1(wItem.passRate)}%</span>
            </div>`).join('')}</div>` : emptyState()}
        </div>

        <div class="card" style="grid-column:span 2">
          <div class="card-head"><div class="card-title">📅 ${this.ar() ? 'إحصائيات الحضور لكل طالب' : 'Attendance per student'}</div></div>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th>${t('student')}</th><th>${t('present')}</th><th>${t('late')}</th><th>${t('absent')}</th><th>${t('excused')}</th><th>${this.ar() ? 'نسبة الحضور' : 'Rate'}</th></tr></thead>
            <tbody>${attStats.map(s => `<tr>
              <td><b>${escapeHtml(s.student.name)}</b></td>
              <td dir="ltr">${s.present}</td><td dir="ltr">${s.late}</td><td dir="ltr">${s.absent}</td><td dir="ltr">${s.excused}</td>
              <td dir="ltr">${s.rate === null ? '—' : `<b style="color:${s.rate >= 80 ? '#16a34a' : s.rate >= 60 ? '#d97706' : '#dc2626'}">${pct1(s.rate)}%</b>`}</td>
            </tr>`).join('') || `<tr><td colspan="6" class="muted text-center">${t('noData')}</td></tr>`}</tbody>
          </table></div>
        </div>
      </div>`;

    if (rows.length && typeof window.renderChart === 'function') {
      renderChart('passRateChart', {
        type: 'bar',
        data: {
          labels: rows.map(r => (r.title || '').slice(0, 24)),
          datasets: [{ label: this.ar() ? 'نسبة النجاح %' : 'Pass rate %', data: rows.map(r => Math.round(r.passRate)), backgroundColor: rows.map(r => r.passRate >= 60 ? '#16a34a' : '#dc2626') }]
        },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
      });
    }
  }
};
