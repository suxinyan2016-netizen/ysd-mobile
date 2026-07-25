<template>
  <view class="page-container">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <view class="back-chevron"></view>
        </view>
      </view>
      <view class="title">拣货</view>
    </view>

    <!-- 拣货列表 -->
    <scroll-view 
      class="picking-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view 
        v-for="(group, groupIndex) in groupedItems"
        :key="groupIndex"
        class="group-section"
      >
        <view class="group-header">
          <text class="group-title">{{ group.groupKey }}</text>
        </view>
        
        <view 
          v-for="(item, itemIndex) in group.items"
          :key="item.itemId || item.id || itemIndex"
          class="item-card"
          @longpress="handleLongPress(item)"
        >
          <view class="item-row">
            <text class="item-label">商品号</text>
            <text class="item-value" :class="{ 'item-picked': item.isPicked }">{{ item.itemNo || item.sku || '-' }}</text>
          </view>
          <view class="item-row">
            <text class="item-label">商品名称</text>
            <text class="item-value">{{ item.sellerPart || item.name || '-' }}</text>
          </view>
          <view class="item-row">
            <text class="item-label">库位</text>
            <text class="item-value">{{ item.slot || '-' }}</text>
          </view>
          <view class="item-row">
            <text class="item-label">收货运单号</text>
            <text class="item-value">{{ item.receivePackageNo || '-' }}</text>
          </view>
          <view class="item-row">
            <text class="item-label">数量</text>
            <text class="item-value">{{ item.qty ?? item.quantity ?? '-' }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && groupedItems.length === 0">
        <text class="empty-icon">📦</text>
        <text class="empty-text">暂无待拣货商品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'
import { smartBack } from '@/utils/navigation'

const userStore = useUserStore()

const loading = ref(false)
const refreshing = ref(false)
const allItems = ref([])
const pickedItemNos = ref(new Set())

// 分组并排序的商品列表
const groupedItems = computed(() => {
  if (!allItems.value.length) return []

  // 按库位、收货运单号、商品号分组
  const groups = {}
  
  allItems.value.forEach(item => {
    const slot = item.slot || '未分配'
    const receivingTrackingNo = item.receivingTrackingNo || '无'
    const itemNo = item.itemNo || item.sku || '未知'
    
    const groupKey = `${slot}|${receivingTrackingNo}`
    
    if (!groups[groupKey]) {
      groups[groupKey] = {
        groupKey: `库位: ${slot}`,
        items: []
      }
    }
    
    groups[groupKey].items.push({
      ...item,
      isPicked: pickedItemNos.value.has(itemNo)
    })
  })

  // 对每个组内的商品按商品号排序
  Object.values(groups).forEach(group => {
    group.items.sort((a, b) => {
      const itemNoA = a.itemNo || a.sku || ''
      const itemNoB = b.itemNo || b.sku || ''
      return itemNoA.localeCompare(itemNoB)
    })
  })

  // 对组按库位、收货运单号排序
  const sortedGroups = Object.values(groups).sort((a, b) => {
    return a.groupKey.localeCompare(b.groupKey)
  })

  return sortedGroups
})

// 加载待发包裹的商品
async function loadPickingItems() {
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

    // 获取待发包裹列表
    const parcelResult = await ApiHelper.get('/parcels', { status: 0, senderId: currentUserId, pageSize: 1000 })
    if (parcelResult && parcelResult.code === 1) {
      const parcels = Array.isArray(parcelResult.data?.rows) ? parcelResult.data.rows : 
                     Array.isArray(parcelResult.data?.list) ? parcelResult.data.list :
                     Array.isArray(parcelResult.data) ? parcelResult.data : []

      if (parcels.length === 0) {
        allItems.value = []
        return
      }

      // 获取所有包裹的商品
      const parcelIds = parcels.map(p => p.parcelId).filter(id => id)
      const itemsPromises = parcelIds.map(parcelId => 
        ApiHelper.get('/items', { sendParcelId: parcelId, pageSize: 1000 })
      )
      
      const itemsResults = await Promise.all(itemsPromises)
      const allItemsList = []
      
      itemsResults.forEach(res => {
        if (res && res.code === 1 && res.data) {
          const items = Array.isArray(res.data) ? res.data :
                       Array.isArray(res.data.rows) ? res.data.rows :
                       Array.isArray(res.data.data) ? res.data.data :
                       res.data.itemList || res.data.items || []
          allItemsList.push(...items)
        }
      })

      // 合并相同商品号的商品（按库位、收货运单号、商品号分组合并数量）
      const mergedItems = mergeItems(allItemsList)
      allItems.value = mergedItems
    } else {
      uni.showToast({ title: '加载包裹失败', icon: 'none' })
    }
  } catch (e) {
    console.error('加载拣货商品失败', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 合并相同商品
function mergeItems(items) {
  const mergedMap = new Map()
  
  items.forEach(item => {
    const slot = item.slot || ''
    const receivingTrackingNo = item.receivingTrackingNo || ''
    const itemNo = item.itemNo || item.sku || ''
    const key = `${slot}|${receivingTrackingNo}|${itemNo}`
    
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)
      const existingQty = existing.qty ?? existing.quantity ?? 0
      const newQty = item.qty ?? item.quantity ?? 0
      existing.qty = existingQty + newQty
      existing.quantity = existing.qty
    } else {
      mergedMap.set(key, { ...item })
    }
  })
  
  return Array.from(mergedMap.values())
}

// 长按处理
function handleLongPress(item) {
  const itemNo = item.itemNo || item.sku
  if (!itemNo) return
  
  uni.showModal({
    title: '确认',
    content: `是否确认商品 ${itemNo} 拣货完成？`,
    success: (res) => {
      if (res.confirm) {
        pickedItemNos.value.add(itemNo)
        uni.showToast({ title: '拣货完成', icon: 'success' })
      }
    }
  })
}

function onRefresh() {
  refreshing.value = true
  loadPickingItems()
}

function goBack() {
  smartBack()
}

onMounted(() => {
  if (!userStore.userInfo?.id) userStore.checkLoginStatus()
  loadPickingItems()
})
</script>

<style lang="scss" scoped>
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
}

.topbar { 
  height: 88rpx; 
  background: #082567; 
  color: #fff; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  position: relative 
}
.title { 
  color: #fff; 
  font-size: 34rpx; 
  font-weight: 700 
}
.back { 
  position: absolute; 
  left: 12rpx; 
  top: 50%; 
  transform: translateY(-50%) 
}
.back-icon { 
  width: 56rpx; 
  height: 56rpx; 
  background: rgba(255,255,255,0.12); 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.18) 
}
.back-chevron{ 
  width: 18rpx; 
  height: 18rpx; 
  border-top: 4rpx solid #fff; 
  border-left: 4rpx solid #fff; 
  transform: rotate(-45deg); 
  margin-left: 8rpx; 
  box-sizing: border-box 
}

.picking-list { 
  flex: 1; 
  padding: 20rpx; 
}

.group-section {
  margin-bottom: 30rpx;
}

.group-header {
  background: #409EFF;
  padding: 16rpx 24rpx;
  border-radius: 8rpx 8rpx 0 0;
}

.group-title {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

.item-card {
  background: #fff;
  padding: 24rpx;
  border-radius: 0 0 8rpx 8rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
}

.item-card:first-child {
  border-radius: 0 0 8rpx 8rpx;
}

.item-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.item-row:last-child {
  border-bottom: none;
}

.item-label {
  font-size: 28rpx;
  color: #666;
}

.item-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.item-picked {
  color: #67C23A;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 40rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
