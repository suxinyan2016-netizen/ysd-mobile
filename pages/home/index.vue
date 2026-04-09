<template>
  <view class="page">
    <view class="topbar">
      <view class="left">
        <view class="avatar-wrap" @click="goProfile">
          <image class="avatar" :src="avatar" mode="aspectFill" />
        </view>
        <text class="username">{{ userName }}</text>
      </view>
      <view class="title">PacItem</view>
      <view class="right">
        <button class="logout-btn" @click="handleLogout">退出</button>
      </view>
    </view>

    <scroll-view class="content" scroll-y="true">
      <view class="welcome">
        <text class="h1">欢迎，{{ userName || '用户' }}</text>
        
      </view>

      <view class="stats-wrap">
        <!-- 卡片1：待处理包裹 -->
        <view class="card">
          <view class="card-title">待处理包裹</view>
          <view class="card-body two-col" :style="{ flexDirection: 'row' }">
            <view class="col" @click="goToPendingReceive">
              <text class="label">待收包裹数</text>
              <text class="num num-receive">{{ pendingParcels.rcvCnt || 0 }}</text>
            </view>
            <view class="col" @click="goToPendingSend">
              <text class="label">待发包裹数</text>
              <text class="num num-send">{{ pendingParcels.sntCnt || 0 }}</text>
            </view>
          </view>
        </view>

        <!-- 卡片2：待结算费用 -->
        <view class="card">
          <view class="card-title">待结算费用</view>
          <view class="card-body two-col" :style="{ flexDirection: 'row' }">
            <view class="col" @click="goToPendingReceive">
              <text class="label">应收款总计</text>
              <text class="num num-receive">{{ formatMoney(pendingSettlement.pendingReceive) }}</text>
            </view>
            <view class="col" @click="goToPendingSend">
              <text class="label">应付款总计</text>
              <text class="num num-pay">{{ formatMoney(pendingSettlement.pendingPay) }}</text>
            </view>
          </view>
        </view>

        <!-- 卡片3：我的货品（有数据才显示） -->
        <view class="card" v-if="showCard3">
          <view class="card-title">我的货品</view>
          <view class="card-body">
            <view v-if="myItemsByCategory && myItemsByCategory.length">
              <text class="section-sub">分类统计</text>
              <view class="inline-grid">
                <view v-for="(it, idx) in myItemsByCategory" :key="'c'+idx" class="col">
                  <text class="label center">{{ it.label || '其他' }}</text>
                  <text class="value center">{{ it.value }}</text>
                </view>
              </view>
            </view>

            <view v-if="myItemsKeeper && myItemsKeeper.length">
              <text class="section-sub">仓库统计</text>
              <view class="inline-grid">
                <view v-for="(k, idx) in myItemsKeeper" :key="'k2'+idx" class="col">
                  <text class="label center">{{ k.label || '仓库' }}</text>
                  <text class="value center">{{ k.value }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 卡片4：我的库存（有数据才显示） -->
        <view class="card" v-if="showCard4">
          <view class="card-title">我的库存</view>
          <view class="card-body">
            <view v-if="myInventoryByCategory && myInventoryByCategory.length">
              <text class="section-sub">分类统计</text>
              <view class="inline-grid">
                <view v-for="(it, idx) in myInventoryByCategory" :key="'ic'+idx" class="col">
                  <text class="label center">{{ it.label || '其他' }}</text>
                  <text class="value center">{{ it.value }}</text>
                </view>
              </view>
            </view>

            <view v-if="myInventoryOwner && myInventoryOwner.length">
              <text class="section-sub">货主统计</text>
              <view class="inline-grid">
                <view v-for="(o, idx) in myInventoryOwner" :key="'io'+idx" class="col">
                  <text class="label center">{{ o.label || '货主' }}</text>
                  <text class="value center">{{ o.value }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

    </scroll-view>
  </view>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { ApiHelper } from '@/utils/apiHelper.js'

export default {
  setup() {
    const userStore = useUserStore()
    const userName = computed(() => {
      const u = userStore.userInfo
      return (u && (u.name || u.username)) || ''
    })
    const avatar = computed(() => {
      const u = userStore.userInfo
      return (u && (u.avatar || u.photo)) || '/static/logo.png'
    })

    const stats = ref({})
    const pendingParcels = computed(() => stats.value.pendingParcels || {})
    const pendingSettlement = computed(() => stats.value.pendingSettlement || { pendingReceive: 0, pendingPay: 0 })
    const myItems = computed(() => stats.value.myItems || { byCategory: [], keeperDistribution: [] })
    const myInventory = computed(() => stats.value.myInventory || { byCategory: [], ownerDistribution: [] })

    const normalizeLabel = (obj, keys) => {
      for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]) !== '') return String(obj[k])
      }
      return ''
    }

    const normalizeNumber = (obj, keys) => {
      for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) {
          const n = Number(obj[k])
          if (!Number.isNaN(n)) return n
        }
      }
      return 0
    }

    const myItemsByCategory = computed(() => {
      const arr = myItems.value.byCategory || []
      return arr.map(it => ({
        label: normalizeLabel(it, ['category', 'name', 'cat', 'type']),
        value: normalizeNumber(it, ['count', 'qty', 'num', 'total', 'cnt'])
      }))
    })

    const myItemsKeeper = computed(() => {
      const arr = myItems.value.keeperDistribution || []
      return arr.map(it => ({
        label: normalizeLabel(it, ['keeper', 'name', 'warehouse', 'wname']),
        value: normalizeNumber(it, ['count', 'qty', 'num', 'total', 'cnt'])
      }))
    })

    const myInventoryByCategory = computed(() => {
      const arr = myInventory.value.byCategory || []
      return arr.map(it => ({
        label: normalizeLabel(it, ['category', 'name', 'cat', 'type']),
        value: normalizeNumber(it, ['count', 'qty', 'num', 'total', 'cnt'])
      }))
    })

    const myInventoryOwner = computed(() => {
      const arr = myInventory.value.ownerDistribution || []
      return arr.map(it => ({
        label: normalizeLabel(it, ['owner', 'name', 'ownerName']),
        value: normalizeNumber(it, ['count', 'qty', 'num', 'total', 'cnt'])
      }))
    })

    const showCard3 = computed(() => (myItemsByCategory.value.length > 0) || (myItemsKeeper.value.length > 0))
    const showCard4 = computed(() => (myInventoryByCategory.value.length > 0) || (myInventoryOwner.value.length > 0))

    function formatMoney(v) {
      if (v === null || v === undefined) return '0.00'
      const n = Number(v)
      if (Number.isNaN(n)) return String(v)
      return n.toFixed(2)
    }

    const fetchStats = async (id) => {
      if (!id) return
      try {
        console.log('home: fetchStats called with id=', id)
        // Ensure userId is passed as query param for GET
        const url = `/home/stats?userId=${encodeURIComponent(id)}`
        console.log('home: requesting', ApiHelper.baseUrl + url)
        const res = await ApiHelper.get(url)
        console.log('home: stats response', res)
        const data = (res && res.code !== undefined) ? res.data : res
        if (data) stats.value = data
      } catch (err) {
        console.error('获取首页统计失败', err)
      }
    }

    onMounted(() => {
      const u = userStore.userInfo || {}
      const id = u.userId || u.id || u.userID || ''
      if (id) fetchStats(id)
    })

    // Also watch for userInfo changes (e.g. after login) and fetch when available
    watch(() => userStore.userInfo, (newUser) => {
      console.log('home: userStore.userInfo changed', newUser)
      const id = (newUser && (newUser.userId || newUser.id || newUser.userID)) || ''
      if (id) fetchStats(id)
    })

    const handleLogout = async () => {
      try {
        await userStore.logout()
      } finally {
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }

    const goProfile = () => {
      const u = userStore.userInfo || {}
      const id = u.userId || u.id || u.userID || ''
      if (id) {
        uni.navigateTo({ url: `/pages/profile/index?userId=${id}` })
      } else {
        uni.navigateTo({ url: '/pages/profile/index' })
      }
    }

    const goToPendingReceive = () => {
      try {
        uni.navigateTo({ url: '/pages/parcel-incoming/index' })
      } catch (e) {
        console.warn('navigate to parcel-incoming failed', e)
      }
    }

    const goToPendingSend = () => {
      try {
        uni.navigateTo({ url: '/pages/parcel-leaving/index' })
      } catch (e) {
        console.warn('navigate to parcel-leaving failed', e)
      }
    }

    return {
      userName,
      avatar,
      handleLogout,
      goProfile,
      pendingParcels,
      pendingSettlement,
      myItems,
      myInventory,
      myItemsByCategory,
      myItemsKeeper,
      myInventoryByCategory,
      myInventoryOwner,
      showCard3,
      showCard4,
      formatMoney,
      goToPendingReceive,
      goToPendingSend
    }
  }
}
</script>

<style lang="scss" scoped>
.page { height: 100vh; display:flex; flex-direction:column; background:#F8F8F8 }
.topbar { height:88rpx !important; min-height:88rpx !important; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:relative; z-index:999; box-sizing:border-box }
.title { color:#fff; font-size:34rpx; font-weight:700 }
.back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg { width:32rpx; height:32rpx }
.topbar .left { position:absolute; left:12rpx; display:flex; align-items:center }
.topbar .right { position:absolute; right:12rpx; display:flex; align-items:center }
.avatar-wrap { display:flex; align-items:center; height:100% }
.avatar { width:56rpx; height:56rpx; border-radius:50%; margin-right:12rpx; align-self:center }
.username { color:#fff; font-size:28rpx; margin-right:12rpx }
.logout-btn { background:transparent; color:#fff; border:1rpx solid rgba(255,255,255,0.2); padding:8rpx 14rpx; border-radius:8rpx; font-size:12px }
.content { flex:1; padding-bottom: 140rpx; padding-top: 12rpx }
.welcome { padding:30rpx }
.h1 { font-size:36rpx; font-weight:700; color:#333 }
.p { margin-top:12rpx; color:#666 }

/* Stats cards */
.stats-wrap { padding:20rpx }
.card { background:#fff; border-radius:12rpx; padding:18rpx; margin-bottom:16rpx; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.06) }
.card-title { font-size:28rpx; font-weight:700; color:#0b2b66; margin-bottom:12rpx }
.card-body { display:flex; flex-direction:column }
.card-body.two-col { display:flex; flex-direction:row; flex-wrap:nowrap; align-items:center; justify-content:space-between; gap:12rpx }
.card-body.two-col .col { flex:0 0 48%; min-width:0; align-items:center }
.card-body.two-col .label, .card-body.two-col .num { width:100%; text-align:center }
.stat-row { display:flex; justify-content:space-between; align-items:center; padding:10rpx 0; border-bottom:1rpx solid #f0f0f0 }
.stat-row:last-child { border-bottom:0 }
.label { color:#666; font-size:26rpx }
.value { color:#222; font-size:28rpx; font-weight:700 }
.section-sub { color:#999; font-size:24rpx; margin-top:6rpx; margin-bottom:6rpx }
.list-row { display:flex; justify-content:space-between; padding:8rpx 0; border-bottom:1rpx dashed #f4f4f4 }
.list-row:last-child { border-bottom:0 }
.grid { display:flex; flex-wrap:wrap; gap:12rpx; margin-top:8rpx }
.col { flex:1 1 50%; min-width:140rpx; display:flex; flex-direction:column; align-items:flex-start }
.num { font-size:36rpx; font-weight:800; margin-top:10rpx }
.num-receive { color:#0b6bff }
.num-send { color:#ff7a00 }
.num-pay { color:#ff4d4f }
.list-row { display:flex; justify-content:space-between; align-items:center; padding:10rpx 0; border-bottom:1rpx solid #f4f4f4 }
.list-row:last-child { border-bottom:0 }
.value { color:#222; font-size:28rpx; font-weight:700 }
.badge { display:none }
.inline-grid { display:flex; gap:12rpx; margin-top:8rpx; flex-wrap:wrap; }
.inline-grid .col { flex:0 0 48%; min-width:0; background:#fafafa; border-radius:8rpx; padding:14rpx; display:flex; flex-direction:column; align-items:center; margin-bottom:12rpx }
.center { text-align:center }
</style>
