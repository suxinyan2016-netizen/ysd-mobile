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
          <view class="package-info" @click="toggleItemList(parcel)">
            <text class="expand-icon">{{ parcel.expanded ? '▼' : '▶' }}</text>
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
              @click.stop="markAsSent(parcel)"
            >
              Sent
            </button>
          </view>
        </view>
        
        <!-- Item 列表 (展开显示) -->
        <view class="item-list-container" v-if="parcel.expanded">
          <view v-if="parcel.loadingItems" class="loading-items">
            <text>加载中...</text>
          </view>
          <view v-else-if="parcel.itemList && parcel.itemList.length > 0" class="item-list">
            <view class="item-scroll">
              <view class="item-table">
                <view class="item-header">
                  <text class="item-col col-no">序号</text>
                  <text class="item-col col-itemno">Item No</text>
                  <text class="item-col col-seller">Seller Part</text>
                  <text class="item-col col-qty">Qty</text>
                </view>
                <view 
                  v-for="(item, index) in parcel.itemList"
                  :key="item.itemId"
                  class="item-row"
                >
                  <text class="item-col col-no">{{ index + 1 }}</text>
                  <text class="item-col col-itemno">{{ item.itemNo || '-' }}</text>
                  <text class="item-col col-seller">{{ item.sellerPart || '-' }}</text>
                  <text class="item-col col-qty">{{ item.qty || 0 }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="no-items">
            <text>暂无Item数据</text>
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

// 切换Item列表的展开/收起状态
async function toggleItemList(parcel) {
  parcel.expanded = !parcel.expanded
  
  // 如果是展开且还没有加载item数据，则加载
  if (parcel.expanded && !parcel.itemList) {
    parcel.loadingItems = true
    try {
      // 使用 ApiHelper 获取包裹详情（包含 items 或 itemList）
      const result = await ApiHelper.get(`/parcels/${parcel.parcelId}`)
      if (result && result.code === 1 && result.data) {
        const data = result.data
        parcel.itemList = data.itemList || data.items || []
        console.log(`加载包裹 ${parcel.packageNo} 的items:`, parcel.itemList)
      } else {
        parcel.itemList = []
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    } catch (error) {
      console.error('加载item列表失败:', error)
      parcel.itemList = []
      uni.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      parcel.loadingItems = false
    }
  }
}

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
        userStore.logout()
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
  try {
    await uni.showModal({
      title: '确认',
      content: '确定要标记此包裹为已发货吗？'
    })
    
    uni.showLoading({ title: '处理中...' })
    
    // 更新 parcel 状态为 1 (Sent) 和设置 sendDate
    const updateData = {
      parcelId: parcel.parcelId,
      status: 1,  // 1 = Sent (已发货)
      sendDate: new Date().toISOString().split('T')[0]  // 设置当前日期
    }
    
    console.log('更新包裹数据:', updateData)
    
    const result = await ApiHelper.put('/parcels', updateData)

    if (result && result.code === 1) {
      uni.hideLoading()
      uni.showToast({
        title: '标记成功',
        icon: 'success'
      })
      
      // 刷新列表
      setTimeout(() => {
        loadParcels(true)
      }, 1000)
    } else {
      uni.hideLoading()
      uni.showToast({
        title: result.msg || '标记失败',
        icon: 'none'
      })
    }
  } catch (error) {
    uni.hideLoading()
    if (error !== 'cancel') {
      console.error('标记已发货失败:', error)
      uni.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
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
  if (!userStore.userInfo) {
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
  cursor: pointer;
  
  .expand-icon {
    font-size: 24rpx;
    color: #999;
    margin-right: 15rpx;
    transition: transform 0.3s;
  }
  
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
