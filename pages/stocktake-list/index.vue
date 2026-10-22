<template>
  <view class="page stocktake-list">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <view class="back-chevron"></view>
        </view>
      </view>
      <view class="title">盘点列表</view>
    </view>

    <view class="list-container">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else>
        <view v-if="rows.length === 0" class="empty">暂无盘点任务</view>
        <view v-else>
          <view v-for="row in rows" :key="row.stocktakeId" class="row-card">
            <view class="line1">
              <text class="sn">SN: {{ row.stocktakeId || '-' }}</text>
              <text class="status">{{ mapStatus(row.status) }}</text>
            </view>
            <view class="line2">
              <text class="slot">货架: {{ row.slot || '-' }}</text>
              <text class="date">盘点日期: {{ formatDate(row.stocktakeTime) }}</text>
            </view>
            <view class="action-row">
              <button class="entry-btn" @click="openEntry(row)">录入</button>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'
import { smartBack } from '@/utils/navigation'

const rows = ref([])
const loading = ref(false)
const userStore = useUserStore()

function getCurrentUserId(){
  const uid = userStore.userInfo?.id || userStore.userInfo?.userId
  if (uid) return Number(uid)
  try{ const saved = uni.getStorageSync('loginUser'); if (saved){ const p = typeof saved === 'string' ? JSON.parse(saved) : saved; return Number(p?.id || p?.userId) } }catch(e){}
  return null
}

function mapStatus(s){ const m = { 1: '进行中', 2: '已完成' }; return m[s] || '-' }

function formatDate(dateStr){
  if (!dateStr) return '-'
  try{
    const d = new Date(dateStr)
    return d.toISOString().split('T')[0]
  }catch(e){ return dateStr }
}

async function load(){
  loading.value = true
  rows.value = []
  try{
    const uid = getCurrentUserId()
    const params = { page: 1, pageSize: 10, status: 1, keeperId: uid }
    const res = await ApiHelper.get('/stocktakes', params)
    if (res && res.code === 1 && res.data){ rows.value = Array.isArray(res.data) ? res.data : (res.data.rows || []) }
  }catch(e){ console.error('load stocktakes failed', e) }
  finally{ loading.value = false }
}

function openEntry(row){
  try{
    const stocktakeId = row.stocktakeId
    if (!stocktakeId) return
    uni.navigateTo({ url: `/pages/stocktake-entry/index?stocktakeId=${stocktakeId}` })
  }catch(e){ console.warn(e) }
}

function goBack(){ smartBack() }

import { onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

function _handleRefresh() {
  try{
    const flag = (typeof uni !== 'undefined' && uni.getStorageSync) ? uni.getStorageSync('stocktakeListRefresh') : null
    if (flag) {
      try{ uni.removeStorageSync && uni.removeStorageSync('stocktakeListRefresh') } catch(e){}
      load()
    }
  }catch(e){}
}

onMounted(() => { load() })

onShow(() => { _handleRefresh() })
</script>

<style scoped>
.page{ min-height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
.back{ position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon{ width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-chevron{ width:18rpx; height:18rpx; border-top:4rpx solid #fff; border-left:4rpx solid #fff; transform:rotate(-45deg); margin-left:8rpx; box-sizing:border-box }
.list-container{ flex:1; padding:20rpx; padding-top:20rpx }
.row-card{ background:#fff; padding:20rpx; border-radius:12rpx; margin-bottom:16rpx }
.line1{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12rpx }
.line2{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16rpx }
.line3{ margin-bottom:16rpx }
.sn{ color:#409EFF; font-size:28rpx; font-weight:600 }
.status{ color:#52c41a; font-size:24rpx }
.slot{ color:#666; font-size:24rpx }
.date{ color:#999; font-size:22rpx }
.action-row{ display:flex; justify-content:flex-end }
.entry-btn{ background:#9254de; color:#fff; border:none; padding:12rpx 32rpx; border-radius:8rpx; font-size:24rpx }
.empty{ text-align:center; color:#999; padding:60rpx 0 }
.loading{ text-align:center; color:#666 }
</style>
