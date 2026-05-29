import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

function waitForConfig() {
  return new Promise((resolve) => {
    if (window.__APP_CONFIG__?.apiBaseUrl !== undefined) {
      resolve(window.__APP_CONFIG__)
    } else {
      const check = setInterval(() => {
        if (window.__APP_CONFIG__?.apiBaseUrl !== undefined) {
          clearInterval(check)
          resolve(window.__APP_CONFIG__)
        }
      }, 50)
    }
  })
}

waitForConfig().then((config) => {
  window.__BASE_URL__ = config.apiBaseUrl || ''

  const app = createApp(App)
  app.use(router)
  app.mount('#app')
})