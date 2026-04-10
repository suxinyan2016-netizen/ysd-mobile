<template>
  <view class="page-container">
    <view class="topbar">
      <view class="back" @click="smartBack()">
        <view class="back-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.5 5.5L9 12l6.5 6.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </view>
      </view>
      <view class="title">我的应收</view>
    </view>

    <view class="content">
      <!-- Item groups (应收商品服务费及寄售货款) -->
      <view class="card" v-if="itemGroups.length">
        <view class="card-header">应收商品服务费及寄售货款</view>
        <view class="card-body">
            <view class="table-row header">
              <text class="col">付款人</text>
              <text class="col right">总额</text>
            </view>
            <view class="table-row" v-for="g in itemGroups" :key="g.paidbyid">
              <text class="col">{{ g.paidby || '未知' }}</text>
              <view class="col right">
                <text class="amount">{{ fmt(g.total) }}</text>
                <button class="link" @click="openItemDetails(g)">明细</button>
              </view>
            </view>
        </view>
      </view>

      <!-- Parcel groups (应收包裹代付运费) -->
      <view class="card" v-if="parcelGroups.length">
        <view class="card-header">应收包裹代付运费</view>
        <view class="card-body">
          <view class="table-row header">
            <text class="col">付款人</text>
            <text class="col right">总额</text>
          </view>
          <view class="table-row" v-for="g in parcelGroups" :key="g.paidbyid">
            <text class="col">{{ g.paidby || '未知' }}</text>
            <view class="col right">
              <text class="amount">{{ fmt(g.total) }}</text>
              <button class="link" @click="openParcelDetails(g)">明细</button>
            </view>
          </view>
        </view>
      </view>

      <view class="summary-row" style="margin-top:12rpx">
        <view class="col"></view>
        <view class="col right"><text class="summary-total">合计: {{ fmt(pageTotal) }}</text></view>
      </view>
    </view>

    <!-- Item details drawer -->
    <view v-if="showItemDialog" class="drawer-overlay" @click.self="showItemDialog=false">
      <view class="drawer">
        <view class="drawer-header">
          <text class="drawer-title">{{ dialogTitle }}</text>
          <view class="drawer-actions">
            <view class="close" @click="showItemDialog=false">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6 L18 18 M6 18 L18 6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            </view>
          </view>
        </view>
        <view class="drawer-content">
          <view class="table-row header">
            <text class="col name">商品名</text>
            <text class="col total">总费用</text>
          </view>
          <view class="table-row" v-for="row in pagedDialogItems" :key="row.itemId || row.id">
            <text class="col name">{{ row.sellerpart || '' }}</text>
            <text class="col total">{{ fmt(row.subtotalfee || row.total || 0) }}</text>
          </view>
        </view>
        <view style="display:flex; justify-content:flex-end; margin-top:8px">
          <view class="pagination">第 {{ itemDialogPage }} 页 / 每页 {{ itemDialogPageSize }}</view>
        </view>
        <view class="drawer-footer">
          <text>合计: {{ fmt(dialogTotal) }}</text>
        </view>
      </view>
    </view>

    <!-- Parcel details drawer -->
    <view v-if="showParcelDialog" class="drawer-overlay" @click.self="showParcelDialog=false">
      <view class="drawer">
        <view class="drawer-header">
          <text class="drawer-title">{{ parcelDialogTitle }}</text>
          <view class="drawer-actions">
            <view class="close" @click="showParcelDialog=false">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6 L18 18 M6 18 L18 6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            </view>
          </view>
        </view>
        <view class="drawer-content">
          <view class="table-row header">
            <text class="col name">运单号</text>
            <text class="col total">费用</text>
          </view>
          <view class="table-row" v-for="row in dialogParcels" :key="row.parcelId || row.packageno || row.id">
            <text class="col name">{{ row.packageno || '' }}</text>
            <text class="col total">{{ fmt(row.fee || 0) }}</text>
          </view>
        </view>
        <view class="drawer-footer">
          <text>合计: {{ fmt(parcelDialogTotal) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'
import { getTokenInfo } from '@/utils/tokenManager'
import { smartBack } from '@/utils/navigation'

const itemGroups = ref([])
const parcelGroups = ref([])

const pageTotal = computed(() => {
  const sum = (groups) => (groups || []).reduce((s, g) => s + Number(g.total || 0), 0)
  return sum(itemGroups.value) + sum(parcelGroups.value)
})

const showItemDialog = ref(false)
const dialogItems = ref([])
const dialogTitle = ref('')
const dialogTotal = ref(0)

// pagination for item dialog
const itemDialogPage = ref(1)
const itemDialogPageSize = ref(10)
const pagedDialogItems = computed(() => {
  const start = (itemDialogPage.value - 1) * itemDialogPageSize.value
  return (dialogItems.value || []).slice(start, start + itemDialogPageSize.value)
})

const showParcelDialog = ref(false)
const dialogParcels = ref([])
const parcelDialogTitle = ref('')
const parcelDialogTotal = ref(0)

function fmt(v) { if (v == null || v === '') return '0.00'; const n = Number(v); if (Number.isNaN(n)) return '0.00'; return n.toFixed(2) }

async function load() {
  const user = getTokenInfo().loginUser || JSON.parse(uni.getStorageSync('loginUser') || '{}') || {}
  const uid = user.userId ?? user.id ?? user.userid
  if (!uid) return

  // item fees where current user is payto (receivable)
  try {
    const res = await ApiHelper.get(`/fee/itemfee?paytoid=${uid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    const map = new Map()
    rows.forEach(r => {
      const key = r.paidbyid || 0
      const name = r.paidby || '未知'
      const subtotal = Number(r.subtotalfee || 0)
      if (!map.has(key)) map.set(key, { paidbyid: key, paidby: name, total: 0 })
      map.get(key).total += subtotal
    })
    itemGroups.value = Array.from(map.values())
  } catch (e) { itemGroups.value = [] }

  // parcel fees where current user is payto (receivable)
  try {
    const res = await ApiHelper.get(`/fee/parcelfee?paytoid=${uid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    const map = new Map()
    rows.forEach(r => {
      const key = r.paidbyid || 0
      const name = r.paidby || '未知'
      const fee = Number(r.fee || 0)
      if (!map.has(key)) map.set(key, { paidbyid: key, paidby: name, total: 0 })
      map.get(key).total += fee
    })
    parcelGroups.value = Array.from(map.values())
  } catch (e) { parcelGroups.value = [] }
}

async function openItemDetails(group) {
  const user = getTokenInfo().loginUser || JSON.parse(uni.getStorageSync('loginUser') || '{}') || {}
  const uid = user.userId ?? user.id ?? user.userid
  if (!uid) return
  const paidbyid = group.paidbyid
  try {
    const res = await ApiHelper.get(`/fee/itemfee?paidbyid=${paidbyid}&paytoid=${uid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    dialogItems.value = rows
    itemDialogPage.value = 1
    dialogTotal.value = rows.reduce((s, r) => s + Number(r.subtotalfee || 0), 0)
    dialogTitle.value = `${group.paidby || ''}（付款方）`
    showItemDialog.value = true
  } catch (e) { uni.showToast({ title: '无法加载明细', icon: 'none' }) }
}

async function openParcelDetails(group) {
  const user = getTokenInfo().loginUser || JSON.parse(uni.getStorageSync('loginUser') || '{}') || {}
  const uid = user.userId ?? user.id ?? user.userid
  if (!uid) return
  const paidbyid = group.paidbyid
  try {
    const res = await ApiHelper.get(`/fee/parcelfee?paidbyid=${paidbyid}&paytoid=${uid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    dialogParcels.value = rows
    parcelDialogTotal.value = rows.reduce((s, r) => s + Number(r.fee || 0), 0)
    parcelDialogTitle.value = `${group.paidby || ''}（付款方）`
    showParcelDialog.value = true
  } catch (e) { uni.showToast({ title: '无法加载运费明细', icon: 'none' }) }
}

onMounted(() => load())
</script>

<style scoped>
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
.content{ padding-top:120rpx; padding:20rpx }
.summary{ background:#fff; padding:16rpx; border-radius:10rpx }
.list .item{ background:#fff; margin-top:12rpx; padding:12rpx; border-radius:8rpx }
.name{ font-weight:700 }
.due{ color:#999 }
.amount{ color:#c0392b }

.link{ background:transparent !important; color:#2d8cf0; border:none !important; padding:0; margin-left:12rpx; font-size:24rpx; outline:none !important; box-shadow:none !important; -webkit-appearance:none; appearance:none; border-radius:0 }

/* drawer styles copied from components/ItemQuery.vue for consistent global drawer */
.drawer-overlay{ position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.35); display:flex; align-items:flex-end; justify-content:center; z-index:2000 }
.drawer{ width:100%; background:#fff; border-top-left-radius:16rpx; border-top-right-radius:16rpx; padding:20rpx }
.drawer-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12rpx }
.drawer-title{ font-size:28rpx; font-weight:600 }
.drawer-content{ max-height:60vh; overflow:auto }
.drawer-content .table-row{ border-bottom: none }
.drawer-content .col.name{ font-weight:400 }
.drawer-header .close{ width:52rpx; height:52rpx; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#f5f5f5 }
.drawer-header .close svg{ width:26rpx; height:26rpx }
.drawer-actions{ display:flex; align-items:center; gap:24rpx }
.drawer-footer{ display:flex; justify-content:flex-end; gap:12rpx; padding-top:12rpx }
.summary-row{ display:flex; align-items:center; padding-top:8rpx }
.summary-total{ font-size:28rpx; font-weight:700 }

.back{ position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon{ width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg{ width:32rpx; height:32rpx }

/* Card / table styles to match web layout */
.card{ background:#fff; border-radius:6rpx; padding:20rpx; margin-bottom:20rpx; box-shadow:0 2rpx 6rpx rgba(0,0,0,0.03) }
.card-header{ font-weight:700; font-size:30rpx; padding-bottom:12rpx; border-bottom:1rpx solid #f0f0f0; margin-bottom:12rpx }
.card-body{ padding:0 }
.table-row{ display:flex; align-items:center; padding:18rpx 0; border-bottom:1rpx solid #f6f6f6 }
.table-row.header{ color:#999; font-size:26rpx }
.col{ flex:1 }
.col.sel{ flex:0 0 60rpx }
.col.name{ flex:1.8 }
.col.total{ display:flex; align-items:center; justify-content:flex-end }
.col.right{ display:flex; align-items:center; justify-content:flex-start; gap:12rpx; padding-left:12rpx }
.amount{ color:#333; font-weight:600 }
</style>
