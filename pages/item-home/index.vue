<template>
  <view class="page item-home">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <view class="back-chevron"></view>
        </view>
      </view>
      <view class="title">商品查询</view>
    </view>

    <view style="padding: 16rpx; padding-top: 64rpx; padding-bottom: 0; box-sizing: border-box;">
      <image src="/static/item_main.png" mode="widthFix" style="width: 100%; border-radius: 16rpx; display: block;" />
    </view>

    <view class="content">
      <view class="func-card">
        <view class="section-title">快捷操作</view>
        <view class="primary-row">
          <view class="primary-card" hover-class="card-active" @click="openOwner">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#1677ff,#0a4fd4);">
                <text class="pcard-icon-text">货</text>
              </view>
              <text class="pcard-label">货主库存</text>
            </view>
            <text class="pcard-desc">按货主查看库存明细</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openWarehouse">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#13c2c2,#08979c);">
                <text class="pcard-icon-text">仓</text>
              </view>
              <text class="pcard-label">仓库库存</text>
            </view>
            <text class="pcard-desc">按仓库查看库存分布</text>
          </view>
        </view>
        <view class="primary-row">
          <view class="primary-card" hover-class="card-active" @click="openCheck">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#fa8c16,#d46b08);">
                <text class="pcard-icon-text">验</text>
              </view>
              <text class="pcard-label">查验</text>
            </view>
            <text class="pcard-desc">待查验商品列表</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openTest">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#36b37e,#00875a);">
                <text class="pcard-icon-text">测</text>
              </view>
              <text class="pcard-label">测试</text>
            </view>
            <text class="pcard-desc">待测试商品列表</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openRepair">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#f5222d,#cf1322);">
                <text class="pcard-icon-text">修</text>
              </view>
              <text class="pcard-label">维修</text>
            </view>
            <text class="pcard-desc">待维修商品列表</text>
          </view>
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