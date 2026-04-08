<template>
  <view class="page">
    <view class="topbar">
      <view class="title">PacItem</view>
      <view class="right">
          <text class="username">{{ userName }}</text>
          <view class="avatar-wrap" @click="goProfile">
            <image class="avatar" :src="avatar" mode="aspectFill" />
          </view>
        </view>
    </view>

    <scroll-view class="content" scroll-y="true">
      <view class="welcome">
        <text class="h1">欢迎，{{ userName || '用户' }}</text>
        <text class="p">这是首页占位，放置常用入口和统计信息。</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user.js'

export default {
  setup() {
    const userStore = useUserStore()
    const userName = computed(() => {
      const u = userStore.userInfo
      return (u && (u.name || u.username)) || ''
    })
    const avatar = computed(() => {
      const u = userStore.userInfo
      return (u && (u.avatar || u.photo)) || '/static/logo.png'
    })

    const handleLogout = async () => {
      try {
        await userStore.logout()
      } finally {
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }

    const goProfile = () => {
      const u = userStore.userInfo || {}
      const id = u.userId || u.id || u.userID || ''
      if (id) {
        uni.navigateTo({ url: `/pages/profile/index?userId=${id}` })
      } else {
        uni.navigateTo({ url: '/pages/profile/index' })
      }
    }

    return { userName, avatar, handleLogout, goProfile }
  }
}
</script>

<style lang="scss" scoped>
.page { height: 100vh; display:flex; flex-direction:column; background:#F8F8F8 }
.topbar { height: 88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:relative }
.title { color:#fff; font-size:34rpx; font-weight:700 }
.back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg { width:32rpx; height:32rpx }
.topbar .right { position:absolute; right:12rpx; display:flex; align-items:center }
.avatar-wrap { display:flex; align-items:center; height:100% }
.avatar { width:64rpx; height:64rpx; border-radius:50%; margin-right:12rpx; align-self:center }
.username { color:#fff; font-size:28rpx; margin-right:12rpx }
.logout { background:transparent; color:#fff; border:1rpx solid rgba(255,255,255,0.2); padding:8rpx 14rpx; border-radius:8rpx }
.content { flex:1 }
.welcome { padding:30rpx }
.h1 { font-size:36rpx; font-weight:700; color:#333 }
.p { margin-top:12rpx; color:#666 }
</style>
