// ════════════════════════════════════════════════════════════
// BPSCNotes Admin — API Client
// ════════════════════════════════════════════════════════════

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

// ── Token helpers ─────────────────────────────────────────────
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('adminToken')
}
export const setToken = (token: string) => {
  if (typeof window !== 'undefined') localStorage.setItem('adminToken', token)
}
export const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
  }
}
export const isLoggedIn = (): boolean => !!getToken()

// ── Core request ──────────────────────────────────────────────
const request = async (url: string, options: any = {}) => {
  const token = getToken()


  const headers: any = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  // 🔥 THIS IS THE MISSING PART
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // const res = await fetch(`http://localhost:5000/api/v1${url}`, {
    const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

// ── File upload ───────────────────────────────────────────────
const uploadRequest = async (path: string, formData: FormData): Promise<any> => {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  const data = await res.json().catch(() => ({ success: false, message: 'Upload failed' }))
  if (!res.ok) throw new Error(data.message || 'Upload failed')
  return data
}

const qs = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

// ════════════════════════════════════════════════════════════
// API Methods
// ════════════════════════════════════════════════════════════
export const api = {

  // ── Auth ──────────────────────────────────────────────────
  auth: {
    login: async (email: string, password: string) => {
      const res = await request('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      // Save token immediately on login
      if (res.data?.token) {
          setToken(res.data.token)
      }
      return res
    },
    logout: () => clearToken(),
  },

  // ── Dashboard ─────────────────────────────────────────────
  dashboard: {
    getStats:            () => request('/admin/stats'),
    getChart:            (type: string, period = '12months') =>
                           request(`/admin/analytics/chart?type=${type}&period=${period}`),
    getRevenueBreakdown: () => request('/admin/analytics/revenue-breakdown'),
    getExamDistribution: () => request('/admin/analytics/exam-distribution'),
  },

  // ── Users ─────────────────────────────────────────────────
  users: {
    list:        (params = {}) => request(`/admin/users?${qs(params)}`),
    getById:     (id: string) => request(`/admin/users/${id}`),
    updateStatus:(id: string, status: string) =>
                   request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    verify:      (id: string) => request(`/admin/users/${id}/verify`, { method: 'PUT' }),
    delete:      (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    awardCoins:  (userId: string, amount: number, reason: string) =>
                   request('/admin/users/award-coins', { method: 'POST', body: JSON.stringify({ userId, amount, reason }) }),
    getAdmins:   () => request('/admin/users/admin-accounts/list'),
    createAdmin: (data: any) => request('/admin/users/admin-accounts', { method: 'POST', body: JSON.stringify(data) }),
    updateAdmin: (id: string, data: any) => request(`/admin/users/admin-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAdmin: (id: string) => request(`/admin/users/admin-accounts/${id}`, { method: 'DELETE' }),
  },

  // ── Courses ───────────────────────────────────────────────
  courses: {
    list:            (params = {}) => request(`/admin/courses?${qs(params)}`),
    create:          (data: any) => request('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
    update:          (id: string, data: any) => request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:          (id: string) => request(`/admin/courses/${id}`, { method: 'DELETE' }),
    uploadThumbnail: (id: string, file: File) => {
      const fd = new FormData()
      fd.append('thumbnail', file)
      return uploadRequest(`/admin/courses/${id}/thumbnail`, fd)
    },
    // Chapter CRUD
    getChapters:    (courseId: string) =>
                      request(`/admin/courses/${courseId}/chapters`),
    createChapter:  (courseId: string, data: { title: string; sortOrder?: number }) =>
                      request(`/admin/courses/${courseId}/chapters`, { method: 'POST', body: JSON.stringify(data) }),
    updateChapter:  (courseId: string, chapterId: string, data: any) =>
                      request(`/admin/courses/${courseId}/chapters/${chapterId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteChapter:  (courseId: string, chapterId: string) =>
                      request(`/admin/courses/${courseId}/chapters/${chapterId}`, { method: 'DELETE' }),
    // Lesson CRUD
    createLesson:   (courseId: string, chapterId: string, data: any) =>
                      request(`/admin/courses/${courseId}/chapters/${chapterId}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
    updateLesson:   (courseId: string, lessonId: string, data: any) =>
                      request(`/admin/courses/${courseId}/lessons/${lessonId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteLesson:   (courseId: string, lessonId: string) =>
                      request(`/admin/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' }),
    unlockFreeLessons: (courseId: string) => request(`/admin/courses/${courseId}/unlock-free-lessons`, { method: 'POST' }),
    bulkFixFreeLocks:  () => request('/admin/courses/bulk-fix-free-locks', { method: 'POST' }),
    // Subjects
    subjects:       () => request('/admin/subjects'),
    affairCategories: () => request('/admin/affair-categories'),
  },

  // ── Library ───────────────────────────────────────────────
  library: {
    list:      (params = {}) => request(`/admin/library?${qs(params)}`),
    create:    (data: any, file?: File) => {
      if (file) {
        const fd = new FormData()
        Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)))
        fd.append('file', file)
        return uploadRequest('/admin/library', fd)
      }
      return request('/admin/library', { method: 'POST', body: JSON.stringify(data) })
    },
    update:    (id: string, data: any) => request(`/admin/library/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:    (id: string) => request(`/admin/library/${id}`, { method: 'DELETE' }),
    getPending:() => request('/admin/library/pending-reviews'),
    review:    (id: string, action: string) =>
                 request(`/admin/library/${id}/review`, { method: 'PUT', body: JSON.stringify({ action }) }),
  },

  studyMaterials: {
    adminStats: () =>
      request('/admin/study-materials/stats'),
  
    adminList: (params = {}) =>
      request(`/admin/study-materials?${qs(params)}`),
  
    approve: (id: string) =>
      request(`/admin/study-materials/${id}/approve`, { method: 'PATCH' }),
  
    reject: (id: string, reason: string) =>
      request(`/admin/study-materials/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  
    toggleFeatured: (id: string) =>
      request(`/admin/study-materials/${id}/toggle-featured`, { method: 'POST' }),
  
    toggleTrending: (id: string) =>
      request(`/admin/study-materials/${id}/toggle-trending`, { method: 'POST' }),
  
    delete: (id: string) =>
      request(`/admin/study-materials/${id}`, {
        method: 'DELETE',
      }),
  
    signedUrl: (id: string) =>
      request(`/admin/study-materials/${id}/url`),
  },

  // ── Quizzes ───────────────────────────────────────────────
  quizzes: {
    list:         (params = {}) => request(`/admin/quizzes?${qs(params)}`),
    create:       (data: any) => request('/admin/quizzes', { method: 'POST', body: JSON.stringify(data) }),
    update:       (id: string, data: any) => request(`/admin/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:       (id: string) => request(`/admin/quizzes/${id}`, { method: 'DELETE' }),
    addQuestions: (quizId: string, questions: any[]) =>
                    request(`/admin/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify({ questions }) }),
    getQuestions:     (quizId: string)              => request(`/admin/quizzes/${quizId}/questions`),
    updateQuestion:   (questionId: string, d: any)   => request(`/admin/questions/${questionId}`, { method: 'PUT',    body: JSON.stringify(d) }),
    deleteQuestion:   (questionId: string)            => request(`/admin/questions/${questionId}`, { method: 'DELETE' }),
  },

  // ── Current Affairs ───────────────────────────────────────
  currentAffairs: {
    list:   (params = {}) => request(`/admin/current-affairs?${qs(params)}`),
    create: (data: any) => request('/admin/current-affairs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/current-affairs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/current-affairs/${id}`, { method: 'DELETE' }),
  },

  // ── Jobs ──────────────────────────────────────────────────
  jobs: {
    list:   (params = {}) => request(`/admin/jobs?${qs(params)}`),
    create: (data: any) => request('/admin/jobs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/jobs/${id}`, { method: 'DELETE' }),
  },

  // ── Subscriptions & Coupons ───────────────────────────────
  subscriptions: {
    savePaymentSettings: (d: any) => request('/admin/settings/payment', { method: 'POST', body: JSON.stringify(d) }),
    refundPayment:       (subId: string) => request(`/admin/subscriptions/${subId}/refund`, { method: 'POST' }),
    list:         (params = {}) => request(`/admin/subscriptions?${qs(params)}`),
    getStats:     ()             => request('/admin/subscriptions/stats'),
    cancel:       (id: string)   => request(`/admin/subscriptions/${id}/cancel`, { method: 'PUT' }),
    refund:       (id: string)   => request(`/admin/subscriptions/${id}/refund`, { method: 'POST' }),
    getCoupons:   () => request('/admin/subscriptions/coupons'),
    createCoupon: (data: any) => request('/admin/subscriptions/coupons', { method: 'POST', body: JSON.stringify(data) }),
    updateCoupon: (id: string, data: any) => request(`/admin/subscriptions/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCoupon: (id: string) => request(`/admin/subscriptions/coupons/${id}`, { method: 'DELETE' }),
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: {
    list:      (params: any = {}) => request(`/admin/notifications?${qs(params)}`),
    send:      (data: any) => request('/admin/notifications/send', { method: 'POST', body: JSON.stringify(data) }),
    markRead:    (id: string) => request(`/admin/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: ()            => request('/admin/notifications/mark-all-read', { method: 'POST' }),
    delete:    (id: string) => request(`/admin/notifications/${id}`, { method: 'DELETE' }),
  },

  // ── Coins ─────────────────────────────────────────────────
  coins: {
    getRules:     ()             => request('/admin/coins/rules'),
    createRule:   (data: any)    => request('/admin/coins/rules', { method: 'POST', body: JSON.stringify(data) }),
    updateRule:   (id: string, data: any) => request(`/admin/coins/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRule:   (id: string)   => request(`/admin/coins/rules/${id}`, { method: 'DELETE' }),
    getTopEarners:()             => request('/admin/coins/top-earners'),
    getStats:     ()             => request('/admin/coins/stats'),
    getAdConfig:  ()             => request('/admin/coins/ad-config'),
    updateAdConfig:(data: any)   => request('/admin/coins/ad-config', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── Study Rooms ───────────────────────────────────────────
  studyRooms: {
    list: () => request('/admin/study-rooms'),
  
    create: (data: any) =>
      request('/admin/study-rooms', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
  
    end: (id: string) =>
      request(`/admin/study-rooms/${id}/end`, {
        method: 'PUT'
      }),
  },

  // ── Exams ─────────────────────────────────────────────────
  exams: {
    list:   (params: any = {}) => request(`/admin/exams?${qs(params)}`),
    create: (data: any)        => request('/admin/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string)       => request(`/admin/exams/${id}`, { method: 'DELETE' }),
    toggleStatus: (id: string, isActive: boolean) => request(`/admin/exams/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),
  },

  // ── Banners ───────────────────────────────────────────────
  banners: {
    list:   () => request('/admin/banners'),
    create: (data: any) => request('/admin/banners', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/banners/${id}`, { method: 'DELETE' }),
  },

  // ── Live Classes ──────────────────────────────────────────
  liveClasses: {
    list:   (params: any = {}) => request(`/admin/live-classes?${qs(params)}`),
    create: (data: any)        => request('/admin/live-classes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/live-classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string)       => request(`/admin/live-classes/${id}`, { method: 'DELETE' }),
    toggle: (id: string, isLive: boolean) => request(`/admin/live-classes/${id}/toggle`, { method: 'PUT', body: JSON.stringify({ isLive }) }),
  },

  // ── Leaderboard ───────────────────────────────────────────
  leaderboard: {
    list:        (params: any = {}) => request(`/admin/leaderboard?${qs(params)}`),
    recalculate: ()                 => request('/admin/leaderboard/recalculate', { method: 'POST' }),
    resetUser:   (userId: string)   => request(`/admin/leaderboard/users/${userId}/reset`, { method: 'POST' }),
  },

  // ── Certificates ──────────────────────────────────────────
  certificates: {
    list: (params = {}) => request(`/admin/certificates?${qs(params)}`),
  },

  // ── Subjects (dynamic filter categories) ────────────────
  subjects: {
    list:   ()           => request('/admin/subjects'),
    create: (data: any)  => request('/admin/subjects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/subjects/${id}`, { method: 'DELETE' }),
  },

  // Exam & Job categories — stored locally (no backend table yet)
  // These are persisted in localStorage by DynamicSelect component
  examCategories: {
    list:   ()             => request('/admin/exam-categories'),
    create: (name: string) => request('/admin/exam-categories', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: string)   => request(`/admin/exam-categories/${id}`, { method: 'DELETE' }),
  },
  jobCategories: {
    list:   ()             => request('/admin/job-categories'),
    create: (name: string) => request('/admin/job-categories', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: string)   => request(`/admin/job-categories/${id}`, { method: 'DELETE' }),
  },

  affairCategories: {
    list:   ()           => request('/admin/affair-categories'),
    create: (data: any)  => request('/admin/affair-categories', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/affair-categories/${id}`, { method: 'DELETE' }),
  },

  // ── Settings ──────────────────────────────────────────────
  settings: {
    getAll: () => request('/admin/settings'),
    update: (settings: Record<string, string>) =>
              request('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  },

  // ── Achievements admin ────────────────────────────────────────
  adminAchievements: {
    list:   () => request('/admin/achievements'),
    create: (d: any) => request('/admin/achievements', { method:'POST', body:JSON.stringify(d) }),
    toggle: (id: string, isActive: boolean) => request(`/admin/achievements/${id}/toggle`, { method:'POST', body:JSON.stringify({ isActive }) }),
  },

  // ── Challenges admin ────────────────────────────────────────
  adminChallenges: {
    list:   (q: any = {}) => request(`/admin/challenges?${new URLSearchParams(q)}`),
    create: (d: any)      => request('/admin/challenges', { method:'POST', body:JSON.stringify(d) }),
    toggle: (id: string, isActive: boolean) => request(`/admin/challenges/${id}/toggle`, { method:'POST', body:JSON.stringify({ isActive }) }),
  },

  // ── Admin Role Management ─────────────────────────────────
  // ── Tier Rooms (Phase 1) ──────────────────────────────────
  tierRooms: {
    getAllTiers:      ()                    => request('/admin/room-tiers'),
    updateTier:      (id: string, d: any)  => request(`/admin/room-tiers/${id}`,         { method: 'PUT',  body: JSON.stringify(d) }),
    getRules:        ()                    => request('/admin/room-tiers/rules'),
    updateRule:      (id: string, d: any)  => request(`/admin/room-tiers/rules/${id}`,   { method: 'PUT',  body: JSON.stringify(d) }),
    promoteUser:     (d: any)              => request('/admin/room-tiers/promote',         { method: 'POST', body: JSON.stringify(d) }),
    getDistribution: ()                    => request('/admin/room-tiers/distribution'),
    // Phase 5 — anti-cheat
    getFlaggedUsers: (q: any = {})         => request(`/admin/room-tiers/flagged-users?${new URLSearchParams(q)}`),
    clearUserFlags:  (userId: string)      => request(`/admin/room-tiers/flagged-users/${userId}/clear`, { method: 'POST' }),
    getLiveSessions: ()                    => request('/admin/room-tiers/live-sessions'),
  },

  adminUsers: {
    list:                 ()             => request('/admin/users/admin-accounts/list'),
    create:               (data: any)    => request('/admin/users/admin-accounts', { method: 'POST', body: JSON.stringify(data) }),
    update:               (id: string, data: any) => request(`/admin/users/admin-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:               (id: string)   => request(`/admin/users/admin-accounts/${id}`, { method: 'DELETE' }),
    // ── Email verification ─────────────────────────────────────
    resendVerification:   (id: string)   => request(`/admin/users/admin-accounts/${id}/resend-verification`, { method: 'POST' }),
    approve:              (id: string)   => request(`/admin/users/admin-accounts/${id}/approve`, { method: 'POST' }),
    verifyToken:          (token: string)=> request(`/admin/verify-email?token=${token}`),
  },

  // ── Flashcards (Active Recall) ────────────────────────────
  flashcards: {
    list:   (params: any = {}) => request(`/admin/flashcards?${qs(params)}`),
    create: (data: any)  => request('/admin/flashcards', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/flashcards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/flashcards/${id}`, { method: 'DELETE' }),
  },
}

export default api