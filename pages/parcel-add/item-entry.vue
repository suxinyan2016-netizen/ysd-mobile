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
        <view class="title">商品录入</view>
      </view>

      <scroll-view class="step-content" scroll-y>
      <view class="info-card">
        <text class="card-title">商品信息</text>
        <view class="info-row">
          <text class="label">运单号:</text>
          <text class="value">{{ packageNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">商品号:</text>
          <input class="form-input" v-model="item.itemNo" placeholder="请输入商品号" />
        </view>
        <view class="info-row">
          <text class="label">商品名:</text>
          <input class="form-input" v-model="item.sellerPart" placeholder="请输入商品名" />
        </view>

        <!-- 新增行: 类别(下拉) -->
        <view class="info-row">
          <text class="label">类别:</text>
          <view class="form-input picker-display editable" @click="openModal('dict', dictOptions.map(d=>d.dictName), '选择类别')">{{ selectedDictName }}</view>
        </view>

        <!-- 单独一行: Qty -->
        <view class="info-row">
          <text class="label">Qty:</text>
          <input class="form-input" type="number" v-model.number="item.qty" placeholder="数量" min="1" step="1" />
        </view>

        <!-- 新增行: 是否良品 -->
        <view class="info-row">
          <text class="label">是否良品:</text>
          <view class="radio-group">
            <view :class="['radio-item', item.isGood === 1 ? 'active' : '']" @click="item.isGood = 1">良品</view>
            <view :class="['radio-item', item.isGood === 0 ? 'active' : '']" @click="item.isGood = 0">次品</view>
          </view>
        </view>

        <!-- 新增行: 是否拆分 -->
        <view class="info-row">
          <text class="label">是否拆封:</text>
          <view class="radio-group">
            <view :class="['radio-item', item.isUnpacked === 0 ? 'active' : '']" @click="item.isUnpacked = 0">未拆封</view>
            <view :class="['radio-item', item.isUnpacked === 1 ? 'active' : '']" @click="item.isUnpacked = 1">已拆封</view>
          </view>
        </view>

        <!-- 新增行: 验货结果 -->
        <view class="info-row">
          <text class="label">验货结果:</text>
          <input class="form-input" v-model="item.iqcResult" placeholder="请输入验货结果" />
        </view>
      </view>

      <view class="section">
        <text class="section-title">商品图片</text>
        <view class="photo-list">
          <view v-for="(img, index) in itemImages" :key="index" class="photo-item" @click="previewImageFull(img.imageUrl)">
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removeImage(index)">✕</view>
          </view>
          <view v-if="canAddMore" class="add-photo" @click="chooseImage">
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>

      <view class="action-btns">
        <button v-if="showStepButtons" class="btn btn-default" @click="goBack">上一步</button>
        <button class="btn btn-save" :disabled="isSaving" @click="handleSave">保存</button>
        <button v-if="!showStepButtons" class="btn btn-warning" :disabled="isSaving" @click="handleSubmitFromService">提交</button>
        <button v-if="showStepButtons" class="btn btn-primary" :disabled="isSaving" @click="handleNext">下一步</button>
      </view>
      <!-- reusable modal component -->
      <ModalPicker v-if="showModal" :show="showModal" :title="modalTitle" :list="modalList" @select="selectModal" @close="closeModal" />
    </scroll-view>
  </view>
</template>

<script setup>
import ModalPicker from '@/components/ModalPicker.vue'
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
let route, router
try {
  const { useRoute, useRouter } = require('vue-router')
  route = useRoute()
  router = useRouter()
} catch (err) {
  const pages = (typeof getCurrentPages === 'function') ? getCurrentPages() : []
  const current = pages[pages.length - 1] || {}
  const opts = current.options || {}
  route = { query: opts, params: opts }
  router = {
    push: (to) => { try { if (typeof to === 'string') return uni.navigateTo({ url: to }); const url = to.path || to.url || to; return uni.navigateTo({ url }) } catch (e) { console.warn(e) } },
    replace: (to) => { try { if (typeof to === 'string') return uni.redirectTo({ url: to }); const url = to.path || to.url || to; return uni.redirectTo({ url }) } catch (e) { console.warn(e) } },
    back: () => uni.navigateBack()
  }
}
import { ApiHelper } from '@/utils/apiHelper'
import { uploadFile, reassignAttachments } from '@/utils/uploadHelper'
import { useUserStore } from '@/stores/user'
import { smartBack } from '@/utils/navigation'
const userStore = useUserStore()

const parcelId = ref((route && route.query && route.query.parcelId) || (route && route.params && route.params.parcelId) || '')
const packageNo = ref((route && route.query && route.query.packageNo) || (route && route.params && route.params.packageNo) || '')
const ownerIdFromRoute = ref((route && route.query && route.query.ownerId) || (route && route.params && route.params.ownerId) || null)

const item = ref({ itemNo: '', sellerPart: '', tempKey: '', receiveParcelId: parcelId.value || null, receivePackageNo: packageNo.value || '', dictId: null, qty: 1, isUnpacked: 0, isGood: 1, iqcResult: '', testDemands: '', testProcedure: '', testResult: '', repairDemands: '', repairProcedure: '', repairResult: '' })
const itemImages = ref([])
const isSaving = ref(false)
const dictOptions = ref([])
const showStepButtons = ref(true)

const canAddMore = computed(() => itemImages.value.length < 6)
const dictIndex = ref(0)
const selectedDictName = computed(() => { if (!dictOptions.value || !dictOptions.value.length) return ''; const idx = dictIndex.value || 0; const d = dictOptions.value[idx]; return d ? d.dictName : '' })

function onDictChange(e) { const idx = e && e.detail && typeof e.detail.value !== 'undefined' ? Number(e.detail.value) : 0; dictIndex.value = idx; const sel = dictOptions.value[idx]; item.value.dictId = sel ? sel.dictId : null }

// modal picker state for unified modal
const showModal = ref(false)
const modalList = ref([])
const modalTitle = ref('')
const modalField = ref('')

function openModal(field, list, title) {
  modalField.value = field
  modalList.value = Array.isArray(list) ? list : []
  modalTitle.value = title || ''
  showModal.value = true
}

function closeModal() { showModal.value = false }

function selectModal(idx) {
  if (modalField.value === 'dict') {
    dictIndex.value = idx
    const sel = dictOptions.value[idx]
    item.value.dictId = sel ? sel.dictId : null
  }
  showModal.value = false
}

function goBack() { smartBack() }

function previewImageFull(imageUrl) { if (!imageUrl) return; const host = ApiHelper.getHost(); const fullUrl = imageUrl.startsWith('http') ? imageUrl : (host + imageUrl); uni.previewImage({ urls: [fullUrl], current: fullUrl }) }

async function loadDicts() {
  try {
    const res = await ApiHelper.get('/dicts')
    if (res && res.code === 1 && Array.isArray(res.data)) {
      dictOptions.value = res.data.filter(d => String(d.dictGroup) === '2' && (d.isValid === 1 || d.isValid === '1'))
      // if an item dictId is already present, set dictIndex so selectedDictName shows
      if (item.value && item.value.dictId) {
        const idx = dictOptions.value.findIndex(d => (d.dictId == item.value.dictId) || (d.id == item.value.dictId))
        if (idx >= 0) dictIndex.value = idx
      }
    }
  } catch (err) {
    console.warn('loadDicts failed', err)
  }
}

const recordedItemIds = ref([])
async function chooseImage() { if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random() * 1000000); uni.chooseImage({ count: 6 - itemImages.value.length, sizeType: ['compressed'], sourceType: ['camera','album'], success: async (res) => { for (const fp of res.tempFilePaths) { itemImages.value.push({ imageUrl: fp, thumbnailUrl: fp, uploaded: false, uploading: false }) } }}) }

async function removeImage(index) { const img = itemImages.value[index]; if (img.id && img.uploaded) { try { await ApiHelper.deleteImage(img.id) } catch(e) { console.warn(e) } } itemImages.value.splice(index,1) }

async function uploadImage(filePath, recordId, tempKey, imageType = 'ITEM_IMAGE') {
  try {
    const data = await uploadFile(filePath, 'ITEM', (typeof recordId !== 'undefined' && recordId !== null) ? recordId : -1, imageType, tempKey)
    return data
  } catch (err) {
    throw err
  }
}

async function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '保存中...' })
  try {
    if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random()*10000)
    const payload = {
      itemNo: item.value.itemNo,
      sellerPart: item.value.sellerPart,
      itemStatus: 0,
      dictId: item.value.dictId || null,
      qty: parseInt(item.value.qty, 10) || 1,
      isUnpacked: item.value.isUnpacked == null ? 0 : item.value.isUnpacked,
      iqcResult: item.value.iqcResult || null,
      receiveParcelId: item.value.receiveParcelId,
      receivePackageNo: item.value.receivePackageNo,
      isGood: (typeof item.value.isGood === 'undefined' || item.value.isGood === null) ? 1 : Number(item.value.isGood),
      tempKey: item.value.tempKey,
      createBy: userStore.userInfo?.name,
      receivedDate: new Date().toISOString().split('T')[0],
      keeperId: userStore.userInfo?.id || (function(){ try { const s = uni.getStorageSync('loginUser'); return s? JSON.parse(s).id:null } catch(e){return null} })(),
      ownerId: ownerIdFromRoute ? Number(ownerIdFromRoute) : (item.value.ownerId || null),
      ispaid: 0,
      isconsigned: 0
    }

    let itemId = item.value.itemId || null
    const fromService = (showStepButtons.value === false)
    let res
    // prefer update when editing from service or when itemId exists
    if (itemId || fromService) {
      // if no numeric id but fromService, try tempKey lookup
      if (!itemId && item.value.tempKey) {
        try {
          const q = await ApiHelper.get('/items', { tempKey: item.value.tempKey, receiveParcelId: item.value.receiveParcelId, createBy: userStore.userInfo?.name || userStore.userInfo?.id, pageSize: 1 })
          if (q && q.code === 1 && q.data && Array.isArray(q.data.rows) && q.data.rows.length) {
            const found = q.data.rows[0]
            itemId = found.itemId || found.id || null
          }
        } catch (err) { console.warn('query by tempKey failed', err) }
      }
      if (itemId) { res = await ApiHelper.put('/items', { ...payload, itemId }) }
    }
    if (!res) { res = await ApiHelper.post('/items', payload) }
    if (!(res && res.code === 1)) throw new Error(res?.msg || '保存item失败')

    if (!itemId) {
      const created = res.data
      itemId = (created && (created.itemId || created.id)) || null
      if (!itemId && item.value.tempKey) {
        try {
          const q = await ApiHelper.get('/items', { tempKey: item.value.tempKey, receiveParcelId: item.value.receiveParcelId, createBy: userStore.userInfo?.name || userStore.userInfo?.id, pageSize: 1 })
          if (q && q.code === 1 && q.data && Array.isArray(q.data.rows) && q.data.rows.length) { const found = q.data.rows[0]; itemId = found.itemId || found.id || null }
        } catch (err) { console.warn('query by tempKey failed', err) }
      }
    }

    let recordIdForUpload = null
    if (itemId) { item.value.itemId = Number(itemId); recordIdForUpload = Number(itemId) }

    // upload images: prefer numeric recordId but always include tempKey so backend can associate
    const uploadRecordId = recordIdForUpload || -1
    for (const img of itemImages.value) {
      if (!img.uploaded && img.imageUrl) {
        try {
          const u = await uploadImage(img.imageUrl, uploadRecordId, item.value.tempKey)
          img.id = u.id
          const host = ApiHelper.getHost()
          img.imageUrl = u.imageUrl && u.imageUrl.startsWith('http') ? u.imageUrl : (host + (u.imageUrl || ''))
          img.thumbnailUrl = u.thumbnailUrl && u.thumbnailUrl.startsWith('http') ? u.thumbnailUrl : (host + (u.thumbnailUrl || u.imageUrl || ''))
          img.uploaded = true
        } catch (upErr) {
          console.warn('图片上传失败', upErr)
        }
      }
    }

    // best-effort: attempt to reassign attachments from tempKey to created itemId
    if (itemId && item.value.tempKey) {
      try {
        await reassignAttachments('ITEM', item.value.tempKey, itemId)
      } catch (bindErr) {
        console.warn('reassign attachments by tempKey failed (non-fatal)', bindErr)
      }
      // Note: backend may not provide /image/manage/reassign; helper already skips in that case.
    }

    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    return itemId
  } catch(e) { console.error('保存item失败', e); uni.hideLoading(); uni.showToast({ title: '保存失败: ' + (e?.message || ''), icon: 'none' }); return null } finally { isSaving.value = false }
}

// when opened from ItemService, provide a submit action that saves then sets itemStatus=1
async function handleSubmitFromService() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '提交中...' })
  try {
    let itemId = await handleSave()
    // if save returned null but item already has an id (editing existing), continue
    if (!itemId) itemId = item.value.itemId || null
    if (!itemId) throw new Error('无法获取 itemId，保存失败')
    // depending on mode, set flags
    const mode = (route && route.query && route.query.mode) || (route && route.params && route.params.mode) || ''
    let res
    if (mode === 'test') {
      res = await ApiHelper.put('/items', { itemId: itemId, isTested: 1 })
    } else if (mode === 'repair') {
      res = await ApiHelper.put('/items', { itemId: itemId, isRepaired: 1 })
    } else {
      res = await ApiHelper.put('/items', { itemId: itemId, itemStatus: 1 })
    }
    if (!(res && res.code === 1)) throw new Error(res?.msg || '设置状态失败')
    uni.hideLoading()
    uni.showToast({ title: '提交成功', icon: 'success' })
    // set refresh flag so service list knows to reload
    try { uni.setStorageSync && uni.setStorageSync('itemServiceRefresh', Date.now()) } catch(e){}
    // try to call previous page's load() directly (H5 navigateBack may not trigger focus)
    try{
      if (typeof getCurrentPages === 'function'){
        const pages = getCurrentPages() || []
        const prev = pages[pages.length-2]
        if (prev) {
          // Vue page instance on H5 is available as $vm
          const vm = prev.$vm || prev.page || null
          if (vm) {
            try{
              if (vm.$refs && vm.$refs.svc && typeof vm.$refs.svc.load === 'function') vm.$refs.svc.load()
              else if (typeof vm.load === 'function') vm.load()
            }catch(e){ console.warn('call prev.load failed', e) }
          }
        }
      }
    }catch(e){ console.warn('notify previous page failed', e) }

    // navigate back to list
    setTimeout(() => { try { uni.navigateBack() } catch(e) { console.warn('navigateBack failed', e) } }, 600)
  } catch (e) {
    console.error('handleSubmitFromService failed', e)
    uni.hideLoading()
    uni.showToast({ title: '提交失败: ' + (e?.message || ''), icon: 'none' })
  } finally { isSaving.value = false }
}

function handleNext() {
  item.value.itemNo = ''
  item.value.sellerPart = ''
  item.value.qty = 1
  item.value.isGood = 1
  item.value.isUnpacked = 0
  item.value.iqcResult = ''
  item.value.dictId = null
  dictIndex.value = 0
  item.value.itemId = null
  item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random() * 10000)
  itemImages.value = []
  uni.showToast({ title: '可以录入下一个商品', icon: 'success' })
}

async function handleSubmit() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '提交中...' })
  try {
    await handleSave()
    await ApiHelper.post('/parcels', { parcelId: parcelId.value, status: 2 })
    uni.hideLoading()
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(async () => {
      try { await uni.switchTab({ url: '/pages/parcel-incoming/index' }) } catch (navErr) { console.warn('switchTab failed, fallback to router:', navErr); try { router.push({ path: '/pages/parcel-incoming/index' }) } catch(e) { console.warn(e) } }
    }, 600)
  } catch(e) { console.error('提交失败', e); uni.hideLoading(); uni.showToast({ title: '提交失败: ' + (e?.message || ''), icon: 'none' }) } finally { isSaving.value = false }
}

onMounted(async () => {
  loadDicts()
  try {
    if (typeof getCurrentPages === 'function') {
      const pages = getCurrentPages() || []
      const current = pages[pages.length - 1] || {}
      const opts = current.options || {}
      if (opts.parcelId) parcelId.value = opts.parcelId
      if (opts.packageNo) { try { packageNo.value = decodeURIComponent(opts.packageNo) } catch(e) { packageNo.value = opts.packageNo } }
      if (opts.ownerId) ownerIdFromRoute.value = opts.ownerId
      item.value.receiveParcelId = parcelId.value || item.value.receiveParcelId
      item.value.receivePackageNo = packageNo.value || item.value.receivePackageNo
        // hide step buttons when navigated from ItemService (fromService=1)
        if (opts.fromService === '1' || opts.fromService === 'true' || opts.fromService === 1) {
          showStepButtons.value = false
        }
      if (opts.itemId) {
        try { await loadExistingItem(opts.itemId) } catch(e) { console.warn('loadExistingItem failed in onMounted', e) }
      }
    }
  } catch (e) { console.warn('populate route params failed', e) }
  try {
    if (!parcelId.value || !packageNo.value) {
      const stored = uni.getStorageSync && uni.getStorageSync('parcelTransfer')
      if (stored) {
        const data = (typeof stored === 'string') ? (function(){ try { return JSON.parse(stored) } catch(e){ return null } })() : stored
        if (data && (data.parcelId || data.packageNo)) {
          if (data.parcelId) parcelId.value = data.parcelId
          if (data.packageNo) { try { packageNo.value = decodeURIComponent(data.packageNo) } catch(e) { packageNo.value = data.packageNo } }
          if (data.ownerId) ownerIdFromRoute.value = data.ownerId
          item.value.receiveParcelId = parcelId.value || item.value.receiveParcelId
          item.value.receivePackageNo = packageNo.value || item.value.receivePackageNo
          try { uni.removeStorageSync && uni.removeStorageSync('parcelTransfer') } catch(e){}
        }
      }
    }
  } catch(e) { console.warn('storage fallback for parcelTransfer failed', e) }
  if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random() * 1000000)
})

// if opened for editing an existing item, load item data and images
async function loadExistingItem(itemId) {
  if (!itemId) return
  try {
    const res = await ApiHelper.get(`/items/${itemId}`)
    if (res && res.code === 1 && res.data) {
      let payload = res.data
      if (payload && payload.item) payload = payload.item
      // normalize
      const data = Array.isArray(payload) && payload.length ? payload[0] : payload
      if (!data) return
      item.value.itemId = data.itemId || data.id || itemId
      item.value.itemNo = data.itemNo || data.sku || data.code || item.value.itemNo
      item.value.sellerPart = data.sellerPart || data.mfrPart || data.name || item.value.sellerPart
      item.value.dictId = data.dictId || data.dict_id || item.value.dictId
      item.value.qty = data.qty ?? data.quantity ?? item.value.qty
      item.value.isGood = typeof data.isGood !== 'undefined' ? data.isGood : (data.is_good ?? item.value.isGood)
      item.value.isUnpacked = typeof data.isUnpacked !== 'undefined' ? data.isUnpacked : (data.is_unpacked ?? item.value.isUnpacked)
      item.value.iqcResult = data.iqcResult || data.iqc_result || item.value.iqcResult
      item.value.receiveParcelId = data.receiveParcelId || data.receive_parcel_id || item.value.receiveParcelId
      item.value.receivePackageNo = data.receivePackageNo || data.receive_package_no || item.value.receivePackageNo
      // show receivePackageNo in top-level packageNo display
      try { packageNo.value = item.value.receivePackageNo || packageNo.value } catch(e){}
      // set dictIndex for selected dict name if dictOptions already loaded
      try { if (item.value.dictId && Array.isArray(dictOptions.value) && dictOptions.value.length) { const idx = dictOptions.value.findIndex(d => (d.dictId == item.value.dictId) || (d.id == item.value.dictId)); if (idx >= 0) dictIndex.value = idx } } catch(e){}
      // load images
      try{
        const imgRes = await ApiHelper.get('/image/manage/grouped', { moduleType: 'ITEM', recordId: item.value.itemId })
        if (imgRes && imgRes.code === 1 && imgRes.data && Array.isArray(imgRes.data.ITEM_IMAGE)){
          const host = ApiHelper.getHost()
          itemImages.value = imgRes.data.ITEM_IMAGE.map(img => ({ id: img.id, imageUrl: img.imageUrl && img.imageUrl.startsWith('http') ? img.imageUrl : (host + (img.imageUrl || '')), thumbnailUrl: img.thumbnailUrl && img.thumbnailUrl.startsWith('http') ? img.thumbnailUrl : (host + (img.thumbnailUrl || img.imageUrl || '')), uploaded: true }))
        }
      }catch(e){ console.warn('load item images failed', e) }
    }
  } catch (e) { console.warn('loadExistingItem failed', e) }
}

</script>

<style lang="scss" scoped>
/* styles aligned with pages/parcel-add/create.vue */
.page-container { height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:68rpx }
.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title { color:#fff; font-size:34rpx; font-weight:700 }
.topbar .back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%); z-index:1001; }
.topbar .back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18); cursor:pointer }
.topbar .back-icon svg { width:32rpx; height:32rpx }
.step-content { flex:1; padding:20rpx; padding-bottom:20rpx }
.info-card { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.card-title { display:block; font-size:30rpx; font-weight:700; color:#333; margin-bottom:12rpx }
.info-row { display:flex; justify-content:flex-start; align-items:center; gap:12rpx; padding:9rpx 0; border-bottom:none; font-size:24rpx }
.info-row:last-child { padding-bottom:0 }
.label { width:160rpx; color:#666; margin-right:12rpx; text-align:left; font-size:22rpx }
.form-input { width:100%; flex:1; height:70rpx; border:none; border-bottom:1rpx solid #e6e6e6; border-radius:0; padding:0 8rpx; font-size:22rpx }
.radio-group { display:flex; gap:20rpx }
.radio-item { padding:10rpx 20rpx; border:1rpx solid #ddd; border-radius:20rpx; color:#666; cursor:pointer; background:#fff }
.radio-item.active { background:#409EFF; color:#fff; border-color:#409EFF }
.photo-list { display:flex; flex-wrap:wrap; gap:20rpx }
.photo-item { width:200rpx; height:200rpx; border-radius:12rpx; position:relative; overflow:hidden }
.photo-item image{ width:100%; height:100% }
.delete-btn { position:absolute; top:-8rpx; right:-8rpx; width:38rpx; height:38rpx; background:#ff4d4f; color:#fff; border-radius:50%; text-align:center; line-height:38rpx; font-size:24rpx; z-index:10 }
.add-photo { width:200rpx; height:200rpx; border:2rpx dashed #ddd; border-radius:12rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#999 }
.action-btns { display:flex; gap:20rpx; padding:20rpx 0 0 0; margin-top:20rpx }
.action-btns .btn { flex:1; height:60rpx; line-height:60rpx; font-size:26rpx; border-radius:8rpx; border:none; padding:0 40rpx }
.btn-default { background:#fff; border:1rpx solid #ddd; color:#666 }
.btn-primary { background:#409EFF; color:#fff }
.btn-submit { background:#67C23A; color:#fff }
.btn-warning { background: #E6A23C; color: #fff }
/* modal styles (shared with other pages) */
/* modal styles moved to components/ModalPicker.vue */
</style>
