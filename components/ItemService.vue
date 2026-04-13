<template>
  <view class="service-container">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15.5 5.5L9 12l6.5 6.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </view>
      </view>
      <view class="title">{{ pageTitle }}</view>
    </view>

    <view class="list-container">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else>
        <view v-if="rows.length === 0" class="empty">没有需要查验的商品</view>
        <view v-else>
          <view v-for="row in rows" :key="row.itemId || row.id" class="row-card" @click="openItem(row)">
            <view class="line1">
              <text class="itemno">{{ row.itemNo || '-' }}</text>
              <text class="dict">{{ row.dictName || row.category || '-' }}</text>
              <text class="qty">数量: {{ row.qty ?? row.quantity ?? '-' }}</text>
              <text class="status">{{ mapItemStatus(row.itemStatus) }}</text>
            </view>
            <view class="line2">
              <text class="sellpart">{{ row.sellerPart || row.mfrPart || '-' }}</text>
              <text class="isgood">{{ row.isGood===1 ? '良品' : (row.isGood===0 ? '次品' : '-') }}</text>
              <text class="owner">货主: {{ row.owner || row.ownerName || '-' }}</text>
              <text class="keeper">仓库: {{ row.keeper || row.keeperName || '-' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { computed } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'
import { smartBack } from '@/utils/navigation'

const props = defineProps({ keeperId: { type: [Number,String], default: null }, itemStatus: { type: [Number,String], default: null }, needTest: { type: [Number,String], default: null }, isTested: { type: [Number,String], default: null }, needRepair: { type: [Number,String], default: null }, isRepaired: { type: [Number,String], default: null } })

const rows = ref([])
const loading = ref(false)
const userStore = useUserStore()

const pageTitle = computed(() => {
  const base = '商品服务'
  try{
    if (props.needTest && Number(props.needTest) === 1) return base + ' - 测试'
    if (props.needRepair && Number(props.needRepair) === 1) return base + ' - 维修'
    if (props.itemStatus !== null && Number(props.itemStatus) === 0) return base + ' - 查验'
  }catch(e){}
  return base
})

function getCurrentUserId(){
  const uid = userStore.userInfo?.id || userStore.userInfo?.userId
  if (uid) return Number(uid)
  try{ const saved = uni.getStorageSync('loginUser'); if (saved){ const p = typeof saved === 'string' ? JSON.parse(saved) : saved; return Number(p?.id || p?.userId) } }catch(e){}
  return null
}

function mapItemStatus(s){ const m = { 0: '检验中', 1: '已入库', 2: '已出库', 9: '异常' }; return m[s] || '-' }

async function load(){
  loading.value = true
  rows.value = []
  try{
    const uid = props.keeperId ? Number(props.keeperId) : getCurrentUserId()
    const params = { page:1, pageSize: 10, keeperId: uid }
    if (props.itemStatus !== null && typeof props.itemStatus !== 'undefined') params.itemStatus = Number(props.itemStatus)
    if (props.needTest !== null && typeof props.needTest !== 'undefined') params.needTest = Number(props.needTest)
    if (props.isTested !== null && typeof props.isTested !== 'undefined') params.isTested = Number(props.isTested)
    if (props.needRepair !== null && typeof props.needRepair !== 'undefined') params.needRepair = Number(props.needRepair)
    if (props.isRepaired !== null && typeof props.isRepaired !== 'undefined') params.isRepaired = Number(props.isRepaired)
    const res = await ApiHelper.get('/items', params)
    if (res && res.code === 1 && res.data){ rows.value = res.data.rows || [] }
  }catch(e){ console.error('ItemService load failed', e) }
  finally{ loading.value = false }
}

// expose load so pages can refresh the list when returning
defineExpose({ load })

function openItem(row){
  try{
    const id = row.itemId || row.id
    if (!id) return
    // indicate navigation from ItemService so item-entry can hide step buttons
    // pass mode when this service was opened for test or repair
    let mode = ''
    try{ if (props.needTest && Number(props.needTest) === 1) mode = 'test'; else if (props.needRepair && Number(props.needRepair) === 1) mode = 'repair'; else if (props.itemStatus !== null && Number(props.itemStatus) === 0) mode = 'inspect' }catch(e){}
    const modePart = mode ? `&mode=${mode}` : ''
    // route to a dedicated test entry page for test mode
    if (mode === 'test') {
      uni.navigateTo({ url: `/pages/parcel-add/item-test-entry?itemId=${id}&fromService=1${modePart}` })
    } else if (mode === 'repair') {
      uni.navigateTo({ url: `/pages/parcel-add/item-repair-entry?itemId=${id}&fromService=1${modePart}` })
    } else {
      uni.navigateTo({ url: `/pages/parcel-add/item-entry?itemId=${id}&fromService=1${modePart}` })
    }
  }catch(e){ console.warn(e) }
}

function goBack(){ smartBack() }

onMounted(() => { load() })
</script>

<style scoped>
.service-container{ height:100vh; background:#f8f8f8; padding-top:88rpx }
.topbar{ height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.title{ color:#fff; font-size:34rpx; font-weight:700 }
.topbar .back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%); z-index:1001 }
.topbar .back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18); cursor:pointer }
.topbar .back-icon svg { width:32rpx; height:32rpx }
.list-container{ padding:20rpx; padding-top:120rpx }
.row-card{ background:#fff; padding:14rpx; border-radius:8rpx; margin-bottom:12rpx }
.line1{ display:flex; gap:12rpx; align-items:center; margin-bottom:8rpx }
.line2{ display:flex; gap:12rpx; align-items:center }
.itemno{ color:#409EFF; width:160rpx }
.dict{ width:120rpx; color:#666 }
.qty{ width:110rpx; color:#666 }
.status{ width:80rpx; color:#666 }
.sellpart{ flex:0.85; color:#333 }
.isgood{ width:80rpx; text-align:center }
.owner{ width:160rpx; color:#666 }
.keeper{ width:160rpx; color:#666 }
.empty{ text-align:center; color:#999; padding:60rpx 0 }
.loading{ text-align:center; color:#666 }
</style>
