<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="title">登录</text>
      <text class="subtitle">YSD包裹管理系统</text>
      <!-- 版本号显示，长按可手动检查更新 -->
      <text class="version-text" @longpress="handleManualUpdate">Version: {{ currentVersion }}</text>
    </view>

    <!-- 调试日志区域 (已隐藏，代码保留以便后续调试) -->
    <!-- <view class="debug-log" v-if="debugLogs.length > 0">
      <view class="log-title">调试日志</view>
      <scroll-view class="log-content" scroll-y>
        <text v-for="(log, index) in debugLogs" :key="index" class="log-item">{{ log }}</text>
      </scroll-view>
      <view class="log-actions">
        <button class="test-btn" @click="testNetworkConnection" size="mini">测试网络</button>
        <button class="test-btn" @click="clearLogs" size="mini">清空日志</button>
      </view>
    </view> -->

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
import { getCurrentVersionName, checkAndHandleUpdate } from '@/utils/versionUpdate.js'

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      showFingerprint: false,
      currentVersion: '',
      debugLogs: []
    }
  },

  mounted() {
    console.log('[Login] mounted called')
    console.log('[Login] Current platform:', uni.getSystemInfoSync().platform)

    // 获取当前版本号
    this.currentVersion = getCurrentVersionName()
    console.log('[Login] Current version:', this.currentVersion)
    this.addDebugLog(`当前版本: ${this.currentVersion}`)

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

    // 手动检查更新
    async handleManualUpdate() {
      console.log('[Login] Manual update check triggered')
      this.addDebugLog('1. 开始手动检查更新')
      uni.showLoading({ title: '检查更新中...' })

      // 添加10秒超时保护
      const timeout = setTimeout(() => {
        uni.hideLoading()
        this.addDebugLog('10. 检查更新超时')
        uni.showToast({ title: '检查更新超时', icon: 'none' })
      }, 10000)

      try {
        this.addDebugLog('2. 调用checkAndHandleUpdate')
        await checkAndHandleUpdate(false, (log) => this.addDebugLog(log)) // false = 非静默模式，会显示提示
        this.addDebugLog('9. checkAndHandleUpdate返回')
        clearTimeout(timeout)
      } catch (e) {
        clearTimeout(timeout)
        console.error('[Login] Manual update check failed:', e)
        this.addDebugLog(`9. 检查更新失败: ${e?.message || e}`)
        uni.showToast({ title: '检查更新失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    // 添加调试日志
    addDebugLog(message) {
      const timestamp = new Date().toLocaleTimeString()
      this.debugLogs.push(`[${timestamp}] ${message}`)
      // 限制日志数量，最多保留50条
      if (this.debugLogs.length > 50) {
        this.debugLogs.shift()
      }
    },

    // 清空日志
    clearLogs() {
      this.debugLogs = []
    },

    // 测试网络连接
    testNetworkConnection() {
      this.addDebugLog('开始测试网络连接...')
      this.addDebugLog('使用uni.request直接测试...')

      uni.request({
        url: 'https://pacitem.com/api/app/version/check',
        method: 'GET',
        data: {
          platform: 'android',
          versionCode: 107
        },
        success: (res) => {
          this.addDebugLog('网络请求成功: ' + JSON.stringify(res))
          uni.showToast({ title: '网络正常', icon: 'success' })
        },
        fail: (err) => {
          this.addDebugLog('网络请求失败: ' + JSON.stringify(err))
          uni.showToast({ title: '网络异常', icon: 'none' })
        }
      })
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
.version-text { display: block; font-size: 28rpx; color: rgba(255,255,255,0.8); margin-top: 10rpx; }

.debug-log {
  margin-bottom: 40rpx;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12rpx;
  padding: 20rpx;
  max-height: 400rpx;
}

.log-title {
  font-size: 24rpx;
  color: #fff;
  margin-bottom: 10rpx;
  font-weight: bold;
}

.log-content {
  height: 300rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8rpx;
  padding: 10rpx;
}

.log-item {
  display: block;
  font-size: 20rpx;
  color: #0f0;
  line-height: 1.5;
  margin-bottom: 5rpx;
  word-break: break-all;
}

.log-actions {
  display: flex;
  gap: 10rpx;
  margin-top: 10rpx;
}

.test-btn {
  flex: 1;
  height: 50rpx;
  line-height: 50rpx;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: #fff;
}

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