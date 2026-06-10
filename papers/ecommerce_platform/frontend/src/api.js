import axios from 'axios'
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4300/api'
export const api = axios.create({ baseURL })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('shop.token')
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})
export const auth = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('shop.token', data.token); localStorage.setItem('shop.user', JSON.stringify(data.user)); return data.user
  },
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('shop.token', data.token); localStorage.setItem('shop.user', JSON.stringify(data.user)); return data.user
  },
  logout() { localStorage.removeItem('shop.token'); localStorage.removeItem('shop.user') },
  user() { const r = localStorage.getItem('shop.user'); return r ? JSON.parse(r) : null },
}
