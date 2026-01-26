// stores/user.js - 完全独立版本
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref(null)
  const isLoggedIn = ref(false)

  // 纯本地检查，不进行任何跳转
  function checkLoginStatus() {
    try {
      console.log('仅检查本地登录状态，不跳转')
      const savedToken = uni.getStorageSync('token')
      const savedUser = uni.getStorageSync('loginUser')
      
      if (savedToken && savedUser) {
        try {
          token.value = savedToken
          userInfo.value = JSON.parse(savedUser)
          isLoggedIn.value = true
          console.log('已登录用户:', userInfo.value.name || userInfo.value.username)
          return true
        } catch (parseError) {
          console.error('解析用户数据失败:', parseError)
          clearLocalStorage()
          return false
        }
      }
      return false
    } catch (error) {
      console.error('检查登录状态出错:', error)
      return false
    }
  }

  // 清理本地存储
  function clearLocalStorage() {
    uni.removeStorageSync('token')
    uni.removeStorageSync('loginUser')
    uni.removeStorageSync('tokenExpiry')
    uni.removeStorageSync('refreshToken')
    uni.removeStorageSync('refreshTokenExpiry')
    token.value = ''
    userInfo.value = null
    isLoggedIn.value = false
  }

  // 直接请求函数
  function makeRequest(url, method = 'POST', data = {}, headers = {}) {
    return new Promise((resolve, reject) => {
      const requestUrl = url.startsWith('http') ? url : `/api${url}`
      
      uni.request({
        url: requestUrl,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...headers
        },
        success: (res) => {
          console.log(`API ${url} 响应状态:`, res.statusCode)
          resolve(res.data)
        },
        fail: (err) => {
          console.error(`API ${url} 请求失败:`, err)
          reject(err)
        }
      })
    })
  }

  // 登录 - 完全独立
  async function login(username, password) {
    try {
      console.log('开始登录:', username)
      
      // 清理旧数据
      clearLocalStorage()
      
      // 直接请求登录接口
      const result = await makeRequest('/login', 'POST', { username, password })
      
      console.log('登录响应:', result)
      
      if (result.code === 1 && result.data) {
        const { token: newToken, user, expiresIn, refreshToken, refreshExpiresIn } = result.data
        
        // 保存数据
        token.value = newToken
        userInfo.value = user
        isLoggedIn.value = true
        
        uni.setStorageSync('token', newToken)
        uni.setStorageSync('loginUser', JSON.stringify(user))
        
        // 保存过期时间
        if (expiresIn) {
          const expiryTime = Date.now() + (expiresIn * 1000)
          uni.setStorageSync('tokenExpiry', expiryTime.toString())
        }
        if (refreshToken && refreshExpiresIn) {
          uni.setStorageSync('refreshToken', refreshToken)
          const refreshExpiry = Date.now() + (refreshExpiresIn * 1000)
          uni.setStorageSync('refreshTokenExpiry', refreshExpiry.toString())
        }
        
        console.log('登录成功:', user.name || user.username)
        return { success: true, data: result.data }
      } else {
        console.log('登录失败:', result.msg)
        return { success: false, message: result.msg || '登录失败' }
      }
    } catch (error) {
      console.error('登录过程出错:', error)
      return { success: false, message: error.message || '网络错误' }
    }
  }

  // 登出 - 简化版本
  async function logout() {
    try {
      // 尝试调用登出API（可选）
      try {
        await makeRequest('/logout', 'POST', {}, { token: token.value })
      } catch (apiError) {
        console.warn('登出API调用失败:', apiError)
      }
    } finally {
      // 无论如何都清理本地数据
      clearLocalStorage()
      console.log('已登出，清理本地数据')
    }
  }

  // 刷新 token
  async function refreshToken() {
    try {
      const storedRefreshToken = uni.getStorageSync('refreshToken')
      if (!storedRefreshToken) {
        return { success: false, message: '没有刷新令牌' }
      }
      
      const result = await makeRequest('/refresh-token', 'POST', { 
        refreshToken: storedRefreshToken 
      })
      
      if (result.code === 1 && result.data) {
        const { token: newToken, expiresIn, refreshToken: newRefreshToken, refreshExpiresIn } = result.data
        
        // 更新存储
        token.value = newToken
        uni.setStorageSync('token', newToken)
        
        if (expiresIn) {
          const expiryTime = Date.now() + (expiresIn * 1000)
          uni.setStorageSync('tokenExpiry', expiryTime.toString())
        }
        if (newRefreshToken) {
          uni.setStorageSync('refreshToken', newRefreshToken)
          if (refreshExpiresIn) {
            const refreshExpiry = Date.now() + (refreshExpiresIn * 1000)
            uni.setStorageSync('refreshTokenExpiry', refreshExpiry.toString())
          }
        }
        
        return { success: true, token: newToken }
      }
      
      return { success: false, message: result.msg || '刷新失败' }
    } catch (error) {
      console.error('刷新 token 错误:', error)
      return { success: false, message: error.message }
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    checkLoginStatus,
    login,
    logout,
    refreshToken,
    clearLocalStorage
  }
})