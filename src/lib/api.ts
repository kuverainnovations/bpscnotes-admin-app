// ════════════════════════════════════════════════════════════
// BPSCNotes Admin — API Client
// ════════════════════════════════════════════════════════════

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

// ── Token helpers ─────────────────────────────────────────────
// Token is now an httpOnly cookie set by POST /admin/login.
// JS cannot read it, so these helpers only manage non-sensitive localStorage state.
export const getToken = (): string | null => null
export const setToken = (_token: string) => {}
export const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('adminUser')
  }
}
export const isLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('adminUser')
}

// ── Core request ──────────────────────────────────────────────
const request = async (url: string, options: any = {}) => {
  const headers: any = {
    ...(options.headers || {}),
  }

  // Only set Content-Type for JSON — FormData sets its own boundary
  if (!options.isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  const data = await res.json()

  if (res.status === 401) {
    // Session expired or invalid token — clear and force back to login
    clearToken()
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/'
    }
    throw new Error(data.message || 'Session expired — please sign in again')
  }

  if (!res.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

// ── File upload ───────────────────────────────────────────────
const uploadRequest = async (path: string, formData: FormData): Promise<any> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method:      'POST',
    headers:     {},
    body:        formData,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({ success: false, message: 'Upload failed' }))
  if (res.status === 401) {
    clearToken()
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/'
    }
    throw new Error(data.message || 'Session expired — please sign in again')
  }
  if (!res.ok) throw new Error(data.message || 'Upload failed')
  return data
}

// ── File upload with progress (XHR — fetch doesn't expose upload progress) ──
const uploadRequestWithProgress = (path: string, formData: FormData, onProgress?: (pct: number) => void): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}${path}`)
    xhr.withCredentials = true

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      let data: any = {}
      try { data = JSON.parse(xhr.responseText) } catch { data = { success: false, message: 'Upload failed' } }
      if (xhr.status === 401) {
        clearToken()
        if (typeof window !== 'undefined' && window.location.pathname !== '/') window.location.href = '/'
        reject(new Error(data.message || 'Session expired — please sign in again'))
        return
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.message || 'Upload failed'))
        return
      }
      resolve(data)
    }

    xhr.onerror = () => reject(new Error('Upload failed — network error'))
    xhr.send(formData)
  })
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
      return request('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    },
    logout: () => request('/admin/logout', { method: 'POST' }).catch(() => {}),
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
    getAdmins:      () => request('/admin/users/admin-accounts/list'),
    createAdmin:    (data: any) => request('/admin/users/admin-accounts', { method: 'POST', body: JSON.stringify(data) }),
    updateAdmin:    (id: string, data: any) => request(`/admin/users/admin-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAdmin:    (id: string) => request(`/admin/users/admin-accounts/${id}`, { method: 'DELETE' }),
    suspicious:     (params: any = {}) => request(`/admin/users/suspicious?${qs(params)}`),
    securityAlerts: (params: any = {}) => request(`/admin/users/security-alerts?${qs(params)}`),
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
    // Upload a PDF/video file for a lesson — returns { fileUrl, fileSizeBytes }
    uploadLessonFile: (courseId: string, file: File, onProgress?: (pct: number) => void) => {
      const fd = new FormData()
      fd.append('file', file)
      return uploadRequestWithProgress(`/admin/courses/${courseId}/lessons/upload-file`, fd, onProgress)
    },
    // Chapter CRUD
    getChapters:    (courseId: string) =>
                      request(`/admin/courses/${courseId}/chapters`),
    // Student reviews/ratings
    getReviews:     (courseId: string) =>
                      request(`/admin/courses/${courseId}/reviews`),
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
    publish:   (id: string) => request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'published' }) }),
    reject:    (id: string, reason: string) => request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'draft', rejection_reason: reason }) }),
    listReview:() => request('/admin/courses?status=review&limit=50'),
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
    review:    (id: string, action: string, reason?: string) =>
                 request(`/admin/library/${id}/review`, { method: 'PUT', body: JSON.stringify({ action, reason }) }),
  },

  studyMaterials: {
    adminStats: () =>
      request('/admin/study-materials/stats'),
  
    adminList: (params = {}) =>
      request(`/admin/study-materials?${qs(params)}`),
  
    approve: (id: string) =>
      request(`/admin/study-materials/${id}/approve`, { method: 'PATCH' }),

    updateLanguage: (id: string, language: string) =>
      request(`/admin/study-materials/${id}/language`, { method: 'PATCH', body: JSON.stringify({ language }) }),
  
    reject: (id: string, reason: string) =>
      request(`/admin/study-materials/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

    // ── Negotiation ──
    counterOffer: (id: string, price: number, message?: string) =>
      request(`/admin/study-materials/${id}/counter-offer`, { method: 'PATCH', body: JSON.stringify({ price, message }) }),

    finalDecision: (id: string, action: 'approve' | 'reject', price?: number, reason?: string) =>
      request(`/admin/study-materials/${id}/final-decision`, { method: 'PATCH', body: JSON.stringify({ action, price, reason }) }),

    // ── Seller wallets (Phase 3) ──
    listWallets: (params: any = {}) =>
      request(`/admin/study-materials/wallets?${qs(params)}`),

    getWalletTransactions: (userId: string, params: any = {}) =>
      request(`/admin/study-materials/wallets/${userId}/transactions?${qs(params)}`),

    // ── Per-material platform revenue (Phase 3 follow-up) ──
    getMaterialRevenue: (params: any = {}) =>
      request(`/admin/study-materials/revenue?${qs(params)}`),

  
    toggleFeatured: (id: string) =>
      request(`/admin/study-materials/${id}/feature`, { method: 'PATCH' }),
  
    toggleTrending: (id: string) =>
      request(`/admin/study-materials/${id}/trending`, { method: 'PATCH' }),
  
    delete: (id: string) =>
      request(`/admin/study-materials/${id}`, {
        method: 'DELETE',
      }),
  
    signedUrl: (id: string) =>
      request(`/admin/study-materials/${id}/url`),

    // Backfill page_count for all PDFs with page_count=0
    backfillPageCounts: () =>
      request(`/admin/study-materials/backfill-page-counts`, { method: 'POST' }),
  },

  // ── Support Escalations (Phase 5) ──────────────────────────
  supportEscalations: {
    list: (params: any = {}) =>
      request(`/admin/support-escalations?${qs(params)}`),
    getChat: (id: string) =>
      request(`/admin/support-escalations/${id}/chat`),
    update: (id: string, data: { status: string; resolutionNote?: string }) =>
      request(`/admin/support-escalations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
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
    // Bulk import: creates quiz shell + all questions in one transaction
    bulkImport: (data: { quiz: any; questions: any[] }) =>
                    request('/admin/quizzes/bulk-import', { method: 'POST', body: JSON.stringify(data) }),
    // Bulk import multiple quizzes: groups questions by quiz_title column
    bulkImportMulti: (groups: { quiz: any; questions: any[] }[]) =>
                    request('/admin/quizzes/bulk-import-multi', { method: 'POST', body: JSON.stringify({ groups }) }),
    updateQuestion:   (questionId: string, d: any)   => request(`/admin/questions/${questionId}`, { method: 'PUT',    body: JSON.stringify(d) }),
    deleteQuestion:   (questionId: string)            => request(`/admin/questions/${questionId}`, { method: 'DELETE' }),
  },

  // ── Current Affairs ───────────────────────────────────────
  currentAffairs: {
    list:   (params = {}) => request(`/admin/current-affairs?${qs(params)}`),
    create: (data: any) => request('/admin/current-affairs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/current-affairs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/current-affairs/${id}`, { method: 'DELETE' }),
    // Used by RichTextEditor — image paste/insert in the article body editor.
    // Returns { data: { url } }.
    uploadImage: (file: File) => {
      const fd = new FormData()
      fd.append('image', file)
      return uploadRequest('/admin/current-affairs/upload-image', fd)
    },
    // Global negative marking config for CA / Practice MCQs (app_settings-backed —
    // CA MCQs are practice questions attached to an article, not a per-test
    // record like quizzes, so this is one toggle that applies to all of them).
    getMcqConfig:    () => request('/admin/current-affairs/mcq-config'),
    updateMcqConfig: (data: any) => request('/admin/current-affairs/mcq-config', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── Jobs ──────────────────────────────────────────────────
  jobs: {
    list:   (params = {}) => request(`/admin/jobs?${qs(params)}`),
    create: (data: any) => request('/admin/jobs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/jobs/${id}`, { method: 'DELETE' }),
    // Upload advertisement PDF for a specific job
    uploadAdvertPdf: (id: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      return request(`/admin/jobs/${id}/advert-pdf`, { method: 'POST', body: form, isFormData: true })
    },
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
    getEconomy:   ()             => request('/admin/coins/economy'),
    updateEconomy:(data: any)    => request('/admin/coins/economy', { method: 'PUT', body: JSON.stringify(data) }),
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

  districts: {
    list:   () => request('/admin/districts'),
    create: (data: any) => request('/admin/districts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/districts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/districts/${id}`, { method: 'DELETE' }),
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
  activity: {
    list: (qs = '') => request(`/admin/activity?${qs}`),
  },

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
    publishNotify: (subject: string, count?: number) =>
      request('/admin/flashcards/publish-notify', { method: 'POST', body: JSON.stringify({ subject, count }) }),
  },

  // ── Payment Management (Issue 4) ──────────────────────────────
  payments: {
    getDashboard:          ()             => request('/admin/payments/dashboard'),
    getCoursePurchases:    (params: any = {}) => request(`/admin/payments/courses?${qs(params)}`),
    getMaterialPurchases:  (params: any = {}) => request(`/admin/payments/materials?${qs(params)}`),
    getSubscriptionPayments: (params: any = {}) => request(`/admin/payments/subscriptions?${qs(params)}`),
    exportCsv: (type: string) => {
      // Cookie is sent automatically by the browser for same-site navigation
      const base = process.env.NEXT_PUBLIC_API_URL || 'https://api.bpscnotes.in/api/v1'
      window.open(`${base}/admin/payments/export?type=${type}`, '_blank')
    },
  },
}

export default api