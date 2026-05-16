// import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

// // ── Base URL — change only this to point to your backend ─────
// const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

// // ── Axios instance ────────────────────────────────────────────
// const api: AxiosInstance = axios.create({
//   baseURL: BASE_URL,
//   timeout: 15000,
//   headers: { 'Content-Type': 'application/json' },
// })

// // ── Request interceptor — attach admin JWT ────────────────────
// api.interceptors.request.use(
//   (config: InternalAxiosRequestConfig) => {
//     if (typeof window !== 'undefined') {
//       const token = localStorage.getItem('adminToken')
//       if (token) config.headers.Authorization = `Bearer ${token}`
//     }
//     return config
//   },
//   (error) => Promise.reject(error)
// )

// // ── Response interceptor — handle 401 ────────────────────────
// api.interceptors.response.use(
//   (response) => response,
//   (error: AxiosError<{ message?: string; success?: boolean }>) => {
//     if (error.response?.status === 401) {
//       if (typeof window !== 'undefined') {
//         localStorage.removeItem('adminToken')
//         localStorage.removeItem('adminUser')
//         window.location.href = '/'
//       }
//     }
//     return Promise.reject(error)
//   }
// )

// export default api
// export { BASE_URL }
