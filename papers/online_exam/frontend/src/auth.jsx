import { createContext, useContext, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  function persist(auth) {
    localStorage.setItem('token', auth.token)
    localStorage.setItem('user', JSON.stringify(auth.user))
    setUser(auth.user)
    return auth.user
  }

  async function login(email, password) {
    return persist(await api.post('/api/auth/login', { email, password }))
  }

  async function register(fullName, email, password) {
    return persist(await api.post('/api/auth/register', { fullName, email, password }))
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
