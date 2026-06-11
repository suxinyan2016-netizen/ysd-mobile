<template>
  <view class="page account-home">
    <view class="topbar">
      <view class="back" @click="smartBack()">
        <view class="back-icon">
          <view class="back-chevron"></view>
        </view>
      </view>
      <view class="title">账户</view>
    </view>

    <view style="padding: 16rpx; padding-top: 32rpx; padding-bottom: 0; box-sizing: border-box;">
      <image src="/static/account_main.png" mode="widthFix" style="width: 100%; border-radius: 16rpx; display: block;" />
    </view>

    <view class="content">
      <view class="func-card">
        <view class="section-title">快捷操作</view>
        <view class="primary-row">
          <view class="primary-card" hover-class="card-active" @click="openProfile">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#1677ff,#0a4fd4);">
                <text class="pcard-icon-text">账</text>
              </view>
              <text class="pcard-label">我的账户</text>
            </view>
            <text class="pcard-desc">查看账户信息</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openReceivables">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#36b37e,#00875a);">
                <text class="pcard-icon-text">收</text>
              </view>
              <text class="pcard-label">我的应收</text>
            </view>
            <text class="pcard-desc">待收款明细汇总</text>
          </view>
        </view>
        <view class="primary-row">
          <view class="primary-card" hover-class="card-active" @click="openPayables">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#fa8c16,#d46b08);">
                <text class="pcard-icon-text">付</text>
              </view>
              <text class="pcard-label">我的应付</text>
            </view>
            <text class="pcard-desc">待付款明细汇总</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openCollection">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#13c2c2,#08979c);">
                <text class="pcard-icon-text">款</text>
              </view>
              <text class="pcard-label">收款记录</text>
            </view>
            <text class="pcard-desc">历史收款流水</text>
          </view>
          <view class="primary-card" hover-class="card-active" @click="openPayment">
            <view class="pcard-header">
              <view class="pcard-icon" style="background:linear-gradient(135deg,#722ed1,#531dab);">
                <text class="pcard-icon-text">支</text>
              </view>
              <text class="pcard-label">付款记录</text>
            </view>
            <text class="pcard-desc">历史付款流水</text>
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
