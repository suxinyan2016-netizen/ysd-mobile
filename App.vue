<!-- App.vue -->
<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import GlobalImageViewer from '@/components/GlobalImageViewer.vue'

// 设置全局错误处理
const setupErrorHandling = () => {
  const addListener = (target, type, handler) => {
    try {
      if (target && typeof target.addEventListener === 'function') {
        target.addEventListener(type, handler)
        return true
      }
    } catch (e) {
      // ignore
    }
    return false
  }

  const globalTarget = (typeof window !== 'undefined' && window) || (typeof globalThis !== 'undefined' && globalThis) || null

  // only attach if environment supports addEventListener (H5/web)
  if (globalTarget) {
    addListener(globalTarget, 'unhandledrejection', (event) => {
      console.error('未处理的 Promise 拒绝:', event.reason)

      if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
          event.reason?.message?.includes('Expected a JavaScript-or-Wasm module script')) {
        console.warn('模块导入错误，忽略:', event.reason.message)
        try { event.preventDefault && event.preventDefault() } catch (e) {}
      }
    })

    addListener(globalTarget, 'error', (event) => {
      console.error('全局错误:', event && event.error ? event.error : event)
      try { event.preventDefault && event.preventDefault() } catch (e) {}
    })
  } else {
    // Non-H5 runtimes (native app) do not expose window.addEventListener.
    // Keep a no-op to avoid runtime errors.
    console.log('跳过全局错误监听：当前运行环境不支持 addEventListener')
  }
}

onMounted(() => {
  console.log('App Launch - 应用启动')

  setupErrorHandling()

  // 重要：完全禁用自动跳转，手动控制路由
  setTimeout(() => {
    try {
      console.log('开始检查登录状态（仅检查，不跳转）')
      const userStore = useUserStore()

      // 仅检查，不自动跳转
      const savedToken = uni.getStorageSync('token')
      const savedUser = uni.getStorageSync('loginUser')

      if (savedToken && savedUser) {
        console.log('检测到已登录，设置用户状态')
        userStore.token = savedToken
        try {
          userStore.userInfo = JSON.parse(savedUser)
          userStore.isLoggedIn = true
        } catch (e) {
          console.error('解析用户信息失败:', e)
          userStore.userInfo = null
          userStore.isLoggedIn = false
        }
      } else {
        console.log('未登录状态')
        userStore.token = ''
        userStore.userInfo = null
        userStore.isLoggedIn = false
      }

      console.log('用户状态检查完成:', {
        isLoggedIn: userStore.isLoggedIn,
        userInfo: userStore.userInfo
      })

    } catch (error) {
      console.error('初始化用户状态时出错:', error)
      // 不进行任何跳转
    }
  }, 500)

  // Emulate onShow for H5: log when window gains focus
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('focus', () => console.log('App Show - 应用显示'))
  }
})

// onHide lifecycle is not available in the H5 hook exports used here;
// skip adding an onHide listener to avoid runtime import errors.
</script>

<template>
  <slot />
  <GlobalImageViewer />
</template>

<style lang="scss">
@import '@/static/common.scss';

page {
  background-color: #f8f8f8;
  font-size: 12px;
}
</style>