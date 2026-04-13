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
      <view class="title">商品测试记录</view>
    </view>

    <scroll-view class="step-content" scroll-y>
      <view class="info-card">
        <text class="card-title">商品信息</text>
        <view class="info-row">
          <text class="label">商品号:</text>
          <text class="value">{{ item.itemNo || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">商品名:</text>
          <text class="value">{{ item.sellerPart || item.itemName || item.name || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">类别:</text>
          <text class="value">{{ item.dictName || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">Qty:</text>
          <text class="value">{{ item.qty ?? item.quantity ?? '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">测试要求:</text>
          <text class="value">{{ item.testDemands || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">测试步骤:</text>
          <text class="value">{{ item.testProcedure || '-' }}</text>
        </view>

        <view class="info-row">
          <text class="label">是否良品:</text>
          <view class="radio-group">
            <view :class="['radio-item', (isGoodIndex===0 || isGoodIndex===0) ? 'active' : '']" @click="isGoodIndex = 0">良品</view>
            <view :class="['radio-item', (isGoodIndex===1) ? 'active' : '']" @click="isGoodIndex = 1">次品</view>
          </view>
        </view>

        <view class="info-row">
          <text class="label">测试结果:</text>
          <textarea class="form-input" v-model="testResult" placeholder="填写测试结果"></textarea>
        </view>
        <view class="info-row">
          <text class="label">测试费用:</text>
          <input class="form-input" type="text" v-model="inspectFeeDisplay" placeholder="0.00" @input="onInspectFeeInput" @blur="formatInspectFee" />
        </view>
      </view>

      <view class="section">
        <text class="section-title">商品图片</text>
        <view class="photo-list">
          <view v-for="(img, index) in itemImages" :key="index" class="photo-item" @click="previewImageFull(img)">
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removeImage(index)">✕</view>
          </view>
          <view v-if="itemImages.length < 6" class="add-photo" @click="chooseImage">
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>

      <view class="action-btns">
        <button class="btn btn-save" :disabled="isSaving" @click="handleSave">保存</button>
        <button class="btn btn-warning" :disabled="isSaving" @click="handleSubmit">提交</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ApiHelper } from '@/utils/apiHelper'
import { uploadFile, chooseFileFlexible } from '@/utils/uploadHelper'
import { useUserStore } from '@/stores/user'
import { smartBack } from '@/utils/navigation'

const route = typeof getCurrentPages === 'function' && getCurrentPages().length ? getCurrentPages()[getCurrentPages().length-1] : null
// fallback to uni.$$route for H5/uni router
const q = (typeof __uniConfig !== 'undefined' && __uniConfig && __uniConfig.route) ? __uniConfig.route : (typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search) : null)

const item = ref({})
const itemImages = ref([])
const isGoodOptions = ['良品','次品']
const isGoodIndex = ref(0)
const testResult = ref('')
const inspectFee = ref(null)
const inspectFeeDisplay = ref('')
const isSaving = ref(false)
const userStore = useUserStore()

function getQueryParam(name){ try{ if (typeof getCurrentPages === 'function'){ const rp = getCurrentPages()[getCurrentPages().length-1]; const search = rp && rp.options ? rp.options : (rp && rp.$route && rp.$route.query ? rp.$route.query : {}); if (search && search[name]) return search[name] } if (typeof window !== 'undefined' && window.location) { const sp = new URLSearchParams(window.location.search); return sp.get(name) } }catch(e){} return null }

let itemId = getQueryParam('itemId') || (q && q.get && q.get('itemId')) || null
let fromServiceFlag = (getQueryParam('fromService') === '1') || (q && q.get && q.get('fromService') === '1') || false

async function load(){
  if (!itemId) return
  try{
    // request single item by id (use /items/{id} to get single record)
    const res = await ApiHelper.get(`/items/${itemId}`)
    if (res && res.code === 1 && res.data){
      let payload = res.data
      if (payload && payload.item) payload = payload.item
      const data = Array.isArray(payload) && payload.length ? payload[0] : payload
      item.value = data || {}
      testResult.value = item.value.testResult || ''
      inspectFee.value = (typeof item.value.inspectFee !== 'undefined' && item.value.inspectFee !== null) ? Number(item.value.inspectFee) : null
      inspectFeeDisplay.value = (typeof inspectFee.value === 'number' && !isNaN(inspectFee.value)) ? inspectFee.value.toFixed(2) : ''
      // try grouped images first, fallback to attachments list
      try{
        const imgRes = await ApiHelper.get('/image/manage/grouped', { moduleType: 'ITEM', recordId: item.value.itemId || itemId })
        if (imgRes && imgRes.code === 1 && imgRes.data && Array.isArray(imgRes.data.ITEM_IMAGE)){
          const host = ApiHelper.getHost()
          itemImages.value = imgRes.data.ITEM_IMAGE.map(img => ({ id: img.id, imageUrl: img.imageUrl && img.imageUrl.startsWith('http') ? img.imageUrl : (host + (img.imageUrl || '')), thumbnailUrl: img.thumbnailUrl && img.thumbnailUrl.startsWith('http') ? img.thumbnailUrl : (host + (img.thumbnailUrl || img.imageUrl || '')), uploaded: true }))
        } else {
          itemImages.value = (item.value.attachments || []).map(a => ({ id: a.id, imageUrl: a.imageUrl || a.fileUrl, thumbnailUrl: a.thumbnailUrl || a.imageUrl }))
        }
      }catch(e){
        itemImages.value = (item.value.attachments || []).map(a => ({ id: a.id, imageUrl: a.imageUrl || a.fileUrl, thumbnailUrl: a.thumbnailUrl || a.imageUrl }))
      }
      isGoodIndex.value = (item.value.isGood === 0) ? 1 : 0
    }
  }catch(e){ console.error('load item failed', e) }
}

function previewImageFull(img){ if (!img) return; const url = img.imageUrl || img.thumbnailUrl; const host = ApiHelper.getHost(); const full = (url && url.startsWith('http')) ? url : (host + (url||'')); uni.previewImage({ urls: [full], current: full }) }

async function chooseImage(){ const picked = await chooseFileFlexible({ count: 6 - itemImages.value.length, allowPdf: false }); for (const f of picked) { itemImages.value.push({ imageUrl: f.path, thumbnailUrl: f.path, uploaded: false }) } }

async function removeImage(idx){ const img = itemImages.value[idx]; if (img && img.id){ try{ await ApiHelper.deleteImage(img.id) }catch(e){ console.warn(e) } } itemImages.value.splice(idx,1) }

async function uploadImage(filePath, recordId, tempKey){ try{ return await uploadFile(filePath, 'ITEM', (typeof recordId !== 'undefined' && recordId !== null) ? recordId : -1, 'ITEM_TEST', tempKey) }catch(e){ throw e } }

async function handleSave(){ if (isSaving.value) return null; isSaving.value = true; uni.showLoading({ title: '保存中...' })
  try{
    if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random()*10000)
    const payload = { isGood: (isGoodIndex.value===0?1:0), testResult: testResult.value || null, inspectFee: (typeof inspectFee.value !== 'undefined' && inspectFee.value !== null) ? Number(inspectFee.value) : null, tempKey: item.value.tempKey }
    let existingId = item.value.itemId || itemId || null
    let res
    // if opened from service prefer update (PUT). If no id, try tempKey lookup before creating.
    if (existingId || fromServiceFlag) {
      // if we don't yet have an id but fromService, try to locate by tempKey
      if (!existingId && item.value.tempKey) {
        try{
          const q = await ApiHelper.get('/items', { tempKey: item.value.tempKey, receiveParcelId: item.value.receiveParcelId, createBy: userStore.userInfo?.name || userStore.userInfo?.id, pageSize: 1 })
          if (q && q.code === 1 && q.data && Array.isArray(q.data.rows) && q.data.rows.length) {
            const found = q.data.rows[0]
            existingId = found.itemId || found.id || null
            if (existingId) item.value.itemId = existingId
          }
        }catch(e){ console.warn('tempKey lookup failed before PUT', e) }
      }
      // if still no id, we'll attempt POST as fallback, otherwise PUT
      if (existingId) {
        res = await ApiHelper.put('/items', { ...payload, itemId: existingId })
        console.debug('[item-test-entry] save PUT /items response:', res)
      }
    }
    if (!res) {
      const createPayload = {
        ...payload,
        itemNo: item.value.itemNo,
        sellerPart: item.value.sellerPart,
        dictId: item.value.dictId || null,
        qty: item.value.qty || item.value.quantity || 1,
        receiveParcelId: item.value.receiveParcelId || null,
        receivePackageNo: item.value.receivePackageNo || null,
        createBy: userStore.userInfo?.name,
        // include keeper and receivedDate so backend can accept the created item
        keeperId: userStore.userInfo?.id || null,
        ownerId: item.value.ownerId || null,
        receivedDate: new Date().toISOString().split('T')[0],
        itemStatus: typeof item.value.itemStatus !== 'undefined' ? item.value.itemStatus : 0
      }
      console.debug('[item-test-entry] create payload:', createPayload)
      res = await ApiHelper.post('/items', createPayload)
      console.debug('[item-test-entry] save POST /items response:', res)
    }
    if (!(res && res.code === 1)) {
      console.error('[item-test-entry] save failed response:', res)
      const serverMsg = res && (res.msg || res.message || JSON.stringify(res))
      uni.hideLoading()
      uni.showToast({ title: '保存失败: ' + (serverMsg || ''), icon: 'none' })
      return false
    }

    // resolve created/updated item id from various possible response shapes
    let recordId = existingId
    if (!recordId) {
      const d = res.data || res
      recordId = d && (d.itemId || d.id || (d.data && (d.data.itemId || d.data.id))) || null
      if (!recordId && item.value.tempKey) {
        // fallback: try to query by tempKey as some backends attach created item later
        try{
          const q = await ApiHelper.get('/items', { tempKey: item.value.tempKey, receiveParcelId: item.value.receiveParcelId, createBy: userStore.userInfo?.name || userStore.userInfo?.id, pageSize: 1 })
          if (q && q.code === 1 && q.data && Array.isArray(q.data.rows) && q.data.rows.length) {
            const found = q.data.rows[0]
            recordId = found.itemId || found.id || null
          }
        }catch(qe){ console.warn('tempKey lookup failed', qe) }
      }
      if (recordId) item.value.itemId = recordId
    }
    console.debug('[item-test-entry] resolved recordId:', recordId)

    const uploadRecordId = recordId || -1
    for (const img of itemImages.value){ if (!img.uploaded && img.imageUrl){ try{ const u = await uploadImage(img.imageUrl, uploadRecordId, item.value.tempKey); img.id = u.id; const host = ApiHelper.getHost(); img.imageUrl = u.imageUrl && u.imageUrl.startsWith('http') ? u.imageUrl : (host + (u.imageUrl || '')); img.thumbnailUrl = u.thumbnailUrl && u.thumbnailUrl.startsWith('http') ? u.thumbnailUrl : (host + (u.thumbnailUrl || u.imageUrl || '')); img.uploaded = true }catch(up){ console.warn('upload failed', up) } } }

    // Note: backend does not provide /image/manage/reassign; attachment binding skipped.

    uni.hideLoading(); uni.showToast({ title: '保存成功', icon: 'success' })
    // return resolved record id so callers can continue (submit needs it)
    return recordId || null
  }catch(e){ console.error(e); uni.hideLoading(); uni.showToast({ title: '保存失败: ' + (e?.message||''), icon: 'none' }); return null }
  finally{ isSaving.value = false }
}

async function handleSubmit(){ if (isSaving.value) return; isSaving.value = true; uni.showLoading({ title: '提交中...' })
  try{
    // Save and obtain itemId (handleSave returns recordId or null)
    const savedId = await handleSave()
    let id = savedId || item.value.itemId || itemId
    if (!id) throw new Error('无法获取itemId')
    const updatePayload = { itemId: id, isTested: 1, isGood: (isGoodIndex.value===0?1:0), testResult: testResult.value || null, inspectFee: (typeof inspectFee.value !== 'undefined' && inspectFee.value !== null) ? Number(inspectFee.value) : null }
    const res = await ApiHelper.put('/items', updatePayload)
    console.debug('[item-test-entry] submit PUT /items response:', res)
    if (!(res && res.code === 1)) {
      console.error('[item-test-entry] submit failed response:', res)
      const srv = res && (res.msg || res.message || JSON.stringify(res))
      uni.hideLoading()
      uni.showToast({ title: '提交失败: ' + (srv || ''), icon: 'none' })
      return
    }
    // notify list to refresh
    try{ uni.setStorageSync && uni.setStorageSync('itemServiceRefresh', Date.now()) }catch(e){}
    // try to call previous page load
    try{ if (typeof getCurrentPages === 'function'){ const pages = getCurrentPages() || []; const prev = pages[pages.length-2]; if (prev){ const vm = prev.$vm || prev.page || null; if (vm){ try{ if (vm.$refs && vm.$refs.svc && typeof vm.$refs.svc.load === 'function') vm.$refs.svc.load(); else if (typeof vm.load === 'function') vm.load() }catch(e){ console.warn(e) } } } } }catch(e){ console.warn('notify prev failed', e) }
    uni.hideLoading(); uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(()=>{ try{ uni.navigateBack() }catch(e){} }, 400)
  }catch(e){ console.error(e); uni.hideLoading(); uni.showToast({ title: '提交失败: ' + (e?.message||''), icon: 'none' }) }
  finally{ isSaving.value = false }
}

function onIsGoodChange(e){ isGoodIndex.value = parseInt(e.detail.value,10) }

function onInspectFeeInput(e){
  try{
    const raw = (e && e.target && typeof e.target.value !== 'undefined')
      ? e.target.value
      : (e && e.detail && typeof e.detail.value !== 'undefined')
        ? e.detail.value
        : (typeof e === 'string' ? e : '')
    const str = String(raw === null || typeof raw === 'undefined' ? '' : raw)
    inspectFeeDisplay.value = str
    const cleaned = str.replace(/,/g, '').replace(/[^0-9.\-]/g, '').trim()
    const parsed = cleaned === '' ? NaN : parseFloat(cleaned)
    inspectFee.value = (!isNaN(parsed) ? parsed : null)
  }catch(err){ console.warn('onInspectFeeInput parse failed', err) }
}

function formatInspectFee(){
  try{
    if (typeof inspectFee.value === 'number' && !isNaN(inspectFee.value)) inspectFeeDisplay.value = inspectFee.value.toFixed(2)
    else inspectFeeDisplay.value = ''
  }catch(err){ console.warn('formatInspectFee failed', err) }
}

function goBack(){ smartBack() }

onMounted(()=>{
  try {
    if (typeof getCurrentPages === 'function') {
      const pages = getCurrentPages() || []
      const current = pages[pages.length - 1] || {}
      const opts = current.options || {}
      if (opts.itemId) itemId = opts.itemId
      if (opts.fromService === '1' || opts.fromService === 'true' || opts.fromService === 1) fromServiceFlag = true
      // set parcel/ref fields if present
      if (opts.receiveParcelId) item.value.receiveParcelId = opts.receiveParcelId
      if (opts.receivePackageNo) item.value.receivePackageNo = opts.receivePackageNo
    }
  } catch(e) { console.warn('populate route params failed', e) }
  if (!item.value.tempKey) item.value.tempKey = 'tk_' + Date.now() + '_' + Math.floor(Math.random()*1000000)
  load()
})

</script>

<style lang="scss" scoped>
/* reuse styles from parcel-add/item-entry.vue for consistent look */
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
textarea.form-input { padding-top:12rpx; line-height:34rpx }
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
</style>
