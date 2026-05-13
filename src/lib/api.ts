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

  console.log("TOKEN IN REQUEST 👉", token) // 🔍 debug

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
        console.log("SETTING TOKEN 👉", res.data.token)

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

  // ── Quizzes ───────────────────────────────────────────────
  quizzes: {
    list:         (params = {}) => request(`/admin/quizzes?${qs(params)}`),
    create:       (data: any) => request('/admin/quizzes', { method: 'POST', body: JSON.stringify(data) }),
    update:       (id: string, data: any) => request(`/admin/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addQuestions: (quizId: string, questions: any[]) =>
                    request(`/admin/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify({ questions }) }),
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
    list:         (params = {}) => request(`/admin/subscriptions?${qs(params)}`),
    getCoupons:   () => request('/admin/subscriptions/coupons'),
    createCoupon: (data: any) => request('/admin/subscriptions/coupons', { method: 'POST', body: JSON.stringify(data) }),
    updateCoupon: (id: string, data: any) => request(`/admin/subscriptions/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCoupon: (id: string) => request(`/admin/subscriptions/coupons/${id}`, { method: 'DELETE' }),
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: {
    list: () => request('/admin/notifications'),
    send: (data: any) => request('/admin/notifications/send', { method: 'POST', body: JSON.stringify(data) }),
  },

  // ── Coins ─────────────────────────────────────────────────
  coins: {
    getRules:     () => request('/admin/coins/rules'),
    updateRule:   (id: string, data: any) => request(`/admin/coins/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getTopEarners:() => request('/admin/coins/top-earners'),
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
    list:   () => request('/admin/exams'),
    create: (data: any) => request('/admin/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
    list:   () => request('/admin/live-classes'),
    create: (data: any) => request('/admin/live-classes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/live-classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── Leaderboard ───────────────────────────────────────────
  leaderboard: {
    list:        () => request('/admin/leaderboard'),
    recalculate: () => request('/admin/leaderboard/recalculate', { method: 'POST' }),
  },

  // ── Certificates ──────────────────────────────────────────
  certificates: {
    list: (params = {}) => request(`/admin/certificates?${qs(params)}`),
  },

  // ── Settings ──────────────────────────────────────────────
  settings: {
    getAll: () => request('/admin/settings'),
    update: (settings: Record<string, string>) =>
              request('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  },

  // ── Admin Role Management ─────────────────────────────────
  // ── Tier Rooms (Phase 1) ──────────────────────────────────
  tierRooms: {
    getAllTiers:    ()                    => request('/admin/room-tiers'),
    updateTier:    (id: string, d: any)  => request(`/admin/room-tiers/${id}`,       { method: 'PUT',  body: JSON.stringify(d) }),
    getRules:      ()                    => request('/admin/room-tiers/rules'),
    updateRule:    (id: string, d: any)  => request(`/admin/room-tiers/rules/${id}`, { method: 'PUT',  body: JSON.stringify(d) }),
    promoteUser:   (d: any)              => request('/admin/room-tiers/promote',     { method: 'POST', body: JSON.stringify(d) }),
    getDistribution: ()                  => request('/admin/room-tiers/distribution'),
  },

  adminUsers: {
    list:   () => request('/admin/users/admin-accounts/list'),
    create: (data: any) => request('/admin/users/admin-accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/users/admin-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/users/admin-accounts/${id}`, { method: 'DELETE' }),
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
