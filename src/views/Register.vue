<template>
  <div class="auth">
    <div class="auth-card">
      <div class="theme-switch" @click="showThemeMenu = !showThemeMenu">
        <span>🎨</span>
        <div v-if="showThemeMenu" class="theme-dropdown">
          <div v-for="t in allThemes" :key="t" @click="switchTheme(t)">{{ t }}</div>
        </div>
      </div>

      <h2>注册</h2>
      <input v-model="authUsername" placeholder="用户名" />
      <input v-model="authPassword" type="password" placeholder="密码" />
      <input v-model="securityQuestionInput" placeholder="安全问题（如：我第一只宠物的名字？）" />
      <input v-model="securityAnswerInput" placeholder="答案" />
      <button @click="register">注册</button>
      <p v-if="authError" class="error">{{ authError }}</p>
      <p class="link">
        已有账号？<router-link to="/login">立即登录</router-link>
      </p>
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
const securityQuestionInput = ref('')
const securityAnswerInput = ref('')
const authError = ref('')

async function register() {
  authError.value = ''
  const hashed = sha256(authPassword.value)
  const body = {
    username: authUsername.value,
    password: hashed,
    securityQuestion: securityQuestionInput.value || null,
    securityAnswer: securityAnswerInput.value || null
  }
  const res = await fetch(`${apiBase}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) { authError.value = await res.text(); return }
  const loginRes = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: authUsername.value, password: hashed })
  })
  if (loginRes.ok) {
    const data = await loginRes.json()
    localStorage.setItem('authToken', data.token)
    localStorage.setItem('authUsername', authUsername.value)
    router.push('/chat')
  } else {
    authError.value = '自动登录失败，请手动登录'
  }
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
.link { color: var(--primary-color); cursor: pointer; font-size: 14px; text-align: center; margin-top: 12px; }
</style>