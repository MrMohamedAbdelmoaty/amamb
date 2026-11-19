/* ============================================================
   AMAMB — Scoring engine (100-point AMAMB standard)

   Academic /90:  Final exam 40 · Periodic tests 25 · Quick checks 15 · Homework 10
   Non-academic /10: Attendance 4 · Behavior 3 · Participation 3

   Percentage is renormalized over the components that have data,
   so a class early in the term is graded fairly on what exists.
   Once an item has ANY recorded score, an unscored student counts
   as zero for it. Excused absences are excluded from attendance.

   Letter grades (AMAMB scale):
   A+ ≥93 · A ≥87 · B+ ≥80 · B ≥73 · C+ ≥67 · C ≥60 · D ≥50 · F <50
   ============================================================ */

const Scoring = {
  MAX: { final: 40, periodic: 25, quickCheck: 15, homework: 10,
         attendance: 4, behavior: 3, participation: 3 },
  LETTER: [ [93, 'A+'], [87, 'A'], [80, 'B+'], [73, 'B'], [67, 'C+'], [60, 'C'], [50, 'D'], [0, 'F'] ],

  hasAny(obj) { return !!obj && Object.values(obj).some(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v))); },
  num(obj, id) {
    if (!obj) return null;
    const v = obj[id];
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  },

  /* Mean ratio 0..1 per component; null when the component has no graded items. */
  itemRatio(items, getMax, studentId) {
    const graded = items.filter(it => this.hasAny(it.scores));
    if (!graded.length) return null;
    let sum = 0;
    for (const it of graded) {
      const max = Number(getMax(it)) || 1;
      const v = this.num(it.scores, studentId);
      sum += Math.max(0, Math.min(1, (v === null ? 0 : v) / max));
    }
    return sum / graded.length;
  },

  homeworkRatio(homeworkItems, studentId) {
    if (!homeworkItems.length) return null;
    let sum = 0;
    for (const hw of homeworkItems) {
      const v = hw.status ? hw.status[studentId] : null;
      sum += (v === 'submitted' || v === 'late') ? 1 : 0;
    }
    return sum / homeworkItems.length;
  },

  attendanceStats(sessions, studentId) {
    let weight = 0, count = 0, partSum = 0, partCount = 0;
    for (const s of sessions) {
      const rec = s.records ? s.records[studentId] : null;
      if (!rec || !rec.status) continue;
      const st = rec.status;
      if (st === 'excused') continue; // excluded from the denominator
      count++;
      weight += st === 'present' ? 1 : st === 'late' ? 0.75 : 0;
      const p = Number(rec.participation);
      if (!isNaN(p) && p >= 1 && p <= 5) { partSum += p; partCount++; }
    }
    return {
      rate: count ? weight / count : null,
      sessions: count,
      participationAvg: partCount ? partSum / partCount : null
    };
  },

  behaviorStats(notes, studentId) {
    let pos = 0, neg = 0, sup = 0;
    for (const n of notes) {
      if (n.student_id !== studentId) continue;
      if (n.type === 'positive') pos++;
      else if (n.type === 'negative') neg++;
      else if (n.type === 'supplies') sup++;
    }
    // AMAMB behavior scale: start at 3, reward positives, penalize incidents
    const raw = 3 + 0.3 * pos - 0.6 * neg - 0.3 * sup;
    return { points: Math.max(0, Math.min(3, Math.round(raw * 10) / 10)), pos, neg, sup };
  },

  /* Full metrics for one student.
     data = { exitTickets, quizzes, homework, attendance, behavior }  (keys kept for DB compatibility) */
  compute(studentId, data) {
    const quickChecks = data.exitTickets || [], periodic = data.quizzes || [],
          homework = data.homework || [], sessions = data.attendance || [],
          notes = data.behavior || [];

    const finals = periodic.filter(q => q.kind === 'final');
    const periodics = periodic.filter(q => q.kind !== 'final');

    const rFinal = this.itemRatio(finals, it => it.max || 40, studentId);
    const rPeriodic = this.itemRatio(periodics, it => it.max || 20, studentId);
    const rCheck = this.itemRatio(quickChecks, it => it.max || 10, studentId);
    const rHw = this.homeworkRatio(homework, studentId);

    // Component points (only graded components count toward the maximum)
    const parts = [];
    if (rFinal !== null) parts.push(['final', rFinal, this.MAX.final]);
    if (rPeriodic !== null) parts.push(['quiz', rPeriodic, this.MAX.periodic]);
    if (rCheck !== null) parts.push(['exit', rCheck, this.MAX.quickCheck]);
    if (rHw !== null) parts.push(['homework', rHw, this.MAX.homework]);
    let academicPoints = 0, academicMax = 0;
    for (const [, r, max] of parts) { academicPoints += r * max; academicMax += max; }
    academicPoints = Math.round(academicPoints * 10) / 10;

    // Non-academic
    const att = this.attendanceStats(sessions, studentId);
    const beh = this.behaviorStats(notes, studentId);
    const attendancePoints = att.rate === null ? null : Math.round(att.rate * this.MAX.attendance * 10) / 10;
    const participationPoints = att.participationAvg === null
      ? (att.rate === null ? null : Math.round((this.MAX.participation / 2) * 10) / 10)
      : Math.round(((att.participationAvg - 1) / 4) * this.MAX.participation * 10) / 10;

    const earned = academicPoints + (participationPoints || 0) + beh.points + (attendancePoints || 0);
    const hasBehaviorNotes = (beh.pos + beh.neg + beh.sup) > 0;
    const available = academicMax + this.MAX.behavior
      + (attendancePoints !== null ? this.MAX.attendance : 0)
      + (participationPoints !== null ? this.MAX.participation : 0);
    // No signal at all (nothing graded, no sessions, no notes) -> no grade yet
    const hasAnyData = academicMax > 0 || att.rate !== null || hasBehaviorNotes;
    const overallPct = (hasAnyData && available > 0) ? Math.round((earned / available) * 1000) / 10 : null;
    const totalPoints = overallPct === null ? 0 : Math.round(overallPct);

    return {
      overallPct,
      ratios: { final: rFinal, quiz: rPeriodic, exit: rCheck, homework: rHw },
      academicPoints,
      academicMax,
      behaviorPoints: beh.points,
      behaviorCounts: { pos: beh.pos, neg: beh.neg, sup: beh.sup },
      attendancePoints: attendancePoints === null ? 0 : attendancePoints,
      attendanceRate: att.rate,
      attendanceSessions: att.sessions,
      participationPoints: participationPoints === null ? 0 : participationPoints,
      participationAvg: att.participationAvg === null ? null : Math.round(att.participationAvg * 100) / 100,
      totalPoints,
      grade: overallPct === null ? '—' : this.letterGrade(overallPct)
    };
  },

  letterGrade(pct) {
    for (const [min, letter] of this.LETTER) if (pct >= min) return letter;
    return 'F';
  },

  /* Metrics for the whole class, ranked by overall % (ties share rank). */
  computeClass(students, data) {
    const rows = students.map(s => ({ student: s, m: this.compute(s.id, data) }));
    rows.sort((a, b) => (b.m.overallPct ?? -1) - (a.m.overallPct ?? -1) || b.m.totalPoints - a.m.totalPoints);
    let rank = 0, prev = null, shown = 0;
    for (const r of rows) {
      shown++;
      const key = r.m.overallPct === null ? 'null' : String(Math.round(r.m.overallPct * 10));
      if (prev === null || key !== prev) { rank = shown; prev = key; }
      r.rank = rank;
    }
    return rows;
  }
};
