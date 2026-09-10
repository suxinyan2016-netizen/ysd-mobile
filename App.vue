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

  // 检查登录状态并自动跳转
  setTimeout(async () => {
    try {
      console.log('开始检查登录状态')
      const userStore = useUserStore()

      const savedToken = uni.getStorageSync('token')
      const savedUser = uni.getStorageSync('loginUser')
      const tokenExpiry = uni.getStorageSync('tokenExpiry')
      const refreshToken = uni.getStorageSync('refreshToken')
      const refreshExpiry = uni.getStorageSync('refreshTokenExpiry')

      // 检查refresh token是否过期
      let isRefreshTokenValid = false
      if (refreshToken) {
        if (refreshExpiry) {
          const expiryTime = parseInt(refreshExpiry)
          const currentTime = Date.now()
          isRefreshTokenValid = currentTime < expiryTime
          console.log('Refresh token过期检查:', { expiryTime, currentTime, isRefreshTokenValid })
        } else {
          // 没有过期时间，默认有效
          isRefreshTokenValid = true
        }
      }

      // 检查access token是否过期
      let isTokenValid = false
      if (savedToken && savedUser) {
        if (tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry)
          const currentTime = Date.now()
          isTokenValid = currentTime < expiryTime
          console.log('Token过期检查:', { expiryTime, currentTime, isTokenValid })
        } else {
          // 没有过期时间，默认有效
          isTokenValid = true
        }
      }

      // 如果access token过期但refresh token有效，尝试刷新token
      if (!isTokenValid && isRefreshTokenValid) {
        console.log('Access token过期但refresh token有效，尝试刷新')
        try {
          const refreshResult = await userStore.refreshToken()
          if (refreshResult.success) {
            console.log('Token刷新成功，更新登录状态')
            isTokenValid = true
            // 刷新后重新获取token
            const newToken = uni.getStorageSync('token')
            const newUser = uni.getStorageSync('loginUser')
            userStore.token = newToken
            userStore.userInfo = JSON.parse(newUser)
            userStore.isLoggedIn = true
          } else {
            console.log('Token刷新失败:', refreshResult.message)
          }
        } catch (refreshError) {
          console.error('Token刷新过程出错:', refreshError)
        }
      }

      if (isTokenValid) {
        console.log('检测到有效登录，设置用户状态并跳转首页')
        userStore.token = uni.getStorageSync('token')
        try {
          userStore.userInfo = JSON.parse(uni.getStorageSync('loginUser'))
          userStore.isLoggedIn = true
          // 自动跳转到首页
          uni.switchTab({ url: '/pages/home/index' })
        } catch (e) {
          console.error('解析用户信息失败:', e)
          userStore.userInfo = null
          userStore.isLoggedIn = false
          // 跳转到登录页
          uni.redirectTo({ url: '/pages/login/index' })
        }
      } else {
        console.log('未登录或所有token已过期，跳转到登录页')
        userStore.token = ''
        userStore.userInfo = null
        userStore.isLoggedIn = false
        // 清理过期的token
        if (savedToken) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('loginUser')
          uni.removeStorageSync('tokenExpiry')
          uni.removeStorageSync('refreshToken')
          uni.removeStorageSync('refreshTokenExpiry')
        }
        // 跳转到登录页
        uni.redirectTo({ url: '/pages/login/index' })
      }

      console.log('用户状态检查完成:', {
        isLoggedIn: userStore.isLoggedIn,
        userInfo: userStore.userInfo
      })

    } catch (error) {
      console.error('初始化用户状态时出错:', error)
      // 出错时跳转到登录页
      uni.redirectTo({ url: '/pages/login/index' })
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