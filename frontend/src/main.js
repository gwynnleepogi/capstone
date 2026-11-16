
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const originalFetch = window.fetch.bind(window)

window.fetch = (url, options = {}) => {
  const token =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')

  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let requestUrl = url

  if (
    typeof url === 'string' &&
    (url.startsWith('/api/') || url.startsWith('/signatures/')) &&
    API_BASE_URL
  ) {
    requestUrl = API_BASE_URL + url
  }

  return originalFetch(requestUrl, {
    ...options,
    headers: headers
  })
}

createApp(App)
  .use(router)
  .mount('#app')
