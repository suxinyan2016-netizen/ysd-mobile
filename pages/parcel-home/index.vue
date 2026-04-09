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
        <view class="icon-card" @click="openIncoming">
          <view class="icon">📥</view>
          <text class="label">待收</text>
        </view>

        <view class="icon-card" @click="openLeaving">
          <view class="icon">📤</view>
          <text class="label">待发</text>
        </view>

        <view class="icon-card" @click="openAdd">
          <view class="icon">📦</view>
          <text class="label">新增</text>
        </view>

        <view class="icon-card" @click="openQuery">
          <view class="icon">🔎</view>
          <text class="label">查询</text>
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

<style lang="scss" scoped>
.page { height:100vh; display:flex; flex-direction:column; background:#F8F8F8 }
.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:relative }
.title { color:#fff; font-size:34rpx; font-weight:700 }
.back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg { width:32rpx; height:32rpx }
  .content { flex:1; display:flex; align-items:flex-start; justify-content:center; padding-top:72rpx }
  /* icon styles moved to global `uni.scss` under the `.parcel-home` namespace */

  /* Ensure two-column layout across targets (scoped to this page) */
  .icons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 240rpx 40rpx;
    width: 100%;
    padding: 0 20rpx;
    box-sizing: border-box;
    align-items: center;
  }

  /* package type modal now uses components/ModalPicker.vue */
</style>
