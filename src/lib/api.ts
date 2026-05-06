// ════════════════════════════════════════════════════════════
// BPSCNotes Admin — API Client
//
// BUG FIXED: request() hardcoded http://localhost:5000/api/v1
// which worked on the developer's machine but failed in production
// because the admin panel runs at admin.bpscnotes.in and the browser
// can't reach "localhost:5000" (that's the user's own machine, not the server).
//
// Fix: all fetch calls use BASE_URL which reads NEXT_PUBLIC_API_URL
// from the .env file → https://api.bpscnotes.in/api/v1
// ════════════════════════════════════════════════════════════

// NEXT_PUBLIC_ prefix means Next.js bakes this into the client bundle at build time.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.bpscnotes.in/api/v1'

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
const request = async (url: string, options: RequestInit & { body?: any } = {}) => {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // BUG FIX: was `http://localhost:5000/api/v1${url}` — hardcoded localhost.
  // Now uses BASE_URL which reads NEXT_PUBLIC_API_URL from .env
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (res.status === 401) {
    // Token expired — clear session and redirect to login
    clearToken()
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
    throw new Error('Session expired. Please log in again.')
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`)
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
// API Methods — unchanged
// ════════════════════════════════════════════════════════════
export const api = {

  auth: {
    login: async (email: string, password: string) => {
      const res = await request('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.data?.token) setToken(res.data.token)
      return res
    },
    logout: () => clearToken(),
  },

  dashboard: {
    getStats:            () => request('/admin/stats'),
    getChart:            (type: string, period = '12months') =>
                           request(`/admin/analytics/chart?type=${type}&period=${period}`),
    getRevenueBreakdown: () => request('/admin/analytics/revenue-breakdown'),
    getExamDistribution: () => request('/admin/analytics/exam-distribution'),
  },

  users: {
    list:         (params = {}) => request(`/admin/users?${qs(params)}`),
    getById:      (id: string)  => request(`/admin/users/${id}`),
    updateStatus: (id: string, status: string) =>
                    request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    verify:       (id: string)  => request(`/admin/users/${id}/verify`, { method: 'PUT' }),
    delete:       (id: string)  => request(`/admin/users/${id}`, { method: 'DELETE' }),
    awardCoins:   (userId: string, amount: number, reason: string) =>
                    request('/admin/users/award-coins', { method: 'POST', body: JSON.stringify({ userId, amount, reason }) }),
    getAdmins:    () => request('/admin/users/admin-accounts/list'),
    createAdmin:  (data: any) => request('/admin/users/admin-accounts', { method: 'POST', body: JSON.stringify(data) }),
    updateAdmin:  (id: string, data: any) => request(`/admin/users/admin-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAdmin:  (id: string) => request(`/admin/users/admin-accounts/${id}`, { method: 'DELETE' }),
  },

  courses: {
    list:            (params = {}) => request(`/admin/courses?${qs(params)}`),
    create:          (data: any)   => request('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
    update:          (id: string, data: any) => request(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:          (id: string)  => request(`/admin/courses/${id}`, { method: 'DELETE' }),
    uploadThumbnail: (id: string, file: File) => {
      const fd = new FormData()
      fd.append('thumbnail', file)
      return uploadRequest(`/admin/courses/${id}/thumbnail`, fd)
    },
  },

  library: {
    list:       (params = {}) => request(`/admin/library?${qs(params)}`),
    create:     (data: any, file?: File) => {
      if (file) {
        const fd = new FormData()
        Object.entries(data).forEach(([k, v]) => fd.append(k, String(v)))
        fd.append('file', file)
        return uploadRequest('/admin/library', fd)
      }
      return request('/admin/library', { method: 'POST', body: JSON.stringify(data) })
    },
    update:     (id: string, data: any) => request(`/admin/library/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:     (id: string) => request(`/admin/library/${id}`, { method: 'DELETE' }),
    getPending: () => request('/admin/library/pending-reviews'),
    review:     (id: string, action: string) =>
                  request(`/admin/library/${id}/review`, { method: 'PUT', body: JSON.stringify({ action }) }),
  },

  quizzes: {
    list:         (params = {}) => request(`/admin/quizzes?${qs(params)}`),
    create:       (data: any)   => request('/admin/quizzes', { method: 'POST', body: JSON.stringify(data) }),
    update:       (id: string, data: any) => request(`/admin/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addQuestions: (quizId: string, questions: any[]) =>
                    request(`/admin/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify({ questions }) }),
    getQuestions: (quizId: string) => request(`/admin/quizzes/${quizId}/questions`),
    deleteQuestion:(questionId: string) => request(`/admin/questions/${questionId}`, { method: 'DELETE' }),
  },

  currentAffairs: {
    list:   (params = {}) => request(`/admin/current-affairs?${qs(params)}`),
    create: (data: any)   => request('/admin/current-affairs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/current-affairs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string)  => request(`/admin/current-affairs/${id}`, { method: 'DELETE' }),
  },

  jobs: {
    list:   (params = {}) => request(`/admin/jobs?${qs(params)}`),
    create: (data: any)   => request('/admin/jobs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string)  => request(`/admin/jobs/${id}`, { method: 'DELETE' }),
  },

  subscriptions: {
    list:         (params = {}) => request(`/admin/subscriptions?${qs(params)}`),
    getCoupons:   () => request('/admin/subscriptions/coupons'),
    createCoupon: (data: any)   => request('/admin/subscriptions/coupons', { method: 'POST', body: JSON.stringify(data) }),
    updateCoupon: (id: string, data: any) => request(`/admin/subscriptions/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCoupon: (id: string)  => request(`/admin/subscriptions/coupons/${id}`, { method: 'DELETE' }),
  },

  notifications: {
    list: () => request('/admin/notifications'),
    send: (data: any) => request('/admin/notifications/send', { method: 'POST', body: JSON.stringify(data) }),
  },

  coins: {
    getRules:      () => request('/admin/coins/rules'),
    updateRule:    (id: string, data: any) => request(`/admin/coins/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getTopEarners: () => request('/admin/coins/top-earners'),
  },

  studyRooms: {
    list:   () => request('/admin/study-rooms'),
    create: (data: any) => request('/admin/study-rooms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/study-rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    end:    (id: string) => request(`/admin/study-rooms/${id}/end`, { method: 'PUT' }),
  },

  exams: {
    list:   () => request('/admin/exams'),
    create: (data: any) => request('/admin/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  banners: {
    list:   () => request('/admin/banners'),
    create: (data: any)  => request('/admin/banners', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/banners/${id}`, { method: 'DELETE' }),
  },

  liveClasses: {
    list:   () => request('/admin/live-classes'),
    create: (data: any)  => request('/admin/live-classes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/live-classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  leaderboard: {
    list:        () => request('/admin/leaderboard'),
    recalculate: () => request('/admin/leaderboard/recalculate', { method: 'POST' }),
  },

  certificates: {
    list: (params = {}) => request(`/admin/certificates?${qs(params)}`),
  },

  settings: {
    getAll: () => request('/admin/settings'),
    update: (settings: Record<string, string>) =>
              request('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  },

  adminUsers: {
    list:   () => request('/admin/users/admin-accounts/list'),
    create: (data: any) => request('/admin/users/admin-accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/admin/users/admin-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/admin/users/admin-accounts/${id}`, { method: 'DELETE' }),
  },
}

export default api
