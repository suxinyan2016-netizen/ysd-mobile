<template>
  <view class="page-container account-home">
    <view class="topbar">
      <view class="back" @click="smartBack()">
        <view class="back-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.5 5.5L9 12l6.5 6.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </view>
      </view>
      <view class="title">账户</view>
    </view>

    <view class="content">
      <view class="icons">
        <view class="row row-1">
          <view class="icon-card full" @click="openProfile">
            <view class="icon">🏦</view>
            <text class="label">我的账户</text>
          </view>
        </view>

        <view class="row row-2">
          <view class="icon-card" @click="openReceivables">
            <view class="icon">📥</view>
            <text class="label">我的应收</text>
          </view>

          <view class="icon-card" @click="openPayables">
            <view class="icon">📤</view>
            <text class="label">我的应付</text>
          </view>
        </view>

        <view class="row row-3">
          <view class="icon-card" @click="openCollection">
            <view class="icon">💰</view>
            <text class="label">收款记录</text>
          </view>

          <view class="icon-card" @click="openPayment">
            <view class="icon">🏷️</view>
            <text class="label">付款记录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { smartBack } from '@/utils/navigation'
function openOverview(){
  try{ uni.navigateTo({ url: '/pages/account/overview' }) }catch(e){ try{ uni.navigateTo({ url: 'pages/account/overview' }) }catch(err){ uni.showToast({ title: '无法打开账户概览', icon:'none' }) } }
}
function openProfile(){
  try{ uni.navigateTo({ url: '/pages/profile/index' }) }catch(e){ try{ uni.navigateTo({ url: 'pages/profile/index' }) }catch(err){ uni.showToast({ title: '无法打开个人资料', icon:'none' }) } }
}
function openReceivables(){
  try{ uni.navigateTo({ url: '/pages/account/receivables' }) }catch(e){ try{ uni.navigateTo({ url: 'pages/account/receivables' }) }catch(err){ uni.showToast({ title: '无法打开应收', icon:'none' }) } }
}
function openPayables(){
  try{ uni.navigateTo({ url: '/pages/account/payables' }) }catch(e){ try{ uni.navigateTo({ url: 'pages/account/payables' }) }catch(err){ uni.showToast({ title: '无法打开应付', icon:'none' }) } }
}
function openCollection(){
  try{ uni.navigateTo({ url: '/pages/statement/collection' }) }catch(e){ try{ uni.navigateTo({ url: 'pages/statement/collection' }) }catch(err){ uni.showToast({ title: '无法打开收款账单', icon:'none' }) } }
}
function openPayment(){
  try{ uni.navigateTo({ url: '/pages/statement/payment' }) }catch(e){ try{ uni.navigateTo({ url: 'pages/statement/payment' }) }catch(err){ uni.showToast({ title: '无法打开付款账单', icon:'none' }) } }
}
</script>

<style scoped>
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
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
