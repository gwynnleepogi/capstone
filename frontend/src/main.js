import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

const originalFetch = window.fetch.bind(window)

window.fetch = (url, options = {}) => {
  const token = localStorage.getItem('accessToken')
  const headers = new Headers(options.headers || {})

  if (token) headers.set('Authorization', `Bearer ${token}`)

  return originalFetch(url, { ...options, headers })
}

createApp(App)
  .use(router)
  .mount('#app')