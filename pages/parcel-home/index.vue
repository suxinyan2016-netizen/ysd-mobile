<template>
  <view class="page parcel-home">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <view class="back-chevron"></view>
        </view>
      </view>
      <view class="title">包裹管理</view>
    </view>

    <view style="padding: 16rpx; padding-top: 32rpx; padding-bottom: 0; box-sizing: border-box;">
      <image src="/static/parcel_main.png" mode="widthFix" style="width: 100%; border-radius: 16rpx; display: block;" />
    </view>

    <view class="content">
      <view class="func-card">
        <view class="section-title">快捷操作</view>
        <view class="primary-row">
          <view class="primary-card" hover-class="card-active" @click="openIncoming">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#1677ff,#0a4fd4);">
                <text class="pcard-icon-text">收</text>
              </view>
              <text class="pcard-label">收包裹</text>
            </view>
            <text class="pcard-desc">扫码入库，拍照验货</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openLeaving">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#36b37e,#00875a);">
                <text class="pcard-icon-text">发</text>
              </view>
              <text class="pcard-label">发包裹</text>
            </view>
            <text class="pcard-desc">包装发运，费用记录</text>
          </view>
        </view>
        <view class="primary-row">
          <view class="primary-card" hover-class="card-active" @click="openAdd">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#fa8c16,#d46b08);">
                <text class="pcard-icon-text">增</text>
              </view>
              <text class="pcard-label">新增包裹</text>
            </view>
            <text class="pcard-desc">创建新运单，填写包裹信息</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openQuery">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#722ed1,#531dab);">
                <text class="pcard-icon-text">查</text>
              </view>
              <text class="pcard-label">查询包裹</text>
            </view>
            <text class="pcard-desc">追踪包裹状态，查看历史记录</text>
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
.page{ min-height:100vh; display:flex; flex-direction:column; background:linear-gradient(180deg,#e8eeff 0%,#f0f4ff 30%,#f8f8f8 100%); padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
.back{ position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon{ width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-chevron{ width:18rpx; height:18rpx; border-top:4rpx solid #fff; border-left:4rpx solid #fff; transform:rotate(-45deg); margin-left:8rpx; box-sizing:border-box }
.content{ flex:1; padding:0 16rpx 40rpx; display:flex; flex-direction:column; gap:24rpx }
.func-card{ background:#fff; border-radius:24rpx; padding:8rpx 24rpx 20rpx; box-shadow:0 4rpx 24rpx rgba(8,37,103,0.08) }
.section-title{ font-size:28rpx; font-weight:700; color:#082567; margin-bottom:24rpx; padding-left:4rpx }
.primary-row{ display:flex; gap:20rpx; margin-bottom:20rpx }
.primary-card{ flex:1; background:#f7f9ff; border-radius:18rpx; padding:28rpx 20rpx; display:flex; flex-direction:column; align-items:flex-start; gap:8rpx }
.card-active{ opacity:0.82 }
.pcard-header{ display:flex; flex-direction:row; align-items:center; gap:16rpx; margin-bottom:8rpx }
.pcard-icon{ width:80rpx; height:80rpx; border-radius:20rpx; display:flex; align-items:center; justify-content:center; flex-shrink:0 }
.pcard-icon-text{ color:#fff; font-size:36rpx; font-weight:700 }
.pcard-label{ font-size:30rpx; font-weight:700; color:#1a1a1a }
.pcard-desc{ font-size:22rpx; color:#999 }

</style>
