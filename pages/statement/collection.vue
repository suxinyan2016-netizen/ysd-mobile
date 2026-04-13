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
      <view class="title">收款记录</view>
    </view>

    <view class="content">
      <view class="search-bar">
        <view class="user-picker">
          <view class="search-input" @click="showUserModal = true">{{ selectedUserName || '请选择付款方' }}</view>
        </view>
        <view class="date-input" @click="openStartPicker"><text>{{ startDate || '开始日期' }}</text></view>
        <view class="date-input" @click="openEndPicker"><text>{{ endDate || '结束日期' }}</text></view>
        <button class="search-btn" @click="onQuery">查询</button>
      </view>

      <ModalPicker :show="showUserModal" title="请选择付款方" :list="userListForModal" @select="onUserSelect" @close="showUserModal=false" />

      <view class="result-list">
        <view v-if="!rows.length" class="empty">无数据</view>
        <view v-for="row in rows" :key="row._key" class="row-card">
          <view class="row-top">
            <text class="top-date">{{ row.paymentdate || row.paymentDate || row.date || '' }}</text>
            <text class="top-type">{{ row.statementtype === 'P' ? '包裹' : '商品' }}</text>
            <text class="top-amount">$ {{ fmt(row.Amount || row.amount || row.total || row.sum || 0) }}</text>
          </view>
          <view class="row-bottom">
            <text class="bottom-payto">付款方: {{ row.paidby || '' }}</text>
            <text class="bottom-items">数量: {{ row.Items || row.items || 0 }}</text>
          </view>
        </view>
      </view>
        <view class="result-totals">
          <view style="flex:1"></view>
          <view class="totals-right">
            <text class="totals-items">数量总数: {{ totalItems }}</text>
            <text class="totals-amount">金额总数: $ {{ fmt(totalAmount) }}</text>
          </view>
        </view>

      <!-- detail drawers removed per requirement -->

    </view>
  </view>
</template>

  <script setup>
import { ref, onMounted, computed } from 'vue'
import ModalPicker from '@/components/ModalPicker.vue'
import { ApiHelper } from '@/utils/apiHelper'
import { smartBack } from '@/utils/navigation'
import { getTokenInfo } from '@/utils/tokenManager'

const rows = ref([])
const totalItems = computed(() => {
  return (rows.value || []).reduce((s, r) => s + Number(r.Items || r.items || 0), 0)
})
const totalAmount = computed(() => {
  return (rows.value || []).reduce((s, r) => s + Number(r.Amount || r.amount || r.total || r.sum || 0), 0)
})
const userText = ref('')
const selectedUser = ref(null)
const users = ref([])
const showUserModal = ref(false)
const userListForModal = computed(() => (users.value || []).map(u => (u.name || u.username || String(u.userId || u.id || ''))))
const selectedUserName = computed(() => selectedUser.value ? (selectedUser.value.name || selectedUser.value.username || '') : '')
const startDate = ref((() => { const d = new Date(); return `${d.getFullYear()}-01-01`; })())
const endDate = ref((() => { const d = new Date(); return d.toISOString().slice(0,10); })())

function openStartPicker(){ try{ uni.showDatePicker({ success: (res) => { if (res && res.value) startDate.value = res.value } }) }catch(e){} }
function openEndPicker(){ try{ uni.showDatePicker({ success: (res) => { if (res && res.value) endDate.value = res.value } }) }catch(e){} }

// detail dialogs removed

function fmt(v){ if (v == null || v === '') return '0.00'; const n = Number(v); if (Number.isNaN(n)) return '0.00'; return n.toFixed(2) }

// dateRange control handled by DateRangePicker component

async function loadUsers(){
  try{
    // try '/users/all' first, fallback to '/users'
    let res = await ApiHelper.get('/users/all').catch(()=>null)
    if (!res) res = await ApiHelper.get('/users').catch(()=>null)
    if (res && res.code === 1) users.value = res.data || []
    else if (Array.isArray(res)) users.value = res
    // filter out system user (userId === 1)
    users.value = (users.value || []).filter(u => ((u.userId || u.id) !== 1))
  }catch(e){ users.value = [] }
}

function fetchUserSuggestions(query, cb){
  const list = (users.value || []).filter(u => u.name && u.name.toLowerCase().includes((query||'').toLowerCase()))
  cb(list.map(u=>({ value: u.name, userId: u.userId || u.id })))
}

function onUserSelect(idx){
  try{
    const i = Number(idx)
    if (isNaN(i) || i < 0){ showUserModal.value = false; return }
    selectedUser.value = users.value && users.value[i] ? users.value[i] : null
    showUserModal.value = false
  }catch(e){ showUserModal.value = false }
}

function formatDate(d){ if (!d) return null; try{ return (new Date(d)).toISOString().slice(0,10) }catch(e){ return null } }

async function onQuery(){
  rows.value = []
  // require a selected payer
  if (!selectedUser.value){ try{ uni.showToast({ title: '请选择付款方', icon: 'none' }) }catch(e){}; return }

  let loginUser = getTokenInfo().loginUser || null
  if (!loginUser || Object.keys(loginUser).length===0){ try{ const raw = uni.getStorageSync('loginUser'); if (raw) loginUser = JSON.parse(raw) }catch(e){ loginUser = loginUser || null } }
  const keeperId = loginUser ? (loginUser.userId || loginUser.id) : null
  const ownerId = selectedUser.value ? (selectedUser.value.userId || selectedUser.value.id) : null
  const params = { ownerId, keeperId, startDate: formatDate(startDate.value), endDate: formatDate(endDate.value) }
  console.log('collection query params:', params)

  try{
    const qs = Object.keys(params).filter(k=>params[k]!=null).map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&')
    const url = `/statement${qs?('?'+qs):''}`
    const res = await ApiHelper.get(url)
    const data = (res && res.data) ? (Array.isArray(res.data)?res.data:(res.data.rows||[])) : (Array.isArray(res)?res:[])
    rows.value = (data || []).map((r,i)=>({ ...r, _key: 'st_'+i }))
    rows.value.sort((a,b)=>{ const da=new Date(a.paymentdate||a.paymentDate||0).getTime()||0; const db=new Date(b.paymentdate||b.paymentDate||0).getTime()||0; return db-da })
  }catch(e){ rows.value = [] }
}

function fmtDateYMD(v){ if (!v) return ''; try{ return (new Date(v)).toISOString().slice(0,10) }catch(e){ return String(v).slice(0,10) } }

// detail handlers removed

onMounted(()=>{ loadUsers() })
</script>

<style scoped>
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title{ color:#fff; font-size:34rpx; font-weight:700 }
.back{ position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon{ width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg{ width:32rpx; height:32rpx }
.content{ padding-top:120rpx; padding:12rpx }
.search-bar{ display:flex; gap:8rpx; align-items:center; margin-bottom:12rpx }
  .search-input{ flex:1; height:56rpx; background:#fff; border-radius:8rpx; display:flex; align-items:center; padding:0 12rpx }
.search-input input{ width:100%; border:none; outline:none; font-size:26rpx }
  .date-input{ width:160rpx; height:56rpx; background:#fff; border-radius:8rpx; display:flex; align-items:center; justify-content:center }
  .search-btn{ width:120rpx; height:56rpx; background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff; border-radius:8rpx; display:flex; align-items:center; justify-content:center; font-size:20rpx }
.result-list{ padding-top:8rpx }
.result-totals{ background:#fff; padding:12rpx; border-radius:8rpx; margin-top:8rpx; display:flex; align-items:center }
.result-totals .totals-right{ display:flex; flex-direction:column; align-items:flex-end }
.result-totals .totals-right .totals-items{ color:#666 }
.result-totals .totals-right .totals-amount{ color:#c0392b; font-weight:700; margin-top:6rpx }
.row-card{ background:#fff; padding:12rpx; border-radius:8rpx; margin-bottom:12rpx }
.row-top{ display:flex; gap:12rpx; align-items:center; margin-bottom:6rpx }
.top-date{ color:#333; font-weight:700 }
.top-type{ color:#999 }
.top-amount{ margin-left:auto; color:#c0392b; font-weight:700 }
.row-bottom{ display:flex; gap:12rpx; align-items:center }
.bottom-paidby{ color:#666 }
.bottom-payto{ color:#666 }
  .link{ background:transparent !important; color:#2d8cf0; border:none !important; padding:0; margin-left:auto; font-size:24rpx }
  .bottom-items{ color:#666 }

/* drawer styles */
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
</style>
