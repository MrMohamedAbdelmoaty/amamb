/* AMAMB — i18n (Arabic default, English toggle, full RTL/LTR) */

const I18N = {
  ar: {
    brandSub: 'منصة المعلم والتعلّم',
    welcome: 'أهلاً بك 👋',
    signinToContinue: 'سجّل دخولك للمتابعة',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    continue: 'متابعة',
    demoAccounts: 'حسابات تجريبية (اضغط للتعبئة)',
    invalidCredentials: 'البريد أو كلمة المرور غير صحيحة',
    schoolSuspended: 'هذه المدرسة موقوفة مؤقتاً — تواصل مع إدارة المنصة',
    dbError: 'تعذر الاتصال بقاعدة البيانات — تأكد من الإنترنت وحاول مجدداً',
    // nav sections
    secOverview: 'نظرة عامة', secManage: 'الإدارة', secTeach: 'التدريس', secMe: 'حسابي',
    // nav items — admin
    navDashboard: 'لوحة المعلومات', navSchools: 'المدارس', navTeachers: 'المعلمون', navStudents: 'الطلاب',
    navSubscriptions: 'الاشتراكات والحالة',
    // nav items — teacher
    navGradebook: 'دفتر الدرجات', navAttendance: 'الحضور (QR)', navBehavior: 'السلوك', navHomework: 'الواجبات',
    navLeaderboard: 'لوحة الصدارة', navReports: 'التقارير', navAnalysis: 'التحليل', navPlans: 'خطط التدخل والإثراء',
    navCertificates: 'الشهادات', navSchedule: 'الجدول الأسبوعي', navExport: 'تصدير Excel',
    // nav items — student
    navMyGrades: 'درجاتي', navMyAttendance: 'حضوري', navMyRank: 'ترتيبي', navMyHomework: 'واجباتي',
    navMyReport: 'تقريري', navTimetable: 'جدولي', navCheckin: 'تسجيل حضوري (QR)', navMyBehavior: 'ملاحظاتي السلوكية',
    // common
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة', close: 'إغلاق',
    confirm: 'تأكيد', search: 'بحث…', actions: 'إجراءات', name: 'الاسم', date: 'التاريخ',
    status: 'الحالة', type: 'النوع', notes: 'ملاحظات', loading: 'جارٍ التحميل…',
    saved: 'تم الحفظ ✅', deleted: 'تم الحذف', added: 'تمت الإضافة ✅', exported: 'تم التصدير ✅',
    required: 'هذا الحقل مطلوب', noData: 'لا توجد بيانات بعد',
    present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'غياب بعذر',
    positive: 'إيجابي', negative: 'سلبي', supplies: 'أدوات مدرسية',
    // dashboard
    totalStudents: 'إجمالي الطلاب', avgOverall: 'متوسط الأداء الكلي', avgAttendance: 'متوسط الحضور',
    pendingHw: 'واجبات غير مسلمة', totalPointsAvg: 'متوسط النقاط',
    topStudent: 'الطالب الأول', needsSupport: 'بحاجة لدعم', weeklyTrend: 'اتجاه الأداء (آخر النتائج)',
    gradeDist: 'توزيع التقديرات', classPerformance: 'أداء الفصل حسب المادة',
    // admin
    schoolName: 'اسم المدرسة', schoolCode: 'رمز المدرسة', plan: 'الخطة', subStatus: 'حالة الاشتراك',
    active: 'نشط', suspended: 'موقوف', trial: 'تجريبي', addSchool: 'إضافة مدرسة',
    editSchool: 'تعديل المدرسة', teachersCount: 'عدد المعلمين', studentsCount: 'عدد الطلاب',
    createTeacher: 'إنشاء حساب معلم', resetPassword: 'إعادة تعيين كلمة المرور',
    newPassword: 'كلمة المرور الجديدة', assignSchool: 'المدرسة', role: 'الدور', platformStats: 'إحصائيات المنصة',
    schools: 'المدارس', teachers: 'المعلمون', students: 'الطلاب', admins: 'المدراء',
    confirmDelete: 'هل أنت متأكد من الحذف؟ لا يمكن التراجع.',
    // gradebook
    exitTickets: 'بطاقات الفهم', quarterQuizzes: 'اختبارات دورية', quarterFinal: 'الاختبار الختامي',
    lesson: 'الدرس', maxScore: 'الدرجة العظمى', student: 'الطالب', newExitTicket: 'بطاقة فهم جديدة',
    newQuiz: 'اختبار جديد', kind: 'النوع', quarter: 'الفترة', q1: 'اختبار دوري ١', q2: 'اختبار دوري ٢', finalExam: 'الاختبار الختامي',
    saveScores: 'حفظ الدرجات', scoresSaved: 'تم حفظ الدرجات ✅', graded: 'تم التقييم', of: 'من',
    // attendance
    openSession: 'فتح جلسة حضور (QR)', closeSession: 'إغلاق الجلسة', sessionOpen: 'الجلسة مفتوحة',
    sessionClosed: 'الجلسة مغلقة', scanToCheckIn: 'امسح الرمز للحضور', shareLink: 'رابط المشاركة',
    sessionCode: 'رمز الجلسة', checkInNow: 'سجّل حضوري الآن', attendanceMarked: 'تم تسجيل حضورك ✅',
    alreadyCheckedIn: 'أنت مسجل بالفعل في هذه الجلسة', qrCheckin: 'الحضور عبر QR',
    manualMark: 'تسجيل يدوي', participation: 'المشاركة', dateFilter: 'التاريخ',
    // behavior
    addNote: 'إضافة ملاحظة', behaviorLog: 'سجل السلوك', noteText: 'نص الملاحظة',
    // homework
    hwTitle: 'عنوان الواجب', dueDate: 'تاريخ التسليم', submitted: 'مسلّم', missing: 'غير مسلّم',
    addHomework: 'واجب جديد',
    // reports
    studentReport: 'تقرير الطالب', classReport: 'تقرير الفصل', generateReport: 'إنشاء التقرير',
    sendWhatsapp: 'إرسال عبر واتساب', printSavePdf: 'طباعة / حفظ PDF', period: 'الفترة',
    weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربعي',
    academic: 'الأكاديمي', behaviorSummary: 'السلوك', attendanceSummary: 'الحضور', strengths: 'نقاط القوة',
    improvements: 'يحتاج تحسين', teacherComment: 'تعليق المعلم',
    // analysis
    analysisTitle: 'تحليل الأداء', itemAnalysis: 'تحليل حسب عنصر التقييم', distribution: 'التوزيع',
    item: 'العنصر', avg: 'المتوسط', highest: 'الأعلى', lowest: 'الأدنى', mastery: 'الإتقان',
    // plans
    interventionPlan: 'خطة تدخل علاجي', enrichmentPlan: 'خطة إثرائية',
    forStudents: 'للطلاب', criteria: 'المعيار', below60: 'أقل من ٦٠٪', above90: 'أكثر من ٩٠٪',
    suggestedActions: 'الإجراءات المقترحة', printPlan: 'طباعة الخطة',
    // certificates
    certTitle: 'شهادة تقدير', certBody: 'تُقدَّر وتُمنَح إلى', certReason: 'تقديراً لتميزه في',
    printCert: 'طباعة الشهادة', topOfClass: 'الأول على الفصل', perfectAttendance: 'حضور مثالي', mostImproved: 'الأكثر تحسناً',
    // schedule
    dayOfWeek: 'اليوم', periodCol: 'الحصة', subject: 'المادة', time: 'الوقت',
    sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس',
    // export
    exportExcel: 'تصدير Excel (XLSX)', exportDesc: 'تصدير دفتر الدرجات كاملاً (بطاقات الفهم + الاختبارات الدورية والختامي + الواجبات + الحضور + السلوك)',
    // misc
    section: 'الشعبة', selectSection: 'اختر الشعبة', school: 'المدرسة', allSchools: 'كل المدارس',
    plan_basic: 'أساسية', plan_pro: 'احترافية', plan_premium: 'مميزة',
    overall: 'الكلي', points: 'النقاط', rank: 'الترتيب',
    yes: 'نعم', no: 'لا', back: 'رجوع', refresh: 'تحديث', export: 'تصدير'
  },
  en: {
    brandSub: 'Teacher & Learning Platform',
    welcome: 'Welcome 👋',
    signinToContinue: 'Sign in to continue',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    continue: 'Continue',
    demoAccounts: 'Demo accounts (tap to fill)',
    invalidCredentials: 'Invalid email or password',
    schoolSuspended: 'This school is suspended — contact platform administration',
    dbError: 'Could not reach the database — check your connection and retry',
    secOverview: 'Overview', secManage: 'Management', secTeach: 'Teaching', secMe: 'My Account',
    navDashboard: 'Dashboard', navSchools: 'Schools', navTeachers: 'Teachers', navStudents: 'Students',
    navSubscriptions: 'Subscriptions & Status',
    navGradebook: 'Gradebook', navAttendance: 'Attendance (QR)', navBehavior: 'Behavior', navHomework: 'Homework',
    navLeaderboard: 'Standings', navReports: 'Reports', navAnalysis: 'Analysis', navPlans: 'Intervention & Enrichment',
    navCertificates: 'Certificates', navSchedule: 'Weekly Schedule', navExport: 'Export Excel',
    navMyGrades: 'My Grades', navMyAttendance: 'My Attendance', navMyRank: 'My Rank', navMyHomework: 'My Homework',
    navMyReport: 'My Report', navTimetable: 'My Timetable', navCheckin: 'QR Check-in', navMyBehavior: 'My Behavior Notes',
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', close: 'Close',
    confirm: 'Confirm', search: 'Search…', actions: 'Actions', name: 'Name', date: 'Date',
    status: 'Status', type: 'Type', notes: 'Notes', loading: 'Loading…',
    saved: 'Saved ✅', deleted: 'Deleted', added: 'Added ✅', exported: 'Exported ✅',
    required: 'This field is required', noData: 'No data yet',
    present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused',
    positive: 'Positive', negative: 'Negative', supplies: 'Supplies',
    totalStudents: 'Total Students', avgOverall: 'Avg Overall', avgAttendance: 'Avg Attendance',
    pendingHw: 'Pending Homework', totalPointsAvg: 'Avg Points',
    topStudent: 'Top Student', needsSupport: 'Needs Support', weeklyTrend: 'Performance Trend',
    gradeDist: 'Grade Distribution', classPerformance: 'Class Performance by Item',
    schoolName: 'School Name', schoolCode: 'School Code', plan: 'Plan', subStatus: 'Subscription',
    active: 'Active', suspended: 'Suspended', trial: 'Trial', addSchool: 'Add School',
    editSchool: 'Edit School', teachersCount: 'Teachers', studentsCount: 'Students',
    createTeacher: 'Create Teacher Account', resetPassword: 'Reset Password',
    newPassword: 'New password', assignSchool: 'School', role: 'Role', platformStats: 'Platform Statistics',
    schools: 'Schools', teachers: 'Teachers', students: 'Students', admins: 'Admins',
    confirmDelete: 'Are you sure? This cannot be undone.',
    exitTickets: 'Quick Checks', quarterQuizzes: 'Periodic Tests', quarterFinal: 'Final Exam',
    lesson: 'Lesson', maxScore: 'Max Score', student: 'Student', newExitTicket: 'New Quick Check',
    newQuiz: 'New Quiz', kind: 'Kind', quarter: 'Period', q1: 'Periodic Test 1', q2: 'Periodic Test 2', finalExam: 'Final Exam',
    saveScores: 'Save Scores', scoresSaved: 'Scores saved ✅', graded: 'graded', of: 'of',
    openSession: 'Open Attendance Session (QR)', closeSession: 'Close Session', sessionOpen: 'Session open',
    sessionClosed: 'Session closed', scanToCheckIn: 'Scan to check in', shareLink: 'Share link',
    sessionCode: 'Session code', checkInNow: 'Check me in now', attendanceMarked: 'You are checked in ✅',
    alreadyCheckedIn: 'You are already checked in', qrCheckin: 'QR Attendance',
    manualMark: 'Manual mark', participation: 'Participation', dateFilter: 'Date',
    addNote: 'Add Note', behaviorLog: 'Behavior Log', noteText: 'Note text',
    hwTitle: 'Homework title', dueDate: 'Due date', submitted: 'Submitted', missing: 'Missing',
    addHomework: 'New Homework',
    studentReport: 'Student Report', classReport: 'Class Report', generateReport: 'Generate Report',
    sendWhatsapp: 'Send via WhatsApp', printSavePdf: 'Print / Save PDF', period: 'Period',
    weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly',
    academic: 'Academic', behaviorSummary: 'Behavior', attendanceSummary: 'Attendance', strengths: 'Strengths',
    improvements: 'Needs Improvement', teacherComment: 'Teacher Comment',
    analysisTitle: 'Performance Analysis', itemAnalysis: 'By Assessment Item', distribution: 'Distribution',
    item: 'Item', avg: 'Avg', highest: 'High', lowest: 'Low', mastery: 'Mastery',
    interventionPlan: 'Intervention Plan', enrichmentPlan: 'Enrichment Plan',
    forStudents: 'For students', criteria: 'Criterion', below60: 'below 60%', above90: 'above 90%',
    suggestedActions: 'Suggested actions', printPlan: 'Print Plan',
    certTitle: 'Certificate of Excellence', certBody: 'is proudly presented to', certReason: 'in recognition of outstanding achievement in',
    printCert: 'Print Certificate', topOfClass: 'Top of the Class', perfectAttendance: 'Perfect Attendance', mostImproved: 'Most Improved',
    dayOfWeek: 'Day', periodCol: 'Period', subject: 'Subject', time: 'Time',
    sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
    exportExcel: 'Export Excel (XLSX)', exportDesc: 'Export the full gradebook (quick checks + periodic tests & final + homework + attendance + behavior)',
    section: 'Section', selectSection: 'Select section', school: 'School', allSchools: 'All schools',
    plan_basic: 'Basic', plan_pro: 'Pro', plan_premium: 'Premium',
    overall: 'Overall', points: 'Points', rank: 'Rank',
    yes: 'Yes', no: 'No', back: 'Back', refresh: 'Refresh', export: 'Export'
  }
};

let currentLang = storageGet(AMAMB_CONFIG.LANG_KEY) || 'ar';

function t(key) {
  const dict = I18N[currentLang] || I18N.ar;
  return dict[key] !== undefined ? dict[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
}
function getLang() { return currentLang; }
function isRTL() { return currentLang === 'ar'; }
function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'ar';
  storageSet(AMAMB_CONFIG.LANG_KEY, currentLang);
  applyLangToDocument();
}
function applyLangToDocument() {
  const html = document.documentElement;
  html.setAttribute('lang', currentLang);
  html.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  const lbl = document.getElementById('langLabel');
  if (lbl) lbl.textContent = currentLang === 'ar' ? 'EN' : 'عربي';
}
function toggleLang() {
  setLang(currentLang === 'ar' ? 'en' : 'ar');
  if (typeof App !== 'undefined' && App.onLangChange) App.onLangChange();
}
