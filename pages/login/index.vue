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
    </view>
  </view>
</template>

<script>
import { ApiHelper } from '@/utils/apiHelper.js'

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false
    }
  },

  mounted() {
    try {
      const savedUser = uni.getStorageSync('loginUser')
      if (savedUser) {
        const user = JSON.parse(savedUser)
        this.username = user.username || user.name || ''
      }
    } catch (e) {
      // ignore
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
        // Use ApiHelper (statically imported) to send login request
        const res = await ApiHelper.post('/login', {
          username: this.username,
          password: this.password
        })
        if (res && res.code === 1 && res.data) {
          const { token, user, expiresIn, refreshToken, refreshExpiresIn } = res.data
          uni.setStorageSync('token', token)
          uni.setStorageSync('loginUser', JSON.stringify(user))
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
}
</style>