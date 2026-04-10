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
      <view class="title">我的应付</view>
    </view>

    <view class="content">
      <!-- Item groups (应付商品服务费及寄售货款) -->
      <view class="card" v-if="itemGroups.length">
        <view class="card-header">应付商品服务费及寄售货款</view>
        <view class="card-body">
          <view class="table-row header">
            <text class="col">付款人</text>
            <text class="col right">总额</text>
          </view>
          <view class="table-row" v-for="g in itemGroups" :key="g.paytoid">
            <text class="col">{{ g.payto || '未知' }}</text>
            <view class="col right">
              <text class="amount">{{ fmt(g.total) }}</text>
              <button class="link" @click="openItemDetails(g)">明细</button>
            </view>
          </view>
        </view>
      </view>

      <!-- Parcel groups (应付包裹代付运费) -->
      <view class="card" v-if="parcelGroups.length">
        <view class="card-header">应付包裹代付运费</view>
        <view class="card-body">
          <view class="table-row header">
            <text class="col">付款人</text>
            <text class="col right">总额</text>
          </view>
          <view class="table-row" v-for="g in parcelGroups" :key="g.paytoid">
            <text class="col">{{ g.payto || '未知' }}</text>
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
            <text class="col sel">选</text>
            <text class="col name">商品名</text>
            <text class="col total">总费用</text>
          </view>
          <view class="table-row" v-for="row in dialogItems" :key="row.itemId || row.id">
            <view class="col sel"><checkbox :value="row.itemId || row.id" :checked="selectedItemIds.includes(row.itemId||row.id)" @change="toggleItemSelection(row)" /></view>
            <text class="col name">{{ row.sellerpart || '' }}</text>
            <text class="col total">{{ fmt(row.subtotalfee || row.total || 0) }}</text>
          </view>
        </view>
        <view class="drawer-footer">
          <text>合计: {{ fmt(dialogTotal) }}</text>
          <button class="btn primary" @click="settleSelectedItems">结算</button>
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
            <text class="col sel">选</text>
            <text class="col name">运单号</text>
            <text class="col total">费用</text>
          </view>
          <view class="table-row" v-for="row in dialogParcels" :key="row.parcelId || row.packageno || row.id">
            <view class="col sel"><checkbox :value="row.parcelId || row.id || row.packageno" :checked="selectedParcelIds.includes(row.parcelId||row.id||row.packageno)" @change="toggleParcelSelection(row)" /></view>
            <text class="col name">{{ row.packageno || '' }}</text>
            <text class="col total">{{ fmt(row.fee || 0) }}</text>
          </view>
        </view>
        <view class="drawer-footer">
          <text>合计: {{ fmt(parcelDialogTotal) }}</text>
          <button class="btn primary" @click="settleSelectedParcels">结算</button>
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
const selectedItemIds = ref([])

const showParcelDialog = ref(false)
const dialogParcels = ref([])
const parcelDialogTitle = ref('')
const parcelDialogTotal = ref(0)
const selectedParcelIds = ref([])
const currentItemGroup = ref(null)
const currentParcelGroup = ref(null)

function fmt(v){ if (v == null || v === '') return '0.00'; const n = Number(v); if (Number.isNaN(n)) return '0.00'; return n.toFixed(2) }

async function load(){
  const user = getTokenInfo().loginUser || JSON.parse(uni.getStorageSync('loginUser') || '{}') || {}
  const uid = user.userId ?? user.id ?? user.userid
  if (!uid) return

  // load item fees grouped by payto
  try{
    const res = await ApiHelper.get(`/fee/itemfee?paidbyid=${uid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    const map = new Map()
    rows.forEach(r => {
      const key = r.paytoid || 0
      const name = r.payto || '未知'
      const subtotal = Number(r.subtotalfee || r.total || 0)
      if (!map.has(key)) map.set(key, { paytoid: key, payto: name, total: 0 })
      map.get(key).total += subtotal
    })
    itemGroups.value = Array.from(map.values())
  }catch(e){ itemGroups.value = [] }

  // load parcel fees grouped by payto
  try{
    const res = await ApiHelper.get(`/fee/parcelfee?paidbyid=${uid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    const map = new Map()
    rows.forEach(r => {
      const key = r.paytoid || 0
      const name = r.payto || '未知'
      const fee = Number(r.fee || 0)
      if (!map.has(key)) map.set(key, { paytoid: key, payto: name, total: 0 })
      map.get(key).total += fee
    })
    parcelGroups.value = Array.from(map.values())
  }catch(e){ parcelGroups.value = [] }
}

async function openItemDetails(group){
  const user = getTokenInfo().loginUser || JSON.parse(uni.getStorageSync('loginUser') || '{}') || {}
  const uid = user.userId ?? user.id ?? user.userid
  if (!uid) return
  const paytoid = group.paytoid
  try{
    const res = await ApiHelper.get(`/fee/itemfee?paidbyid=${uid}&paytoid=${paytoid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    dialogItems.value = rows
    selectedItemIds.value = []
    currentItemGroup.value = group
    dialogTotal.value = rows.reduce((s,r)=>s+Number(r.subtotalfee||r.total||0),0)
    dialogTitle.value = `${group.payto || ''}（收款方）`
    showItemDialog.value = true
  }catch(e){ uni.showToast({ title: '无法加载明细', icon:'none' }) }
}

async function openParcelDetails(group){
  const user = getTokenInfo().loginUser || JSON.parse(uni.getStorageSync('loginUser') || '{}') || {}
  const uid = user.userId ?? user.id ?? user.userid
  if (!uid) return
  const paytoid = group.paytoid
  try{
    const res = await ApiHelper.get(`/fee/parcelfee?paidbyid=${uid}&paytoid=${paytoid}`)
    const rows = (res && res.data) ? (Array.isArray(res.data) ? res.data : (res.data.rows || [])) : (Array.isArray(res) ? res : [])
    dialogParcels.value = rows
    selectedParcelIds.value = []
    currentParcelGroup.value = group
    parcelDialogTotal.value = rows.reduce((s,r)=>s+Number(r.fee||0),0)
    parcelDialogTitle.value = `${group.payto || ''}（收款方）`
    showParcelDialog.value = true
  }catch(e){ uni.showToast({ title: '无法加载运费明细', icon:'none' }) }
}

function toggleItemSelection(row){
  const id = row.itemId || row.id
  const idx = selectedItemIds.value.indexOf(id)
  if (idx === -1) selectedItemIds.value.push(id)
  else selectedItemIds.value.splice(idx,1)
}

function toggleParcelSelection(row){
  const id = row.parcelId || row.id || row.packageno
  const idx = selectedParcelIds.value.indexOf(id)
  if (idx === -1) selectedParcelIds.value.push(id)
  else selectedParcelIds.value.splice(idx,1)
}

async function settleSelectedItems(){
  const ids = selectedItemIds.value.slice()
  if (!ids.length){ uni.showToast({ title:'请选择要结算的商品', icon:'none' }); return }
  uni.showModal({ title:'确认', content:'确定结算选中的商品吗？', success: async (res) => {
    if (res.confirm){
      try{
        await ApiHelper.post('/fees/settleItems', { ids })
        uni.showToast({ title:'结算成功', icon:'success' })
        if (currentItemGroup.value) await openItemDetails(currentItemGroup.value)
        await load()
      }catch(e){ uni.showToast({ title:'结算失败', icon:'none' }) }
    }
  }})
}

async function settleSelectedParcels(){
  const ids = selectedParcelIds.value.slice()
  if (!ids.length){ uni.showToast({ title:'请选择要结算的包裹', icon:'none' }); return }
  uni.showModal({ title:'确认', content:'确定结算选中的包裹吗？', success: async (res) => {
    if (res.confirm){
      try{
        await ApiHelper.post('/fees/settleParcels', { ids })
        uni.showToast({ title:'结算成功', icon:'success' })
        if (currentParcelGroup.value) await openParcelDetails(currentParcelGroup.value)
        await load()
      }catch(e){ uni.showToast({ title:'结算失败', icon:'none' }) }
    }
  }})
}

onMounted(load)
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

/* Card / table styles to match web layout */
.card{ background:#fff; border-radius:6rpx; padding:20rpx; margin-bottom:20rpx; box-shadow:0 2rpx 6rpx rgba(0,0,0,0.03) }
.card-header{ font-weight:700; font-size:30rpx; padding-bottom:12rpx; border-bottom:1rpx solid #f0f0f0; margin-bottom:12rpx }
.card-body{ padding:0 }
.table-row{ display:flex; align-items:center; padding:18rpx 0; border-bottom:1rpx solid #f6f6f6 }
.table-row.header{ color:#999; font-size:26rpx }
.col{ flex:1 }
.col.sel{ flex:0 0 51rpx }
.col.name{ flex:1.8 }
.col.total{ display:flex; align-items:center; justify-content:flex-end }
.col.right{ display:flex; align-items:center; justify-content:flex-start; gap:12rpx; padding-left:12rpx }
.link{ background:transparent !important; color:#2d8cf0; border:none !important; padding:0; margin-left:12rpx; font-size:24rpx; outline:none !important; box-shadow:none !important; -webkit-appearance:none; appearance:none; border-radius:0 }
.col.sel checkbox{ width:38rpx; height:38rpx }
.amount{ color:#333; font-weight:600 }

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

/* match global drawer primary button style used elsewhere */
.drawer-footer .btn{ padding:0 18rpx; height:56rpx; min-width:120rpx; display:flex; align-items:center; justify-content:center; border-radius:8rpx; background:#fff; color:#333; border:1rpx solid #ececec; box-shadow:0 6rpx 18rpx rgba(0,0,0,0.04); font-size:20rpx; font-weight:400 }
.drawer-footer .btn.primary{ background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff; box-shadow: 0 6rpx 18rpx rgba(64,158,255,0.12); border: none; min-width:120rpx; height:56rpx; font-size:20rpx }
.summary-row{ display:flex; align-items:center; padding-top:8rpx }
.summary-total{ font-size:28rpx; font-weight:700 }
.back{ position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon{ width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg{ width:32rpx; height:32rpx }
</style>
