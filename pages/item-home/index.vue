<template>
  <view class="page-container parcel-home">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.5 5.5L9 12l6.5 6.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </view>
      </view>
      <view class="title">商品查询</view>
    </view>

    <view class="content">
      <view class="icons">
        <view class="icon-card" @click="openOwner">
          <view class="icon">👤</view>
          <text class="label">货主库存</text>
        </view>

        <view class="icon-card" @click="openWarehouse">
          <view class="icon">🏬</view>
          <text class="label">仓库库存</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { smartBack } from '@/utils/navigation'
function goBack(){ smartBack() }
const active = ref('owner')
function openOwner(){
  try{
    console.log('navigating to item-owner')
    uni.navigateTo({ url: '/pages/item-owner/index' })
  }catch(e){
    console.warn('navigateTo failed, retrying without leading slash', e)
    try{ uni.navigateTo({ url: 'pages/item-owner/index' }) }catch(err){ console.error('navigation failed', err); uni.showToast({ title: '无法打开货主库存', icon:'none' }) }
  }
}

function openWarehouse(){
  try{
    console.log('navigating to item-warehouse')
    uni.navigateTo({ url: '/pages/item-warehouse/index' })
  }catch(e){
    console.warn('navigateTo failed, retrying without leading slash', e)
    try{ uni.navigateTo({ url: 'pages/item-warehouse/index' }) }catch(err){ console.error('navigation failed', err); uni.showToast({ title: '无法打开仓库库存', icon:'none' }) }
  }
}
</script>

<style scoped>
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
  /* Use shared `.parcel-home` styles defined in uni.scss for icon-card, icon and label */
  .content { flex:1; display:flex; align-items:flex-start; justify-content:center; padding-top:72rpx }
</style>