/* ============================================================
   AMAMB — Auto-grader for exam question types
   Types: mcq · multi · tf · fill · short · order · match · essay
   Essay is manual (score = null until reviewed).
   All-or-nothing per question (deterministic, documented).
   ============================================================ */
const Grader = {
  norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[\u064b-\u0652\u0670]/g, '')   // Arabic diacritics
      .replace(/\u0640/g, '')                  // tatweel
      .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ').trim();
  },
  /* response shape depends on type (see questions table):
     mcq → index · tf → boolean · multi → [indices]
     fill/short → string · order → [rank per step] · match → [chosen pair-index per a] · essay → string */
  grade(q, response) {
    const ans = q.answer || {};
    const pts = Number(q.points);
    const p = isNaN(pts) ? 1 : pts;
    const ok = pass => ({ auto: true, correct: !!pass, score: pass ? p : 0 });
    switch (q.type) {
      case 'mcq':
        return ok(Number(response) === Number(ans.correct));
      case 'tf': {
        const resp = response === true || response === 'true';
        return ok(resp === (ans.correct === true || ans.correct === 'true'));
      }
      case 'multi': {
        const corr = (ans.correct || []).map(Number).sort((a, b) => a - b);
        const resp = (Array.isArray(response) ? response : []).map(Number).sort((a, b) => a - b);
        return ok(corr.length > 0 && corr.length === resp.length && corr.every((v, i) => v === resp[i]));
      }
      case 'fill':
      case 'short': {
        const accept = (ans.accept || []).map(a => Grader.norm(a)).filter(Boolean);
        const got = Grader.norm(response);
        return ok(accept.length > 0 && accept.includes(got));
      }
      case 'order': {
        const steps = (q.options && q.options.steps) || [];
        const resp = Array.isArray(response) ? response.map(Number) : [];
        return ok(steps.length > 0 && steps.every((_, i) => resp[i] === i));
      }
      case 'match': {
        const pairs = (q.options && q.options.pairs) || [];
        const resp = Array.isArray(response) ? response.map(Number) : [];
        return ok(pairs.length > 0 && pairs.every((_, i) => resp[i] === i));
      }
      case 'essay':
        return { auto: false, correct: null, score: null };
      default:
        return { auto: false, correct: null, score: null };
    }
  },
  maxScore(questions) { return (questions || []).reduce((s, q) => s + (Number(q.points) || 1), 0); },
  autoScore(questions, answers) {
    let score = 0, pending = 0, max = 0;
    for (const q of questions || []) {
      max += Number(q.points) || 1;
      const r = this.grade(q, answers ? answers[q.id] : undefined);
      if (r.auto) score += r.score || 0; else pending += 1;
    }
    return { score, pending, max };
  }
};
