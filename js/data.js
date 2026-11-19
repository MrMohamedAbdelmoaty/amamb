/* AMAMB — shared data access layer */
const Data = {
  /* Teacher: my sections (school-isolated). */
  async mySections(user) {
    if (user.role === 'admin') {
      // Admins can inspect any section (school filter optional via App.state.schoolFilter)
      return API.select('sections', 'select=*,schools(name)&order=created_at');
    }
    return API.select('sections', 'select=*,schools(name)&teacher_id=eq.' + user.id + '&order=grade,name');
  },

  /* All data for one section, fetched in parallel. */
  async sectionData(sectionId) {
    const enc = encodeURIComponent(sectionId);
    const [students, exitTickets, quizzes, homework, attendance, behavior, scheduleList] = await Promise.all([
      API.select('students', 'select=*&section_id=eq.' + enc + '&order=name'),
      API.select('exit_tickets', 'select=*&section_id=eq.' + enc + '&order=date'),
      API.select('quizzes', 'select=*&section_id=eq.' + enc + '&order=date'),
      API.select('homework', 'select=*&section_id=eq.' + enc + '&order=due_date'),
      API.select('attendance', 'select=*&section_id=eq.' + enc + '&order=date'),
      API.select('behavior', 'select=*&section_id=eq.' + enc + '&order=date.desc'),
      API.select('schedule', 'select=*&section_id=eq.' + enc + '&order=day_of_week,period')
    ]);
    return {
      students: students || [], exitTickets: exitTickets || [], quizzes: quizzes || [],
      homework: homework || [], attendance: attendance || [], behavior: behavior || [],
      schedule: scheduleList || []
    };
  },

  /* Student: my roster row + section + all section data. */
  async myStudentData(user) {
    const rows = await API.select('students', 'select=*&user_id=eq.' + user.id);
    if (!rows || !rows.length) return { student: null, section: null, data: null };
    const student = rows[0];
    const sections = await API.select('sections', 'select=*,schools(name)&id=eq.' + student.section_id);
    const section = sections && sections.length ? sections[0] : null;
    const data = await this.sectionData(student.section_id);
    return { student, section, data };
  },

  /* Admin overview stats */
  async platformStats() {
    const [schools, profiles, students] = await Promise.all([
      API.select('schools', 'select=id,name,code,plan,subscription_status,created_at'),
      API.select('profiles', 'select=id,role,school_id'),
      API.select('students', 'select=id,school_id')
    ]);
    return { schools: schools || [], profiles: profiles || [], students: students || [] };
  }
};
