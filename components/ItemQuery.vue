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

    <view :class="['result-list', { blocked: showDetail }]">
      <view v-if="loading" class="loading">加载中...</view>
      <view v-else>
        <view v-if="rows.length===0" class="empty">暂无结果</view>
        <view v-else>
          <view v-for="row in rows" :key="row.itemId" class="row-card" @click="openDetail(row)">
            <view class="row-top">
                  <text class="top-itemno">{{ row.itemNo || '-' }}</text>
                  <text class="top-dict">{{ row.dictName || '-' }}</text>
                  <text class="top-qty"><text class="qty-label">数量：</text><text class="qty-val">{{ row.qty ?? row.quantity ?? '-' }}</text></text>
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

    <view v-if="showDetail" :class="['drawer-overlay', { previewing: isPreviewing }]" @click.self="closeDetail">
      <view class="drawer">
        <view class="drawer-header">
          <text class="drawer-title">商品详情</text>
          <view class="drawer-actions">
            <view v-if="showAddParcel" class="action-group">
              <button class="btn primary header-btn" @click="openTransfer">调拨出库</button>
              <button class="btn primary header-btn" @click="openUserSale">发售出库</button>
            </view>
            <view v-if="canSplit" class="action-group">
              <button class="btn primary header-btn" @click.stop="openSplit">拆分</button>
            </view>
            <view class="close" @click="closeDetail">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6 L18 18 M6 18 L18 6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            </view>
          </view>
        </view>
        <view class="drawer-content">
          <view class="detail-row"><text class="label">商品号:</text><text class="value">{{ sel.itemNo || '-' }}</text></view>
          <view class="detail-row"><text class="label">类别:</text><text class="value">{{ sel.dictName || sel.category || '-' }}</text></view>
          <view class="detail-row"><text class="label">商品名:</text><text class="value">{{ sel.sellerPart || sel.mfrPart || '-' }}</text></view>
          <view class="detail-row"><text class="label">是否良品:</text><text :class="['value', sel.isGood==0 ? 'bad' : '']">{{ sel.isGood==1 ? '良品' : (sel.isGood==0 ? '次品' : '-') }}</text></view>
          <view class="detail-row"><text class="label">数量:</text><text class="value">{{ sel.qty ?? sel.quantity ?? '-' }}</text></view>
          <view class="detail-row"><text class="label">状态:</text><text class="value">{{ mapItemStatus(sel.itemStatus) }}</text></view>
          <view class="detail-row"><text class="label">收货运单号:</text><text class="value">{{ sel.receivePackageNo || sel.receive_package_no || '-' }}</text></view>
          <view class="detail-row"><text class="label">寄出运单号:</text><text class="value">{{ sel.sendPackageNo || sel.send_package_no || '-' }}</text></view>
          <view class="detail-row"><text class="label">客户反馈:</text><text class="value">{{ sel.customerFeedback || sel.customer_feedback || '-' }}</text></view>
          <view class="detail-row"><text class="label">检验结果:</text><text class="value">{{ sel.iqcResult || sel.iqc_result || '-' }}</text></view>
          <view class="detail-row"><text class="label">是否寄售:</text><text class="value">{{ (sel.isConsigned==1||sel.isConsigned==='1') ? '是' : '否' }}</text></view>
          <view v-if="(sel.isConsigned==1||sel.isConsigned==='1')" class="detail-row"><text class="label">抽成方式:</text><text class="value">{{ commissionModel.value === 1 ? '百分比' : (commissionModel.value === 2 ? '固定' : '-') }}</text></view>
          <view v-if="(sel.isConsigned==1||sel.isConsigned==='1')" class="detail-row"><text class="label">抽成设定:</text><text class="value num">{{ formatNumber(rawCommissionSet.value ?? sel.commissionSet ?? sel.commission_set ?? commissionSetting.value) }}</text></view>
          <view v-if="(sel.isConsigned==1||sel.isConsigned==='1')" class="detail-row"><text class="label">上架平台:</text><text class="value">{{ sel.listingPlatform || sel.listing_platform || '-' }}</text></view>
          <view v-if="(sel.isConsigned==1||sel.isConsigned==='1')" class="detail-row"><text class="label">成交日期:</text><text class="value">{{ sel.dealDate || sel.deal_date || '-' }}</text></view>
          <view v-if="(sel.isConsigned==1||sel.isConsigned==='1')" class="detail-row"><text class="label">成交价格:</text><text class="value num">{{ formatNumber(rawSalePrice ?? sel.salePrice ?? sel.sale_price ?? dealPrice) }}</text></view>
          <view class="detail-row"><text class="label">是否拆封:</text><text class="value">{{ sel.isUnpacked==1 ? '是' : '否' }}</text></view>
          <view class="detail-row"><text class="label">检验费:</text><text class="value num">{{ formatNumber(rawInspectFee ?? sel.inspectFee ?? sel.inspect_fee ?? inspectionFee) }}</text></view>
          <view class="detail-row"><text class="label">维修费:</text><text class="value num">{{ formatNumber(rawRepairFee ?? sel.repairFee ?? sel.repair_fee ?? repairFee) }}</text></view>
          <view class="detail-row"><text class="label">保管费:</text><text class="value num">{{ formatNumber(rawKeepFee ?? sel.keepFee ?? sel.keep_fee ?? storageFee) }}</text></view>
          <view class="detail-row"><text class="label">装箱费:</text><text class="value num">{{ formatNumber(rawPackingFee ?? sel.packingFee ?? sel.packing_fee ?? packingFee) }}</text></view>
          <view class="detail-row"><text class="label">其他费用:</text><text class="value num">{{ formatNumber(rawOtherFee ?? sel.otherFee ?? sel.other_fee ?? otherFee) }}</text></view>
          <view v-if="(sel.isConsigned==1||sel.isConsigned==='1')" class="detail-row"><text class="label">抽成费:</text><text class="value num">{{ formatNumber(commissionFee) }}</text></view>
          <view class="detail-row"><text class="label">总金额:</text><text class="value num">{{ formatNumber(totalAmount) }}</text></view>
          
          <view class="detail-row"><text class="label">是否结算:</text><text class="value">{{ sel.isPaid==1 ? '是' : '否' }}</text></view>
          <view class="detail-row"><text class="label">费用备注:</text><text class="value">{{ sel.feeRemarks || sel.feeRemarks || sel.fee_remark || '-' }}</text></view>
          <view class="detail-row"><text class="label">付款日期:</text><text class="value">{{ sel.paymentDate || sel.payment_date || sel.paidDate || sel.paid_date || '-' }}</text></view>
          
          <view v-if="itemImages.length" class="detail-row image-gallery-row">
            <text class="label">商品图片:</text>
            <view class="value">
              <view class="gallery-scroll">
                <view v-for="(img, idx) in itemImages" :key="img.id || idx" class="photo-item" @click.stop="previewImages(idx)">
                  <image :src="img.thumbnailUrl" mode="aspectFill"></image>
                  <text class="img-label">{{ mapImageLabel(img.typeCode) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

      <!-- Split overlay -->
      <view v-if="showSplit" class="more-overlay" @click.self="showSplit=false">
        <view class="more-drawer">
          <view class="drawer-header">
            <text class="drawer-title">拆分商品</text>
            <view class="close" @click="showSplit=false">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6 L18 18 M6 18 L18 6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            </view>
          </view>
          <view class="more-row split-row">
            <text class="label">当前数量</text>
            <text class="picker-value">{{ sel.qty ?? sel.quantity ?? '-' }}</text>
            <text class="label small">拆分数量</text>
            <input type="number" v-model.number="splitQty" placeholder="请输入拆分数量" />
          </view>
          <view class="more-actions">
            <button class="btn" @click="showSplit=false">取消</button>
            <button class="btn primary" @click="confirmSplit">确定</button>
          </view>
        </view>
      </view>

      <!-- More filters drawer -->
    <view v-if="showMore" class="more-overlay" @click.self="closeMore">
      <view class="more-drawer">
        <view class="drawer-header">
          <text class="drawer-title">更多筛选</text>
          <view class="close" @click="closeMore">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6 L18 18 M6 18 L18 6" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </view>
        </view>
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
            <view :class="['radio-item', filter_isPaid === 0 ? 'active' : '']" @click="filter_isPaid = 0">否</view>
            <view :class="['radio-item', filter_isPaid === 1 ? 'active' : '']" @click="filter_isPaid = 1">是</view>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">是否良品</text>
          <view class="radio-group">
            <view :class="['radio-item', filter_isGood === 0 ? 'active' : '']" @click="filter_isGood = 0">次品</view>
            <view :class="['radio-item', filter_isGood === 1 ? 'active' : '']" @click="filter_isGood = 1">良品</view>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">是否寄售</text>
          <view class="radio-group">
            <view :class="['radio-item', filter_isConsigned === 0 ? 'active' : '']" @click="filter_isConsigned = 0">否</view>
            <view :class="['radio-item', filter_isConsigned === 1 ? 'active' : '']" @click="filter_isConsigned = 1">是</view>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">需要测试</text>
          <view class="radio-group">
            <view :class="['radio-item', filter_needTest === 0 ? 'active' : '']" @click="filter_needTest = 0">否</view>
            <view :class="['radio-item', filter_needTest === 1 ? 'active' : '']" @click="filter_needTest = 1">是</view>
          </view>
        </view>

        <view class="more-row radio-row">
          <text class="label">需要维修</text>
          <view class="radio-group">
            <view :class="['radio-item', filter_needRepair === 0 ? 'active' : '']" @click="filter_needRepair = 0">否</view>
            <view :class="['radio-item', filter_needRepair === 1 ? 'active' : '']" @click="filter_needRepair = 1">是</view>
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
    <!-- Global image viewer mounted in App.vue will handle previews -->
  </view>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import ModalPicker from '@/components/ModalPicker.vue'
import { splitItem } from '@/utils/itemSplit'
import { ApiHelper } from '@/utils/apiHelper'
import { openImageViewer } from '@/stores/imageViewer'
import { useUserStore } from '@/stores/user'
import { smartBack } from '@/utils/navigation'

const props = defineProps({
  title: { type: String, default: '商品查询' },
  fixedParam: { type: String, default: 'ownerId' },
  otherPicker: { type: String, default: 'keeper' }, // 'keeper' or 'owner'
  inspect: { type: [Boolean, String], default: false },
  showInspectButton: { type: Boolean, default: true }
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
const showSplit = ref(false)
const splitQty = ref(1)
// when true the list was produced by the inspect action (keeperId + itemStatus=0)
const isInspectMode = ref(false)
// item images for detail drawer
const itemImages = ref([])
// when true we hide the drawer overlay so native preview isn't covered
const isPreviewing = ref(false)
// raw numeric refs populated when loading detail to avoid mapping issues
const rawInspectFee = ref(null)
const rawRepairFee = ref(null)
const rawKeepFee = ref(null)
const rawPackingFee = ref(null)
const rawOtherFee = ref(null)
const rawSalePrice = ref(null)
const rawCommissionSet = ref(null)
const rawIsConsigned = ref(null)
const rawCommissionModel = ref(null)

  // helper: safely parse numeric fields
  function toNum(v){
    if (v === null || typeof v === 'undefined' || v === '') return 0
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }

  function formatNumber(v){
    const n = toNum(v)
    return n.toFixed(2)
  }

  // compute fee components (support multiple possible backend keys)
  function pick(...keys){
    for (const k of keys){
      if (sel.value && typeof sel.value[k] !== 'undefined' && sel.value[k] !== null) return sel.value[k]
    }
    return null
  }

  const inspectionFee = computed(() => toNum(rawInspectFee.value != null ? rawInspectFee.value : pick('inspectFee','inspectionFee','inspection_fee','iqcFee','iqc_fee','inspection')))
  const repairFee = computed(() => toNum(rawRepairFee.value != null ? rawRepairFee.value : pick('repairFee','repair_fee','maintenanceFee','maintenance_fee','repair')))
  const storageFee = computed(() => toNum(rawKeepFee.value != null ? rawKeepFee.value : pick('keepFee','keep_fee','storageFee','storage_fee','keeperFee','keeper_fee','storage')))
  const packingFee = computed(() => toNum(rawPackingFee.value != null ? rawPackingFee.value : pick('packingFee','packing_fee','boxFee','box_fee','packing')))
  const otherFee = computed(() => toNum(rawOtherFee.value != null ? rawOtherFee.value : pick('otherFee','other_fee','miscFee','misc_fee','other')))

  const commissionModel = computed(() => Number(rawCommissionModel.value != null ? rawCommissionModel.value : (pick('commissionModel','commission_model','commissionmodel','commission_model') || 0)))
  const commissionSetting = computed(() => toNum(rawCommissionSet.value != null ? rawCommissionSet.value : pick('commissionSet','commissionSet','commission_setting','commissionSetting','commissionRate','commission_rate','commission') ))
  const dealPrice = computed(() => toNum(rawSalePrice.value != null ? rawSalePrice.value : pick('salePrice','sale_price','dealPrice','deal_price','成交价格')))

  const sumFees = computed(() => inspectionFee.value + repairFee.value + storageFee.value + packingFee.value + otherFee.value)

  const commissionFee = computed(() => {
    const isConsigned = Number(rawIsConsigned.value != null ? rawIsConsigned.value : (typeof sel.value.isConsigned !== 'undefined' && sel.value.isConsigned !== null ? sel.value.isConsigned : (pick('isConsigned','is_consigned','isConsign','is_consign') || 0)))
    if (isConsigned !== 1) return 0
    if (commissionModel.value === 1) {
      // percentage model
      const base = dealPrice.value - sumFees.value
      const amt = base > 0 ? (base * commissionSetting.value / 100) : 0
      return Math.max(0, Number(amt.toFixed(2)))
    }
    if (commissionModel.value === 2) {
      // fixed amount
      return Math.max(0, Number(commissionSetting.value.toFixed(2)))
    }
    return 0
  })

  const totalAmount = computed(() => {
    const isConsigned = Number(rawIsConsigned.value != null ? rawIsConsigned.value : (typeof sel.value.isConsigned !== 'undefined' && sel.value.isConsigned !== null ? sel.value.isConsigned : (pick('isConsigned','is_consigned','isConsign','is_consign') || 0)))
    if (isConsigned !== 1) {
      return Number(sumFees.value.toFixed(2))
    }
    // consigned
    const net = dealPrice.value - sumFees.value
    const total = net - commissionFee.value
    return Number(total.toFixed(2))
  })

  const totalPages = computed(() => Math.max(1, Math.ceil((total.value||0) / pageSize.value)))

  // show '加入包裹' when current user is the owner and item is in status 1 (已入库)
  const showAddParcel = computed(() => {
    try{
      const uid = getCurrentUserId()
      if (!uid) return false
      const ownerId = sel.value ? Number(sel.value.ownerId || sel.value.ownerId) : null
      const status = sel.value ? Number(sel.value.itemStatus || sel.value.itemStatus) : null
      return ownerId === uid && status === 1
    }catch(e){ return false }
  })

  const canSplit = computed(() => {
    try{
      const uid = getCurrentUserId()
      if (!uid) return false
      const ownerId = sel.value ? Number(sel.value.ownerId || sel.value.ownerId) : null
      const status = sel.value ? Number(sel.value.itemStatus || sel.value.itemStatus) : null
      const qty = Number(sel.value.qty ?? sel.value.quantity ?? 0)
      return ownerId === uid && status === 1 && qty > 1
    }catch(e){ return false }
  })

  function openSplit(){
    if (!canSplit.value) { uni.showToast({ title: '不可拆分', icon: 'none' }); return }
    splitQty.value = 1
    showSplit.value = true
  }

  async function confirmSplit(){
    const q = Number(splitQty.value)
    const qty = Number(sel.value.qty ?? sel.value.quantity ?? 0)
    if (!q || q < 1 || q >= qty) { uni.showToast({ title: '拆分数量应为正整数且小于当前数量', icon: 'none' }); return }
    try{
      await splitItem(sel.value.itemId, q)
      uni.showToast({ title: '拆分成功', icon: 'success' })
      showSplit.value = false
      // refresh list and detail
      page.value = 1
      doSearch()
      showDetail.value = false
    }catch(e){ console.error('split failed', e); uni.showToast({ title: e?.message || '拆分失败', icon: 'none' }) }
  }

  function addToParcel(){
    if (!sel.value || !sel.value.itemId) { uni.showToast({ title: '无可加入的商品', icon: 'none' }); return }
    try{ uni.navigateTo({ url: `/pages/parcel-add/create?itemId=${sel.value.itemId}` }) }catch(e){ uni.showToast({ title:'跳转失败', icon:'none' }) }
  }

  function openTransfer(){
    if (!sel.value || !sel.value.itemId) { uni.showToast({ title: '无可加入的商品', icon: 'none' }); return }
    const keeperName = sel.value.keeper || sel.value.keeperName || ''
    const keeperId = sel.value.keeperId || sel.value.keeperId || ''
    const url = `/pages/parcel-add/create?mode=transfer&packageType=2&senderReadonly=1&fromItemId=${sel.value.itemId}&keeperId=${keeperId}&keeperName=${encodeURIComponent(keeperName)}`
    try{ uni.navigateTo({ url }) } catch(e){ uni.showToast({ title:'跳转失败', icon:'none' }) }
  }

  function openUserSale(){
    if (!sel.value || !sel.value.itemId) { uni.showToast({ title: '无可发售的商品', icon: 'none' }); return }
    const keeperName = sel.value.keeper || sel.value.keeperName || ''
    const keeperId = sel.value.keeperId || sel.value.keeperId || ''
    const url = `/pages/parcel-add/create?mode=sale&packageType=3&senderReadonly=1&receiverManual=1&hideDemands=1&fromItemId=${sel.value.itemId}&keeperId=${keeperId}&keeperName=${encodeURIComponent(keeperName)}`
    try{ uni.navigateTo({ url }) } catch(e){ uni.showToast({ title:'跳转失败', icon:'none' }) }
  }

function goBack(){ smartBack() }

function mapItemStatus(s){
  const m = { 0: '检验中', 1: '已入库', 2: '已出库', 9: '异常' }
  return m[s] || '-'
}

function mapImageLabel(type){
  if (!type) return ''
  const t = String(type).toUpperCase()
  if (t === 'ITEM_IMAGE') return '验货'
  if (t === 'ITEM_TEST') return '测试'
  if (t === 'ITEM_REPAIR') return '维修'
  return ''
}

function previewImages(index){
  if (!Array.isArray(itemImages.value) || itemImages.value.length === 0) return
  const imgs = itemImages.value.map(i => i.imageUrl || i.fileUrl || '')
  openImageViewer(imgs, index || 0)
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
const filter_itemStatus = ref(1)
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
  // copy more-drawer filters into the main search inputs so params are included
  itemNo.value = filter_itemNo.value || ''
  sellerPart.value = filter_sellerPart.value || ''
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
const selectedStatusLabel = ref(statusLabels[1] || '已入库')
const selectedIsPaidLabel = ref('')
const selectedIsGoodLabel = ref('')
const selectedIsConsignedLabel = ref('')
const selectedNeedTestLabel = ref('')
const selectedNeedRepairLabel = ref('')

async function doSearch(){
  // normal search mode
  isInspectMode.value = false
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
    if (filter_receivePackageNo.value) params.receivePackageNo = filter_receivePackageNo.value
    if (filter_sendPackageNo.value) params.sendPackageNo = filter_sendPackageNo.value
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

async function doInspectSearch(){
  // force keeperId=current user and itemStatus=0
  loading.value = true
  isInspectMode.value = true
  rows.value = []
  try{
    const uid = getCurrentUserId()
    if (!uid){ uni.showToast({ title:'无法获取当前用户ID，无法查询', icon:'none' }); loading.value=false; return }
    const params = { page: 1, pageSize: pageSize.value, keeperId: uid, itemStatus: 0 }
    const res = await ApiHelper.get('/items', params)
    if (res && res.code === 1 && res.data){
      total.value = res.data.total || (res.data.rows ? res.data.rows.length : 0)
      rows.value = res.data.rows || []
      page.value = 1
    } else { uni.showToast({ title: (res && res.msg) || '查询失败', icon:'none' }) }
  }catch(e){ console.error('inspect search error', e); uni.showToast({ title:'网络错误', icon:'none' }) }
  finally{ loading.value = false }
}

function gotoPage(p){ if (p<1) p=1; if (p>totalPages.value) p=totalPages.value; page.value = p; doSearch() }

async function openDetail(row){
  // if we're in inspect mode, open item edit/inspection page instead of drawer
  if (isInspectMode.value) {
    try{
      const pkgNo = encodeURIComponent(row.receivePackageNo || row.receive_package_no || '')
      const ownerId = row.ownerId || row.ownerId || ''
      uni.navigateTo({ url: `/pages/parcel-add/item-entry?itemId=${row.itemId}&packageNo=${pkgNo}&ownerId=${ownerId}` })
      return
    }catch(e){ /* fallback to drawer if navigation fails */ }
  }
  showDetail.value = true
  try{
    const res = await ApiHelper.get(`/items/${row.itemId}`)
    if (res && res.code === 1) {
      let payload = res.data
      // normalize common wrappers
      if (payload && payload.item) payload = payload.item
      if (payload && Array.isArray(payload.rows) && payload.rows.length === 1) payload = payload.rows[0]
      // ensure we set a plain object for reactivity
      sel.value = (payload && typeof payload === 'object') ? { ...payload } : (row || {})
      // populate raw numeric refs directly from payload to avoid pick mismatches
      rawInspectFee.value = typeof payload.inspectFee !== 'undefined' ? payload.inspectFee : (typeof payload.inspect_fee !== 'undefined' ? payload.inspect_fee : null)
      rawRepairFee.value = typeof payload.repairFee !== 'undefined' ? payload.repairFee : (typeof payload.repair_fee !== 'undefined' ? payload.repair_fee : null)
      rawKeepFee.value = typeof payload.keepFee !== 'undefined' ? payload.keepFee : (typeof payload.keep_fee !== 'undefined' ? payload.keep_fee : null)
      rawPackingFee.value = typeof payload.packingFee !== 'undefined' ? payload.packingFee : (typeof payload.packing_fee !== 'undefined' ? payload.packing_fee : null)
      rawOtherFee.value = typeof payload.otherFee !== 'undefined' ? payload.otherFee : (typeof payload.other_fee !== 'undefined' ? payload.other_fee : null)
      rawSalePrice.value = typeof payload.salePrice !== 'undefined' ? payload.salePrice : (typeof payload.sale_price !== 'undefined' ? payload.sale_price : null)
      rawCommissionSet.value = typeof payload.commissionSet !== 'undefined' ? payload.commissionSet : (typeof payload.commission_set !== 'undefined' ? payload.commission_set : null)
      rawIsConsigned.value = typeof payload.isConsigned !== 'undefined' ? payload.isConsigned : (typeof payload.is_consigned !== 'undefined' ? payload.is_consigned : null)
      rawCommissionModel.value = typeof payload.commissionModel !== 'undefined' ? payload.commissionModel : (typeof payload.commission_model !== 'undefined' ? payload.commission_model : null)
      // debug logs removed
      // load item images (grouped)
      try{
        const imgRes = await ApiHelper.get('/image/manage/grouped', { moduleType: 'ITEM', recordId: sel.value.itemId || sel.value.id || row.itemId })
        if (imgRes && imgRes.code === 1 && imgRes.data){
          const host = ApiHelper.getHost()
          const keys = ['ITEM_IMAGE','ITEM_TEST','ITEM_REPAIR']
          const gathered = []
          for (const k of keys){
            const list = imgRes.data[k]
            if (Array.isArray(list)){
              for (const img of list){
                const imageUrl = img.imageUrl && String(img.imageUrl).startsWith('http') ? img.imageUrl : (host + (img.imageUrl || ''))
                const thumbnailUrl = img.thumbnailUrl && String(img.thumbnailUrl).startsWith('http') ? img.thumbnailUrl : (host + (img.thumbnailUrl || img.imageUrl || ''))
                gathered.push({ id: img.id, imageUrl, thumbnailUrl, typeCode: img.typeCode || img.type_code || k })
              }
            }
          }
          itemImages.value = gathered
        } else {
          itemImages.value = []
        }
      }catch(e){ console.warn('load item images failed', e); itemImages.value = [] }
    } else {
      sel.value = row || {}
    }
  }catch(e){ console.error('openDetail error', e); sel.value = row; uni.showToast({ title:'无法加载详情', icon:'none' }) }
}

function closeDetail(){ showDetail.value = false; sel.value = {}; itemImages.value = [] }

onMounted(() => {
  page.value = 1
  if (props.inspect) doInspectSearch()
  else doSearch()

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('focus', () => {
      page.value = 1
      if (props.inspect) doInspectSearch()
      else doSearch()
    })
  }
})
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
 .inspect-btn { width:60rpx; height:60rpx; display:flex; align-items:center; justify-content:center; border-radius:8rpx; margin-right:8rpx; background: linear-gradient(90deg,#409EFF,#66B1FF); border:none; box-shadow:0 6rpx 18rpx rgba(64,158,255,0.12) }
 .inspect-btn svg{ width:28rpx; height:28rpx }
.result-list{ flex:1; padding:20rpx }
.row-card{ background:#fff; padding:12rpx; border-radius:8rpx; margin-bottom:12rpx; display:flex; flex-direction:column }
  .row-top{ display:flex; gap:12rpx; align-items:center; margin-bottom:6rpx }
  .row-bottom{ display:flex; gap:12rpx; align-items:center }
  .row-top text, .row-bottom text { font-size:10px; color:#333 }

  /* Column layout: col1 flexible, col2 120, col3 110, col4 80 */
  .top-itemno{ width:200px; color:#409EFF }
  .bottom-name{ width:200px; color:#333 }

  .top-dict{ width:120px; color:#666; text-align:left }
  .bottom-isgood{ width:120px; text-align:left }

  .top-qty{ width:110px; color:#666; display:flex; align-items:center; gap:6rpx; justify-content:flex-start }
  .bottom-owner{ width:110px; color:#666; text-align:left }
  .qty-label{ color:#666; font-size:10px; margin-right:6rpx }
  .qty-val{ font-weight:400 }

  .top-status{ width:80px; color:#666; text-align:left }
  .bottom-keeper{ width:80px; color:#666; text-align:left }
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
.drawer-header .close{ width:52rpx; height:52rpx; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#f5f5f5; cursor:pointer }
.drawer-header .close svg{ width:26rpx; height:26rpx }
.drawer-actions{ display:flex; align-items:center; gap:24rpx }
.header-btn{ padding:8rpx 14rpx; height:56rpx; min-width:120rpx; display:flex; align-items:center; justify-content:center; background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff; border:none; border-radius:8rpx; box-shadow: 0 6rpx 18rpx rgba(64,158,255,0.12); font-size:22rpx }
.action-group{ display:flex; gap:12rpx; align-items:center }
.detail-row{ display:flex; gap:12rpx; padding:12rpx 0; border-bottom:1rpx solid #f0f0f0 }
.detail-row .label{ width:160rpx; color:#666 }
.detail-row .value{ flex:1; color:#333 }
.detail-row .value.bad{ color:#FF4D4F }
.detail-row .value.num{ text-align:right }

.more-overlay{ position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.35); display:flex; align-items:flex-end; justify-content:center; z-index:2000 }
  .more-drawer{ width:100%; background:#fff; border-top-left-radius:16rpx; border-top-right-radius:16rpx; padding:20rpx }
  .more-drawer .drawer-header{ display:flex; justify-content:space-between; align-items:center; padding-bottom:12rpx }
  .more-drawer .drawer-title{ font-size:26rpx; font-weight:700 }
  .more-drawer .close{ width:44rpx; height:44rpx; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#f5f5f5; cursor:pointer }
  .more-drawer .close svg{ width:22rpx; height:22rpx }
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
.radio-item{ display:flex; align-items:center; gap:12rpx; color:#333; font-size:20rpx; padding:8rpx 12rpx; min-width:120rpx; border-radius:10rpx; border:1rpx solid #ececec; cursor:pointer; background:#fff }
.radio-item radio{ width:44rpx; height:44rpx }
.radio-item.active{ background:#409EFF; color:#fff; border-color:#409EFF }

/* split overlay alignment */
.split-row{ display:flex; align-items:center; gap:12rpx }
.split-row .label{ width:140rpx }
.split-row .label.small{ width:120rpx; text-align:left }
.split-row .picker-value{ width:110rpx; text-align:right; font-size:22rpx }
.split-row input{ width:140rpx; text-align:right; font-size:26rpx; padding:8rpx 12rpx; border-radius:8rpx; border:1rpx solid #ececec }

/* image gallery in detail drawer */
.image-gallery-row .gallery-scroll{ display:flex; gap:12rpx; overflow:auto; padding:8rpx 0 }
.photo-item{ width:140rpx; height:140rpx; border-radius:8rpx; overflow:hidden; position:relative; background:#f5f5f5; flex:0 0 auto }
.photo-item image{ width:100%; height:100%; display:block }
.photo-item .img-label{ position:absolute; left:8rpx; bottom:6rpx; padding:4rpx 8rpx; background:rgba(0,0,0,0.45); color:#fff; border-radius:6rpx; font-size:20rpx }
/* while native preview is open, hide drawer overlay so preview isn't covered */
.drawer-overlay.previewing{ opacity:0; pointer-events:none }

/* in-app image viewer styles */
.image-viewer-overlay{ position:fixed; left:0; right:0; top:0; bottom:0; background:#000; z-index:99999; display:flex; align-items:center; justify-content:center }
.viewer-swiper{ width:100%; height:100% }
.viewer-item{ display:flex; align-items:center; justify-content:center; height:100% }
.viewer-image{ width:100%; height:100% }
.viewer-close{ position:absolute; top:28rpx; right:24rpx; width:88rpx; height:88rpx; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); border-radius:44rpx; box-shadow:0 6rpx 18rpx rgba(0,0,0,0.4) }
.viewer-close-icon{ width:40rpx; height:40rpx }
.blocked{ pointer-events:none }
</style>