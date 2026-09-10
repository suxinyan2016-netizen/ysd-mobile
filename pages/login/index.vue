<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="title">登录</text>
      <text class="subtitle">YSD包裹管理系统</text>
    </view>

    <view class="login-form">
      <view class="form-item">
        <view class="input-wrapper">
          <text class="icon">👤</text>
          <input
            class="input"
            v-model="username"
            type="text"
            placeholder="用户名"
            placeholder-class="placeholder"
          />
        </view>
      </view>

      <view class="form-item">
        <view class="input-wrapper">
          <text class="icon">🔒</text>
          <input
            class="input"
            v-model="password"
            type="password"
            placeholder="密码"
            placeholder-class="placeholder"
          />
        </view>
      </view>

      <button
        class="login-btn"
        type="primary"
        :loading="loading"
        @click="handleLogin"
      >
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <view class="fingerprint-section" v-if="showFingerprint">
        <image class="fingerprint-icon" src="/static/fingerprinter.png" @click="handleFingerprintLogin" mode="aspectFit"></image>
      </view>
    </view>
  </view>
</template>

<script>
import { ApiHelper } from '@/utils/apiHelper.js'
import { useUserStore } from '@/stores/user'

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      showFingerprint: false
    }
  },

  mounted() {
    console.log('[Login] mounted called')
    console.log('[Login] Current platform:', uni.getSystemInfoSync().platform)

    // #ifdef APP-PLUS
    console.log('[Login] Running in APP-PLUS environment')
    console.log('[Login] plus object available:', typeof plus !== 'undefined')
    if (typeof plus !== 'undefined') {
      console.log('[Login] plus.fingerprint available:', typeof plus.fingerprint !== 'undefined')
    }
    // #endif

    // #ifndef APP-PLUS
    console.log('[Login] NOT in APP-PLUS environment')
    // #endif

    try {
      const savedUser = uni.getStorageSync('loginUser')
      console.log('[Login] savedUser:', savedUser)
      if (savedUser) {
        const user = JSON.parse(savedUser)
        this.username = user.username || user.name || ''
        console.log('[Login] username set to:', this.username)
      }
      // Check if fingerprint is available
      console.log('[Login] About to check fingerprint availability')
      this.checkFingerprintAvailable()
    } catch (e) {
      console.error('[Login] mounted error:', e)
    }
  },

  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
        return
      }
      this.loading = true
      try {
        // Log login attempt for debugging
        console.log('[Login] Attempting login with username:', this.username)
        uni.setStorageSync('debug_log', 'Login attempt: ' + this.username + ' at ' + new Date().toISOString())

        // Use ApiHelper (statically imported) to send login request
        const res = await ApiHelper.post('/login', {
          username: this.username,
          password: this.password
        })
        if (res && res.code === 1 && res.data) {
          const { token, user, expiresIn, refreshToken, refreshExpiresIn } = res.data
          uni.setStorageSync('token', token)
          uni.setStorageSync('loginUser', JSON.stringify(user))
          // Save credentials for fingerprint login
          uni.setStorageSync('savedCredentials', JSON.stringify({
            username: this.username,
            password: this.password
          }))
          // update pinia user store so pages watching userInfo get notified
          try {
            const userStore = useUserStore()
            userStore.token = token
            userStore.userInfo = user
            userStore.isLoggedIn = true
          } catch (e) { console.warn('update userStore failed', e) }
          if (expiresIn) {
            const expiryTime = Date.now() + expiresIn * 1000
            uni.setStorageSync('tokenExpiry', expiryTime.toString())
          }
          if (refreshToken && refreshExpiresIn) {
            uni.setStorageSync('refreshToken', refreshToken)
            const refreshExpiry = Date.now() + refreshExpiresIn * 1000
            uni.setStorageSync('refreshTokenExpiry', refreshExpiry.toString())
          }
          uni.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => {
            uni.switchTab({ url: '/pages/home/index' })
          }, 800)
        } else {
          uni.showToast({ title: (res && res.msg) || '登录失败', icon: 'none' })
        }
      } catch (err) {
        // log full error for debugging and show message
        console.error('login error:', err)
        uni.setStorageSync('debug_error', JSON.stringify(err))
        uni.setStorageSync('debug_error_time', new Date().toISOString())
        uni.showToast({ title: '登录请求失败: ' + (err?.message || ''), icon: 'none' })
      } finally {
        this.loading = false
        // immediately clear password variable in UI/state
        try { this.password = '' } catch (e) {}
      }
    },

    async checkFingerprintAvailable() {
      // #ifdef APP-PLUS
      try {
        console.log('[Fingerprint] Starting availability check')
        const fingerprint = plus.fingerprint
        console.log('[Fingerprint] plus.fingerprint object:', fingerprint)

        // Check if we have saved credentials for fingerprint login
        const savedCredentials = uni.getStorageSync('savedCredentials')
        console.log('[Fingerprint] savedCredentials:', savedCredentials ? 'exists' : 'not found')

        // Show fingerprint button if module is available and we have saved credentials
        if (fingerprint && savedCredentials) {
          this.showFingerprint = true
          console.log('[Fingerprint] Fingerprint module available and credentials saved, showing button')
        } else {
          console.log('[Fingerprint] Fingerprint not available or no saved credentials')
          this.showFingerprint = false
        }
      } catch (e) {
        console.error('[Fingerprint] availability check failed:', e)
        this.showFingerprint = false
      }
      // #endif

      // #ifndef APP-PLUS
      console.log('[Fingerprint] Not in APP-PLUS environment')
      // #endif
    },

    async handleFingerprintLogin() {
      // Get saved credentials and auto-fill username
      const savedCredentials = uni.getStorageSync('savedCredentials')
      if (!savedCredentials) {
        uni.showToast({ title: '请先使用密码登录', icon: 'none' })
        return
      }

      const credentials = JSON.parse(savedCredentials)
      this.username = credentials.username
      console.log('[Fingerprint] Auto-filled username:', this.username)

      // #ifdef APP-PLUS
      try {
        const fingerprint = plus.fingerprint
        if (!fingerprint) {
          uni.showToast({ title: '设备不支持指纹识别', icon: 'none' })
          return
        }

        // Skip isSupport check due to compatibility issues, try authenticate directly
        console.log('[Fingerprint] Skipping isSupport check, trying authenticate directly')
        uni.showLoading({ title: '请验证指纹' })

        const authenticate = await Promise.race([
          new Promise((resolve, reject) => {
            fingerprint.authenticate((result) => {
              console.log('[Fingerprint] authenticate result:', result)
              // Check if authentication succeeded based on code and message
              if (result.code === 0 || result.message === 'Authenticate Succeeded') {
                resolve(true)
              } else {
                reject(new Error('指纹验证失败: ' + (result.message || '未知错误')))
              }
            }, (error) => {
              console.error('[Fingerprint] authenticate error:', error)
              reject(new Error('指纹验证错误: ' + (error?.message || '未知错误')))
            }, {})
          }),
          new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('指纹验证超时')), 10000)
          })
        ])

        uni.hideLoading()

        if (authenticate) {
          // Fingerprint verified, now login with saved credentials
          await this.performFingerprintLogin()
        }
      } catch (e) {
        uni.hideLoading()
        console.error('[Fingerprint] Authentication failed:', e)
        let errorMsg = '指纹验证失败'
        if (e?.message) {
          errorMsg += ': ' + e.message
        }
        uni.showToast({ title: errorMsg, icon: 'none' })
      }
      // #endif

      // #ifndef APP-PLUS
      uni.showToast({ title: '仅APP支持指纹登录', icon: 'none' })
      // #endif
    },

    async performFingerprintLogin() {
      try {
        // Get saved password from secure storage
        const savedCredentials = uni.getStorageSync('savedCredentials')
        if (!savedCredentials) {
          uni.showToast({ title: '请先使用密码登录', icon: 'none' })
          return
        }

        const credentials = JSON.parse(savedCredentials)
        if (credentials.username !== this.username) {
          uni.showToast({ title: '用户名不匹配', icon: 'none' })
          return
        }

        this.loading = true
        const res = await ApiHelper.post('/login', {
          username: this.username,
          password: credentials.password
        })

        if (res && res.code === 1 && res.data) {
          const { token, user, expiresIn, refreshToken, refreshExpiresIn } = res.data
          uni.setStorageSync('token', token)
          uni.setStorageSync('loginUser', JSON.stringify(user))

          try {
            const userStore = useUserStore()
            userStore.token = token
            userStore.userInfo = user
            userStore.isLoggedIn = true
          } catch (e) { console.warn('update userStore failed', e) }

          if (expiresIn) {
            const expiryTime = Date.now() + expiresIn * 1000
            uni.setStorageSync('tokenExpiry', expiryTime.toString())
          }
          if (refreshToken && refreshExpiresIn) {
            uni.setStorageSync('refreshToken', refreshToken)
            const refreshExpiry = Date.now() + refreshExpiresIn * 1000
            uni.setStorageSync('refreshTokenExpiry', refreshExpiry.toString())
          }

          uni.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => {
            uni.switchTab({ url: '/pages/home/index' })
          }, 800)
        } else {
          uni.showToast({ title: (res && res.msg) || '登录失败', icon: 'none' })
        }
      } catch (err) {
        console.error('fingerprint login error:', err)
        uni.showToast({ title: '登录请求失败: ' + (err?.message || ''), icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    // directLogin is no longer used; ApiHelper handles requests with absolute baseUrl on device.
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 100rpx 60rpx;
}

.login-header { text-align: center; margin-bottom: 100rpx; }
.logo { width: 160rpx; height: 160rpx; margin-bottom: 40rpx; }
.title { display: block; font-size: 48rpx; font-weight: bold; color: #fff; margin-bottom: 20rpx; }
.subtitle { display: block; font-size: 28rpx; color: rgba(255,255,255,0.8); }

.login-form {
  .form-item { margin-bottom: 40rpx; }
  .input-wrapper { display:flex; align-items:center; background: rgba(255,255,255,0.9); border-radius:12rpx; padding:0 30rpx; height:90rpx; }
  .icon { font-size:40rpx; margin-right:20rpx }
  .input { flex:1; font-size:30rpx; height:100% }
  .placeholder { color:#999 }
  .login-btn { width:100%; height:90rpx; line-height:90rpx; background:#409EFF; border-radius:12rpx; color:#fff; font-size:32rpx; font-weight:bold; margin-top:60rpx; border:none }
  .fingerprint-section {
    margin-top: 60rpx;
    text-align: center;
  }

  .fingerprint-icon {
    width: 120rpx;
    height: 120rpx;
    cursor: pointer;
    opacity: 0.9;
    transition: opacity 0.3s;
  }

  .fingerprint-icon:active {
    opacity: 0.6;
  }
}
</style>