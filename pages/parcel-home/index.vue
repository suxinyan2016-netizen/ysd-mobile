<template>
  <view class="page parcel-home">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.5 5.5L9 12l6.5 6.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </view>
      </view>
      <view class="title">包裹管理</view>
    </view>

    <view class="content">
      <view class="icons three-col">
        <view class="icon-card" @click="openIncoming">
          <view class="icon">📥</view>
          <text class="label">待收</text>
        </view>

        <view class="icon-card" @click="openLeaving">
          <view class="icon">📤</view>
          <text class="label">待发</text>
        </view>

        <view class="icon-card" @click="openQuery">
          <view class="icon">🔎</view>
          <text class="label">查询</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goBack() {
      // if opened as tab, go to home tab; otherwise navigateBack
      try {
        uni.switchTab({ url: '/pages/home/index' })
      } catch (e) {
        uni.navigateBack()
      }
    },
    openIncoming() {
      uni.navigateTo({ url: '/pages/parcel-incoming/index' })
    },
    openLeaving() {
      uni.navigateTo({ url: '/pages/parcel-leaving/index' })
    }
    ,openQuery() {
      // navigate to a parcel query page (create this page if needed)
      try {
        uni.navigateTo({ url: '/pages/parcel-query/index' })
      } catch (e) {
        uni.showToast({ title: '未找到查询页面', icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page { height:100vh; display:flex; flex-direction:column; background:#F8F8F8 }
.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:relative }
.title { color:#fff; font-size:34rpx; font-weight:700 }
.back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg { width:32rpx; height:32rpx }
  .content { flex:1; display:flex; align-items:center; justify-content:center }
  /* icon styles moved to global `uni.scss` under the `.parcel-home` namespace */

  /* Ensure three-column layout across targets (scoped to this page) */
  .icons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;
    width: 100%;
    padding: 0 20rpx;
    box-sizing: border-box;
    align-items: center;
  }
</style>
