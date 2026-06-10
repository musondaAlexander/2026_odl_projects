import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export const api = axios.create({ baseURL })

// Attach the JWT access token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sfs.access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Transparently refresh the access token on a 401, once.
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true
      const refresh = localStorage.getItem('sfs.refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(`${baseURL}/auth/token/refresh/`, { refresh })
          localStorage.setItem('sfs.access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('sfs.access')
          localStorage.removeItem('sfs.refresh')
        }
      }
    }
    return Promise.reject(error)
  },
)

export const auth = {
  async login(username, password) {
    const { data } = await api.post('/auth/token/', { username, password })
    localStorage.setItem('sfs.access', data.access)
    localStorage.setItem('sfs.refresh', data.refresh)
    return data
  },
  async register(username, email, password) {
    return api.post('/accounts/register/', { username, email, password })
  },
  logout() {
    localStorage.removeItem('sfs.access')
    localStorage.removeItem('sfs.refresh')
  },
  isAuthenticated() {
    return Boolean(localStorage.getItem('sfs.access'))
  },
}
