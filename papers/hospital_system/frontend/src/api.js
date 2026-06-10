import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4200/api'
export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms.access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authApi = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('hms.access', data.accessToken)
    localStorage.setItem('hms.refresh', data.refreshToken)
    localStorage.setItem('hms.user', JSON.stringify(data.user))
    return data.user
  },
  logout() {
    localStorage.removeItem('hms.access')
    localStorage.removeItem('hms.refresh')
    localStorage.removeItem('hms.user')
  },
  user() {
    const raw = localStorage.getItem('hms.user')
    return raw ? JSON.parse(raw) : null
  },
}
