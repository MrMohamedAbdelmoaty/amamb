/* ============================================================
   AMAMB — App shell: auth, routing, navigation
   ============================================================ */

/* Chart registry — destroy before re-render to avoid canvas reuse errors */
window.CHARTS = {};
window.renderChart = function (id, config) {
  try {
    if (window.CHARTS[id]) { window.CHARTS[id].destroy(); delete window.CHARTS[id]; }
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === 'undefined') return;
    window.CHARTS[id] = new Chart(canvas.getContext('2d'), config);
  } catch (e) { console.warn('chart error', e); }
};
function destroyCharts() {
  Object.keys(window.CHARTS).forEach(k => { try { window.CHARTS[k].destroy(); } catch (e) {} delete window.CHARTS[k]; });
}

const App = {
  state: { user: null, page: 'dashboard', sectionId: null },

  user() { return this.state.user; },
  currentSectionId() { return this.state.sectionId; },
  setCurrentSectionId(id) { this.state.sectionId = id || null; },

  /* ---------- navigation model ---------- */
  navItems(role) {
    const I = (id, icon, key, sec, fn) => ({ id, icon, label: t(key), sec, fn });
    if (role === 'admin') return [
      I('dashboard', '📊', 'navDashboard', 'secOverview', r => AdminPages.dashboard(r)),
      I('schools', '🏫', 'navSchools', 'secManage', r => AdminPages.schools(r)),
      I('teachers', '🧑‍🏫', 'navTeachers', 'secManage', r => AdminPages.teachers(r)),
      I('students', '🎒', 'navStudents', 'secManage', r => AdminPages.students(r)),
      I('subscriptions', '💳', 'navSubscriptions', 'secManage', r => AdminPages.subscriptions(r))
    ];
    if (role === 'teacher') return [
      I('dashboard', '📊', 'navDashboard', 'secOverview', r => TeacherPages.dashboard(r)),
      I('roster', '🎒', 'navStudents', 'secTeach', r => TeacherPages.roster(r)),
      I('gradebook', '📒', 'navGradebook', 'secTeach', r => TeacherPages.gradebook(r)),
      I('homework', '📚', 'navHomework', 'secTeach', r => TeacherPages.gradebook(r, 2)),
      I('attendance', '📱', 'navAttendance', 'secTeach', r => TeacherPages.attendance(r)),
      I('behavior', '🧭', 'navBehavior', 'secTeach', r => TeacherPages.behavior(r)),
      I('leaderboard', '🏆', 'navLeaderboard', 'secTeach', r => TeacherPages.leaderboard(r)),
      I('reports', '📄', 'navReports', 'secTeach', r => TeacherPages.reports(r)),
      I('analysis', '📈', 'navAnalysis', 'secTeach', r => TeacherPages.analysis(r)),
      I('plans', '📋', 'navPlans', 'secTeach', r => TeacherPages.plans(r)),
      I('certificates', '🎓', 'navCertificates', 'secTeach', r => TeacherPages.certificates(r)),
      I('schedule', '🗓️', 'navSchedule', 'secTeach', r => TeacherPages.schedule(r)),
      I('export', '📥', 'navExport', 'secTeach', r => TeacherPages.exportPage(r))
    ];
    // student
    return [
      I('dashboard', '📊', 'navDashboard', 'secMe', r => StudentPages.dashboard(r)),
      I('myGrades', '📒', 'navMyGrades', 'secMe', r => StudentPages.grades(r)),
      I('myHomework', '📚', 'navMyHomework', 'secMe', r => StudentPages.homework(r)),
      I('myAttendance', '🗓️', 'navMyAttendance', 'secMe', r => StudentPages.attendance(r)),
      I('rank', '🏆', 'navMyRank', 'secMe', r => StudentPages.rank(r)),
      I('myReport', '📄', 'navMyReport', 'secMe', r => StudentPages.report(r)),
      I('timetable', '📅', 'navTimetable', 'secMe', r => StudentPages.timetable(r)),
      I('checkin', '📲', 'navCheckin', 'secMe', r => StudentPages.checkin(r)),
      I('myBehavior', '🧭', 'navMyBehavior', 'secMe', r => StudentPages.behavior(r))
    ];
  },

  /* ---------- boot ---------- */
  async init() {
    applyLangToDocument();

    // Stash QR check-in params from URL for post-login processing
    try {
      const params = new URLSearchParams(location.search);
      const cid = params.get('checkin');
      if (cid) sessionSet('amamb_pending_checkin', JSON.stringify({ id: cid, code: params.get('code') || '' }));
      if (cid) history.replaceState(null, '', location.pathname);
    } catch (e) { /* non-fatal */ }

    // Wire static chrome
    $('#langToggle').addEventListener('click', toggleLang);
    $('#langToggleLogin').addEventListener('click', toggleLang);
    $('#logoutBtn').addEventListener('click', () => this.logout());
    $('#sidebarToggle').addEventListener('click', () => { $('#sidebar').classList.toggle('open'); $('#sidebarOverlay').classList.toggle('show'); });
    $('#sidebarOverlay').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#sidebarOverlay').classList.remove('show'); });
    $('#sectionPicker').addEventListener('change', e => { this.setCurrentSectionId(e.target.value); this.renderCurrent(); });
    $('#checkinContinue').addEventListener('click', () => {
      $('#checkinView').classList.add('hidden');
      if (this.state.user) { $('#appView').classList.remove('hidden'); this.go(this.state.user.role === 'student' ? 'checkin' : 'dashboard'); }
      else $('#loginView').classList.remove('hidden');
    });

    // Login form
    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const email = $('#loginEmail').value.trim(), pass = $('#loginPassword').value;
      const btn = $('#loginBtn');
      btn.disabled = true; $('#loginError').classList.add('hidden');
      try { await this.doLogin(email, pass); } finally { btn.disabled = false; }
    });
    $$('.demo-chip').forEach(chip => chip.addEventListener('click', () => {
      $('#loginEmail').value = chip.dataset.email;
      $('#loginPassword').value = chip.dataset.pass;
    }));

    const saved = Session.get();
    if (saved) { this.state.user = saved; await this.showApp(); await this.processPendingCheckin(); }
    else { this.showLogin(); }
  },

  async doLogin(email, password) {
    const errEl = $('#loginError');
    try {
      const user = await API.login(email, password);
      Session.set(user); this.state.user = user;
      $('#loginView').classList.add('hidden');
      $('#appView').classList.remove('hidden');
      await this.showApp();
      await this.processPendingCheckin();
    } catch (e) {
      const code = (e && e.message) || '';
      errEl.textContent = code === 'INVALID_CREDENTIALS' ? t('invalidCredentials') : code === 'SCHOOL_SUSPENDED' ? t('schoolSuspended') : t('dbError');
      errEl.classList.remove('hidden');
    }
  },

  logout() {
    Session.clear();
    this.state.user = null; this.state.sectionId = null; this.state.page = 'dashboard';
    destroyCharts();
    $('#appView').classList.add('hidden');
    $('#loginView').classList.remove('hidden');
    $('#loginPassword').value = '';
  },

  showLogin() { $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden'); },

  async showApp() {
    const user = this.state.user;
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    // Sidebar identity
    $('#userName').textContent = user.name;
    $('#userRole').textContent = user.role === 'admin' ? TR_ADMIN() : user.role === 'teacher' ? (getLang() === 'ar' ? 'معلم' : 'Teacher') : (getLang() === 'ar' ? 'طالب' : 'Student');
    $('#userAvatar').textContent = initials(user.name);
    // School label
    let schoolName = user.school_name || '';
    if (!schoolName && user.school_id) {
      try { const s = await API.select('schools', 'select=name&id=eq.' + user.school_id); schoolName = s && s[0] ? s[0].name : ''; user.school_name = schoolName; Session.set(user); } catch (e) {}
    }
    $('#sideSchoolName').textContent = schoolName || (user.role === 'admin' ? 'AMAMB Platform' : '—');
    // Section picker (teachers only)
    const picker = $('#sectionPicker');
    if (user.role === 'teacher') { await this.refreshTopbar(); picker.classList.remove('hidden'); }
    else picker.classList.add('hidden');
    this.renderNav();
    this.go('dashboard');
  },

  async refreshTopbar() {
    const user = this.state.user; if (!user) return;
    try {
      const sections = await Data.mySections(user);
      const picker = $('#sectionPicker');
      picker.innerHTML = (sections || []).map(s => `<option value="${escapeHtml(s.id)}" ${s.id === this.state.sectionId ? 'selected' : ''}>${escapeHtml((s.grade || '') + ' ' + (s.name || ''))}</option>`).join('');
      if (!this.state.sectionId && sections && sections.length) this.setCurrentSectionId(sections[0].id);
      if (sections && sections.length && !picker.value) picker.value = this.state.sectionId;
    } catch (e) { console.warn('section picker failed', e); }
  },

  renderNav() {
    const user = this.state.user; if (!user) return;
    const items = this.navItems(user.role);
    const nav = $('#navMenu');
    let html = '', lastSec = null;
    for (const item of items) {
      if (item.sec !== lastSec) { html += `<div class="nav-section">${escapeHtml(t(item.sec))}</div>`; lastSec = item.sec; }
      html += `<button class="nav-item ${item.id === this.state.page ? 'active' : ''}" data-page="${item.id}"><span class="nav-ico">${item.icon}</span><span>${escapeHtml(item.label)}</span></button>`;
    }
    nav.innerHTML = html;
    $$('.nav-item', nav).forEach(btn => btn.addEventListener('click', () => {
      this.go(btn.dataset.page);
      $('#sidebar').classList.remove('open'); $('#sidebarOverlay').classList.remove('show');
    }));
  },

  async go(page) {
    const user = this.state.user; if (!user) return;
    const items = this.navItems(user.role);
    const item = items.find(i => i.id === page) || items[0];
    this.state.page = item.id;
    destroyCharts();
    clearInterval(window.__attPoll);
    $('#pageTitle').textContent = item.label;
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === item.id));
    const root = $('#page');
    root.innerHTML = `<div class="card">${t('loading')}</div>`;
    try { await item.fn(root); }
    catch (e) {
      console.error(e);
      root.innerHTML = `<div class="card text-center" style="padding:2rem"><div style="font-size:2rem">⚠️</div><p>${t('dbError')}</p><button class="btn primary" id="retryPageBtn">${t('refresh')}</button></div>`;
      const btn = $('#retryPageBtn'); if (btn) btn.addEventListener('click', () => this.renderCurrent());
    }
  },

  renderCurrent() { this.go(this.state.page); },

  onLangChange() {
    applyLangToDocument();
    if (!this.state.user) return;
    // Re-render chrome texts that were set dynamically
    const user = this.state.user;
    $('#userRole').textContent = user.role === 'admin' ? TR_ADMIN() : user.role === 'teacher' ? (getLang() === 'ar' ? 'معلم' : 'Teacher') : (getLang() === 'ar' ? 'طالب' : 'Student');
    this.refreshTopbar();
    this.renderNav();
    this.go(this.state.page);
  },

  /* ---------- QR auto check-in (runs after login when URL had ?checkin=) ---------- */
  async processPendingCheckin() {
    let pending = null;
    try { pending = JSON.parse(sessionGet('amamb_pending_checkin') || 'null'); } catch (e) { pending = null; }
    if (!pending || !pending.id) return;
    const user = this.state.user;
    if (!user) return; // stays stashed for after login
    if (user.role !== 'student') { sessionRemove('amamb_pending_checkin'); return; }
    // Delegate to the student page which performs and displays the check-in
    sessionSet('amamb_pending_checkin', JSON.stringify(pending));
    await this.go('checkin');
  }
};

function TR_ADMIN() { return getLang() === 'ar' ? 'مدير المنصة' : 'Platform Admin'; }

document.addEventListener('DOMContentLoaded', () => { App.init(); });
