<template>
  <router-view />
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'

// 内置主题
const builtinThemes = [
  {
    name: '默认',
    vars: {
      '--bg-color': '#f5f7fa',
      '--surface-color': '#ffffff',
      '--text-color': '#2c3e50',
      '--text-secondary': '#606266',
      '--primary-color': '#409eff',
      '--primary-light': '#ecf5ff',
      '--border-color': '#dcdfe6',
      '--input-bg': '#ffffff',
      '--hover-bg': '#f2f3f5',
      '--msg-user-color': '#2c3e50',
      '--progress-bg': '#e9ecef',
      '--progress-fill': '#409eff',
      '--file-link-color': '#409eff',
      '--shadow': '0 2px 12px rgba(0,0,0,0.05)',
      '--radius': '8px'
    }
  },
  {
    name: '暗黑',
    vars: {
      '--bg-color': '#1e1e2f',
      '--surface-color': '#2a2a3d',
      '--text-color': '#e0e0e0',
      '--text-secondary': '#a0a0b0',
      '--primary-color': '#90caf9',
      '--primary-light': '#1a2533',
      '--border-color': '#3a3a4a',
      '--input-bg': '#2a2a3d',
      '--hover-bg': '#353550',
      '--msg-user-color': '#e0e0e0',
      '--progress-bg': '#3a3a4a',
      '--progress-fill': '#90caf9',
      '--file-link-color': '#90caf9',
      '--shadow': '0 2px 12px rgba(0,0,0,0.3)',
      '--radius': '8px'
    }
  },
  {
    name: '自然',
    vars: {
      '--bg-color': '#f0f7e6',
      '--surface-color': '#ffffff',
      '--text-color': '#2e7d32',
      '--text-secondary': '#558b2f',
      '--primary-color': '#43a047',
      '--primary-light': '#e8f5e9',
      '--border-color': '#c8e6c9',
      '--input-bg': '#ffffff',
      '--hover-bg': '#e8f5e9',
      '--msg-user-color': '#1b5e20',
      '--progress-bg': '#c8e6c9',
      '--progress-fill': '#43a047',
      '--file-link-color': '#2e7d32',
      '--shadow': '0 2px 12px rgba(0,0,0,0.05)',
      '--radius': '8px'
    }
  }
]

// 导出供其他组件使用
window.__BUILTIN_THEMES__ = builtinThemes

const currentTheme = ref(localStorage.getItem('chatTheme') || '默认')

// 获取导入的主题列表
function getImportedThemes() {
  const list = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('importedTheme_')) {
      list.push(key.replace('importedTheme_', ''))
    }
  }
  return list
}

// 应用到根元素
function applyTheme(themeName) {
  currentTheme.value = themeName
  localStorage.setItem('chatTheme', themeName)

  // 清除之前导入的主题样式
  document.querySelectorAll('style[data-theme="imported"]').forEach(el => el.remove())

  const builtin = builtinThemes.find(t => t.name === themeName)
  if (builtin) {
    Object.entries(builtin.vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  } else {
    // 加载导入的主题 CSS
    const css = localStorage.getItem(`importedTheme_${themeName}`)
    if (css) {
      const style = document.createElement('style')
      style.setAttribute('data-theme', 'imported')
      style.textContent = css
      document.head.appendChild(style)
    } else {
      // 未找到主题，回退到默认
      applyTheme('默认')
    }
  }
}

// 初始化主题
applyTheme(currentTheme.value)

// 挂载到 window，供其他组件调用
window.__applyTheme = applyTheme
window.__getAllThemes = () => {
  const builtinNames = builtinThemes.map(t => t.name)
  const importedNames = getImportedThemes()
  return [...builtinNames, ...importedNames]
}
window.__isImportedTheme = (name) => getImportedThemes().includes(name)
window.__importTheme = (name, css) => {
  localStorage.setItem(`importedTheme_${name}`, css)
}
window.__removeImportedTheme = (name) => {
  localStorage.removeItem(`importedTheme_${name}`)
}
</script>