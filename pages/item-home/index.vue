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
      
        <view class="icon-card" @click="openCheck">
          <view class="icon">🔍</view>
          <text class="label">查验</text>
        </view>

        <view class="icon-card" @click="openTest">
          <view class="icon">🧪</view>
          <text class="label">测试</text>
        </view>

        <view class="icon-card" @click="openRepair">
          <view class="icon">🛠️</view>
          <text class="label">维修</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { smartBack } from '@/utils/navigation'
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()
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

function openCheck(){
  try{
    let uid = userStore.userInfo?.id || userStore.userInfo?.userId
    if (!uid){ try{ const s = uni.getStorageSync('loginUser'); if (s){ const p = typeof s === 'string' ? JSON.parse(s) : s; uid = p?.id || p?.userId } }catch(e){} }
    const keeperId = encodeURIComponent(uid || '')
    uni.navigateTo({ url: `/pages/item-service/index?keeperId=${keeperId}&itemStatus=0` })
  }catch(e){
    console.warn('navigateTo failed, retrying without leading slash', e)
    try{ uni.navigateTo({ url: `pages/item-service/index?keeperId=${encodeURIComponent(userStore.userInfo?.id||'')}&itemStatus=0` }) }catch(err){ console.error('navigation failed', err); uni.showToast({ title: '无法打开查验', icon:'none' }) }
  }
}
function openTest(){
  try{
    let uid = userStore.userInfo?.id || userStore.userInfo?.userId
    if (!uid){ try{ const s = uni.getStorageSync('loginUser'); if (s){ const p = typeof s === 'string' ? JSON.parse(s) : s; uid = p?.id || p?.userId } }catch(e){} }
    const keeperId = encodeURIComponent(uid || '')
    uni.navigateTo({ url: `/pages/item-service/index?keeperId=${keeperId}&needTest=1&isTested=0` })
  }catch(e){
    console.warn('navigateTo failed, retrying without leading slash', e)
    try{ uni.navigateTo({ url: `pages/item-service/index?keeperId=${encodeURIComponent(userStore.userInfo?.id||'')}&needTest=1&isTested=0` }) }catch(err){ console.error('navigation failed', err); uni.showToast({ title: '无法打开测试列表', icon:'none' }) }
  }
}
function openRepair(){
  try{
    let uid = userStore.userInfo?.id || userStore.userInfo?.userId
    if (!uid){ try{ const s = uni.getStorageSync('loginUser'); if (s){ const p = typeof s === 'string' ? JSON.parse(s) : s; uid = p?.id || p?.userId } }catch(e){} }
    const keeperId = encodeURIComponent(uid || '')
    uni.navigateTo({ url: `/pages/item-service/index?keeperId=${keeperId}&needRepair=1&isRepaired=0` })
  }catch(e){
    console.warn('navigateTo failed, retrying without leading slash', e)
    try{ uni.navigateTo({ url: `pages/item-service/index?keeperId=${encodeURIComponent(userStore.userInfo?.id||'')}&needRepair=1&isRepaired=0` }) }catch(err){ console.error('navigation failed', err); uni.showToast({ title: '无法打开维修列表', icon:'none' }) }
  }
}
</script>

<style scoped>
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
  .topbar .back{ position:absolute; left:20rpx; top:0; bottom:0; display:flex; align-items:center; justify-content:center; width:88rpx }
  .topbar .back-icon{ width:36rpx; height:36rpx; display:flex; align-items:center; justify-content:center }
  .topbar .back-icon svg{ width:36rpx; height:36rpx }
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
  /* Use shared `.parcel-home` styles defined in uni.scss for icon-card, icon and label */
  .content { flex:1; display:flex; align-items:flex-start; justify-content:center; padding-top:72rpx }

  /* icon-card styles aligned with pages/account/index.vue */
  .icons{ display:flex; flex-wrap:wrap; gap:18rpx; width:92%; justify-content:space-between }
  .icon-card{ flex:0 0 48%; min-width:0; height:150rpx; background:#fff; border-radius:18rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 8rpx 20rpx rgba(0,0,0,0.06); cursor:pointer }
  .icon-card.full{ flex:0 0 100%; width:100% }
  .icon{ font-size:54rpx; margin-bottom:10rpx; text-align:center }
  .label{ color:#333; font-size:20rpx; text-align:center }
</style>