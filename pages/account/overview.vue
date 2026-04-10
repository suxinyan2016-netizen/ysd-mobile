<template>
  <view class="page-container">
    <view class="topbar">
      <view class="title">账户概览</view>
    </view>

    <view class="content">
      <view class="summary-card" v-if="summary">
        <view class="row"><text class="label">总余额</text><text class="value">{{ summary.totalBalance }}</text></view>
        <view class="row"><text class="label">可用</text><text class="value">{{ summary.availableBalance }}</text></view>
        <view class="row"><text class="label">冻结</text><text class="value">{{ summary.frozenBalance }}</text></view>
      </view>

      <view class="placeholder" v-else>加载中…</view>

      <view class="transactions">
        <text class="section-title">最近交易</text>
        <view class="tx" v-for="t in transactions" :key="t.id">
          <text class="tx-time">{{ t.date }}</text>
          <text class="tx-desc">{{ t.type }} · {{ t.counterparty || '-' }}</text>
          <text class="tx-amount">{{ t.amount }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'

const summary = ref(null)
const transactions = ref([])

async function loadSummary(){
  try{
    const res = await ApiHelper.get('/accounts/summary')
    if (res) summary.value = res.data || res
  }catch(e){ console.warn('load summary failed', e) }
}

async function loadTransactions(){
  try{
    // try public endpoint; backend may require accountId - this is a stub to show layout
    const res = await ApiHelper.get('/accounts/transactions', { page:1, size:10 })
    if (res && res.items) transactions.value = res.items
    else if (res && res.data && res.data.items) transactions.value = res.data.items
  }catch(e){ console.warn('load tx failed', e) }
}

onMounted(()=>{ loadSummary(); loadTransactions() })
</script>

<style scoped>
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
.content{ padding-top:120rpx; padding:24rpx }
.summary-card{ background:#fff; border-radius:12rpx; padding:20rpx; box-shadow:0 2rpx 6rpx rgba(0,0,0,0.04) }
.row{ display:flex; justify-content:space-between; padding:12rpx 0 }
.label{ color:#666 }
.value{ color:#111; font-weight:700 }
.section-title{ margin-top:22rpx; color:#333; font-size:30rpx; font-weight:700 }
.tx{ background:#fff; margin-top:12rpx; padding:14rpx; border-radius:10rpx }
.tx-time{ color:#999; font-size:24rpx }
.tx-desc{ color:#444; margin-top:6rpx }
.tx-amount{ color:#e74c3c; position:absolute; right:20rpx }
</style>
