import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ff.token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authApi = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('ff.token', data.token)
    localStorage.setItem('ff.user', JSON.stringify(data.user))
    return data.user
  },
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('ff.token', data.token)
    localStorage.setItem('ff.user', JSON.stringify(data.user))
    return data.user
  },
  logout() {
    localStorage.removeItem('ff.token')
    localStorage.removeItem('ff.user')
  },
  currentUser() {
    const raw = localStorage.getItem('ff.user')
    return raw ? JSON.parse(raw) : null
  },
}
