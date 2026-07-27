const USER_KEY = 'user_data'

// La sesión real vive en una cookie httpOnly puesta por el backend (no accesible por JS).
// `user_data` es solo un perfil no sensible en localStorage para decisiones de UI/routing;
// la fuente de verdad para autenticación siempre es el backend (cookie + CSRF).
export const removeToken = () => {
  localStorage.removeItem(USER_KEY)
}

export const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export const hasValidSession = () => Boolean(getUser())

export const getUser = () => {
  const userData = localStorage.getItem(USER_KEY)
  return userData ? JSON.parse(userData) : null
}

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
