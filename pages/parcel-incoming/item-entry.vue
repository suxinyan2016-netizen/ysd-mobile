<template>
  <view class="page-container">
    <view class="step-indicator">商品/内件信息</view>

    <scroll-view class="step-content" scroll-y>
      <view class="info-card">
        <view class="info-row">
          <text class="label">包裹号:</text>
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
          <picker mode="selector" :range="dictOptions.map(d=>d.dictName)" :value="dictIndex" @change="onDictChange">
            <view class="form-input picker-display">{{ selectedDictName }}</view>
          </picker>
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
        <button class="btn btn-default" @click="goBack">上一步</button>
        <button class="btn btn-save" :disabled="isSaving" @click="handleSave">保存</button>
        <button class="btn btn-submit" :disabled="isSaving" @click="handleSubmit">提交</button>
        <button class="btn btn-primary" :disabled="isSaving" @click="handleNext">下一步</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from 'vue'
let route, router
try {
  // try to use vue-router injections when available
  // (works in H5 dev server). In some native runtimes injections may not be provided.
  // import is kept below to allow bundlers tree-shake; we call functions dynamically.
  // eslint-disable-next-line node/no-missing-import
  const { useRoute, useRouter } = require('vue-router')
  route = useRoute()
  router = useRouter()
} catch (err) {
  // fallback for uni-app native runtimes (HBuilder Android base)
  const pages = (typeof getCurrentPages === 'function') ? getCurrentPages() : []
  const current = pages[pages.length - 1] || {}
  const opts = current.options || {}
  route = { query: opts, params: opts }
  router = {
    push: (to) => {
      try {
        if (typeof to === 'string') return uni.navigateTo({ url: to })
        const url = to.path || to.url || to
        return uni.navigateTo({ url })
      } catch (e) { console.warn(e) }
    },
    replace: (to) => {
      try {
        if (typeof to === 'string') return uni.redirectTo({ url: to })
        const url = to.path || to.url || to
        return uni.redirectTo({ url })
      } catch (e) { console.warn(e) }
    },
    back: () => uni.navigateBack()
  }
}
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()

// make route params reactive — in some native runtimes route/options are only populated
const parcelId = ref((route && route.query && route.query.parcelId) || (route && route.params && route.params.parcelId) || '')
const packageNo = ref((route && route.query && route.query.packageNo) || (route && route.params && route.params.packageNo) || '')
// ownerId passed from the parcel create page (货主选择)，fallback null
const ownerIdFromRoute = ref((route && route.query && route.query.ownerId) || (route && route.params && route.params.ownerId) || null)

const item = ref({ itemNo: '', sellerPart: '', tempKey: '', receiveParcelId: parcelId.value || null, receivePackageNo: packageNo.value || '', dictId: null, qty: 1, isUnpacked: 0, isGood: 1, iqcResult: '' })
const itemImages = ref([])
const isSaving = ref(false)
const dictOptions = ref([])

const canAddMore = computed(() => itemImages.value.length < 6)
const dictIndex = ref(0)
const selectedDictName = computed(() => {
  if (!dictOptions.value || !dictOptions.value.length) return ''
  const idx = dictIndex.value || 0
  const d = dictOptions.value[idx]
  return d ? d.dictName : ''
})

function onDictChange(e) {
  const idx = e && e.detail && typeof e.detail.value !== 'undefined' ? Number(e.detail.value) : 0
  dictIndex.value = idx
  const sel = dictOptions.value[idx]
  item.value.dictId = sel ? sel.dictId : null
}

function goBack() { router.back() }

function previewImageFull(imageUrl) {
  if (!imageUrl) return
  const host = ApiHelper.getHost()
  const fullUrl = imageUrl.startsWith('http') ? imageUrl : (host + imageUrl)
  uni.previewImage({ urls: [fullUrl], current: fullUrl })
}

async function loadDicts() {
  try {
    const res = await ApiHelper.get('/dicts')
    if (res && res.code === 1 && Array.isArray(res.data)) {
      // filter dictGroup == 2 and isValid == 1
      dictOptions.value = res.data.filter(d => String(d.dictGroup) === '2' && (d.isValid === 1 || d.isValid === '1'))
    }
  } catch (err) {
    console.warn('loadDicts failed', err)
  }
}

      const recordedItemIds = ref([]) // store itemIds recorded when navigating between items so they can be updated on submit
async function chooseImage() {
  // ensure a tempKey exists before selecting images so any server-side fallback matching can use it
  if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random() * 1000000)
  uni.chooseImage({ count: 6 - itemImages.value.length, sizeType: ['compressed'], sourceType: ['camera','album'], success: async (res) => {
    for (const fp of res.tempFilePaths) {
      itemImages.value.push({ imageUrl: fp, thumbnailUrl: fp, uploaded: false, uploading: false })
    }
  }})
}

async function removeImage(index) {
  const img = itemImages.value[index]
  if (img.id && img.uploaded) {
    try { await ApiHelper.deleteImage(img.id) } catch(e) { console.warn(e) }
  }
  itemImages.value.splice(index,1)
}

async function uploadImage(filePath, recordId) {
  return new Promise((resolve, reject) => {
    const uploadUrl = ApiHelper.baseUrl + '/image/manage/upload'
    // include username header required by backend
    const username = userStore.userInfo?.name || (function(){ try { const s = uni.getStorageSync('loginUser'); return s? JSON.parse(s).name:null } catch(e){return null} })()
    const headers = ApiHelper.getAuthHeaders(username ? { username } : {})
    uni.uploadFile({ url: uploadUrl, filePath, name: 'file', header: headers, formData: { moduleType: 'ITEM', recordId: recordId, imageType: 'ITEM_IMAGE' }, success: (res) => {
      try { const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data; if (data && data.code === 1) resolve(data.data); else reject(new Error(data?.msg || '上传失败')) } catch(err){ reject(err) }
    }, fail: (err) => reject(err) })
  })
}

async function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '保存中...' })
  try {
    // ensure tempKey for associating images if backend doesn't return id
    if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random()*10000)

    // prepare payload matching backend Item POJO
    const payload = {
      itemNo: item.value.itemNo,
      sellerPart: item.value.sellerPart,
      // saved items should be marked as entered (1)
      itemStatus: 1,
      // additional fields
      dictId: item.value.dictId || null,
      qty: parseInt(item.value.qty, 10) || 1,
      isUnpacked: item.value.isUnpacked == null ? 0 : item.value.isUnpacked,
      iqcResult: item.value.iqcResult || null,
      receiveParcelId: item.value.receiveParcelId,
      receivePackageNo: item.value.receivePackageNo,
      isGood: (typeof item.value.isGood === 'undefined' || item.value.isGood === null) ? 1 : Number(item.value.isGood),
      tempKey: item.value.tempKey,
      createBy: userStore.userInfo?.name,
      // new fields required: receivedDate (current date), keeperId (current user id), ownerId (from first page), ispaid, isconsigned
      receivedDate: new Date().toISOString().split('T')[0],
      keeperId: userStore.userInfo?.id || (function(){ try { const s = uni.getStorageSync('loginUser'); return s? JSON.parse(s).id:null } catch(e){return null} })(),
      ownerId: ownerIdFromRoute ? Number(ownerIdFromRoute) : (item.value.ownerId || null),
      ispaid: 0,
      isconsigned: 0
    }

    // determine create vs update
    let itemId = item.value.itemId || null
    let res
    if (itemId) {
      // update existing item
      res = await ApiHelper.put('/items', { ...payload, itemId })
    } else {
      // create new item
      res = await ApiHelper.post('/items', payload)
    }
    if (!(res && res.code === 1)) throw new Error(res?.msg || '保存item失败')

    // try to obtain itemId: prefer response data, then fallback to querying by tempKey if available
    if (!itemId) {
      const created = res.data
      itemId = (created && (created.itemId || created.id)) || null
    if (!itemId && item.value.tempKey) {
      // attempt to query item by tempKey (backend may support query by tempKey)
      // narrow by receiveParcelId and createBy to avoid matching previous items
      try {
        const q = await ApiHelper.get('/items', { tempKey: item.value.tempKey, receiveParcelId: item.value.receiveParcelId, createBy: userStore.userInfo?.name || userStore.userInfo?.id, pageSize: 1 })
        if (q && q.code === 1 && q.data && Array.isArray(q.data.rows) && q.data.rows.length) {
          const found = q.data.rows[0]
          itemId = found.itemId || found.id || null
        }
      } catch (err) {
        console.warn('query by tempKey failed', err)
      }
    }
    }

    // if we have a numeric itemId, update local item and upload images using that id
    let recordIdForUpload = null
    if (itemId) {
      item.value.itemId = Number(itemId)
      recordIdForUpload = Number(itemId)
    }

    // upload images only when we have a numeric recordId
    if (recordIdForUpload) {
      for (const img of itemImages.value) {
        if (!img.uploaded && img.imageUrl) {
          const u = await uploadImage(img.imageUrl, recordIdForUpload)
          img.id = u.id
          const host = ApiHelper.getHost()
          img.imageUrl = u.imageUrl && u.imageUrl.startsWith('http') ? u.imageUrl : (host + (u.imageUrl || ''))
          img.thumbnailUrl = u.thumbnailUrl && u.thumbnailUrl.startsWith('http') ? u.thumbnailUrl : (host + (u.thumbnailUrl || u.imageUrl || ''))
          img.uploaded = true
        }
      }
    } else {
      // backend requires numeric recordId for image upload; inform user to save again or refresh
      console.warn('No numeric itemId available; skipping image upload')
    }

    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    return itemId
  } catch(e) {
    console.error('保存item失败', e)
    uni.hideLoading()
    uni.showToast({ title: '保存失败: ' + (e?.message || ''), icon: 'none' })
    return null
  } finally { isSaving.value = false }
}

function handleNext() {
  // Do not auto-save on "下一步" — clear the form to enter a new item
  // reset fields but keep parcel association (receiveParcelId / receivePackageNo)
  item.value.itemNo = ''
  item.value.sellerPart = ''
  // reset selection fields to defaults
  item.value.qty = 1
  item.value.isGood = 1
  item.value.isUnpacked = 0
  item.value.iqcResult = ''
  // clear dict selection
  item.value.dictId = null
  dictIndex.value = 0
  // ensure we clear any existing itemId so next save will create a new item
  item.value.itemId = null
  // generate new tempKey for next item's images
  item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random() * 10000)
  itemImages.value = []
  uni.showToast({ title: '可以录入下一个商品', icon: 'success' })
}

async function handleSubmit() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '提交中...' })
    try {
      // ensure current item saved (will be saved with itemStatus = 1)
      await handleSave()

      // only update parcel status to 2 on submit (do not touch item statuses here)
      await ApiHelper.post('/parcels', { parcelId: parcelId.value, status: 2 })

      uni.hideLoading()
      uni.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(async () => {
          // 跳转到待收包裹列表页面（该页面为 tabbar，需要使用 switchTab）
          try {
            await uni.switchTab({ url: '/pages/parcel-incoming/index' })
          } catch (navErr) {
            // fallback: log and attempt router navigation
            console.warn('switchTab failed, fallback to router:', navErr)
            try { router.push({ path: '/pages/parcel-incoming/index' }) } catch(e) { console.warn(e) }
          }
        }, 600)
  } catch(e) {
    console.error('提交失败', e)
    uni.hideLoading()
    uni.showToast({ title: '提交失败: ' + (e?.message || ''), icon: 'none' })
  } finally { isSaving.value = false }
}

onMounted(() => {
  loadDicts()
  // In some native runtimes the route/options may not be available at module-eval time.
  // Re-check current page options and populate reactive refs so template shows packageNo.
  try {
    if (typeof getCurrentPages === 'function') {
      const pages = getCurrentPages() || []
      const current = pages[pages.length - 1] || {}
      const opts = current.options || {}
      if (opts.parcelId) parcelId.value = opts.parcelId
      if (opts.packageNo) {
        try { packageNo.value = decodeURIComponent(opts.packageNo) } catch(e) { packageNo.value = opts.packageNo }
      }
      if (opts.ownerId) ownerIdFromRoute.value = opts.ownerId
      // ensure item model reflects the parcel association
      item.value.receiveParcelId = parcelId.value || item.value.receiveParcelId
      item.value.receivePackageNo = packageNo.value || item.value.receivePackageNo
    }
  } catch (e) { console.warn('populate route params failed', e) }
  // fallback: try reading from storage if route options were not populated (native bridge may drop query)
  try {
    if (!parcelId.value || !packageNo.value) {
      const stored = uni.getStorageSync && uni.getStorageSync('parcelTransfer')
      if (stored) {
        // stored may be JSON string or object depending on code elsewhere
        const data = (typeof stored === 'string') ? (function(){ try { return JSON.parse(stored) } catch(e){ return null } })() : stored
        if (data && (data.parcelId || data.packageNo)) {
          if (data.parcelId) parcelId.value = data.parcelId
          if (data.packageNo) {
            try { packageNo.value = decodeURIComponent(data.packageNo) } catch(e) { packageNo.value = data.packageNo }
          }
          if (data.ownerId) ownerIdFromRoute.value = data.ownerId
          item.value.receiveParcelId = parcelId.value || item.value.receiveParcelId
          item.value.receivePackageNo = packageNo.value || item.value.receivePackageNo
          // clear stored transfer to avoid reusing stale data
          try { uni.removeStorageSync && uni.removeStorageSync('parcelTransfer') } catch(e){}
        }
      }
    }
  } catch(e) { console.warn('storage fallback for parcelTransfer failed', e) }
  // ensure we have a tempKey for this item session so image association can fallback reliably
  if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random() * 1000000)
})
</script>

<style lang="scss" scoped>
/* keep styles similar to create.vue */
.page-container { height:100vh; display:flex; flex-direction:column; background:#f8f8f8 }
.step-indicator { background:#fff; padding:30rpx; text-align:center; font-size:32rpx; font-weight:bold; color:#409EFF; border-bottom:1rpx solid #eee }
.step-content { flex:1; padding:20rpx; padding-bottom:20rpx }
.info-card { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.info-row { display:flex; justify-content:flex-start; align-items:center; margin-bottom:20rpx; font-size:28rpx }
.label { width:160rpx; color:#999; margin-right:20rpx; text-align:right }
.value { color:#333; font-size:28rpx }
.form-input { width:460rpx; flex:none; height:70rpx; border:1rpx solid #ddd; border-radius:8rpx; padding:0 20rpx; font-size:24rpx }
.section { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.photo-list { display:flex; flex-wrap:wrap; gap:20rpx }
.photo-item { width:200rpx; height:200rpx; border-radius:12rpx; position:relative; overflow:hidden }
.photo-item image{ width:100%; height:100% }
.delete-btn { position:absolute; top:-8rpx; right:-8rpx; width:38rpx; height:38rpx; background:#ff4d4f; color:#fff; border-radius:50%; text-align:center; line-height:38rpx; font-size:24rpx; z-index:10 }
.add-photo { width:200rpx; height:200rpx; border:2rpx dashed #ddd; border-radius:12rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#999 }
.add-icon { font-size:60rpx; line-height:1 }
.add-text { font-size:24rpx; margin-top:10rpx }
.action-btns { display:flex; gap:20rpx; padding:20rpx 0 0 0; margin-top:20rpx }
.action-btns .btn { flex:1; height:80rpx; line-height:80rpx; font-size:30rpx; border-radius:12rpx; border:none }
.btn-default { background:#fff; border:1rpx solid #ddd; color:#666 }
.btn-primary { background:#409EFF; color:#fff }
.btn-submit { background:#67C23A; color:#fff }

.two-col { display:flex; gap:10rpx }
.picker-display { height:70rpx; line-height:70rpx }
.radio-group { display:flex; gap:20rpx }
.radio-item { padding:10rpx 20rpx; border:1rpx solid #ddd; border-radius:8rpx; color:#666 }
.radio-item.active { background:#409EFF; color:#fff; border-color:#409EFF }
</style>