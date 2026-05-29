<template>
  <div class="auth">
    <div class="auth-card">
      <div class="theme-switch" @click="showThemeMenu = !showThemeMenu">
        <span>🎨</span>
        <div v-if="showThemeMenu" class="theme-dropdown">
          <div v-for="t in allThemes" :key="t" @click="switchTheme(t)">{{ t }}</div>
        </div>
      </div>

      <template v-if="showForgotPassword">
        <h2>找回密码</h2>
        <div v-if="!resetStep">
          <input v-model="forgotUsername" placeholder="输入用户名" />
          <button @click="fetchSecurityQuestion">下一步</button>
          <p v-if="forgotError" class="error">{{ forgotError }}</p>
        </div>
        <div v-else>
          <p class="question-label">安全问题：{{ securityQuestion }}</p>
          <input v-model="forgotAnswer" placeholder="答案" />
          <input v-model="newPassword1" type="password" placeholder="新密码" />
          <input v-model="newPassword2" type="password" placeholder="确认新密码" />
          <button @click="resetPassword">重置密码</button>
          <p v-if="forgotError" class="error">{{ forgotError }}</p>
          <p v-if="forgotSuccess" class="success">{{ forgotSuccess }}</p>
        </div>
        <p class="link" @click="cancelForgot">返回登录</p>
      </template>

      <template v-else>
        <h2>登录</h2>
        <input v-model="authUsername" placeholder="用户名" />
        <input v-model="authPassword" type="password" placeholder="密码" @keyup.enter="login" />
        <button @click="login">登录</button>
        <p class="link" @click="showForgotPassword = true">忘记密码？</p>
        <p v-if="authError" class="error">{{ authError }}</p>
        <p class="link">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { sha256 } from 'js-sha256'

const router = useRouter()
const apiBase = window.__BASE_URL__ || ''

const showThemeMenu = ref(false)
const allThemes = computed(() => window.__getAllThemes?.() || [])

function switchTheme(name) {
  window.__applyTheme?.(name)
  showThemeMenu.value = false
}

const authUsername = ref('')
const authPassword = ref('')
const authError = ref('')

const showForgotPassword = ref(false)
const forgotUsername = ref('')
const securityQuestion = ref('')
const forgotAnswer = ref('')
const newPassword1 = ref('')
const newPassword2 = ref('')
const forgotError = ref('')
const forgotSuccess = ref('')
const resetStep = ref(0)

async function login() {
  authError.value = ''
  const hashed = sha256(authPassword.value)
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: authUsername.value, password: hashed })
  })
  if (!res.ok) { authError.value = '用户名或密码错误'; return }
  const data = await res.json()
  localStorage.setItem('authToken', data.token)
  localStorage.setItem('authUsername', authUsername.value)
  router.push('/chat')
}

async function fetchSecurityQuestion() {
  forgotError.value = ''
  const res = await fetch(`${apiBase}/api/auth/security-question?username=${encodeURIComponent(forgotUsername.value)}`)
  if (!res.ok) { forgotError.value = '用户不存在或未设置安全问题'; return }
  const data = await res.json()
  securityQuestion.value = data.question
  resetStep.value = 1
}

async function resetPassword() {
  forgotError.value = ''
  forgotSuccess.value = ''
  if (!forgotAnswer.value || !newPassword1.value || !newPassword2.value) {
    forgotError.value = '请填写所有字段'
    return
  }
  if (newPassword1.value !== newPassword2.value) {
    forgotError.value = '两次密码不一致'
    return
  }
  const hashedPassword = sha256(newPassword1.value)
  const res = await fetch(`${apiBase}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: forgotUsername.value, answer: forgotAnswer.value, newPassword: hashedPassword })
  })
  if (!res.ok) { forgotError.value = (await res.text()) || '重置失败'; return }
  forgotSuccess.value = '密码重置成功！请返回登录'
  setTimeout(() => { cancelForgot() }, 3000)
}

function cancelForgot() {
  showForgotPassword.value = false
  resetStep.value = 0
  forgotUsername.value = ''
  securityQuestion.value = ''
  forgotAnswer.value = ''
  newPassword1.value = ''
  newPassword2.value = ''
  forgotError.value = ''
  forgotSuccess.value = ''
}
</script>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-light), var(--bg-color));
}
.auth-card {
  background: var(--surface-color);
  padding: 40px;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  width: 380px;
  position: relative;
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
}
.theme-switch {
  position: absolute;
  top: 15px;
  right: 15px;
  cursor: pointer;
  font-size: 20px;
}
.theme-dropdown {
  position: absolute;
  top: 30px;
  right: 0;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px;
  min-width: 80px;
  z-index: 10;
}
.theme-dropdown div {
  padding: 6px 12px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.theme-dropdown div:hover { background: var(--hover-bg); }
h2 { text-align: center; margin-bottom: 20px; color: var(--text-color); }
input {
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--input-bg);
  color: var(--text-color);
  box-sizing: border-box;
}
button {
  width: 100%;
  padding: 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.2s;
}
button:hover { opacity: 0.9; }
.error { color: #ef4444; font-size: 12px; margin-top: 4px; }
.success { color: #22c55e; font-size: 12px; margin-top: 4px; }
.link { color: var(--primary-color); cursor: pointer; font-size: 14px; text-align: center; margin-top: 12px; }
.question-label { margin-bottom: 12px; color: var(--text-color); }
</style>