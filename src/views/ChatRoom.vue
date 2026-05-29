<template>
  <div class="chat-layout">
    <!-- 侧边栏：在线用户 + 公告 -->
    <aside class="chat-sidebar">
      <div class="sidebar-header">在线用户</div>
      <div class="user-list">
        <div v-for="user in onlineUsers" :key="user" class="user-item" @click="mentionUser(user)">@{{ user }}</div>
      </div>
      <div v-if="adminAnnouncement" class="admin-announcement">{{ adminAnnouncement }}</div>
    </aside>

    <!-- 主聊天区 -->
    <div class="chat-main">
      <div class="chat-header">
        <!-- 当前用户头像（可点击更换） -->
        <div class="current-user-avatar" @click="triggerAvatarChange" title="点击更换头像">
          <img :src="currentAvatarUrl || defaultAvatar" class="avatar-img" />
          <div class="avatar-overlay">换</div>
        </div>

        <span class="username-display">{{ username }}</span>

        <div class="header-actions">
          <button class="icon-btn" @click="triggerAvatarChange">🖼️</button>
          <button class="icon-btn" @click="showThemePicker = !showThemePicker">🎨</button>
          <button class="icon-btn" @click="logout">退出</button>
        </div>
      </div>

      <!-- 隐藏的文件选择框 -->
      <input type="file" ref="avatarFileInput" accept="image/*" @change="onAvatarFileSelected" hidden />

      <!-- 主题面板 -->
      <div v-if="showThemePicker" class="theme-panel">
        <div class="theme-grid">
          <div v-for="t in allThemes" :key="t" class="theme-chip" :class="{ active: currentTheme === t }" @click="switchTheme(t)">{{ t }}</div>
        </div>
        <div class="import-section">
          <button @click="importTheme" class="import-btn">📂 导入 CSS 主题文件</button>
          <input type="file" ref="themeFileInput" accept=".css" @change="handleThemeFile" hidden />
        </div>
      </div>

      <!-- 音乐控制栏（始终显示） -->
      <div class="music-bar">
        <span>🎵</span>
        <span class="song-title">{{ musicState.currentTitle || '未播放' }}</span>
        <button v-if="musicState.currentUrl" class="icon-btn" @click="toggleGlobalMusic">{{ musicState.isPlaying ? '⏸️' : '▶️' }}</button>
        <button v-if="musicState.currentUrl" class="icon-btn" @click="connection.invoke('NextMusic')">⏭️</button>
        <button v-if="musicState.currentUrl" class="icon-btn" @click="connection.invoke('SetCycleMode', musicState.cycleMode === 'single' ? 'list' : 'single')">
          🔁 {{ musicState.cycleMode === 'single' ? '单曲' : '列表' }}
        </button>
        <button v-if="musicState.currentUrl" class="icon-btn" @click="connection.invoke('StopMusic')">⏹️</button>
        <button class="icon-btn" @click="showPlaylist = !showPlaylist">📋</button>
      </div>

      <!-- 播放列表 -->
      <div v-if="showPlaylist" class="playlist-dropdown">
        <div v-for="(track, idx) in playlist" :key="idx" class="playlist-item" @click="connection.invoke('PlayMusic', track.url, track.title)">
          {{ track.title }}
        </div>
      </div>

      <!-- 消息区域 -->
      <div class="messages" ref="msgBox">
        <div v-for="(msg, idx) in messages" :key="idx" class="message-row" :class="{ 'is-self': msg.user === username }">
          <img :src="msg.avatar || defaultAvatar" class="msg-avatar" />
          <div class="message-bubble">
            <div class="msg-sender">{{ msg.user }}</div>
            <div v-if="msg.type === 'image'"><img :src="msg.text" style="max-width:200px; border-radius:8px;" /></div>
            <div v-else-if="msg.type === 'file'">
              <div v-if="isAudioFile(msg.text)">
                <audio controls :src="msg.text"></audio>
                <button class="add-music-btn" @click="addToPlaylist(msg.text, msg.fileName || '音乐')">🎵 加入列表</button>
              </div>
              <video v-else-if="isVideoFile(msg.text)" controls :src="msg.text" style="max-width:100%"></video>
              <a v-else :href="msg.text" target="_blank">📁 {{ msg.fileName || '下载' }}</a>
            </div>
            <div v-else>{{ msg.text }}</div>
          </div>
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="showProgress" class="progress-bar">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
        <span>{{ uploadProgress }}%</span>
      </div>

      <!-- 输入区 -->
      <div class="input-area">
        <button class="icon-btn" @click="toggleEmoji">😊</button>
        <input type="file" ref="fileInput" @change="uploadImage" hidden />
        <button class="icon-btn" @click="$refs.fileInput.click()">🖼️</button>
        <input type="file" ref="fileUploadInput" @change="uploadFile" hidden />
        <button class="icon-btn" @click="$refs.fileUploadInput.click()">📎</button>
        <button class="icon-btn" @click="clearMessages">🗑️</button>
        <input class="msg-input" v-model="newMessage" @keyup.enter="sendText" placeholder="输入消息..." />
        <button class="send-btn" @click="sendText">发送</button>
      </div>

      <!-- 表情面板 -->
      <div v-if="showEmoji" class="emoji-panel">
        <span v-for="e in emojis" :key="e" @click="addEmoji(e)">{{ e }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as signalR from '@microsoft/signalr'

const router = useRouter()
const apiBase = window.__BASE_URL__ || ''

// ==================== 主题 ====================
const showThemePicker = ref(false)
const currentTheme = ref(localStorage.getItem('chatTheme') || '默认')
const themeFileInput = ref(null)

const allThemes = computed(() => {
  const builtin = window.__getBuiltinThemes?.()?.map(t => t.name) || []
  const imported = window.__getImportedThemeList?.() || []
  return [...builtin, ...imported]
})

function switchTheme(name) {
  window.__applyTheme?.(name)
  showThemePicker.value = false
}

function importTheme() { themeFileInput.value?.click() }

function handleThemeFile(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 500 * 1024) { alert('主题文件不能超过 500KB'); return }
  const reader = new FileReader()
  reader.onload = (ev) => {
    const css = ev.target.result
    const name = file.name.replace('.css', '')
    if (!name) { alert('文件名无效'); return }
    window.__importTheme?.(name, css)
    switchTheme(name)
    alert(`主题“${name}”已导入并应用`)
  }
  reader.readAsText(file)
  e.target.value = ''
}

// ==================== 用户 ====================
const username = ref(localStorage.getItem('authUsername') || '')
const token = ref(localStorage.getItem('authToken') || '')

// ==================== 头像 ====================
const currentAvatarUrl = ref('')
const avatarFileInput = ref(null)
const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%23bdbdbd"/%3E%3C/svg%3E'

function getFullUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = apiBase || ''
  return base ? base + path : path
}

function triggerAvatarChange() { avatarFileInput.value?.click() }

async function onAvatarFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) { alert('头像不能超过 2MB'); return }
  if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return }
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch(uploadApiUrl, { method: 'POST', body: formData })
    if (!res.ok) throw new Error('上传失败')
    const data = await res.json()
    const fullUrl = getFullUrl(data.url)
    currentAvatarUrl.value = fullUrl
    await connection.invoke('UpdateAvatar', data.url)
  } catch (err) { console.error(err); alert('头像更换失败') }
  finally { event.target.value = '' }
}

// ==================== 聊天 ====================
const messages = ref([])
const newMessage = ref('')
const msgBox = ref(null)
const showEmoji = ref(false)
const emojis = ['😀','😂','😍','😎','🥳','😢','😡','👍','👎','❤️','🔥','🎉']
const onlineUsers = ref([])
const uploadProgress = ref(0)
const showProgress = ref(false)

// ==================== 音乐 ====================
const playlist = ref([])
const showPlaylist = ref(false)
const musicState = reactive({
  currentUrl: null, currentTitle: null, currentTime: 0, isPlaying: false, cycleMode: 'list'
})
let bgAudioElement = null

const adminAnnouncement = ref('')

// ==================== SignalR ====================
let connection = null
const hubUrl = apiBase ? `${apiBase}/chatHub` : '/chatHub'
const uploadApiUrl = apiBase ? `${apiBase}/api/upload` : '/api/upload'

function startConnection() {
  if (!token.value) { router.push('/login'); return }
  connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, { accessTokenFactory: () => token.value })
    .withAutomaticReconnect()
    .build()

  connection.on('ReceiveMessage', (user, text, type, avatar, fileName) => {
    messages.value.push({ user, text, type, avatar: getFullUrl(avatar) || '', fileName })
  })
  connection.on('UserJoined', (user, avatar) => {
    messages.value.push({ user: '系统', text: `${user} 加入了聊天室`, type: 'text', avatar: getFullUrl(avatar) || defaultAvatar })
  })
  connection.on('UserLeft', user => {
    messages.value.push({ user: '系统', text: `${user} 离开了聊天室`, type: 'text', avatar: defaultAvatar })
  })
  connection.on('Kickout', msg => { alert(msg); logout() })
  connection.on('Muted', msg => { alert(msg) })
  connection.on('AvatarChanged', (changedUser, newAvatar) => {
    const fullAvatar = getFullUrl(newAvatar)
    messages.value.forEach(msg => { if (msg.user === changedUser) msg.avatar = fullAvatar })
    if (changedUser === username.value) currentAvatarUrl.value = fullAvatar
  })
  connection.on('PlaylistUpdated', list => { playlist.value = list.map(p => ({ url: p.url, title: p.title })) })
  connection.on('MusicStateUpdated', state => {
    Object.assign(musicState, state)
    syncLocalPlayer(state)
  })
  connection.onclose(() => { alert('连接断开'); logout() })

  connection.start().then(async () => {
    await connection.invoke('Join', '')
    const history = await connection.invoke('GetRecentMessages')
    messages.value = history.map(m => ({
      user: m.user, text: m.text, type: m.type, avatar: getFullUrl(m.avatar) || defaultAvatar, fileName: m.fileName
    }))
    const myMsgs = messages.value.filter(m => m.user === username.value)
    currentAvatarUrl.value = myMsgs.length > 0 ? myMsgs[myMsgs.length - 1].avatar : defaultAvatar

    try { const initState = await connection.invoke('GetMusicState'); Object.assign(musicState, initState); syncLocalPlayer(initState) } catch {}
    try { const serverPlaylist = await connection.invoke('GetPlaylist'); if (serverPlaylist) playlist.value = serverPlaylist.map(p => ({ url: p.url, title: p.title })) } catch {}

    setInterval(async () => { try { const ann = await connection.invoke('GetAdminAnnouncement'); if (ann) adminAnnouncement.value = ann } catch {} }, 30000)
    startOnlineUsersPolling()
  }).catch(err => { console.error(err); logout() })
}

function syncLocalPlayer(state) {
  if (!state.currentUrl) {
    if (bgAudioElement) { bgAudioElement.pause(); bgAudioElement = null }
    return
  }
  const needNewAudio = !bgAudioElement || bgAudioElement.src !== state.currentUrl
  if (needNewAudio) {
    if (bgAudioElement) bgAudioElement.pause()
    bgAudioElement = new Audio(state.currentUrl)
    bgAudioElement.addEventListener('ended', () => connection.invoke('NextMusic'))
  }
  if (Math.abs(bgAudioElement.currentTime - state.currentTime) > 1) bgAudioElement.currentTime = state.currentTime
  if (state.isPlaying) bgAudioElement.play().catch(() => {})
  else bgAudioElement.pause()
}

function toggleGlobalMusic() {
  if (musicState.isPlaying) connection.invoke('PauseMusic')
  else connection.invoke('ResumeMusic')
}

async function addToPlaylist(url, title) { await connection.invoke('AddToPlaylist', url, title) }

function startOnlineUsersPolling() {
  setInterval(async () => {
    try { const res = await fetch(`${apiBase}/api/admin/onlineUsers`); if (res.ok) onlineUsers.value = await res.json() } catch {}
  }, 5000)
}

function sendText() {
  const text = newMessage.value.trim()
  if (!text) return
  connection.invoke('SendMessage', text)
  newMessage.value = ''
}

function uploadImage(event) {
  const file = event.target.files[0]
  if (!file) return
  if (file.size > 5*1024*1024) { alert('图片不能超过5MB'); return }
  if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return }
  uploadProgress.value = 0
  showProgress.value = true
  const formData = new FormData(); formData.append('file', file)
  const xhr = new XMLHttpRequest()
  xhr.timeout = 600000
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
  })
  xhr.addEventListener('load', async () => {
    showProgress.value = false
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText)
      connection.invoke('SendImage', data.url)
    } else alert('图片上传失败')
  })
  xhr.addEventListener('error', () => { showProgress.value = false; alert('图片上传失败') })
  xhr.ontimeout = () => { showProgress.value = false; alert('上传超时') }
  xhr.open('POST', uploadApiUrl)
  xhr.send(formData)
  event.target.value = ''
}

function uploadFile(event) {
  const file = event.target.files[0]
  if (!file) return
  const maxSize = 2 * 1024 * 1024 * 1024
  if (file.size > maxSize) { alert('文件不能超过 2GB'); return }
  uploadProgress.value = 0
  showProgress.value = true
  const formData = new FormData(); formData.append('file', file)
  const xhr = new XMLHttpRequest()
  xhr.timeout = 600000
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
  })
  xhr.addEventListener('load', async () => {
    uploadProgress.value = 100
    setTimeout(() => { showProgress.value = false }, 500)
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText)
      connection.invoke('SendFile', data.url, data.fileName)
    } else alert('文件上传失败')
  })
  xhr.addEventListener('error', () => { showProgress.value = false; alert('文件上传失败') })
  xhr.ontimeout = () => { showProgress.value = false; alert('上传超时') }
  xhr.open('POST', uploadApiUrl)
  xhr.send(formData)
  event.target.value = ''
}

function clearMessages() {
  if (messages.value.length === 0) return
  if (confirm('确定要清除当前聊天记录吗？此操作仅清除本地显示，不影响他人。')) messages.value = []
}

function logout() {
  connection?.stop()
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUsername')
  router.push('/login')
}

function mentionUser(user) { newMessage.value += `@${user} ` }
function toggleEmoji() { showEmoji.value = !showEmoji.value }
function addEmoji(e) { newMessage.value += e }

function getFileExtension(url) { return url.split('?')[0].split('.').pop()?.toLowerCase() || '' }
function isAudioFile(url) { return ['mp3','wav','ogg','aac','flac'].includes(getFileExtension(url)) }
function isVideoFile(url) { return ['mp4','webm','mov'].includes(getFileExtension(url)) }

onMounted(() => {
  if (!token.value) router.push('/login')
  else startConnection()
})

onUnmounted(() => {
  if (bgAudioElement) { bgAudioElement.pause(); bgAudioElement = null }
})
</script>

<style scoped>
/* ===== 全局布局 ===== */
.chat-layout { display: flex; height: 100vh; background: var(--bg-color); color: var(--text-color); }
.chat-sidebar { width: 220px; background: var(--surface-color); border-right: 1px solid var(--border-color); padding: 15px; overflow-y: auto; }
.sidebar-header { font-weight: bold; margin-bottom: 10px; }
.user-list { margin-bottom: 20px; }
.user-item { padding: 6px 8px; cursor: pointer; border-radius: 6px; }
.user-item:hover { background: var(--hover-bg); }
.admin-announcement { margin-top: 10px; padding: 8px; background: var(--primary-light); border-radius: 8px; font-size: 13px; }

/* ===== 主聊天区 ===== */
.chat-main { flex: 1; display: flex; flex-direction: column; }
.chat-header { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: var(--surface-color); border-bottom: 1px solid var(--border-color); }
.header-actions { display: flex; gap: 8px; }
.icon-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-color); padding: 4px; border-radius: 4px; }
.icon-btn:hover { background: var(--hover-bg); }

/* 当前用户头像 */
.current-user-avatar {
  position: relative; width: 40px; height: 40px; border-radius: 50%; overflow: hidden;
  cursor: pointer; margin-right: 10px; border: 2px solid var(--primary-color); flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-overlay {
  position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5);
  color: white; font-size: 10px; text-align: center; padding: 2px 0; opacity: 0; transition: opacity 0.2s;
}
.current-user-avatar:hover .avatar-overlay { opacity: 1; }

/* 主题面板 */
.theme-panel { padding: 10px; background: var(--surface-color); border-bottom: 1px solid var(--border-color); }
.theme-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.theme-chip { padding: 6px 12px; border-radius: 20px; cursor: pointer; border: 1px solid var(--border-color); }
.theme-chip.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
.import-section { margin-top: 10px; }
.import-btn { background: var(--primary-light); border: 1px solid var(--primary-color); color: var(--primary-color); padding: 4px 12px; border-radius: 20px; cursor: pointer; }

/* 音乐控制条 */
.music-bar { display: flex; align-items: center; gap: 8px; padding: 8px 15px; background: var(--surface-color); border-bottom: 1px solid var(--border-color); }
.playlist-dropdown { position: absolute; top: 120px; right: 15px; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; z-index: 10; }
.playlist-item { padding: 6px 12px; cursor: pointer; }
.playlist-item:hover { background: var(--hover-bg); }

/* 消息区域 */
.messages { flex: 1; overflow-y: auto; padding: 15px; }
.message-row { display: flex; margin-bottom: 15px; }
.message-row.is-self { flex-direction: row-reverse; }
.msg-avatar { width: 36px; height: 36px; border-radius: 50%; margin: 0 10px; }
.message-bubble { max-width: 60%; padding: 10px 14px; border-radius: 18px; background: var(--msg-other-bg); box-shadow: var(--shadow); }
.is-self .message-bubble { background: var(--msg-self-bg); }
.msg-sender { font-weight: bold; font-size: 13px; margin-bottom: 4px; }

/* 进度条 */
.progress-bar { height: 20px; background: var(--progress-bg); border-radius: 10px; margin: 10px; overflow: hidden; position: relative; }
.progress-fill { height: 100%; background: var(--progress-fill); transition: width 0.3s; }

/* 输入区 */
.input-area { display: flex; align-items: center; gap: 8px; padding: 15px; background: var(--surface-color); border-top: 1px solid var(--border-color); }
.msg-input { flex: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 20px; background: var(--input-bg); color: var(--text-color); outline: none; }
.send-btn { background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; }

/* 表情面板 */
.emoji-panel { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px; background: var(--surface-color); border-top: 1px solid var(--border-color); }
</style>