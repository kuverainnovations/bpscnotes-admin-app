// ─── User ─────────────────────────────────────────────────────
export type UserStatus = 'active' | 'banned' | 'pending'
export type UserRole   = 'student' | 'instructor' | 'admin'

export interface User {
  id: string; name: string; email: string; mobile: string
  avatar?: string; initials: string; avatarColor: string
  status: UserStatus; role: UserRole
  primaryExam: string; prepLevel: string; district: string
  joinedDate: string; lastActive: string
  streak: number; coins: number; rank: number
  totalStudyHours: number; accuracy: number
  subscription: 'free' | 'monthly' | 'quarterly' | 'annual'
  coursesEnrolled: number; quizzesAttempted: number
  isVerified: boolean; referralCode: string; referredBy?: string
}

// ─── Course ───────────────────────────────────────────────────
export type ContentStatus = 'published' | 'draft' | 'review' | 'rejected'

export interface Course {
  id: string; title: string; instructor: string
  subject: string; examTags: string[]; price: number
  status: ContentStatus; totalLessons: number; totalHours: number
  enrollments: number; rating: number; reviewCount: number
  createdAt: string; updatedAt: string; isPaid: boolean
  thumbnail?: string; description: string
}

// ─── Note / Library Item ──────────────────────────────────────
export type NoteType = 'pdf' | 'pyq' | 'book' | 'video'

export interface LibraryNote {
  id: string; title: string; subject: string; type: NoteType
  author: string; uploadedBy: string; pages: number
  fileSizeMb: number; downloads: number; rating: number
  isPremium: boolean; status: ContentStatus
  uploadedDate: string; description: string; tags: string[]
  examTags: string[]
}

// ─── Quiz ─────────────────────────────────────────────────────
export interface Quiz {
  id: string; title: string; subject: string
  examTags: string[]; totalQuestions: number
  difficulty: 'easy' | 'medium' | 'hard'
  duration: number; attempts: number; avgScore: number
  status: ContentStatus; createdAt: string
  type: 'daily' | 'topic' | 'mock'
  passingScore: number; coins: number
}

// ─── Job Vacancy ──────────────────────────────────────────────
export interface JobVacancy {
  id: string; title: string; organization: string
  category: string; totalPosts: number; lastDate: string
  notificationDate: string; examDate?: string
  status: 'active' | 'expired' | 'upcoming'
  ageLimit: string; qualification: string
  applicationLink: string; views: number; saves: number
}

// ─── Current Affairs ──────────────────────────────────────────
export interface CurrentAffair {
  id: string; title: string; summary: string
  fullContent: string // sanitized rich HTML — rendered via RichContentView
  category: string; date: string; examTags: string[]
  source: string; isImportant: boolean
  status: ContentStatus; views: number; bookmarks: number
  author: string; tags: string[]
}

// ─── Subscription ─────────────────────────────────────────────
export type PlanType = 'monthly' | 'quarterly' | 'annual'

export interface Subscription {
  id: string; userId: string; userName: string
  userEmail: string; plan: PlanType; amount: number
  startDate: string; endDate: string; autoRenew: boolean
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  paymentMethod: string; upiId?: string
  coinsUsed: number; couponCode?: string; discount: number
  transactionId: string
}

// ─── Notification ─────────────────────────────────────────────
export type NotifTarget = 'all' | 'free' | 'pro' | 'exam' | 'custom'

export interface AdminNotification {
  id: string; title: string; body: string
  type: string; target: NotifTarget; targetExam?: string
  scheduledAt?: string; sentAt?: string
  status: 'draft' | 'scheduled' | 'sent' | 'failed'
  totalSent: number; opened: number; clicked: number
  createdBy: string; createdAt: string
}

// ─── Coin Transaction ─────────────────────────────────────────
export interface CoinRule {
  id: string; action: string; description: string
  coinsAwarded: number; maxPerDay: number
  isActive: boolean; totalAwarded: number
}

// ─── Study Room ───────────────────────────────────────────────
export interface StudyRoom {
  id: string; name: string; subject: string
  host: string; maxMembers: number; currentMembers: number
  isActive: boolean; isPrivate: boolean
  createdAt: string; lastActivity: string
  totalSessions: number; examTags: string[]
}

// ─── Exam ─────────────────────────────────────────────────────
export interface Exam {
  id: string; name: string; fullName: string
  category: string; emoji: string
  totalUsers: number; activeUsers: number
  isActive: boolean; createdAt: string
}

// ─── Stats ────────────────────────────────────────────────────
export interface DashboardStats {
  totalUsers: number; activeToday: number
  newThisWeek: number; totalRevenue: number
  revenueThisMonth: number; activeSubscriptions: number
  totalCourses: number; totalNotes: number
  quizAttempts: number; avgAccuracy: number
  coinCirculation: number; activeStudyRooms: number
}

// ─── Analytics ────────────────────────────────────────────────
export interface ChartDataPoint {
  date: string; value: number; label?: string
}

export interface RevenueBreakdown {
  plan: string; amount: number; count: number; color: string
}