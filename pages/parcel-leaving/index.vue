<template>
  <view class="page-container">
    <!-- 用户信息栏 -->
    <view class="user-bar">
      <view class="user-info">
        <text class="user-icon">👤</text>
        <text class="user-name">{{ userStore.userInfo?.name || '用户' }}</text>
      </view>
      <button class="logout-btn" @click="handleLogout">注销</button>
    </view>
    
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input 
          v-model="searchText"
          type="text"
          placeholder="搜索包裹号"
          @confirm="handleSearch"
        />
      </view>
      <button class="scan-btn" @click="handleSearch">
        📷
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
        
        <!-- Item 列表 已移除：包裹列表不再展开显示 item 信息 -->
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

// 加载包裹列表
async function loadParcels(reset = false) {
  if (loading.value) return
  
  if (reset) {
    currentPage.value = 1
    hasMore.value = true
    parcelList.value = []
  }
  
  loading.value = true
  
  try {
    const currentUserId = userStore.userInfo?.id
    
    if (!currentUserId) {
      uni.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      packageNo: searchText.value,
      status: 0,  // 只查询 Planed 状态的包裹
      senderId: currentUserId  // 当前用户作为发件人
    }
    
    console.log('查询待发包裹参数:', params)
    
    const result = await ApiHelper.get('/parcels', params)
    
    if (result.code) {
      let newData = result.data.rows || []
      
      // 二次过滤，确保结果必须满足条件
      newData = newData.filter(parcel => {
        const isStatusMatch = parcel.status === 0
        const isSenderMatch = parcel.senderId === currentUserId
        console.log(`包裹 ${parcel.packageNo}: status=${parcel.status}, senderId=${parcel.senderId}, 匹配=${isStatusMatch && isSenderMatch}`)
        return isStatusMatch && isSenderMatch
      })
      
      console.log(`过滤后的包裹数量: ${newData.length}`)
      
      // 为每个包裹加载 label 图片
      for (const parcel of newData) {
        console.log(`包裹 ${parcel.packageNo} 原始数据:`, parcel)
        parcel.expanded = false  // 初始状态为收起
        parcel.loadingItems = false
        await loadParcelImages(parcel)
      }
      
      // 按 packageNo 排序
      newData.sort((a, b) => {
        const noA = a.packageNo || ''
        const noB = b.packageNo || ''
        return noA.localeCompare(noB)
      })
      
      console.log('最终包裹列表:', newData)
      
      if (reset) {
        parcelList.value = newData
      } else {
        parcelList.value = [...parcelList.value, ...newData]
      }
      
      // 检查是否还有更多数据
      hasMore.value = parcelList.value.length < result.data.total
    } else {
      uni.showToast({
        title: result.msg || '加载失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('加载包裹列表失败:', error)
    uni.showToast({
      title: '网络错误',
      icon: 'none'
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 获取包裹的item列表（兼容items和itemList）
function getParcelItems(parcel) {
  const items = parcel.items || parcel.itemList || []
  console.log(`包裹 ${parcel.packageNo} 的items:`, items)
  return items
}

// 展开功能已移除：包裹列表不再支持点击三角展开 item 信息

// 查看label
async function viewLabel(parcel) {
  if (!parcel.labelImages || parcel.labelImages.length === 0) {
    uni.showToast({
      title: '暂无Label图片',
      icon: 'none'
    })
    return
  }
  
  // 如果只有一个label，直接预览
  if (parcel.labelImages.length === 1) {
    const file = parcel.labelImages[0]
    if (file.imageUrl) {
      previewFile(file)
    } else {
      uni.showToast({
        title: 'Label文件不存在',
        icon: 'none'
      })
    }
  } else {
    // 多个label，显示选择列表
    const items = parcel.labelImages.map((img, index) => `Label ${index + 1}`)
    uni.showActionSheet({
      itemList: items,
      success: (res) => {
        const file = parcel.labelImages[res.tapIndex]
        if (file.imageUrl) {
          previewFile(file)
        } else {
          uni.showToast({
            title: 'Label文件不存在',
            icon: 'none'
          })
        }
      }
    })
  }
}

// 判断是否为PDF文件
function isPDF(url) {
  if (!url) return false
  return url.toLowerCase().endsWith('.pdf')
}

// 预览文件（图片或PDF）
function previewFile(file) {
  const url = file.imageUrl
  const fullUrl = url.startsWith('http') ? url : 'http://localhost:8080' + url
  
  if (isPDF(url)) {
    // PDF文件，使用系统浏览器打开
    // #ifdef H5
    window.open(fullUrl, '_blank')
    // #endif
    
    // #ifdef APP-PLUS
    plus.runtime.openURL(fullUrl)
    // #endif
    
    // #ifdef MP
    uni.downloadFile({
      url: fullUrl,
      success: function(res) {
        const filePath = res.tempFilePath
        uni.openDocument({
          filePath: filePath,
          showMenu: true,
          success: function() {
            console.log('打开PDF成功')
          },
          fail: function(err) {
            console.error('打开PDF失败:', err)
            uni.showToast({
              title: '无法打开PDF文件',
              icon: 'none'
            })
          }
        })
      },
      fail: function(err) {
        console.error('下载PDF失败:', err)
        uni.showToast({
          title: '下载失败',
          icon: 'none'
        })
      }
    })
    // #endif
  } else {
    // 图片文件，使用uni.previewImage
    uni.previewImage({
      urls: [fullUrl],
      current: fullUrl
    })
  }
}

// 加载包裹的 label 图片
async function loadParcelImages(parcel) {
  try {
    const result = await ApiHelper.get('/image/manage/grouped', {
      moduleType: 'PARCEL',
      recordId: parcel.parcelId
    })
    if (result && result.code === 1 && result.data) {
      const groupedImages = result.data

      // 加载 PACKAGE_LABEL 图片
      if (groupedImages.PACKAGE_LABEL && Array.isArray(groupedImages.PACKAGE_LABEL)) {
        parcel.labelImages = groupedImages.PACKAGE_LABEL.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl
        }))
      } else {
        parcel.labelImages = []
      }
    }
  } catch (error) {
    console.error('加载包裹图片失败:', error)
    parcel.labelImages = []
  }
}

// 搜索
function handleSearch() {
  loadParcels(true)
}

// 扫码
function handleScan() {
  uni.scanCode({
    success: (res) => {
      searchText.value = res.result
      handleSearch()
    }
  })
}

// 注销
function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要注销登录吗？',
    success: (res) => {
      if (res.confirm) {
        // 执行登出并跳转到登录页，确保本地数据已清理
        userStore.logout().finally(() => {
          try {
            uni.reLaunch({ url: '/pages/login/index' })
          } catch (e) {
            // fallback navigation
            uni.navigateTo({ url: '/pages/login/index' })
          }
        })
      }
    }
  })
}

// 下拉刷新
function onRefresh() {
  refreshing.value = true
  loadParcels(true)
}

// 加载更多
function onLoadMore() {
  if (hasMore.value && !loading.value) {
    currentPage.value++
    loadParcels()
  }
}

// 标记已发货
async function markAsSent(parcel) {
  // 旧的立即标记逻辑被拆分：现在通过发送对话框逐个更新 item fee 后再完成包裹标记
  console.warn('markAsSent is deprecated; use openSendDialog instead')
}

// --- Send dialog state and handlers ---
const showSendDialog = ref(false)
const dialogParcel = ref(null)
const dialogItems = ref([])
const currentDialogIndex = ref(0)
const feeForm = ref({ inspectFee: '0.00', repairFee: '0.00', keepFee: '0.00', packingFee: '0.00', otherFee: '0.00' })

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

  // Support multiple naming conventions and nested fee object
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
  // Fetch items for this parcel by sendParcelId instead of fetching parcel detail
  const res = await ApiHelper.get('/items', { sendParcelId: parcel.parcelId, pageSize: 1000 })
  uni.hideLoading()
    if (res && res.code === 1 && res.data) {
      dialogParcel.value = parcel
      // Support multiple possible response shapes: itemList, items, rows, or direct array
      let items = []
      if (Array.isArray(res.data)) items = res.data
      else if (Array.isArray(res.data.rows)) items = res.data.rows
      else if (Array.isArray(res.data.data)) items = res.data.data
      else items = res.data.itemList || res.data.items || res.data.rows || []
      dialogItems.value = Array.isArray(items) ? items : []
      if (dialogItems.value.length === 0) {
        // 没有 item，直接使用原先的确认行为
        await uni.showModal({ title: '确认', content: '确定要标记此包裹为已发货吗？' })
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
      } else {
        currentDialogIndex.value = 0
        loadFeesFromItem(dialogItems.value[0])
        showSendDialog.value = true
      }
    } else {
      uni.hideLoading()
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

  // prepare update payload for item fees
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

    // update local copy
    Object.assign(item, payload)

    // move to next item or finalize
    if (idx < dialogItems.value.length - 1) {
      currentDialogIndex.value++
      loadFeesFromItem(dialogItems.value[currentDialogIndex.value])
    } else {
      // all items processed -> finalize parcel sent
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

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    0: '待发货',
    1: '运输中',
    2: '已收货',
    3: '已验货'
  }
  return statusMap[status] || '-'
}

// 获取状态样式
function getStatusClass(status) {
  return `status-${status}`
}

onMounted(() => {
  // 确保用户信息已加载
  if (!userStore.userInfo?.id) {
    userStore.checkLoginStatus()
  }
  loadParcels(true)
})

// 页面显示时刷新数据
onShow(() => {
  loadParcels(true)
})
</script>

<style lang="scss" scoped>
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
}

.user-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 20rpx 20rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  
  .user-info {
    display: flex;
    align-items: center;
    flex: 1;
    
    .user-icon {
      font-size: 40rpx;
      margin-right: 15rpx;
    }
    
    .user-name {
      font-size: 32rpx;
      font-weight: 500;
    }
  }
  
  .logout-btn {
    padding: 10rpx 30rpx;
    background: rgba(255, 255, 255, 0.2);
    border: 1rpx solid rgba(255, 255, 255, 0.5);
    border-radius: 30rpx;
    color: #fff;
    font-size: 26rpx;
    line-height: normal;
    margin-left: 20rpx;
    
    &::after {
      border: none;
    }
  }
}

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
    
    .search-icon {
      font-size: 32rpx;
      margin-right: 10rpx;
    }
    
    input {
      flex: 1;
      font-size: 28rpx;
    }
  }
  
  .scan-btn {
    width: 70rpx;
    height: 70rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #409EFF;
    color: #fff;
    border-radius: 40rpx;
    font-size: 36rpx;
    line-height: 1;
    padding: 0;
    
    &::after {
      border: none;
    }
  }
}

.parcel-list {
  flex: 1;
  padding: 20rpx;
}

.parcel-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.card-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
}

  .package-info {
  flex: 1;
  display: flex;
  align-items: center;
  
  .package-no {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
}

.action-buttons {
  display: flex;
  gap: 15rpx;
  
  button {
    padding: 0 30rpx;
    height: 60rpx;
    line-height: 60rpx;
    font-size: 26rpx;
    border-radius: 8rpx;
    
    &::after {
      border: none;
    }
  }
  
  .btn-label {
    background: transparent;
    border: none;
    color: #409EFF;
  }
  
  .btn-sent {
    background: #409EFF;
    color: #fff;
  }
}

.item-list-container {
  border-top: 1rpx solid #f0f0f0;
  background: #fafafa;
  padding: 20rpx 30rpx;
}

.loading-items {
  padding: 40rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.no-items {
  padding: 40rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.card-body {
  margin-bottom: 20rpx;
  
  .section {
    margin-bottom: 30rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .section-title {
    display: block;
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 15rpx;
  }
  
  .photo-list {
    display: flex;
    flex-wrap: wrap;
    gap: 15rpx;
  }
  
  .photo-item {
    width: 150rpx;
    height: 150rpx;
    border-radius: 8rpx;
    overflow: hidden;
    border: 1rpx solid #eee;
    position: relative;
    
    image {
      width: 100%;
      height: 100%;
    }
    
    .pdf-icon {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      
      .icon-text {
        font-size: 60rpx;
        margin-bottom: 10rpx;
      }
      
      .pdf-text {
        font-size: 24rpx;
        color: #666;
      }
    }
  }
  
  .item-list {
    border: 1rpx solid #eee;
    border-radius: 8rpx;
    overflow: hidden;
  }

  /* 横向滚动表格样式 */
  .item-scroll {
    overflow-x: auto;
  }

  .item-table {
    min-width: 680rpx;
  }

  .item-header {
    display: flex;
    background: #f5f5f5;
    padding: 20rpx 15rpx;
    font-size: 26rpx;
    font-weight: bold;
    color: #666;
    border-bottom: 1rpx solid #eee;
  }

  .item-row {
    display: flex;
    padding: 20rpx 15rpx;
    font-size: 26rpx;
    color: #333;
    border-bottom: 1rpx solid #f0f0f0;
    &:last-child {
      border-bottom: none;
    }
  }

  .item-col {
    &.col-no { width: 120rpx; text-align: center; }
    &.col-itemno { width: 300rpx; }
    &.col-seller { width: 300rpx; }
    &.col-qty { width: 140rpx; text-align: right; }
  }
  
  .item-header {
    display: flex;
    background: #f5f5f5;
    padding: 20rpx 15rpx;
    font-size: 26rpx;
    font-weight: bold;
    color: #666;
    border-bottom: 1rpx solid #eee;
  }
  
  .item-row {
    display: flex;
    padding: 20rpx 15rpx;
    font-size: 26rpx;
    color: #333;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .item-col {
    &.col-no {
      width: 80rpx;
      text-align: center;
    }
    
    &.col-itemno {
      flex: 1;
    }
  }
  
  .info-row {
    display: flex;
    margin-bottom: 16rpx;
    font-size: 28rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      width: 160rpx;
      color: #999;
    }
    
    .value {
      flex: 1;
      color: #333;
    }
  }
}

/* 发送对话框样式 */
.dialog-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.dialog-card {
  width: 86%;
  max-height: 85%;
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx;
  overflow: auto;
}
.dialog-title { font-size: 32rpx; font-weight: 600; margin-bottom: 20rpx; display:block }
.item-card .row { display:flex; justify-content:space-between; padding:10rpx 0; border-bottom:1rpx solid #f0f0f0 }
.item-card .seq-row { background: #f5f7fa; padding:12rpx; border-radius:6rpx }
.item-card .label { color:#666 }
.item-card .value { color:#333 }
.fees { margin-top: 16rpx }
.fee-row { display:flex; justify-content:space-between; align-items:center; padding:8rpx 0 }
.fee-label { color:#666 }
.fee-input { width:40%; text-align:right; border:1rpx solid #eee; padding:10rpx; border-radius:6rpx }
.fee-total { display:flex; justify-content:space-between; padding:12rpx 0; font-weight:600 }
.fee-total-label { color:#333 }
.fee-total-value { color:#409EFF }
.dialog-actions { display:flex; gap:16rpx; margin-top:20rpx }
.dialog-actions .btn { flex:1; font-size:24rpx; height:64rpx; line-height:64rpx; padding:0 }
.dialog-actions .btn-cancel {
  background: #E6A23C;
  color: #fff;
  border: none;
}
.dialog-actions .btn-primary {
  background: #67C23A;
  color: #fff;
  border: none;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  
  .action-btn {
    padding: 0 40rpx;
    height: 60rpx;
    line-height: 60rpx;
    font-size: 26rpx;
    
    &::after {
      border: none;
    }
  }
}

.item-list {
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  overflow: hidden;
  background: #fff;
}

.item-header {
  display: flex;
  background: #f5f5f5;
  padding: 20rpx 15rpx;
  font-size: 26rpx;
  font-weight: bold;
  color: #666;
  border-bottom: 1rpx solid #e0e0e0;
}

.item-row {
  display: flex;
  padding: 20rpx 15rpx;
  font-size: 26rpx;
  color: #333;
  border-bottom: 1rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:nth-child(even) {
    background: #fafafa;
  }
}

.item-col {
  &.col-no { width: 120rpx; text-align: center; }
  &.col-itemno { width: 300rpx; padding: 0 15rpx; text-align: left; }
  &.col-seller { width: 300rpx; text-align: left; }
  &.col-qty { width: 140rpx; text-align: right; }
}

.loading-more {
  padding: 40rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.no-more {
  padding: 40rpx 0;
  text-align: center;
  color: #ccc;
  font-size: 26rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: 40rpx;
  }
  
  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}
</style>
