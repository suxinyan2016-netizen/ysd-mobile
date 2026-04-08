<template>
  <view class="page">
    <view class="topbar">
      <view class="back" @click="goHome">
        <view class="back-icon">
          <svg class="back-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.5 5.5L9 12l6.5 6.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </view>
      </view>
      <view class="title">个人资料</view>
      <view class="right-top"><text class="logout-top" @click="handleLogout">退出</text></view>
    </view>

    <scroll-view class="content" scroll-y="true">
      <view class="profile">
        <view class="header">
          <view class="avatar-col">
            <image class="avatar" :src="avatar" mode="aspectFill" />
          </view>
        </view>
        <view class="form">
          <view class="row"><text class="label">用户名</text><input class="input" v-model="user.username" /></view>
          <view class="row"><text class="label">姓名</text><input class="input" v-model="user.name" /></view>
          <view class="row"><text class="label">手机</text><input class="input" v-model="user.phone" /></view>
          <view class="row"><text class="label">邮箱</text><input class="input" v-model="user.email" /></view>
          <view class="row full"><text class="label">地址</text><textarea class="textarea" v-model="user.address" /></view>
          <view class="row"><text class="label">邮编</text><input class="input" v-model="user.zipcode" /></view>

          <view class="sep"><text>修改密码</text></view>
          <view class="row"><text class="label">旧密码</text><input class="input" v-model="oldPassword" type="password" /></view>
          <view class="row"><text class="label">新密码</text><input class="input" v-model="newPassword" type="password" /></view>
          <view class="row"><text class="label">确认</text><input class="input" v-model="confirmPassword" type="password" /></view>

          <view class="buttons">
            <button class="btn btn-save full" @click="onSave">保存</button>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { reactive, ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { ApiHelper } from '@/utils/apiHelper.js'
import { queryUserInfo } from '@/utils/userApi.js'

export default {
  setup() {
    const user = reactive({ username: '', name: '', phone: '', email: '', address: '', zipcode: '', userId: null, avatar: '' })
    const oldPassword = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const avatar = ref('/static/logo.png')

    const load = async () => {
      try {
        // try to get userId from page query (passed from home)
        let requestedId = null
        try {
          const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
          if (pages && pages.length) {
            const opts = pages[pages.length - 1].options || {}
            requestedId = opts.userId || opts.userID || opts.id || null
          }
        } catch (e) {
          // ignore
        }

        const saved = uni.getStorageSync('loginUser')
        const local = saved ? JSON.parse(saved) : {}
        const uid = requestedId || local.userId || local.id || null

        if (uid) {
          try {
            const res = await ApiHelper.get(`/users/${uid}`)
            if (res && res.code === 1 && res.data) {
              Object.assign(user, res.data)
            } else {
              Object.assign(user, local)
            }
          } catch (err) {
            console.warn('fetch user failed, use local stored', err)
            Object.assign(user, local)
          }
        } else {
          Object.assign(user, local)
        }

        avatar.value = user.avatar || user.photo || '/static/logo.png'
      } catch (e) {
        console.error('load profile error', e)
      }
    }

    const userStore = useUserStore()

    onMounted(load)

    const onCancel = () => {
      load()
    }

    const handleLogout = async () => {
      try {
        await userStore.logout()
      } finally {
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }

    const goHome = () => {
      uni.switchTab({ url: '/pages/home/index' })
    }

    const onSave = async () => {
      // password checks
      if (newPassword.value || confirmPassword.value || oldPassword.value) {
        if (newPassword.value !== confirmPassword.value) {
          uni.showToast({ title: '两次新密码不一致', icon: 'none' })
          return
        }
      }

      try {
        const payload = {
          userId: user.userId,
          username: user.username,
          name: user.name,
          phone: user.phone,
          address: user.address,
          zipcode: user.zipcode,
          email: user.email
        }
        if (newPassword.value) {
          payload.oldPassword = oldPassword.value
          payload.password = newPassword.value
        }

        // attempt API update, fall back to local update on failure
        try {
          // backend expects PUT /api/users to update
          const res = await ApiHelper.put('/users', payload)
          if (res && res.code === 1) {
            uni.showToast({ title: '保存成功', icon: 'success' })
          } else {
            uni.showToast({ title: (res && res.msg) || '保存失败（后端）', icon: 'none' })
            return
          }
        } catch (err) {
          console.warn('update API failed, saving locally', err)
          uni.showToast({ title: '保存失败（网络），已本地保存', icon: 'none' })
        }

        // update local storage copy
        try {
          const stored = uni.getStorageSync('loginUser')
          const sObj = stored ? JSON.parse(stored) : {}
          const updated = { ...sObj, username: user.username, name: user.name, phone: user.phone, address: user.address, zipcode: user.zipcode, email: user.email }
          if (payload.password) updated.password = payload.password
          uni.setStorageSync('loginUser', JSON.stringify(updated))
        } catch (e) {
          console.error('update local storage error', e)
        }
      } catch (e) {
        console.error('save profile error', e)
        uni.showToast({ title: '保存出错', icon: 'none' })
      }
    }

    return { user, avatar, oldPassword, newPassword, confirmPassword, onCancel, onSave, handleLogout, goHome }
  }
}
</script>

<style scoped>
.page { height:100vh; background:#F8F8F8 }
.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:relative }
.title { color:#fff; font-size:34rpx; font-weight:700 }
.back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg, .back-svg { width:32rpx; height:32rpx }
.right-top { position:absolute; right:18rpx }
.logout-top { color:#fff; font-size:24rpx }
.content { padding:24rpx }
.profile { align-items:flex-start }
.avatar { width:140rpx; height:140rpx; border-radius:50%; margin:20rpx auto }
.avatar-col { display:flex; flex-direction:column; align-items:center }
.logout-link { color:#999; font-size:24rpx; margin-top:8rpx }
.form { width:100% }
.row { display:flex; align-items:center; margin-bottom:16rpx }
.row.full { align-items:flex-start }
.label { width:120rpx; color:#333 }
.input { flex:1; height:64rpx; padding:10rpx; border-radius:8rpx; border:1rpx solid #e6e6e6; background:#fff }
.textarea { flex:1; min-height:88rpx; height:88rpx; padding:10rpx; border-radius:8rpx; border:1rpx solid #e6e6e6; background:#fff }
.sep { margin:12rpx 0; color:#666 }
.buttons { margin-top:22rpx }
.btn { padding:14rpx 28rpx; border-radius:12rpx; font-size:30rpx; line-height:40rpx; border:1rpx solid transparent; cursor:pointer; display:inline-block }
.btn:hover { opacity:0.95 }
.btn.cancel { background:#fff; color:#333; border-color:#dcdfe6 }
.btn.save { background:#007AFF; color:#fff; box-shadow:0 6rpx 18rpx rgba(103,73,7,0.18) }
.btn.full { width:100%; box-sizing:border-box; text-align:center }
</style>
