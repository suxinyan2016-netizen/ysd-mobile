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
      <view class="title">包裹查询</view>
    </view>

    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input v-model="packageNo" type="text" placeholder="输入运单号" @confirm="doSearch" />
      </view>
      <button class="search-btn" @click="doSearch">搜索</button>
    </view>

    <view :class="['result-list', { blocked: showDetail }]">
      <view v-if="loading" class="loading">加载中...</view>

      <view v-else>
        <view v-if="rows.length === 0" class="empty">暂无结果</view>

        <view v-else>
          <view class="table-headers">
            <text class="th th-no">运单号</text>
            <text class="th th-type">类型</text>
            <text class="th th-status">状态</text>
          </view>

          <view v-for="row in rows" :key="row.parcelId" class="row-card">
            <view class="row-main">
              <text class="pkg-no" @click="openDetail(row)">{{ row.packageNo || '-' }}</text>
              <text class="pkg-type">{{ mapPackageType(row.packageType) }}</text>
              <text class="pkg-status">{{ mapStatus(row.status) }}</text>
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
          <text class="drawer-title">包裹详情</text>
          <view class="close" @click="closeDetail" role="button" tabindex="0">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M6 6 L18 18 M6 18 L18 6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
          </view>
        </view>

        <view class="drawer-content">
          <view class="detail-list">
            <!-- parcel images: moved below remarks -->
          <view class="detail-row"><text class="label">运单号:</text><text class="value">{{ sel.packageNo || '-' }}</text></view>
          <view class="detail-row"><text class="label">状态:</text><text class="value">{{ mapStatus(sel.status) }}</text></view>
          <view class="detail-row"><text class="label">ProcessID:</text><text class="value">{{ sel.processId || '-' }}</text></view>
          <view class="detail-row"><text class="label">处理日期:</text><text class="value">{{ sel.processDate || '-' }}</text></view>
          <view class="detail-row"><text class="label">货主:</text><text class="value">{{ sel.createBy || sel.ownerId || '-' }}</text></view>
          <view class="detail-row"><text class="label">创建时间:</text><text class="value">{{ sel.createTime || '-' }}</text></view>
          <view class="detail-row"><text class="label">重量:</text><text class="value">{{ formatNumber(sel.weight) }}</text></view>
          <view class="detail-row"><text class="label">尺寸:</text><text class="value">{{ sel.size || '-' }}</text></view>
          <view class="detail-row"><text class="label">发件人:</text><text class="value">{{ sel.senderName || '-' }}</text></view>
          <view class="detail-row"><text class="label">寄件日期:</text><text class="value">{{ sel.sendDate || '-' }}</text></view>
          <view class="detail-row"><text class="label">寄件地址:</text><text class="value">{{ sel.senderAddress || '-' }}</text></view>
          <view class="detail-row"><text class="label">收件人:</text><text class="value">{{ sel.receiverName || '-' }}</text></view>
          <view class="detail-row"><text class="label">收件日期:</text><text class="value">{{ sel.receivedDate || '-' }}</text></view>
          <view class="detail-row"><text class="label">收件地址:</text><text class="value">{{ sel.receiverAddress || '-' }}</text></view>
          <view class="detail-row"><text class="label">类型:</text><text class="value">{{ mapPackageType(sel.packageType) }}</text></view>
          <view class="detail-row"><text class="label">货主要求:</text><text class="value">{{ mapDemands(sel.demands) }}</text></view>
          <view class="detail-row"><text class="label">费用:</text><text class="value">{{ formatNumber(sel.fee) }}</text></view>
          <view class="detail-row"><text class="label">支付状态:</text><text class="value">{{ sel.isPaid===1 ? '已结算' : '未结算' }}</text></view>
          <view class="detail-row"><text class="label">备注:</text><text class="value">{{ sel.remarks || '-' }}</text></view>
          
          <!-- parcel images row: placed immediately after remarks -->
          <view v-if="(sel._parcelImages && sel._parcelImages.length)" class="detail-row parcel-images-row">
            <text class="label">包裹图片:</text>
            <view class="value">
              <view class="gallery-scroll">
                <view v-for="(img, idx) in sel._parcelImages" :key="img.id || idx" class="photo-item" @click.stop="handleParcelImageClick(img)">
                  <image :src="img.thumbnailUrl" mode="aspectFill"></image>
                  <text class="img-label">{{ img.label }}</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="sel.itemList && sel.itemList.length" class="items-section">
            <text class="section-title">Items ({{ sel.itemList.length }})</text>
            <view class="items-wrap">
              <view v-for="item in sel.itemList" :key="item.itemId" class="item-card">
                <view class="item-row"><text class="label">ItemNo</text><text class="value">{{ item.itemNo ? item.itemNo : '' }}</text></view>
                <view class="item-row"><text class="label">Seller Part</text><text class="value">{{ item.sellerPart || item.mfrPart || '-' }}</text></view>
                <view class="item-row"><text class="label">Qty</text><text class="value">{{ item.qty ?? item.quantity ?? '-' }}</text></view>
                <view class="item-row"><text class="label">IQCResult</text><text class="value">{{ item.iqcResult || item.IQCResult || '-' }}</text></view>
                <view class="item-row"><text class="label">良品/坏品</text><text class="value">{{ item.isGood===1 ? '良品' : (item.isGood===0 ? '坏品' : '-') }}</text></view>
              </view>
            </view>
          </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'
import { openImageViewer } from '@/stores/imageViewer'

const packageNo = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const rows = ref([])
const loading = ref(false)

const showDetail = ref(false)
const sel = ref({})
// use global viewer instead of local in-app viewer

const totalPages = computed(() => Math.max(1, Math.ceil((total.value||0) / pageSize.value)))

function formatNumber(v){ if (v===null||v===undefined||v==='') return '-'; const n = parseFloat(v); if (isNaN(n)) return '-'; return n.toString() }

function mapStatus(status){
  const map = {
    0: '初始',
    1: '在途',
    2: '入库',
    3: '投递',
    4: '关闭',
    8: '弃货',
    9: '异常'
  }
  return map[status] || '-'
}

function mapPackageType(t){
  const map = {
    1: '客户退货',
    2: '仓库调拨',
    3: '用户发售'
  }
  return map[t] || '-'
}
function mapDemands(d){ if (!d) return '-'; const parts = (''+d).split(',').filter(Boolean); const dict={'0':'原箱转运','1':'验货拍照','2':'特殊要求'}; return parts.map(p=>dict[p]||p).join(', ') }

async function openDetail(row){
  showDetail.value = true
  try{
    const res = await ApiHelper.get(`/parcels/${row.parcelId}`)
    if (res && res.code === 1) {
      // backend may return data as object
      sel.value = res.data || res || row
    } else if (res && res.data) {
      sel.value = res.data
    } else {
      sel.value = row
    }
    // load parcel images grouped
    try{
      const gid = sel.value.parcelId || sel.value.id || row.parcelId
      const imgRes = await ApiHelper.get('/image/manage/grouped', { moduleType: 'PARCEL', recordId: gid })
      const host = ApiHelper.getHost()
      const collected = []
      if (imgRes && imgRes.code === 1 && imgRes.data) {
        const groups = ['PACKAGE_SENDER','PACKAGE_RECEIVER','PACKAGE_LABEL','PACKING_LIST']
        for (const g of groups){
          const list = imgRes.data[g]
          if (Array.isArray(list)){
            for (const it of list){
              const imageUrl = it.imageUrl && String(it.imageUrl).startsWith('http') ? it.imageUrl : (host + (it.imageUrl || it.fileUrl || ''))
              const thumbnailUrl = it.thumbnailUrl && String(it.thumbnailUrl).startsWith('http') ? it.thumbnailUrl : (host + (it.thumbnailUrl || it.imageUrl || it.fileUrl || ''))
              collected.push({ id: it.id, imageUrl, thumbnailUrl, label: mapParcelLabel(g), typeCode: g, raw: it })
            }
          }
        }
      }
      sel.value._parcelImages = collected
    }catch(e){ console.warn('load parcel images failed', e); sel.value._parcelImages = [] }
  }catch(e){
    console.error('openDetail error', e)
    sel.value = row
    uni.showToast({ title: '无法加载详情', icon: 'none' })
  }
}
function closeDetail(){ showDetail.value = false; sel.value = {} }

function gotoPage(p){ if (p<1) p=1; if (p>totalPages.value) p=totalPages.value; page.value = p; doSearch() }

async function doSearch(){
  loading.value = true
  rows.value = []
  total.value = 0
  try{
    const params = { page: page.value, pageSize: pageSize.value, packageNo: packageNo.value || '' }
    const res = await ApiHelper.get('/parcels', params)
    if (res && res.code === 1 && res.data){
      total.value = res.data.total || (res.data.rows ? res.data.rows.length : 0)
      rows.value = res.data.rows || []
    } else {
      uni.showToast({ title: (res && res.msg) || '查询失败', icon: 'none' })
    }
  } catch (e){
    console.error('parcel-query error', e)
    uni.showToast({ title: '网络错误', icon:'none' })
  } finally{
    loading.value = false
  }
}

import { smartBack } from '@/utils/navigation'

function goBack(){
  smartBack()
}

function mapParcelLabel(code){
  if (!code) return ''
  const c = String(code).toUpperCase()
  if (c === 'PACKAGE_SENDER') return '发货前外观'
  if (c === 'PACKAGE_RECEIVER') return '收件后外观'
  if (c === 'PACKAGE_LABEL') return '包裹标签'
  if (c === 'PACKING_LIST') return '装箱单'
  return ''
}

function handleParcelImageClick(img){
  if (!img) return
  console.log('[parcel-query] handleParcelImageClick', img)
  const url = img.imageUrl || img.fileUrl || ''
  if (!url) return
  const lower = String(url).toLowerCase()
  // if PDF, open with native document viewer (collapse drawer while open)
  if (lower.endsWith('.pdf')){
    const wasOpen = showDetail.value
    try{ showDetail.value = false }catch(e){}
    uni.openDocument({ filePath: url, complete() { try{ if (wasOpen) showDetail.value = true }catch(e){} } })
    return
  }
  // for images, use global viewer mounted at app root
  const imgs = (sel.value._parcelImages || []).map(i => i.imageUrl || i.fileUrl || '')
  const idx = imgs.findIndex(u => u === url)
  openImageViewer(imgs, idx >= 0 ? idx : 0)
}

// Load first page automatically when entering the page
onMounted(() => {
  page.value = 1
  doSearch()
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('focus', () => { page.value = 1; doSearch() })
  }
})
</script>

.style-placeholder
<style scoped lang="scss">
.page-container{ height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.title { color:#fff; font-size:34rpx; font-weight:700 }
.back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%) }
.back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18) }
.back-icon svg { width:32rpx; height:32rpx }
.search-bar{ display:flex; align-items:center; padding:20rpx; background:#fff }
.search-input{ flex:1; display:flex; align-items:center; background:#f5f5f5; border-radius:40rpx; padding:0 30rpx; height:70rpx; margin-right:16rpx }
.search-icon{ font-size:32rpx; margin-right:10rpx }
.search-input input{ flex:1; font-size:28rpx }
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

.result-list{ flex:1; padding:20rpx }
.row-card{ background:#fff; padding:24rpx; border-radius:12rpx; margin-bottom:16rpx; display:flex; align-items:center }
.row-main{ display:flex; gap:20rpx; width:100%; align-items:center }
.pkg-no{ color:#409EFF; font-size:26rpx }
.pkg-type{ color:#666; margin-left:auto }
.pkg-status{ margin-left:16rpx; color:#999 }

.table-headers{ display:flex; gap:20rpx; padding:12rpx 18rpx; background:#fff; border-radius:8rpx; margin-bottom:12rpx; align-items:center }
.table-headers .th{ font-size:26rpx; color:#666; font-weight:600 }
.th-no{ flex:1 }
.th-type{ width:140rpx; text-align:center }
.th-status{ width:60rpx; text-align:center }

.pager{ display:flex; align-items:center; justify-content:center; gap:24rpx; margin-top:12rpx }
.pager-btn{ display:flex; align-items:center; gap:10rpx; padding:10rpx 18rpx; background:#fff; border-radius:12rpx; box-shadow:0 8rpx 18rpx rgba(0,0,0,0.06); cursor:pointer }
.pager-btn svg{ width:28rpx; height:28rpx }
.pager-btn .btn-text{ font-size:26rpx; color:#409EFF }
.pager-btn.primary{ background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff }
.pager-btn.primary .btn-text{ color:#fff }
.pager-btn.disabled{ opacity:0.45; pointer-events:none; box-shadow:none }

.drawer-overlay{ position:fixed; left:0; top:0; right:0; bottom:0; background:rgba(0,0,0,0.4); display:flex; align-items:flex-end; z-index:9999 }
.drawer{ width:100%; max-height:82%; background:#fff; border-top-left-radius:16rpx; border-top-right-radius:16rpx; padding:0; display:flex; flex-direction:column; overflow:hidden }
.drawer-header{ display:flex; justify-content:space-between; align-items:center; padding:20rpx 24rpx; border-bottom:1rpx solid #f0f0f0; background:#fff; box-shadow:0 6rpx 14rpx rgba(0,0,0,0.04); z-index:12 }
.drawer-title{ font-size:26rpx; font-weight:700 }
.drawer-content{ overflow:auto; flex:1; padding:16rpx 24rpx 24rpx }
.close{ width:56rpx; height:56rpx; border-radius:28rpx; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.04); cursor:pointer; box-shadow:0 6rpx 14rpx rgba(0,0,0,0.06); }
.close svg{ width:28rpx; height:28rpx }
.detail-list{ display:flex; flex-direction:column; gap:10rpx }
.detail-row{ display:flex; align-items:center; padding:10rpx 0; border-bottom:1rpx solid #f0f0f0 }
.label{ color:#666; /* increase left title width by 25% of a 20% baseline = 25% */ width: calc(20% * 1.25); flex: 0 0 calc(20% * 1.25); }
.value{ color:#333; flex: 1 1 auto }

.items-section{ margin-top:12rpx }
.section-title{ font-size:26rpx; font-weight:600; margin-bottom:8rpx }
.items-wrap{ display:flex; flex-direction:column; gap:10rpx }
.item-card{ background:#fff; border-radius:10rpx; padding:12rpx; box-shadow:0 6rpx 14rpx rgba(0,0,0,0.04) }
.item-card .item-row{ display:flex; justify-content:space-between; padding:6rpx 0 }
.item-card .label{ width:40% }
.item-card .value{ width:58%; text-align:right }

.loading{ text-align:center; padding:40rpx }
.empty{ text-align:center; padding:40rpx; color:#999 }

/* parcel images gallery styles */
.parcel-images-row .gallery-scroll{ display:flex; gap:12rpx; overflow:auto; padding:8rpx 0 }
.parcel-images-row .photo-item{ width:140rpx; height:140rpx; border-radius:8rpx; overflow:hidden; position:relative; background:#f5f5f5; flex:0 0 auto }
.parcel-images-row .photo-item image{ width:100%; height:100% }
.parcel-images-row .img-label{ position:absolute; left:8rpx; bottom:6rpx; padding:4rpx 8rpx; background:rgba(0,0,0,0.45); color:#fff; border-radius:6rpx; font-size:20rpx }

/* in-app parcel viewer styles */
.image-viewer-overlay{ position:fixed; left:0; right:0; top:0; bottom:0; background:#000; z-index:99999; display:flex; align-items:center; justify-content:center }
.viewer-swiper{ width:100%; height:100% }
.viewer-item{ display:flex; align-items:center; justify-content:center; height:100% }
.viewer-image{ width:100%; height:100% }
.viewer-close{ position:absolute; top:28rpx; right:24rpx; width:88rpx; height:88rpx; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); border-radius:44rpx; box-shadow:0 6rpx 18rpx rgba(0,0,0,0.4) }
.viewer-close-icon{ width:40rpx; height:40rpx }
</style>
