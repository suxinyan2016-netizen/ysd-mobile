<template>
  <view class="page-container">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <view class="back-chevron"></view>
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
        <text class="dialog-title">Item 信息 (共 {{ dialogItems.length }} 项)</text>

        <scroll-view class="items-scroll" scroll-y>
          <view 
            v-for="(item, index) in dialogItems" 
            :key="item.itemId || item.id || index"
            class="item-card"
            :class="{ 'item-card-active': index === currentDialogIndex }"
            @click="selectItem(index)"
          >
            <view class="item-header">
              <text class="item-seq">Item {{ index + 1 }}</text>
              <text class="item-status" v-if="index === currentDialogIndex">当前编辑</text>
            </view>
            <view class="row seq-row"><text class="label">SN</text><text class="value">{{ index + 1 }}</text></view>
            <view class="row"><text class="label">ItemNo 商品号</text><text class="value">{{ item?.itemNo || item?.sku || '-' }}</text></view>
            <view class="row"><text class="label">Seller Part 商品名</text><text class="value">{{ item?.sellerPart || item?.name || '-' }}</text></view>
            <view class="row"><text class="label">Qty 数量</text><text class="value">{{ item?.qty ?? item?.quantity ?? '-' }}</text></view>
            <view class="info-split-row">
              <view class="info-left">
                <view class="row"><text class="label">isGood</text><text class="value">{{ item?.isGood === 1 ? '良品' : (item?.isGood === 0 ? '坏品' : '-') }}</text></view>
                <view class="row"><text class="label">isUnpacked</text><text class="value">{{ item?.isUnpacked === 1 ? '已拆封' : (item?.isUnpacked === 0 ? '未拆封' : '-') }}</text></view>
                <view class="row"><text class="label">IQCResult</text><text class="value">{{ item?.iqcResult || item?.IQCResult || '-' }}</text></view>
              </view>
              <view class="info-right" v-if="index === currentDialogIndex">
                <view class="img-upload-area" @click.stop="pickItemImage">
                  <image v-if="itemImagePreview" :src="itemImagePreview" class="img-preview" mode="aspectFill" />
                  <view v-else class="img-placeholder">
                    <text class="img-plus">📷</text>
                    <text class="img-hint">上传图片</text>
                  </view>
                </view>
              </view>
            </view>

            <view class="fees" v-if="index === currentDialogIndex">
              <view class="fee-row"><text class="fee-label">InspectFee 检测费</text><input class="fee-input" type="number" v-model="feeForm.inspectFee" @blur="feeForm.inspectFee = formatToTwo(feeForm.inspectFee)" /></view>
              <view class="fee-row"><text class="fee-label">repairFee 维修费</text><input class="fee-input" type="number" v-model="feeForm.repairFee" @blur="feeForm.repairFee = formatToTwo(feeForm.repairFee)" /></view>
              <view class="fee-row"><text class="fee-label">keepFee 保管费</text><input class="fee-input" type="number" v-model="feeForm.keepFee" @blur="feeForm.keepFee = formatToTwo(feeForm.keepFee)" /></view>
              <view class="fee-row"><text class="fee-label">packingFee 包装费</text><input class="fee-input" type="number" v-model="feeForm.packingFee" @blur="feeForm.packingFee = formatToTwo(feeForm.packingFee)" /></view>
              <view class="fee-row"><text class="fee-label">OtherFee 其他费</text><input class="fee-input" type="number" v-model="feeForm.otherFee" @blur="feeForm.otherFee = formatToTwo(feeForm.otherFee)" /></view>
              <view class="fee-total"><text class="fee-total-label">TotalFee 总费用</text><text class="fee-total-value">{{ totalFee() }}</text></view>
            </view>
          </view>
        </scroll-view>

        <view class="dialog-actions">
          <button class="btn btn-cancel" @click="closeSendDialog">Cancel</button>
          <button class="btn btn-primary" @click="handleDialogSent">Sent</button>
        </view>
      </view>
    </view>
    <!-- hidden canvas for timestamp watermark -->
    <canvas
      canvas-id="watermark-canvas"
      id="watermark-canvas"
      :style="`position:fixed; left:-9999px; top:0; width:${canvasW}px; height:${canvasH}px; opacity:0; pointer-events:none;`"
    />
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'
import { uploadFile } from '@/utils/uploadHelper'
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

// image upload state
const itemImagePath = ref('')
const itemImagePreview = ref('')
const canvasW = ref(750)
const canvasH = ref(1000)
const instance = getCurrentInstance()

// Save current item's fee and image data before switching
function saveCurrentItemData() {
  const idx = currentDialogIndex.value
  if (idx >= 0 && idx < dialogItems.value.length) {
    const item = dialogItems.value[idx]
    item._feeForm = { ...feeForm.value }
    item._itemImagePath = itemImagePath.value
    item._itemImagePreview = itemImagePreview.value
  }
}

// Load item's stored fee and image data
function loadItemData(item) {
  if (item._feeForm) {
    feeForm.value = { ...item._feeForm }
  } else {
    loadFeesFromItem(item)
  }
  itemImagePath.value = item._itemImagePath || ''
  itemImagePreview.value = item._itemImagePreview || ''
}

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
      const list = Array.isArray(data.rows) ? data.rows : (Array.isArray(data.list) ? data.list : (Array.isArray(result.data) ? result.data : []))
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

function pickItemImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0]
      itemImagePreview.value = tempPath
      try {
        const processed = await addTimestampWatermark(tempPath)
        itemImagePath.value = processed
        itemImagePreview.value = processed
      } catch(e) {
        console.warn('水印添加失败', e)
        itemImagePath.value = tempPath
      }
    }
  })
}

function addTimestampWatermark(filePath) {
  return new Promise((resolve) => {
    uni.getImageInfo({
      src: filePath,
      success: async (imgInfo) => {
        const maxW = 900
        let w = imgInfo.width, h = imgInfo.height
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
        canvasW.value = w
        canvasH.value = h
        await nextTick()
        setTimeout(() => {
          const ctx = uni.createCanvasContext('watermark-canvas', instance?.proxy)
          ctx.drawImage(filePath, 0, 0, w, h)
          const now = new Date()
          const pad = n => String(n).padStart(2, '0')
          const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} Sent.`
          const fontSize = Math.max(14, Math.round(w * 0.025))
          const barH = fontSize + 20
          ctx.setFillStyle('rgba(0,0,0,0.5)')
          ctx.fillRect(0, h - barH, w, barH)
          ctx.setFillStyle('#ffffff')
          ctx.setFontSize(fontSize)
          ctx.fillText(ts, 10, h - 8)
          ctx.draw(false, () => {
            setTimeout(() => {
              uni.canvasToTempFilePath({
                canvasId: 'watermark-canvas',
                success: (r) => resolve(r.tempFilePath),
                fail: () => resolve(filePath)
              }, instance?.proxy)
            }, 300)
          })
        }, 150)
      },
      fail: () => resolve(filePath)
    })
  })
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
  itemImagePath.value = ''
  itemImagePreview.value = ''
}

function selectItem(index) {
  saveCurrentItemData()
  currentDialogIndex.value = index
  loadItemData(dialogItems.value[index])
}

async function saveAllItemsData() {
  const savePromises = dialogItems.value.map(async (item) => {
    if (!item._feeForm && !item._itemImagePath) return null
    
    const payload = {
      itemId: item.itemId || item.id,
      inspectFee: parseFloat(item._feeForm?.inspectFee) || 0,
      repairFee: parseFloat(item._feeForm?.repairFee) || 0,
      keepFee: parseFloat(item._feeForm?.keepFee) || 0,
      packingFee: parseFloat(item._feeForm?.packingFee) || 0,
      otherFee: parseFloat(item._feeForm?.otherFee) || 0
    }
    
    try {
      const r = await ApiHelper.put('/items', payload)
      if (r && r.code === 1) {
        Object.assign(item, payload)
        
        // Upload image if exists
        if (item._itemImagePath) {
          const currentItemId = item.itemId || item.id
          try {
            await uploadFile(item._itemImagePath, 'ITEM', currentItemId, 'ITEM_IMAGE', null)
          } catch(e) {
            console.warn('图片上传失败', e)
          }
        }
      }
      return r
    } catch (error) {
      console.error('保存item失败', error)
      return null
    }
  })
  
  await Promise.all(savePromises)
}

async function handleDialogSent() {
  const idx = currentDialogIndex.value
  const item = dialogItems.value[idx]
  if (!item) return
  
  // Save current item data first
  saveCurrentItemData()
  
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

    // Upload current item image if selected
    const currentItemId = item.itemId || item.id
    if (itemImagePath.value && currentItemId) {
      try {
        uni.showLoading({ title: '上传图片...' })
        await uploadFile(itemImagePath.value, 'ITEM', currentItemId, 'ITEM_IMAGE', null)
        uni.hideLoading()
      } catch(e) {
        uni.hideLoading()
        console.warn('图片上传失败', e)
      }
    }
    
    itemImagePath.value = ''
    itemImagePreview.value = ''

    if (idx < dialogItems.value.length - 1) {
      currentDialogIndex.value++
      loadItemData(dialogItems.value[currentDialogIndex.value])
    } else {
      // Save all items' data before submitting parcel status
      try {
        uni.showLoading({ title: '保存所有Item数据...' })
        await saveAllItemsData()
        uni.hideLoading()
        
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

onMounted(()=>{
  if (!userStore.userInfo?.id) userStore.checkLoginStatus()
  loadParcels(true)
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', _onFocus)
    window.addEventListener('focus', _onFocus)
  }
})

function _onFocus() { loadParcels(true) }

onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('focus', _onFocus)
})

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
.back-chevron{ width:18rpx; height:18rpx; border-top:4rpx solid #fff; border-left:4rpx solid #fff; transform:rotate(-45deg); margin-left:8rpx; box-sizing:border-box }

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
    font-size: 26rpx;
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
.dialog-card{ width:86%; max-height:85%; background:#fff; border-radius:12rpx; padding:30rpx; display:flex; flex-direction:column }
.dialog-title{ font-size:32rpx; font-weight:600; margin-bottom:20rpx; flex-shrink:0 }

.items-scroll{ flex:1; overflow-y: auto; margin-bottom:20rpx; max-height:60vh }
.item-card{ background:#f9f9f9; border-radius:8rpx; padding:20rpx; margin-bottom:16rpx; border:2rpx solid #e0e0e0; transition:all 0.2s }
.item-card:last-child{ margin-bottom:0 }
.item-card-active{ border-color:#409EFF; background:#fff; box-shadow:0 2rpx 8rpx rgba(64,158,255,0.15) }

.item-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12rpx; padding-bottom:12rpx; border-bottom:2rpx solid #ddd }
.item-seq{ font-size:28rpx; font-weight:600; color:#333 }
.item-status{ font-size:22rpx; color:#409EFF; background:rgba(64,158,255,0.1); padding:4rpx 12rpx; border-radius:4rpx }

.item-card .row{ display:flex; justify-content:space-between; padding:10rpx 0; border-bottom:1rpx solid #f0f0f0 }
.fees{ margin-top:16rpx } .fee-row{ display:flex; justify-content:space-between; align-items:center; padding:12rpx 0 } .fee-input{ width:45%; text-align:right; border:1rpx solid #ddd; padding:16rpx 12rpx; border-radius:8rpx; font-size:28rpx; height:72rpx; line-height:40rpx; background:#fff } .fee-total{ display:flex; justify-content:space-between; align-items:center; padding:12rpx 0; border-top:2rpx solid #ddd; margin-top:8rpx } .fee-total-label{ font-weight:600; font-size:28rpx } .fee-total-value{ width:45%; text-align:right; font-weight:600; font-size:28rpx; padding-right:12rpx }
.dialog-actions{ display:flex; gap:16rpx; flex-shrink:0 } .dialog-actions .btn{ flex:1; font-size:26rpx; height:64rpx; line-height:64rpx }
.dialog-actions .btn-cancel{ background:#E6A23C; color:#fff; border:none } .dialog-actions .btn-primary{ background:#67C23A; color:#fff; border:none }

.loading-more,.no-more{ text-align:center; padding:30rpx; font-size:28rpx; color:#999 }
.empty-state{ display:flex; flex-direction:column; align-items:center; justify-content:center; padding:200rpx 0 }
.empty-icon{ font-size:120rpx; margin-bottom:40rpx }
.empty-text{ font-size:28rpx; color:#999 }
/* info split row */
.info-split-row{ display:flex; flex-direction:row; align-items:stretch; border-bottom:1rpx solid #f0f0f0 }
.info-left{ flex:2 }
.info-left .row{ border-bottom:1rpx solid #f0f0f0 }
.info-left .row:last-child{ border-bottom:none }
.info-right{ flex:1; padding:8rpx 0 8rpx 12rpx; display:flex; align-items:stretch }
.img-upload-area{ flex:1; min-height:160rpx; border:2rpx dashed #ccc; border-radius:8rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; background:#fafafa }
.img-preview{ width:100%; height:100% }
.img-placeholder{ display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10rpx }
.img-plus{ font-size:40rpx; color:#999 }
.img-hint{ font-size:22rpx; color:#999; margin-top:6rpx; text-align:center }
</style>
