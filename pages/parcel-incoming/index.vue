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
            @click="goToInspect(parcel)"
      >
            <view class="card-header">
                <text class="package-no">{{ parcel.packageNo }}</text>
              <text class="status" :class="getStatusClass(parcel.status)">
                {{ getStatusText(parcel.status) }}
              </text>
            </view>
        
        <view class="card-body">
          <view class="info-row">
            <text class="label">发件人:</text>
            <text class="value">{{ parcel.senderName || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="label">收件人:</text>
            <text class="value">{{ parcel.receiverName || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="label">发货时间:</text>
            <text class="value">{{ parcel.sendDate || '-' }}</text>
          </view>
        </view>
        
        <view class="card-footer">
          <button 
            class="action-btn"
            size="mini"
            type="primary"
            @click.stop="goToInspect(parcel)"
          >
            验收
          </button>
        </view>
        <!-- 展开显示 items 列表 -->
        <view v-if="isExpanded(parcel)" class="item-list">
          <view v-for="item in parcel.items || parcel.itemList || []" :key="item.itemId" class="item-row">
            <text class="item-no">{{ item.itemNo || '-' }}</text>
            <text class="seller-part">{{ item.sellerPart || '-' }}</text>
            <text class="qty">{{ item.qty ?? item.quantity ?? '-' }}</text>
          </view>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view class="loading-more" v-if="hasMore">
        <text>加载更多...</text>
      </view>
      <view class="no-more" v-else-if="parcelList.length > 0">
        <text>没有更多了</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && parcelList.length === 0">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无包裹数据</text>
      </view>
    </scroll-view>
    
    <!-- 退出登录按钮 -->
    <view class="logout-btn" @click="handleLogout">
      <text>退出登录</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const expanded = ref([])

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
    // 确保 userInfo 已赋值
    if (!userStore.userInfo || !userStore.userInfo.id) {
      userStore.checkLoginStatus()
    }
    const receiverId = userStore.userInfo?.id || ''
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      status: 1, // 待收包裹
      receiverId,
      packageNo: searchText.value
    }
    const result = await ApiHelper.get('/parcels', params)
    
    if (result.code) {
      const newData = result.data.rows || []
      
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
    uni.showToast({
      title: '网络错误',
      icon: 'none'
    })
  } finally {
    loading.value = false
    refreshing.value = false
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
        uni.reLaunch({ url: '/pages/login/index' })
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

// 跳转验收页面
// 跳转验收页面，先获取图片数据
async function goToInspect(parcel) {
  try {
    // 直接跳转到验收页面，仅传 parcelId，包裹图片在验收页加载
    uni.navigateTo({ url: `/pages/parcel-inspect/index?parcelId=${parcel.parcelId}` })
  } catch (e) {
    uni.showToast({ title: '图片加载失败', icon: 'none' })
    // 失败时也允许跳转
    uni.navigateTo({
      url: `/pages/parcel-inspect/index?parcelId=${parcel.parcelId}`
    })
  }
}

function toggleExpand(parcel) {
  const id = parcel.parcelId
  const idx = expanded.value.indexOf(id)
  if (idx === -1) expanded.value.push(id)
  else expanded.value.splice(idx, 1)
}

function isExpanded(parcel) {
  return expanded.value.indexOf(parcel.parcelId) !== -1
}

// 查看 Label（图片或 PDF）
// (Label and Sent actions were removed from the incoming page per UX requirements)

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    0: '待处理',
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
  userStore.checkLoginStatus()
  loadParcels(true)
})

// 页面显示时刷新数据（从验收页面返回时会触发）
onShow(() => {
  userStore.checkLoginStatus()
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
      font-size: 36rpx;
      margin-right: 10rpx;
    }
    
    .user-name {
      font-size: 28rpx;
      font-weight: 500;
    }
  }
  
  .logout-btn {
    padding: 10rpx 30rpx;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 30rpx;
    font-size: 24rpx;
    line-height: 1.5;
    margin-left: 20rpx;
    
    &:active {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.search-bar {
  display: flex;
  align-items: center;
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
    margin-right: 20rpx;
    
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
    line-height: 70rpx;
    text-align: center;
    background: #409EFF;
    color: #fff;
    border-radius: 50%;
    font-size: 32rpx;
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
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 10rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #eee;
    
    .package-no {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      flex: 1;
      text-align: left;
    }
    
    .status {
      font-size: 24rpx;
      padding: 8rpx 20rpx;
      border-radius: 20rpx;
      
      &.status-0 {
        background: #FFF3E0;
        color: #FF9800;
      }
      
      &.status-1 {
        background: #E3F2FD;
        color: #2196F3;
      }
      
      &.status-2 {
        background: #E8F5E9;
        color: #4CAF50;
      }
    }
  }

  .expand-btn {
    width: 48rpx;
    height: 48rpx;
    line-height: 48rpx;
    text-align: center;
    border-radius: 8rpx;
    background: transparent;
    border: none;
    font-size: 28rpx;
  }

  .item-list {
    background: #fafafa;
    padding: 20rpx;
    border-top: 1rpx dashed #eee;
  }

  .item-row {
    display: flex;
    gap: 20rpx;
    padding: 10rpx 0;
    font-size: 26rpx;
    color: #333;
  }

  .item-no { width: 40%; }
  .seller-part { width: 40%; }
  .qty { width: 20%; text-align: right; }
  
  .card-body {
    margin-bottom: 20rpx;
    
    .info-row {
      display: flex;
      margin-bottom: 16rpx;
      font-size: 28rpx;
      
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
}

.loading-more,
.no-more {
  text-align: center;
  padding: 30rpx;
  font-size: 28rpx;
  color: #999;
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

.logout-btn {
  padding: 20rpx;
  text-align: center;
  background: #fff;
  border-top: 1rpx solid #eee;
  font-size: 28rpx;
  color: #666;
}
</style>
