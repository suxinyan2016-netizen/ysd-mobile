<!-- App.vue -->
<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

// 设置全局错误处理
const setupErrorHandling = () => {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 拒绝:', event.reason)
    
    // 如果是模块导入错误，记录但不阻止
    if (event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
        event.reason?.message?.includes('Expected a JavaScript-or-Wasm module script')) {
      console.warn('模块导入错误，忽略:', event.reason.message)
      event.preventDefault()
    }
  })

  window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error)
    // 阻止错误冒泡
    event.preventDefault()
  })
}

onLaunch(() => {
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
})

onShow(() => {
  console.log('App Show - 应用显示')
})

onHide(() => {
  console.log('App Hide - 应用隐藏')
})
</script>

<style lang="scss">
@use '@/static/common.scss';

page {
  background-color: #f8f8f8;
  font-size: 14px;
}
</style>