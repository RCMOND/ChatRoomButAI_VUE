import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import ChatRoom from '../views/ChatRoom.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/chat', component: ChatRoom, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken')
  
  if (to.matched.some(r => r.meta.requiresAuth)) {
    if (!token) {
      next('/login')
    } else {
      // 可选：检查 token 是否过期（如果是 JWT 且保存了过期时间）
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const now = Math.floor(Date.now() / 1000)
        if (payload.exp && now >= payload.exp) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('authUsername')
          next('/login')
          return
        }
      } catch (e) {
        // 非标准 JWT 就忽略
      }
      next()
    }
  } else {
    next()
  }
})

export default router
