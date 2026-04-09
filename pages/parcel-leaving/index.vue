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
      <view class="title">待发包裹</view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input 
          v-model="searchText"
          type="text"
          placeholder="搜索运单号"
          @confirm="handleSearch"
        />
      </view>
        <button class="search-btn" @click="handleSearch">
          搜索
        </button>
    </view>
    
    <!-- 包裹列表 -->
    <scroll-view 
      class="parcel-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view 
        v-for="parcel in parcelList"
        :key="parcel.parcelId"
        class="parcel-card"
      >
        <view class="card-main">
          <view class="package-info">
            <text class="package-no">{{ parcel.packageNo }}</text>
          </view>
          
          <view class="action-buttons">
            <button 
              class="btn-label"
              size="mini"
              @click.stop="viewLabel(parcel)"
            >
              Label
            </button>
            <button 
                  class="btn-sent"
                  size="mini"
                  type="primary"
                  @click.stop="openSendDialog(parcel)"
                >
                  Sent
            </button>
          </view>
        </view>
      </view>
      
      <!-- 加载状态：仅在加载更多时显示提示 -->
      <view class="loading-more" v-if="loading && hasMore">
        <text>加载更多...</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && parcelList.length === 0">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无待发包裹</text>
      </view>
    </scroll-view>
    
    <!-- 发送对话框（覆盖层） -->
    <view v-if="showSendDialog" class="dialog-overlay">
      <view class="dialog-card">
        <text class="dialog-title">Item 信息 ({{ currentDialogIndex + 1 }} / {{ dialogItems.length }})</text>

        <view class="item-card">
          <view class="row seq-row"><text class="label">序号</text><text class="value">{{ currentDialogIndex + 1 }}</text></view>
          <view class="row"><text class="label">ItemNo</text><text class="value">{{ dialogItems[currentDialogIndex]?.itemNo || dialogItems[currentDialogIndex]?.sku || '-' }}</text></view>
          <view class="row"><text class="label">Seller Part</text><text class="value">{{ dialogItems[currentDialogIndex]?.sellerPart || dialogItems[currentDialogIndex]?.name || '-' }}</text></view>
          <view class="row"><text class="label">Qty</text><text class="value">{{ dialogItems[currentDialogIndex]?.qty ?? dialogItems[currentDialogIndex]?.quantity ?? '-' }}</text></view>
          <view class="row"><text class="label">isGood</text><text class="value">{{ dialogItems[currentDialogIndex]?.isGood === 1 ? '良品' : (dialogItems[currentDialogIndex]?.isGood === 0 ? '坏品' : '-') }}</text></view>
          <view class="row"><text class="label">isUnpacked</text><text class="value">{{ dialogItems[currentDialogIndex]?.isUnpacked === 1 ? '已拆封' : (dialogItems[currentDialogIndex]?.isUnpacked === 0 ? '未拆封' : '-') }}</text></view>
          <view class="row"><text class="label">IQCResult</text><text class="value">{{ dialogItems[currentDialogIndex]?.iqcResult || dialogItems[currentDialogIndex]?.IQCResult || '-' }}</text></view>

          <view class="fees">
            <view class="fee-row"><text class="fee-label">InspectFee</text><input class="fee-input" type="number" v-model="feeForm.inspectFee" @blur="feeForm.inspectFee = formatToTwo(feeForm.inspectFee)" /></view>
            <view class="fee-row"><text class="fee-label">repairFee</text><input class="fee-input" type="number" v-model="feeForm.repairFee" @blur="feeForm.repairFee = formatToTwo(feeForm.repairFee)" /></view>
            <view class="fee-row"><text class="fee-label">keepFee</text><input class="fee-input" type="number" v-model="feeForm.keepFee" @blur="feeForm.keepFee = formatToTwo(feeForm.keepFee)" /></view>
            <view class="fee-row"><text class="fee-label">packingFee</text><input class="fee-input" type="number" v-model="feeForm.packingFee" @blur="feeForm.packingFee = formatToTwo(feeForm.packingFee)" /></view>
            <view class="fee-row"><text class="fee-label">OtherFee</text><input class="fee-input" type="number" v-model="feeForm.otherFee" @blur="feeForm.otherFee = formatToTwo(feeForm.otherFee)" /></view>
            <view class="fee-total"><text class="fee-total-label">TotalFee</text><text class="fee-total-value">{{ totalFee() }}</text></view>
          </view>
        </view>

        <view class="dialog-actions">
          <button class="btn btn-cancel" @click="closeSendDialog">Cancel</button>
          <button class="btn btn-primary" @click="handleDialogSent">Sent</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const searchText = ref('')
const parcelList = ref([])
const loading = ref(false)
const refreshing = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)

// --- Send dialog state ---
const showSendDialog = ref(false)
const dialogParcel = ref(null)
const dialogItems = ref([])
const currentDialogIndex = ref(0)
const feeForm = ref({ inspectFee: '0.00', repairFee: '0.00', keepFee: '0.00', packingFee: '0.00', otherFee: '0.00' })

// 加载包裹列表（待发）
async function loadParcels(reset = false) {
  if (loading.value) return
  if (reset) {
    currentPage.value = 1
    hasMore.value = true
    parcelList.value = []
  }
  loading.value = true
  try {
    if (!userStore.userInfo || !userStore.userInfo.id) {
      userStore.checkLoginStatus()
    }
    const currentUserId = userStore.userInfo?.id
    if (!currentUserId) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      packageNo: searchText.value,
      status: 0,
      senderId: currentUserId
    }
    const result = await ApiHelper.get('/parcels', params)
    if (result && result.code === 1) {
      const data = result.data || {}
      const list = Array.isArray(data.list) ? data.list : (Array.isArray(result.data) ? result.data : [])
      if (reset) parcelList.value = list
      else parcelList.value = parcelList.value.concat(list)
      if (list.length < pageSize.value) hasMore.value = false
      else currentPage.value = currentPage.value + 1
    } else {
      uni.showToast({ title: result?.message || '查询失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载包裹失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function formatToTwo(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return '0.00'
  return n.toFixed(2)
}

function loadFeesFromItem(item) {
  if (!item) {
    feeForm.value.inspectFee = '0.00'
    feeForm.value.repairFee = '0.00'
    feeForm.value.keepFee = '0.00'
    feeForm.value.packingFee = '0.00'
    feeForm.value.otherFee = '0.00'
    return
  }

  const tryKeys = (obj, candidates) => {
    if (!obj) return null
    for (const k of candidates) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k]
    }
    return null
  }

  const feesObj = item.fees || item.fee || item.Fees || null

  const inspectVal = tryKeys(item, ['inspectFee', 'inspect_fee', 'inspectfee', 'inspect']) ?? tryKeys(feesObj, ['inspectFee', 'inspect_fee', 'inspect']) ?? 0
  const repairVal = tryKeys(item, ['repairFee', 'repair_fee', 'repairfee', 'repair']) ?? tryKeys(feesObj, ['repairFee', 'repair_fee', 'repair']) ?? 0
  const keepVal = tryKeys(item, ['keepFee', 'keep_fee', 'keepfee', 'keep']) ?? tryKeys(feesObj, ['keepFee', 'keep_fee', 'keep']) ?? 0
  const packingVal = tryKeys(item, ['packingFee', 'packing_fee', 'packingfee', 'packing']) ?? tryKeys(feesObj, ['packingFee', 'packing_fee', 'packing']) ?? 0
  const otherVal = tryKeys(item, ['otherFee', 'other_fee', 'otherfee', 'other']) ?? tryKeys(feesObj, ['otherFee', 'other_fee', 'other']) ?? 0

  feeForm.value.inspectFee = formatToTwo(inspectVal)
  feeForm.value.repairFee = formatToTwo(repairVal)
  feeForm.value.keepFee = formatToTwo(keepVal)
  feeForm.value.packingFee = formatToTwo(packingVal)
  feeForm.value.otherFee = formatToTwo(otherVal)
}

function totalFee() {
  const f = feeForm.value
  const sum = (parseFloat(f.inspectFee||0) || 0) + (parseFloat(f.repairFee||0)||0) + (parseFloat(f.keepFee||0)||0) + (parseFloat(f.packingFee||0)||0) + (parseFloat(f.otherFee||0)||0)
  return sum.toFixed(2)
}

async function openSendDialog(parcel) {
  try {
    uni.showLoading({ title: '加载中...' })
    const res = await ApiHelper.get('/items', { sendParcelId: parcel.parcelId, pageSize: 1000 })
    uni.hideLoading()
    if (res && res.code === 1 && res.data) {
      dialogParcel.value = parcel
      let items = []
      if (Array.isArray(res.data)) items = res.data
      else if (Array.isArray(res.data.rows)) items = res.data.rows
      else if (Array.isArray(res.data.data)) items = res.data.data
      else items = res.data.itemList || res.data.items || res.data.rows || []
      dialogItems.value = Array.isArray(items) ? items : []
      if (dialogItems.value.length === 0) {
        const modal = await uni.showModal({ title: '确认', content: '确定要标记此包裹为已发货吗？' })
        if (modal.confirm) {
          try {
            uni.showLoading({ title: '处理中...' })
            const updateData = { parcelId: parcel.parcelId, status: 1, sendDate: new Date().toISOString().split('T')[0] }
            const r = await ApiHelper.put('/parcels', updateData)
            uni.hideLoading()
            if (r && r.code === 1) {
              uni.showToast({ title: '标记成功', icon: 'success' })
              setTimeout(() => loadParcels(true), 800)
            } else {
              uni.showToast({ title: r.msg || '标记失败', icon: 'none' })
            }
          } catch (e) {
            uni.hideLoading()
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      } else {
        currentDialogIndex.value = 0
        loadFeesFromItem(dialogItems.value[0])
        showSendDialog.value = true
      }
    } else {
      uni.showToast({ title: '加载包裹项失败', icon: 'none' })
    }
  } catch (err) {
    uni.hideLoading()
    console.error('openSendDialog error', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function closeSendDialog() {
  showSendDialog.value = false
  dialogParcel.value = null
  dialogItems.value = []
  currentDialogIndex.value = 0
}

async function handleDialogSent() {
  const idx = currentDialogIndex.value
  const item = dialogItems.value[idx]
  if (!item) return
  const payload = {
    itemId: item.itemId || item.id,
    inspectFee: parseFloat(feeForm.value.inspectFee) || 0,
    repairFee: parseFloat(feeForm.value.repairFee) || 0,
    keepFee: parseFloat(feeForm.value.keepFee) || 0,
    packingFee: parseFloat(feeForm.value.packingFee) || 0,
    otherFee: parseFloat(feeForm.value.otherFee) || 0
  }

  try {
    uni.showLoading({ title: '保存中...' })
    const r = await ApiHelper.put('/items', payload)
    uni.hideLoading()
    if (!(r && r.code === 1)) {
      uni.showToast({ title: r?.msg || '保存失败', icon: 'none' })
      return
    }

    Object.assign(item, payload)

    if (idx < dialogItems.value.length - 1) {
      currentDialogIndex.value++
      loadFeesFromItem(dialogItems.value[currentDialogIndex.value])
    } else {
      try {
        uni.showLoading({ title: '提交包裹状态...' })
        const updateData = { parcelId: dialogParcel.value.parcelId, status: 1, sendDate: new Date().toISOString().split('T')[0] }
        const pr = await ApiHelper.put('/parcels', updateData)
        uni.hideLoading()
        if (pr && pr.code === 1) {
          uni.showToast({ title: '标记成功', icon: 'success' })
          closeSendDialog()
          setTimeout(() => loadParcels(true), 800)
        } else {
          uni.showToast({ title: pr.msg || '提交失败', icon: 'none' })
        }
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '提交失败', icon: 'none' })
      }
    }
  } catch (error) {
    uni.hideLoading()
    console.error('保存 item fee 失败', error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

// 查看label
async function viewLabel(parcel) {
  if (!parcel.labelImages || parcel.labelImages.length === 0) {
    uni.showToast({ title: '暂无Label图片', icon: 'none' })
    return
  }
  if (parcel.labelImages.length === 1) {
    const file = parcel.labelImages[0]
    if (file.imageUrl) previewFile(file)
    else uni.showToast({ title: 'Label文件不存在', icon: 'none' })
  } else {
    const items = parcel.labelImages.map((img, index) => `Label ${index + 1}`)
    uni.showActionSheet({ itemList: items, success: (res) => {
      const file = parcel.labelImages[res.tapIndex]
      if (file.imageUrl) previewFile(file)
      else uni.showToast({ title: 'Label文件不存在', icon: 'none' })
    }})
  }
}

function isPDF(url) { if (!url) return false; return url.toLowerCase().endsWith('.pdf') }

function previewFile(file) {
  const url = file.imageUrl
  const fullUrl = url.startsWith('http') ? url : 'http://localhost:8080' + url
  if (isPDF(url)) {
    // #ifdef H5
    window.open(fullUrl, '_blank')
    // #endif
    // #ifdef APP-PLUS
    try { plus.runtime.openURL(fullUrl) } catch(e){}
    // #endif
    // #ifdef MP
    uni.downloadFile({ url: fullUrl, success: function(res){ const filePath = res.tempFilePath; uni.openDocument({ filePath, showMenu:true }) } })
    // #endif
  } else {
    uni.previewImage({ urls: [fullUrl], current: fullUrl })
  }
}

async function loadParcelImages(parcel) {
  try {
    const result = await ApiHelper.get('/image/manage/grouped', { moduleType: 'PARCEL', recordId: parcel.parcelId })
    if (result && result.code === 1 && result.data) {
      const groupedImages = result.data
      if (groupedImages.PACKAGE_LABEL && Array.isArray(groupedImages.PACKAGE_LABEL)) {
        parcel.labelImages = groupedImages.PACKAGE_LABEL.map(img => ({ id: img.id, imageUrl: img.imageUrl, thumbnailUrl: img.thumbnailUrl }))
      } else parcel.labelImages = []
    }
  } catch (e) { console.error('加载包裹图片失败:', e); parcel.labelImages = [] }
}

function handleSearch() { loadParcels(true) }
function handleScan() { uni.scanCode({ success: (res) => { searchText.value = res.result; handleSearch() } }) }

function handleLogout() {
  uni.showModal({ title: '提示', content: '确定要注销登录吗？', success: (res)=>{ if (res.confirm){ userStore.logout().finally(()=>{ try{ uni.reLaunch({ url: '/pages/login/index' }) } catch(e){ uni.navigateTo({ url: '/pages/login/index' }) } }) } } })
}

function onRefresh(){ refreshing.value=true; loadParcels(true) }
function onLoadMore(){ if (hasMore.value && !loading.value) { currentPage.value++; loadParcels() } }

onMounted(()=>{ if (!userStore.userInfo?.id) userStore.checkLoginStatus(); loadParcels(true) })
onShow(()=>{ loadParcels(true) })

import { smartBack } from '@/utils/navigation'

function goBack(){ smartBack() }
</script>

<style lang="scss" scoped>
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
}

.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:relative }
.title { color:#fff; font-size:34rpx; font-weight:700 }
.back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg { width:32rpx; height:32rpx }

.search-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background: #fff;
  
  .search-input {
    flex: 1;
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 40rpx;
    padding: 0 30rpx;
    height: 70rpx;
    margin-right: 16rpx;

    .search-icon { font-size: 32rpx; margin-right: 10rpx }
    input { flex:1; font-size:28rpx }
  }

  .search-btn {
    width: 105rpx;
    height: 60rpx;
    line-height: 60rpx;
    text-align: center;
    background: linear-gradient(90deg, #409EFF, #66B1FF);
    color: #fff;
    border-radius: 8rpx;
    font-size: 20rpx;
    font-weight: 400;
    padding: 0 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6rpx 18rpx rgba(64,158,255,0.12);
    border: none;
    margin-right: 8rpx;
  }
}

.parcel-list { flex:1; padding:20rpx }
.parcel-card { background:#fff; border-radius:16rpx; margin-bottom:20rpx; box-shadow:0 2rpx 12rpx rgba(0,0,0,0.08); overflow:hidden }
.card-main { display:flex; align-items:center; justify-content:space-between; padding:30rpx }
.package-info { flex:1; .package-no{ font-size:32rpx; font-weight:bold; color:#333 } }
.action-buttons { display:flex; gap:15rpx; button{ padding:0 30rpx; height:60rpx; line-height:60rpx; font-size:26rpx; border-radius:8rpx } .btn-label{ background:transparent; color:#409EFF } .btn-sent{ background:#409EFF; color:#fff } }

/* dialog styles */
.dialog-overlay{ position:fixed; left:0; top:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999 }
.dialog-card{ width:86%; max-height:85%; background:#fff; border-radius:12rpx; padding:30rpx; overflow:auto }
.dialog-title{ font-size:32rpx; font-weight:600; margin-bottom:20rpx }
.item-card .row{ display:flex; justify-content:space-between; padding:10rpx 0; border-bottom:1rpx solid #f0f0f0 }
.fees{ margin-top:16rpx } .fee-row{ display:flex; justify-content:space-between; align-items:center; padding:8rpx 0 } .fee-input{ width:40%; text-align:right; border:1rpx solid #eee; padding:10rpx; border-radius:6rpx }
.dialog-actions{ display:flex; gap:16rpx; margin-top:20rpx } .dialog-actions .btn{ flex:1; font-size:24rpx; height:64rpx; line-height:64rpx }
.dialog-actions .btn-cancel{ background:#E6A23C; color:#fff; border:none } .dialog-actions .btn-primary{ background:#67C23A; color:#fff; border:none }

.loading-more,.no-more{ text-align:center; padding:30rpx; font-size:28rpx; color:#999 }
.empty-state{ display:flex; flex-direction:column; align-items:center; justify-content:center; padding:200rpx 0 }
.empty-icon{ font-size:120rpx; margin-bottom:40rpx }
.empty-text{ font-size:28rpx; color:#999 }
</style>
