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
      <view class="icons">
        <view class="row row-2">
          <view class="icon-card" @click="openIncoming">
            <view class="icon">📥</view>
            <text class="label">待收</text>
          </view>

          <view class="icon-card" @click="openLeaving">
            <view class="icon">📤</view>
            <text class="label">待发</text>
          </view>
        </view>

        <view class="row row-3">
          <view class="icon-card" @click="openAdd">
            <view class="icon">📦</view>
            <text class="label">新增</text>
          </view>

          <view class="icon-card" @click="openQuery">
            <view class="icon">🔎</view>
            <text class="label">查询</text>
          </view>
        </view>
      </view>
      <!-- package type picker (reusable ModalPicker) -->
      <ModalPicker v-if="showPackageTypeModal" :show="showPackageTypeModal" :title="'选择包裹类型'" :list="['用户退货运单','仓库调拨运单']" @select="onChoosePackageType" @close="closePackageModal" />
    </view>
  </view>
</template>

<script>
import ModalPicker from '@/components/ModalPicker.vue'

export default {
  components: { ModalPicker },
  data() {
    return {
      showPackageTypeModal: false,
      selectedPackageType: 1
    }
  },
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
    ,openAdd() {
      // show custom modal so we can control font-size
      this.selectedPackageType = 1
      this.showPackageTypeModal = true
    }
    ,closePackageModal() {
      this.showPackageTypeModal = false
    }
    ,chooseAndNavigate(type) {
      this.showPackageTypeModal = false
      try { uni.navigateTo({ url: `/pages/parcel-add/create?packageType=${type}` }) } catch (e) { uni.showToast({ title: '无法打开新增页面', icon: 'none' }) }
    }
    ,onChoosePackageType(idx) {
      // idx is 0-based; map to type 1/2
      const type = (typeof idx === 'number') ? (idx + 1) : 1
      this.chooseAndNavigate(type)
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



<style scoped>
.page{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
.back{ position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon{ width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg{ width:32rpx; height:32rpx }
.content { flex:1; display:flex; align-items:flex-start; justify-content:center; padding-top:72rpx }
.icons{ display:flex; flex-direction:column; gap:18rpx; width:100%; align-items:center }
.row{ width:92%; display:flex; gap:18rpx; justify-content:center }
.row.row-1{ justify-content:center }
.row.row-2{ justify-content:space-between }
.row.row-3{ justify-content:space-between }
.icon-card{ flex:1; min-width:0; height:150rpx; background:#fff; border-radius:18rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 8rpx 20rpx rgba(0,0,0,0.06); cursor:pointer }
.icon-card.full{ flex:0 0 100%; width:100% }
.icon{ font-size:54rpx; margin-bottom:10rpx; text-align:center }
.label{ color:#333; font-size:20rpx; text-align:center }
</style>
