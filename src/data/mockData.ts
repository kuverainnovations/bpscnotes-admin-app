import type {
  User, Course, LibraryNote, Quiz, JobVacancy, CurrentAffair,
  Subscription, AdminNotification, CoinRule, StudyRoom, Exam,
  DashboardStats, ChartDataPoint, RevenueBreakdown
} from '@/types'

// ─── Dashboard Stats ──────────────────────────────────────────
export const dashboardStats: DashboardStats = {
  totalUsers: 18543, activeToday: 4231, newThisWeek: 892,
  totalRevenue: 2847650, revenueThisMonth: 384200,
  activeSubscriptions: 6821, totalCourses: 48, totalNotes: 312,
  quizAttempts: 142830, avgAccuracy: 73.4,
  coinCirculation: 984320, activeStudyRooms: 23,
}

export const userGrowthData: ChartDataPoint[] = [
  { date: 'Jan', value: 8200 }, { date: 'Feb', value: 9800 },
  { date: 'Mar', value: 11200 }, { date: 'Apr', value: 12900 },
  { date: 'May', value: 14100 }, { date: 'Jun', value: 15400 },
  { date: 'Jul', value: 16200 }, { date: 'Aug', value: 17100 },
  { date: 'Sep', value: 17800 }, { date: 'Oct', value: 18100 },
  { date: 'Nov', value: 18300 }, { date: 'Dec', value: 18543 },
]

export const revenueData: ChartDataPoint[] = [
  { date: 'Jan', value: 180000 }, { date: 'Feb', value: 220000 },
  { date: 'Mar', value: 195000 }, { date: 'Apr', value: 310000 },
  { date: 'May', value: 285000 }, { date: 'Jun', value: 340000 },
  { date: 'Jul', value: 298000 }, { date: 'Aug', value: 376000 },
  { date: 'Sep', value: 312000 }, { date: 'Oct', value: 398000 },
  { date: 'Nov', value: 348000 }, { date: 'Dec', value: 384200 },
]

export const quizAttemptsData: ChartDataPoint[] = [
  { date: 'Mon', value: 3200 }, { date: 'Tue', value: 4100 },
  { date: 'Wed', value: 3800 }, { date: 'Thu', value: 4600 },
  { date: 'Fri', value: 5200 }, { date: 'Sat', value: 6800 },
  { date: 'Sun', value: 5900 },
]

export const revenuePieData: RevenueBreakdown[] = [
  { plan: 'Annual',    amount: 1248000, count: 832,  color: '#1565C0' },
  { plan: 'Quarterly', amount: 896000,  count: 1792, color: '#2196F3' },
  { plan: 'Monthly',   amount: 703650,  count: 3536, color: '#64B5F6' },
]

export const examDistribution = [
  { exam: 'BPSC 70th CCE', users: 8200, color: '#1565C0' },
  { exam: 'Bihar Police SI', users: 3100, color: '#2ECC71' },
  { exam: 'SSC CGL', users: 2400, color: '#2980B9' },
  { exam: 'Railway NTPC', users: 1900, color: '#E74C3C' },
  { exam: 'UPSC CSE', users: 1200, color: '#F39C12' },
  { exam: 'Others', users: 1743, color: '#95A5A6' },
]

// ─── Users ───────────────────────────────────────────────────
const colors = ['#1565C0','#9B59B6','#2ECC71','#E67E22','#E74C3C','#F39C12','#1ABC9C']

export const users: User[] = [
  { id:'u1', name:'Rahul Kumar', email:'rahul@example.com', mobile:'+91 98765 43210', initials:'RK', avatarColor: colors[0], status:'active', role:'student', primaryExam:'BPSC 70th CCE', prepLevel:'Intermediate', district:'Patna, Bihar', joinedDate:'15 Jan 2026', lastActive:'Today', streak:7, coins:142, rank:3, totalStudyHours:128.5, accuracy:87, subscription:'quarterly', coursesEnrolled:4, quizzesAttempted:89, isVerified:true, referralCode:'RAHUL2026' },
  { id:'u2', name:'Priya Singh', email:'priya@example.com', mobile:'+91 87654 32109', initials:'PS', avatarColor: colors[1], status:'active', role:'student', primaryExam:'BPSC 70th CCE', prepLevel:'Advanced', district:'Muzaffarpur, Bihar', joinedDate:'20 Jan 2026', lastActive:'Today', streak:14, coins:380, rank:1, totalStudyHours:210, accuracy:94, subscription:'annual', coursesEnrolled:6, quizzesAttempted:142, isVerified:true, referralCode:'PRIYA2026' },
  { id:'u3', name:'Amit Yadav', email:'amit@example.com', mobile:'+91 76543 21098', initials:'AY', avatarColor: colors[2], status:'active', role:'student', primaryExam:'Bihar Police SI', prepLevel:'Beginner', district:'Gaya, Bihar', joinedDate:'05 Feb 2026', lastActive:'Yesterday', streak:3, coins:45, rank:124, totalStudyHours:32, accuracy:62, subscription:'free', coursesEnrolled:1, quizzesAttempted:18, isVerified:false, referralCode:'AMIT2026' },
  { id:'u4', name:'Sneha Verma', email:'sneha@example.com', mobile:'+91 65432 10987', initials:'SV', avatarColor: colors[3], status:'active', role:'student', primaryExam:'BPSC 70th CCE', prepLevel:'Intermediate', district:'Bhagalpur, Bihar', joinedDate:'10 Jan 2026', lastActive:'2 days ago', streak:5, coins:210, rank:12, totalStudyHours:98, accuracy:81, subscription:'monthly', coursesEnrolled:3, quizzesAttempted:67, isVerified:true, referralCode:'SNEHA2026' },
  { id:'u5', name:'Ravi Shankar', email:'ravi@example.com', mobile:'+91 54321 09876', initials:'RS', avatarColor: colors[4], status:'banned', role:'student', primaryExam:'SSC CGL', prepLevel:'Intermediate', district:'Darbhanga, Bihar', joinedDate:'25 Jan 2026', lastActive:'5 days ago', streak:0, coins:0, rank:892, totalStudyHours:28, accuracy:58, subscription:'free', coursesEnrolled:1, quizzesAttempted:12, isVerified:false, referralCode:'RAVI2026' },
  { id:'u6', name:'Divya Pandey', email:'divya@example.com', mobile:'+91 43210 98765', initials:'DP', avatarColor: colors[5], status:'active', role:'instructor', primaryExam:'BPSC 70th CCE', prepLevel:'Advanced', district:'Patna, Bihar', joinedDate:'01 Jan 2026', lastActive:'Today', streak:21, coins:950, rank:2, totalStudyHours:320, accuracy:96, subscription:'annual', coursesEnrolled:0, quizzesAttempted:200, isVerified:true, referralCode:'DIVYA2026' },
  { id:'u7', name:'Manoj Kumar', email:'manoj@example.com', mobile:'+91 32109 87654', initials:'MK', avatarColor: colors[6], status:'pending', role:'student', primaryExam:'Railway NTPC', prepLevel:'Beginner', district:'Ara, Bihar', joinedDate:'12 Mar 2026', lastActive:'Today', streak:1, coins:10, rank:4210, totalStudyHours:8, accuracy:55, subscription:'free', coursesEnrolled:0, quizzesAttempted:4, isVerified:false, referralCode:'MANOJ2026' },
  { id:'u8', name:'Pooja Kumari', email:'pooja@example.com', mobile:'+91 21098 76543', initials:'PK', avatarColor: colors[0], status:'active', role:'student', primaryExam:'BPSC 71st CCE', prepLevel:'Intermediate', district:'Nalanda, Bihar', joinedDate:'18 Feb 2026', lastActive:'Today', streak:9, coins:178, rank:28, totalStudyHours:74, accuracy:79, subscription:'quarterly', coursesEnrolled:2, quizzesAttempted:52, isVerified:true, referralCode:'POOJA2026' },
]

// ─── Courses ─────────────────────────────────────────────────
export const courses: Course[] = [
  { id:'c1', title:'BPSC 70th Complete Preparation Course', instructor:'BPSCNotes Team', subject:'All Subjects', examTags:['BPSC 70th CCE'], price:1999, status:'published', totalLessons:180, totalHours:45, enrollments:18500, rating:4.9, reviewCount:2840, createdAt:'01 Jan 2026', updatedAt:'10 Mar 2026', isPaid:true, description:'Complete BPSC prep course.' },
  { id:'c2', title:'Polity Master Class — BPSC Special', instructor:'Dr. R.K. Sharma', subject:'Polity', examTags:['BPSC 70th CCE','BPSC 71st CCE'], price:799, status:'published', totalLessons:45, totalHours:12, enrollments:9800, rating:4.8, reviewCount:1240, createdAt:'05 Jan 2026', updatedAt:'08 Mar 2026', isPaid:true, description:'Complete Polity course.' },
  { id:'c3', title:'Bihar GK Intensive Course', instructor:'Rahul Sir', subject:'Bihar GK', examTags:['BPSC 70th CCE','Bihar Police SI'], price:599, status:'published', totalLessons:60, totalHours:15, enrollments:12400, rating:4.9, reviewCount:1890, createdAt:'10 Jan 2026', updatedAt:'09 Mar 2026', isPaid:true, description:'Complete Bihar GK.' },
  { id:'c4', title:'Economy for BPSC — Zero to Advanced', instructor:'CA Vikram Joshi', subject:'Economy', examTags:['BPSC 70th CCE'], price:899, status:'published', totalLessons:40, totalHours:10, enrollments:7200, rating:4.7, reviewCount:980, createdAt:'15 Jan 2026', updatedAt:'07 Mar 2026', isPaid:true, description:'Indian Economy course.' },
  { id:'c5', title:'Modern History — BPSC Focus', instructor:'Prof. Anita Singh', subject:'History', examTags:['BPSC 70th CCE','UPSC CSE'], price:0, status:'published', totalLessons:35, totalHours:9, enrollments:15600, rating:4.6, reviewCount:2100, createdAt:'20 Jan 2026', updatedAt:'06 Mar 2026', isPaid:false, description:'Modern History free course.' },
  { id:'c6', title:'SSC CGL Complete Course 2026', instructor:'BPSCNotes Team', subject:'All Subjects', examTags:['SSC CGL'], price:1499, status:'draft', totalLessons:120, totalHours:32, enrollments:0, rating:0, reviewCount:0, createdAt:'01 Mar 2026', updatedAt:'12 Mar 2026', isPaid:true, description:'SSC CGL prep.' },
  { id:'c7', title:'Bihar Police SI Complete Course', instructor:'Inspector Raj Kumar', subject:'All Subjects', examTags:['Bihar Police SI'], price:799, status:'review', totalLessons:65, totalHours:18, enrollments:0, rating:0, reviewCount:0, createdAt:'08 Mar 2026', updatedAt:'13 Mar 2026', isPaid:true, description:'Bihar Police SI course.' },
]

// ─── Library Notes ────────────────────────────────────────────
export const libraryNotes: LibraryNote[] = [
  { id:'n1', title:'BPSC Polity Complete Notes', subject:'Polity', type:'pdf', author:'BPSCNotes Team', uploadedBy:'admin', pages:185, fileSizeMb:12.4, downloads:45200, rating:4.8, isPremium:false, status:'published', uploadedDate:'10 Mar 2026', description:'Complete Polity notes.', tags:['Constitution','Fundamental Rights'], examTags:['BPSC 70th CCE'] },
  { id:'n2', title:'BPSC 69th Previous Year Paper', subject:'All Subjects', type:'pyq', author:'BPSCNotes Team', uploadedBy:'admin', pages:24, fileSizeMb:2.1, downloads:38900, rating:4.9, isPremium:false, status:'published', uploadedDate:'05 Mar 2026', description:'69th CCE Prelims.', tags:['Prelims','2024'], examTags:['BPSC 70th CCE'] },
  { id:'n3', title:'Bihar GK Handbook 2026', subject:'Bihar GK', type:'book', author:'Rahul Kumar', uploadedBy:'u6', pages:320, fileSizeMb:22.5, downloads:51200, rating:4.9, isPremium:true, status:'published', uploadedDate:'01 Mar 2026', description:'Complete Bihar GK.', tags:['Bihar','2026'], examTags:['BPSC 70th CCE','Bihar Police SI'] },
  { id:'n4', title:'Economy Video Notes — Budget 2026', subject:'Economy', type:'video', author:'CA Vikram Joshi', uploadedBy:'u6', pages:68, fileSizeMb:5.2, downloads:19800, rating:4.6, isPremium:true, status:'published', uploadedDate:'13 Mar 2026', description:'Economy video notes.', tags:['RBI','Budget 2026'], examTags:['BPSC 70th CCE'] },
  { id:'n5', title:'Student Uploaded: Polity Notes', subject:'Polity', type:'pdf', author:'Sneha Verma', uploadedBy:'u4', pages:42, fileSizeMb:3.1, downloads:0, rating:0, isPremium:false, status:'review', uploadedDate:'14 Mar 2026', description:'Self-made polity notes.', tags:['Constitution'], examTags:['BPSC 70th CCE'] },
]

// ─── Quizzes ─────────────────────────────────────────────────
export const quizzes: Quiz[] = [
  { id:'q1', title:'Daily Quiz — Polity', subject:'Polity', examTags:['BPSC 70th CCE'], totalQuestions:10, difficulty:'medium', duration:15, attempts:8420, avgScore:72, status:'published', createdAt:'Today', type:'daily', coins:10 },
  { id:'q2', title:'Fundamental Rights Deep Quiz', subject:'Polity', examTags:['BPSC 70th CCE','UPSC CSE'], totalQuestions:25, difficulty:'hard', duration:30, attempts:3200, avgScore:65, status:'published', createdAt:'10 Mar 2026', type:'topic', coins:20 },
  { id:'q3', title:'Bihar GK — 100 Important Questions', subject:'Bihar GK', examTags:['BPSC 70th CCE','Bihar Police SI'], totalQuestions:100, difficulty:'medium', duration:90, attempts:6800, avgScore:68, status:'published', createdAt:'08 Mar 2026', type:'mock', coins:50 },
  { id:'q4', title:'BPSC 70th Full Mock Test #5', subject:'All Subjects', examTags:['BPSC 70th CCE'], totalQuestions:150, difficulty:'hard', duration:120, attempts:4200, avgScore:61, status:'published', createdAt:'05 Mar 2026', type:'mock', coins:100 },
  { id:'q5', title:'Economy — RBI & Banking Quiz', subject:'Economy', examTags:['BPSC 70th CCE','SSC CGL'], totalQuestions:20, difficulty:'medium', duration:25, attempts:2900, avgScore:70, status:'draft', createdAt:'12 Mar 2026', type:'topic', coins:15 },
]

// ─── Job Vacancies ────────────────────────────────────────────
export const jobVacancies: JobVacancy[] = [
  { id:'j1', title:'BPSC 70th CCE', organization:'Bihar Public Service Commission', category:'State Civil Services', totalPosts:1929, lastDate:'30 Apr 2026', notificationDate:'01 Mar 2026', examDate:'Jul 2026', status:'active', ageLimit:'21-37 years', qualification:'Graduation', applicationLink:'https://bpsc.bih.nic.in', views:48200, saves:12800 },
  { id:'j2', title:'Bihar Police Sub-Inspector', organization:'Bihar Police', category:'Police Services', totalPosts:2088, lastDate:'15 May 2026', notificationDate:'10 Mar 2026', status:'active', ageLimit:'20-37 years', qualification:'Graduation', applicationLink:'https://csbc.bih.nic.in', views:32100, saves:8900 },
  { id:'j3', title:'SSC CGL 2026', organization:'Staff Selection Commission', category:'Central Govt', totalPosts:17727, lastDate:'20 Apr 2026', notificationDate:'20 Feb 2026', examDate:'Jun-Jul 2026', status:'active', ageLimit:'18-32 years', qualification:'Graduation', applicationLink:'https://ssc.nic.in', views:89400, saves:24300 },
  { id:'j4', title:'Railway NTPC 2026', organization:'Railway Recruitment Board', category:'Railways', totalPosts:11558, lastDate:'10 Apr 2026', notificationDate:'15 Feb 2026', status:'active', ageLimit:'18-33 years', qualification:'12th / Graduation', applicationLink:'https://rrbcdg.gov.in', views:76200, saves:18700 },
  { id:'j5', title:'BPSC Teacher Recruitment', organization:'Bihar Education Department', category:'Teaching', totalPosts:82123, lastDate:'01 Mar 2026', notificationDate:'01 Jan 2026', examDate:'Completed', status:'expired', ageLimit:'21-37 years', qualification:'Graduation + B.Ed', applicationLink:'https://bpsc.bih.nic.in', views:124000, saves:31200 },
]

// ─── Current Affairs ──────────────────────────────────────────
export const currentAffairs: CurrentAffair[] = [
  { id:'ca1', title:'India\'s GDP Growth Rate Q3 2025-26 at 8.4%', summary:'India\'s GDP growth rate for Q3 2025-26 stood at 8.4%, making it the fastest growing major economy. The growth was driven by manufacturing and services sectors.', category:'Economy', date:'14 Mar 2026', examTags:['BPSC 70th CCE','UPSC CSE','SSC CGL'], source:'Ministry of Statistics', isImportant:true, status:'published', views:18400, bookmarks:4200, author:'admin', tags:['GDP','Economy','Q3'] },
  { id:'ca2', title:'Bihar Government Launches New Scholarship Scheme', summary:'Bihar government launched a new scholarship scheme for OBC/EBC students pursuing higher education. Benefits up to ₹1 lakh per year.', category:'Bihar Affairs', date:'13 Mar 2026', examTags:['BPSC 70th CCE','Bihar Police SI'], source:'Government of Bihar', isImportant:true, status:'published', views:12800, bookmarks:3100, author:'admin', tags:['Bihar','Scholarship','Education'] },
  { id:'ca3', title:'India Ranks 3rd in Renewable Energy Capacity', summary:'India has achieved 3rd position globally in renewable energy capacity with 200 GW installed capacity. Solar energy contributes 70 GW.', category:'Science & Tech', date:'12 Mar 2026', examTags:['BPSC 70th CCE','UPSC CSE'], source:'Ministry of New & Renewable Energy', isImportant:false, status:'published', views:8900, bookmarks:1800, author:'admin', tags:['Renewable Energy','Solar','Environment'] },
  { id:'ca4', title:'Supreme Court Verdict on Electoral Bonds', summary:'Supreme Court upheld the ban on electoral bonds declaring them unconstitutional and violating RTI and right to information.', category:'Polity & Governance', date:'11 Mar 2026', examTags:['BPSC 70th CCE','UPSC CSE'], source:'Supreme Court of India', isImportant:true, status:'draft', views:0, bookmarks:0, author:'admin', tags:['Supreme Court','Electoral Bonds','Democracy'] },
]

// ─── Subscriptions ────────────────────────────────────────────
export const subscriptions: Subscription[] = [
  { id:'s1', userId:'u2', userName:'Priya Singh', userEmail:'priya@example.com', plan:'annual', amount:1499, startDate:'01 Jan 2026', endDate:'31 Dec 2026', autoRenew:true, status:'active', paymentMethod:'GPay', upiId:'priya@oksbi', coinsUsed:0, discount:0, transactionId:'TXN001234' },
  { id:'s2', userId:'u1', userName:'Rahul Kumar', userEmail:'rahul@example.com', plan:'quarterly', amount:449, startDate:'15 Jan 2026', endDate:'15 Apr 2026', autoRenew:true, status:'active', paymentMethod:'PhonePe', coinsUsed:50, couponCode:'BPSC50', discount:50, transactionId:'TXN001235' },
  { id:'s3', userId:'u4', userName:'Sneha Verma', userEmail:'sneha@example.com', plan:'monthly', amount:199, startDate:'10 Mar 2026', endDate:'10 Apr 2026', autoRenew:false, status:'active', paymentMethod:'Paytm', coinsUsed:0, discount:0, transactionId:'TXN001236' },
  { id:'s4', userId:'u8', userName:'Pooja Kumari', userEmail:'pooja@example.com', plan:'quarterly', amount:499, startDate:'18 Feb 2026', endDate:'18 May 2026', autoRenew:true, status:'active', paymentMethod:'UPI', upiId:'pooja@upi', coinsUsed:0, discount:0, transactionId:'TXN001237' },
  { id:'s5', userId:'u7', userName:'Manoj Kumar', userEmail:'manoj@example.com', plan:'monthly', amount:199, startDate:'01 Feb 2026', endDate:'01 Mar 2026', autoRenew:false, status:'expired', paymentMethod:'BHIM', coinsUsed:0, discount:0, transactionId:'TXN001238' },
]

// ─── Notifications ────────────────────────────────────────────
export const adminNotifications: AdminNotification[] = [
  { id:'an1', title:'🔥 7-Day Streak Bonus!', body:'Complete today\'s quiz and earn 50 bonus coins for your 7-day streak!', type:'streak', target:'all', sentAt:'Today 8:00 AM', status:'sent', totalSent:18543, opened:12400, clicked:8200, createdBy:'admin', createdAt:'Today' },
  { id:'an2', title:'📝 New Mock Test Available', body:'BPSC 70th Mock Test #5 is now live. Test yourself with 150 questions!', type:'mock', target:'exam', targetExam:'BPSC 70th CCE', sentAt:'Yesterday', status:'sent', totalSent:8200, opened:6100, clicked:4300, createdBy:'admin', createdAt:'Yesterday' },
  { id:'an3', title:'💼 New Job Alert: Bihar Police SI', body:'2088 vacancies open! Apply before 15 May 2026.', type:'job', target:'exam', targetExam:'Bihar Police SI', scheduledAt:'Tomorrow 9:00 AM', status:'scheduled', totalSent:0, opened:0, clicked:0, createdBy:'admin', createdAt:'Today' },
  { id:'an4', title:'🎉 Republic Day Special Offer', body:'Get 30% off on Annual subscription today only! Use code: REPUBLIC26', type:'promotion', target:'free', status:'draft', totalSent:0, opened:0, clicked:0, createdBy:'admin', createdAt:'10 Mar 2026' },
]

// ─── Coin Rules ───────────────────────────────────────────────
export const coinRules: CoinRule[] = [
  { id:'cr1', action:'daily_quiz', description:'Complete Daily Quiz', coinsAwarded:10, maxPerDay:1, isActive:true, totalAwarded:842000 },
  { id:'cr2', action:'streak_7', description:'7-Day Study Streak', coinsAwarded:15, maxPerDay:1, isActive:true, totalAwarded:124000 },
  { id:'cr3', action:'streak_30', description:'30-Day Study Streak Bonus', coinsAwarded:100, maxPerDay:1, isActive:true, totalAwarded:38000 },
  { id:'cr4', action:'referral', description:'Referral — Friend Joined', coinsAwarded:50, maxPerDay:5, isActive:true, totalAwarded:210000 },
  { id:'cr5', action:'active_recall', description:'Complete 10 Flashcards', coinsAwarded:5, maxPerDay:3, isActive:true, totalAwarded:380000 },
  { id:'cr6', action:'mock_top10', description:'Top 10 in Mock Test', coinsAwarded:100, maxPerDay:1, isActive:true, totalAwarded:45000 },
  { id:'cr7', action:'daily_login', description:'Daily Login Bonus', coinsAwarded:2, maxPerDay:1, isActive:true, totalAwarded:1240000 },
  { id:'cr8', action:'profile_complete', description:'Complete Profile', coinsAwarded:20, maxPerDay:1, isActive:false, totalAwarded:18000 },
]

// ─── Study Rooms ──────────────────────────────────────────────
export const studyRooms: StudyRoom[] = [
  { id:'sr1', name:'Polity Masters', subject:'Polity', host:'Priya Singh', maxMembers:20, currentMembers:14, isActive:true, isPrivate:false, createdAt:'10 Mar 2026', lastActivity:'5 min ago', totalSessions:24, examTags:['BPSC 70th CCE'] },
  { id:'sr2', name:'Bihar GK Grind', subject:'Bihar GK', host:'Rahul Kumar', maxMembers:15, currentMembers:9, isActive:true, isPrivate:false, createdAt:'08 Mar 2026', lastActivity:'12 min ago', totalSessions:18, examTags:['BPSC 70th CCE','Bihar Police SI'] },
  { id:'sr3', name:'Economy Study Circle', subject:'Economy', host:'Divya Pandey', maxMembers:10, currentMembers:7, isActive:true, isPrivate:true, createdAt:'12 Mar 2026', lastActivity:'1 hr ago', totalSessions:8, examTags:['BPSC 70th CCE'] },
  { id:'sr4', name:'SSC CGL Prep Room', subject:'All Subjects', host:'Amit Yadav', maxMembers:25, currentMembers:0, isActive:false, isPrivate:false, createdAt:'05 Mar 2026', lastActivity:'2 days ago', totalSessions:12, examTags:['SSC CGL'] },
]

// ─── Exams ────────────────────────────────────────────────────
export const exams: Exam[] = [
  { id:'e1', name:'BPSC 70th CCE', fullName:'Bihar Public Service Commission 70th CCE', category:'BPSC', emoji:'🎯', totalUsers:8200, activeUsers:6100, isActive:true, createdAt:'01 Jan 2026' },
  { id:'e2', name:'BPSC 71st CCE', fullName:'Bihar Public Service Commission 71st CCE', category:'BPSC', emoji:'🎯', totalUsers:3400, activeUsers:2800, isActive:true, createdAt:'01 Jan 2026' },
  { id:'e3', name:'Bihar Police SI', fullName:'Bihar Police Sub-Inspector', category:'Bihar State', emoji:'👮', totalUsers:3100, activeUsers:2400, isActive:true, createdAt:'01 Jan 2026' },
  { id:'e4', name:'SSC CGL', fullName:'Staff Selection Commission CGL', category:'Central Govt', emoji:'🇮🇳', totalUsers:2400, activeUsers:1800, isActive:true, createdAt:'01 Jan 2026' },
  { id:'e5', name:'Railway NTPC', fullName:'Railway Recruitment Board NTPC', category:'Central Govt', emoji:'🚂', totalUsers:1900, activeUsers:1400, isActive:true, createdAt:'01 Jan 2026' },
  { id:'e6', name:'UPSC CSE', fullName:'Union Public Service Commission CSE', category:'Central Govt', emoji:'🏆', totalUsers:1200, activeUsers:900, isActive:true, createdAt:'01 Jan 2026' },
]

// ─── Coupons ──────────────────────────────────────────────────
export const coupons = [
  { id:'cp1', code:'BPSC50', type:'percent', value:5, description:'5% off for BPSC aspirants', usedCount:1240, maxUses:5000, expiresAt:'31 Dec 2026', isActive:true, appliesTo:'subscription' },
  { id:'cp2', code:'SAVE100', type:'flat', value:100, description:'₹100 flat discount', usedCount:892, maxUses:2000, expiresAt:'30 Apr 2026', isActive:true, appliesTo:'both' },
  { id:'cp3', code:'FIRST', type:'flat', value:50, description:'First-time subscriber discount', usedCount:3210, maxUses:10000, expiresAt:'31 Dec 2026', isActive:true, appliesTo:'subscription' },
  { id:'cp4', code:'BIHAR25', type:'percent', value:25, description:'Bihar Day special offer', usedCount:421, maxUses:500, expiresAt:'22 Mar 2026', isActive:false, appliesTo:'both' },
]

// ─── Admin Roles ──────────────────────────────────────────────
export const adminRoles = [
  { id:'ar1', name:'Super Admin', email:'superadmin@bpscnotes.com', permissions:['all'], lastLogin:'Today 9:00 AM', status:'active', avatar:'SA', color:'#1565C0' },
  { id:'ar2', name:'Content Manager', email:'content@bpscnotes.com', permissions:['courses','notes','quizzes','current-affairs'], lastLogin:'Today 11:00 AM', status:'active', avatar:'CM', color:'#9B59B6' },
  { id:'ar3', name:'Support Agent', email:'support@bpscnotes.com', permissions:['users','notifications'], lastLogin:'Yesterday', status:'active', avatar:'SA', color:'#2ECC71' },
]
