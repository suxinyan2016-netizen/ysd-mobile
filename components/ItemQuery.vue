<template>
  <view class="page-container">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.5 5.5L9 12l6.5 6.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </view>
      </view>
      <view class="title">{{ title }}</view>
    </view>

    <view class="search-bar">
      <view class="search-input">
        <input v-model="itemNo" placeholder="请输入商品号" />
      </view>
      <view class="search-input">
        <input v-model="sellerPart" placeholder="请输入商品名" />
      </view>
      <button class="search-btn" @click="doSearch">查询</button>
      <button class="more-btn" @click="openMore">更多</button>
    </view>

    <view class="result-list">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else>
        <view v-if="rows.length===0" class="empty">暂无结果</view>
        <view v-else>
          <view v-for="row in rows" :key="row.itemId" class="row-card" @click="openDetail(row)">
            <view class="row-top">
              <text class="top-itemno">{{ row.itemNo || '-' }}</text>
              <text class="top-dict">{{ row.dictName || '-' }}</text>
              <text class="top-status">{{ mapItemStatus(row.itemStatus) }}</text>
            </view>
            <view class="row-bottom">
              <text class="bottom-name">{{ row.sellerPart || row.mfrPart || '-' }}</text>
              <text :class="['bottom-isgood', row.isGood===0 ? 'bad' : 'good']">{{ row.isGood===1 ? '良品' : (row.isGood===0 ? '次品' : '-') }}</text>
              <text class="bottom-owner">货主：{{ row.owner || row.ownerName || '-' }}</text>
              <text class="bottom-keeper">仓库：{{ row.keeper || row.keeperName || '-' }}</text>
            </view>
          </view>
        </view>

        <view class="pager">
          <view class="pager-btn primary" :class="{disabled: page<=1}" @click="page>1 && gotoPage(page-1)">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 6 L9 12 L15 18" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            <text class="btn-text">上一页</text>
          </view>

          <text class="page-info">第 {{ page }} 页 / 共 {{ totalPages }} 页</text>

          <view class="pager-btn primary" :class="{disabled: page>=totalPages}" @click="page<totalPages && gotoPage(page+1)">
            <text class="btn-text">下一页</text>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 6 L15 12 L9 18" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showDetail" class="drawer-overlay" @click.self="closeDetail">
      <view class="drawer">
        <view class="drawer-header">
          <text class="drawer-title">商品详情</text>
          <view class="close" @click="closeDetail">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6 L18 18 M6 18 L18 6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </view>
        </view>
        <view class="drawer-content">
          <view class="detail-row"><text class="label">ItemNo:</text><text class="value">{{ sel.itemNo || '-' }}</text></view>
          <view class="detail-row"><text class="label">Seller Part:</text><text class="value">{{ sel.sellerPart || sel.mfrPart || '-' }}</text></view>
          <view class="detail-row"><text class="label">Qty:</text><text class="value">{{ sel.qty ?? '-' }}</text></view>
          <view class="detail-row"><text class="label">Keeper:</text><text class="value">{{ sel.keeperName || sel.keeper || '-' }}</text></view>
          <view class="detail-row"><text class="label">Owner:</text><text class="value">{{ sel.ownerName || sel.owner || '-' }}</text></view>
          <view class="detail-row"><text class="label">分类:</text><text class="value">{{ sel.dictName || '-' }}</text></view>
        </view>
      </view>
    </view>

    <!-- More filters drawer -->
    <view v-if="showMore" class="more-overlay" @click.self="closeMore">
      <view class="more-drawer">
        <view class="more-row"><text class="label">商品号</text><input v-model="filter_itemNo" placeholder="请输入商品号" /></view>
        <view class="more-row"><text class="label">商品名</text><input v-model="filter_sellerPart" placeholder="请输入商品名" /></view>
        <view class="more-row" @click="openPicker('dict')"><text class="label">类别</text><text class="picker-value">{{ selectedDictName || '请选择' }}</text></view>
        <view class="more-row"><text class="label">收货运单号</text><input v-model="filter_receivePackageNo" placeholder="请输入收货运单号" /></view>
        <view class="more-row"><text class="label">寄出运单号</text><input v-model="filter_sendPackageNo" placeholder="请输入寄出运单号" /></view>
        <view class="more-row" v-if="otherPicker==='keeper'" @click="openPicker('keeper')"><text class="label">仓库</text><text class="picker-value">{{ selectedKeeperName || '请选择' }}</text></view>
        <view class="more-row" v-if="otherPicker==='owner'" @click="openPicker('owner')"><text class="label">货主</text><text class="picker-value">{{ selectedOwnerName || '请选择' }}</text></view>
        <view class="more-row" @click="openPicker('itemStatus')"><text class="label">状态</text><text class="picker-value">{{ selectedStatusLabel || '请选择' }}</text></view>
        <view class="more-row radio-row">
          <text class="label">是否结算</text>
          <view class="radio-group">
            <label class="radio-item"><radio v-model="filter_isPaid" :value="0" />否</label>
            <label class="radio-item"><radio v-model="filter_isPaid" :value="1" />是</label>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">是否良品</text>
          <view class="radio-group">
            <label class="radio-item"><radio v-model="filter_isGood" :value="0" />次品</label>
            <label class="radio-item"><radio v-model="filter_isGood" :value="1" />良品</label>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">是否寄售</text>
          <view class="radio-group">
            <label class="radio-item"><radio v-model="filter_isConsigned" :value="0" />否</label>
            <label class="radio-item"><radio v-model="filter_isConsigned" :value="1" />是</label>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">需要测试</text>
          <view class="radio-group">
            <label class="radio-item"><radio v-model="filter_needTest" :value="0" />否</label>
            <label class="radio-item"><radio v-model="filter_needTest" :value="1" />是</label>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">需要维修</text>
          <view class="radio-group">
            <label class="radio-item"><radio v-model="filter_needRepair" :value="0" />否</label>
            <label class="radio-item"><radio v-model="filter_needRepair" :value="1" />是</label>
          </view>
        </view>
        <view class="more-actions">
          <button class="btn" @click="resetMore">重置</button>
          <button class="btn primary" @click="applyMore">确定</button>
        </view>
      </view>
    </view>

    <!-- Picker modal -->
    <ModalPicker v-if="showPicker" :show="showPicker" :title="pickerTitle" :list="pickerList" @select="onPickerSelect" @close="closePicker" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import ModalPicker from '@/components/ModalPicker.vue'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'
import { smartBack } from '@/utils/navigation'

const props = defineProps({
  title: { type: String, default: '商品查询' },
  fixedParam: { type: String, default: 'ownerId' },
  otherPicker: { type: String, default: 'keeper' } // 'keeper' or 'owner'
})

const userStore = useUserStore()
const itemNo = ref('')
const sellerPart = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const rows = ref([])
const loading = ref(false)
const showDetail = ref(false)
const sel = ref({})

const totalPages = computed(() => Math.max(1, Math.ceil((total.value||0) / pageSize.value)))

function goBack(){ smartBack() }

function mapItemStatus(s){
  const m = { 0: '检验中', 1: '已入库', 2: '已出库', 9: '异常' }
  return m[s] || '-'
}

function getCurrentUserId(){
  let uid = userStore.userInfo?.id || userStore.userInfo?.userId
  if (!uid){
    try{
      const saved = uni.getStorageSync('loginUser')
      if (saved){
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
        uid = parsed?.id || parsed?.userId
      }
    }catch(e){}
  }
  return uid ? Number(uid) : null
}

// More filter state
const showMore = ref(false)
const filter_itemNo = ref('')
const filter_sellerPart = ref('')
const filter_dictId = ref(null)
const selectedDictName = ref('')
const filter_receivePackageNo = ref('')
const filter_sendPackageNo = ref('')
const filter_ownerId = ref(null)
const selectedOwnerName = ref('')
const filter_keeperId = ref(null)
const selectedKeeperName = ref('')
const filter_itemStatus = ref(null)
const filter_isPaid = ref(null)
const filter_isGood = ref(null)
const filter_isConsigned = ref(null)
const filter_needTest = ref(null)
const filter_needRepair = ref(null)

const showPicker = ref(false)
const pickerList = ref([])
const pickerTitle = ref('')
const pickerTarget = ref('')

const dictOptions = ref([])
const userList = ref([])

const statusLabels = ['检验中','已入库','已出库','异常']
const statusValues = [0,1,2,9]
const boolLabels = ['否','是']
const boolValues = [0,1]

function openMore(){
  showMore.value = true
  if (!dictOptions.value.length) loadDicts()
  if (!userList.value.length) loadUsers()
}
function closeMore(){ showMore.value = false }
function resetMore(){
  filter_itemNo.value=''
  filter_sellerPart.value=''
  filter_dictId.value=null; selectedDictName.value=''
  filter_receivePackageNo.value=''
  filter_sendPackageNo.value=''
  filter_ownerId.value=null; selectedOwnerName.value=''
  filter_keeperId.value=null; selectedKeeperName.value=''
  filter_itemStatus.value=null; selectedStatusLabel.value=''
  filter_isPaid.value=null; selectedIsPaidLabel.value=''
  filter_isGood.value=null; selectedIsGoodLabel.value=''
  filter_isConsigned.value=null; selectedIsConsignedLabel.value=''
  filter_needTest.value=null; selectedNeedTestLabel.value=''
  filter_needRepair.value=null; selectedNeedRepairLabel.value=''
}
function applyMore(){
  showMore.value = false
  page.value = 1
  doSearch()
}

async function loadDicts(){
  try{
    const res = await ApiHelper.get('/dicts')
    if (res && res.code===1 && Array.isArray(res.data)){
      dictOptions.value = res.data.filter(d => String(d.dictGroup) === '2')
    }
  }catch(e){ console.warn('loadDicts failed', e) }
}
async function loadUsers(){
  try{
    const res = await ApiHelper.get('/users/all')
    if (res && res.code===1 && Array.isArray(res.data)){
      userList.value = res.data.filter(u => Number(u.id || u.userId) !== 1)
    }
  }catch(e){ console.warn('loadUsers failed', e) }
}

function openPicker(target){
  pickerTarget.value = target
  if (target === 'dict'){
    pickerList.value = dictOptions.value.map(d=>d.dictName||d.name)
    pickerTitle.value = '选择类别'
  } else if (target === 'owner'){
    pickerList.value = userList.value.map(u=>u.name||u.username)
    pickerTitle.value = '选择货主'
  } else if (target === 'keeper'){
    pickerList.value = userList.value.map(u=>u.name||u.username)
    pickerTitle.value = '选择仓库'
  } else if (target === 'itemStatus'){
    pickerList.value = statusLabels
    pickerTitle.value = '选择状态'
  } else if (target === 'isPaid'){
    pickerList.value = boolLabels; pickerTitle.value='是否结算'
  } else if (target === 'isGood'){
    pickerList.value = ['次品','良品']; pickerTitle.value='是否良品'
  } else if (target === 'isConsigned'){
    pickerList.value = boolLabels; pickerTitle.value='是否寄售'
  } else if (target === 'needTest'){
    pickerList.value = boolLabels; pickerTitle.value='需要测试'
  } else if (target === 'needRepair'){
    pickerList.value = boolLabels; pickerTitle.value='需要维修'
  }
  showPicker.value = true
}

function closePicker(){ showPicker.value = false }

function onPickerSelect(idx){
  showPicker.value = false
  const i = Number(idx)
  if (pickerTarget.value === 'dict'){
    const sel = dictOptions.value[i]
    filter_dictId.value = sel?.dictId || sel?.id || null
    selectedDictName.value = sel?.dictName || sel?.name || ''
  } else if (pickerTarget.value === 'owner'){
    const u = userList.value[i]
    filter_ownerId.value = u?.id || u?.userId || null
    selectedOwnerName.value = u?.name || u?.username || ''
  } else if (pickerTarget.value === 'keeper'){
    const u = userList.value[i]
    filter_keeperId.value = u?.id || u?.userId || null
    selectedKeeperName.value = u?.name || u?.username || ''
  } else if (pickerTarget.value === 'itemStatus'){
    filter_itemStatus.value = statusValues[i]
    selectedStatusLabel.value = statusLabels[i]
  } else if (pickerTarget.value === 'isPaid'){
    filter_isPaid.value = boolValues[i]
    selectedIsPaidLabel.value = boolLabels[i]
  } else if (pickerTarget.value === 'isGood'){
    filter_isGood.value = i===1?1:0
    selectedIsGoodLabel.value = i===1?'良品':'次品'
  } else if (pickerTarget.value === 'isConsigned'){
    filter_isConsigned.value = boolValues[i]
    selectedIsConsignedLabel.value = boolLabels[i]
  } else if (pickerTarget.value === 'needTest'){
    filter_needTest.value = boolValues[i]
    selectedNeedTestLabel.value = boolLabels[i]
  } else if (pickerTarget.value === 'needRepair'){
    filter_needRepair.value = boolValues[i]
    selectedNeedRepairLabel.value = boolLabels[i]
  }
}

// labels for selected picks
const selectedStatusLabel = ref('')
const selectedIsPaidLabel = ref('')
const selectedIsGoodLabel = ref('')
const selectedIsConsignedLabel = ref('')
const selectedNeedTestLabel = ref('')
const selectedNeedRepairLabel = ref('')

async function doSearch(){
  loading.value = true
  rows.value = []
  try{
    const uid = getCurrentUserId()
    if (!uid){ uni.showToast({ title:'无法获取当前用户ID，无法查询', icon:'none' }); loading.value=false; return }
    const params = { page: page.value, pageSize: pageSize.value, itemNo: itemNo.value || '', sellerPart: sellerPart.value || '' }
    // fixed param: ownerId or keeperId is set to current user
    params[props.fixedParam] = uid
    // include the other picker if selected
    if (props.otherPicker === 'keeper' && filter_keeperId.value) params.keeperId = filter_keeperId.value
    if (props.otherPicker === 'owner' && filter_ownerId.value) params.ownerId = filter_ownerId.value
    if (filter_dictId.value) params.dictId = filter_dictId.value
    if (filter_itemStatus.value !== null) params.itemStatus = filter_itemStatus.value
    if (filter_isPaid.value !== null) params.isPaid = filter_isPaid.value
    if (filter_isGood.value !== null) params.isGood = filter_isGood.value
    if (filter_isConsigned.value !== null) params.isConsigned = filter_isConsigned.value
    if (filter_needTest.value !== null) params.needTest = filter_needTest.value
    if (filter_needRepair.value !== null) params.needRepair = filter_needRepair.value

    const res = await ApiHelper.get('/items', params)
    if (res && res.code === 1 && res.data){
      total.value = res.data.total || (res.data.rows ? res.data.rows.length : 0)
      rows.value = res.data.rows || []
    } else { uni.showToast({ title: (res && res.msg) || '查询失败', icon:'none' }) }
  }catch(e){ console.error('item query search error', e); uni.showToast({ title:'网络错误', icon:'none' }) }
  finally{ loading.value = false }
}

function gotoPage(p){ if (p<1) p=1; if (p>totalPages.value) p=totalPages.value; page.value = p; doSearch() }

async function openDetail(row){
  showDetail.value = true
  try{
    const res = await ApiHelper.get(`/items/${row.itemId}`)
    if (res && res.code === 1) sel.value = res.data || row
    else sel.value = row
  }catch(e){ console.error('openDetail error', e); sel.value = row; uni.showToast({ title:'无法加载详情', icon:'none' }) }
}

function closeDetail(){ showDetail.value = false; sel.value = {} }

onLoad(() => { page.value = 1; doSearch() })
onShow(() => { page.value = 1; doSearch() })
</script>

<style scoped>
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.title{ color:#fff; font-size:34rpx; font-weight:700 }
.back{ position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon{ width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg{ width:32rpx; height:32rpx }
.search-bar{ display:flex; align-items:center; padding:20rpx; background:#fff; margin-top:0 }
.search-input{ flex:1; display:flex; align-items:center; background:#f5f5f5; border-radius:40rpx; padding:0 30rpx; height:70rpx; margin-right:16rpx }
.search-input input{ flex:1; font-size:24rpx }
.search-btn { width: 105rpx; height: 60rpx; line-height: 60rpx; text-align: center; background: linear-gradient(90deg, #409EFF, #66B1FF); color: #fff; border-radius: 8rpx; font-size: 20rpx; font-weight: 400; padding: 0 16rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 18rpx rgba(64,158,255,0.12); border: none; margin-right: 8rpx; }
.more-btn { width: 105rpx; height: 60rpx; line-height: 60rpx; text-align: center; background: linear-gradient(90deg, #409EFF, #66B1FF); color: #fff; border-radius: 8rpx; font-size: 20rpx; font-weight: 400; padding: 0 16rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 18rpx rgba(64,158,255,0.12); border: none; }
.result-list{ flex:1; padding:20rpx }
.row-card{ background:#fff; padding:12rpx; border-radius:8rpx; margin-bottom:12rpx; display:flex; flex-direction:column }
.row-top{ display:flex; gap:12rpx; align-items:center; margin-bottom:6rpx }
.row-bottom{ display:flex; gap:12rpx; align-items:center }
.row-top text, .row-bottom text { font-size:10px; color:#333 }
.top-itemno{ flex:1; color:#409EFF }
.top-dict{ width:120px; color:#666 }
.top-status{ width:80px; color:#666 }
.bottom-name{ flex:3; color:#333 }
  .bottom-isgood{ width:80px; text-align:center }
  .bottom-isgood.bad{ color:#FF4D4F }
  .bottom-owner{ width:80px; color:#666 }
  .bottom-keeper{ width:80px; color:#666 }

  .pager{ display:flex; align-items:center; justify-content:center; gap:24rpx; margin-top:12rpx }
  .pager-btn{ display:flex; align-items:center; gap:10rpx; padding:10rpx 18rpx; background:#fff; border-radius:12rpx; box-shadow:0 8rpx 18rpx rgba(0,0,0,0.06); cursor:pointer }
  .pager-btn svg{ width:28rpx; height:28rpx }
  .pager-btn .btn-text{ font-size:26rpx; color:#409EFF }
  .pager-btn.primary{ background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff }
  .pager-btn.primary .btn-text{ color:#fff }
  .pager-btn.disabled{ opacity:0.45; pointer-events:none; box-shadow:none }

/* drawer + more styles */
.drawer-overlay{ position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.35); display:flex; align-items:flex-end; justify-content:center; z-index:2000 }
.drawer{ width:100%; background:#fff; border-top-left-radius:16rpx; border-top-right-radius:16rpx; padding:20rpx }
.drawer-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12rpx }
.drawer-title{ font-size:28rpx; font-weight:600 }
.drawer-content{ max-height:60vh; overflow:auto }
.detail-row{ display:flex; gap:12rpx; padding:12rpx 0; border-bottom:1rpx solid #f0f0f0 }
.detail-row .label{ width:160rpx; color:#666 }
.detail-row .value{ flex:1; color:#333 }

.more-overlay{ position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.35); display:flex; align-items:flex-end; justify-content:center; z-index:2000 }
.more-drawer{ width:100%; background:#fff; border-top-left-radius:16rpx; border-top-right-radius:16rpx; padding:20rpx }
.more-row{ display:flex; align-items:center; justify-content:space-between; padding:12rpx 0; border-bottom:1rpx solid #f6f6f6 }
.more-row .label{ color:#666 }
.more-row input{ font-size:22rpx }
.picker-value{ color:#333 }
.more-actions{ display:flex; gap:12rpx; justify-content:flex-end; margin-top:12rpx }
.more-actions .btn{ padding:0 18rpx; height:56rpx; min-width:120rpx; display:flex; align-items:center; justify-content:center; border-radius:8rpx; background:#fff; color:#333; border:1rpx solid #ececec; box-shadow:0 6rpx 18rpx rgba(0,0,0,0.04); font-size:20rpx; font-weight:400 }
.more-actions .btn.primary{ background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff; box-shadow: 0 6rpx 18rpx rgba(64,158,255,0.12); border: none; min-width:120rpx; height:56rpx; font-size:20rpx }
.btn{ padding:8rpx 12rpx; border-radius:8rpx; background:#f5f5f5; }
.btn.primary{ background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff }

.radio-group{ display:flex; gap:36rpx; align-items:center }
.radio-item{ display:flex; align-items:center; gap:12rpx; color:#333; font-size:24rpx; padding:8rpx 12rpx; min-width:120rpx; border-radius:10rpx }
.radio-item radio{ width:44rpx; height:44rpx }
</style>