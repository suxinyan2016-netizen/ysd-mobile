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
      <view class="title">新增包裹</view>
    </view>
    

    <scroll-view class="step-content" scroll-y>
      <view class="info-card">
        <text class="card-title">包裹信息</text>
        <view class="info-row">
          <text class="label">运单号:</text>
          <input class="form-input" v-model="parcel.packageNo" placeholder="请输入运单号" />
        </view>
        <view class="info-row">
          <text class="label">货主:</text>
          <view class="readonly-display">{{ currentUserName }}</view>
        </view>
        <!-- status occupies its own row -->
        <view class="info-row">
          <text class="label">状态:</text>
          <view class="picker-display editable" @click="openModal('packageStatus', packageStatusNames, '选择状态')">{{ packageStatusNames[packageStatusIndex] }}</view>
        </view>

        <!-- package type occupies its own row -->
        <view class="info-row">
          <text class="label">包裹类型:</text>
          <view class="readonly-display">{{ packageType === '1' ? '退货' : '调拨' }}</view>
        </view>

        <!-- sender occupies its own row -->
        <view class="info-row">
          <text class="label">寄出人:</text>
          <template v-if="packageType === '1'">
            <input class="form-input small-input" v-model="senderName" placeholder="请输入寄出人" />
          </template>
          <template v-else>
            <view class="picker-display editable" @click="openModal('sender', senderNames, '选择寄出人')">{{ senderNames[senderIndex] || '请选择寄出人' }}</view>
          </template>
        </view>

        <!-- receiver occupies its own row -->
        <view class="info-row">
          <text class="label">收货方:</text>
          <view class="picker-display editable" @click="openModal('receiver', receiverNames, '选择收货方')">{{ receiverNames[receiverIndex] || '请选择收货方' }}</view>
        </view>

        <!-- demands (owner requirements) occupy full row -->
        <view class="info-row">
          <text class="label">货主要求:</text>
          <view class="demand-options" style="flex:1">
            <view v-for="opt in demandsOptions" :key="opt.code" :class="['demand-option', { active: demands.includes(opt.code) } ]" @click="toggleDemand(opt.code)">
              {{ opt.label }}
            </view>
          </view>
        </view>
      </view>

      <view class="section upload-files">
        <text class="section-title">包裹标签 (Package Label)</text>
        <view class="photo-list">
          <view v-for="(f, index) in packageLabelFiles" :key="index" class="photo-item" @click="handleLabelClick(f)">
            <image v-if="!f.isPdf" :src="f.thumbnailUrl || f.fileUrl" mode="aspectFill" />
            <view v-else class="pdf-placeholder">PDF</view>
            <view class="delete-btn" @click.stop="removePackageLabel(index)">✕</view>
          </view>
          <view v-if="canAddMoreLabel" class="add-photo" @click="choosePackageLabel">
            <text class="add-icon">+</text>
            <text class="add-text">上传标签</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">发货外观 (Appearance after send)</text>
        <view class="photo-list">
          <view v-for="(img, index) in senderImages" :key="index" class="photo-item" @click="previewImageFull(img.imageUrl)">
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removeSenderImage(index)">✕</view>
          </view>
          <view v-if="canAddMoreSender" class="add-photo" @click="chooseSenderImage">
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>

      <view class="action-btns">
        <button class="btn btn-save" :disabled="isSaving || savedOnce" @click="handleSave">保存</button>
        <button class="btn btn-primary" :disabled="isSaving || !parcel.parcelId" @click="handleNext">下一步</button>
      </view>
      <!-- reusable modal component -->
      <ModalPicker v-if="showModal" :show="showModal" :title="modalTitle" :list="modalList" @select="selectModal" @close="closeModal" />
    </scroll-view>
  </view>
</template>

<script setup>
import ModalPicker from '@/components/ModalPicker.vue'
import { ref, computed, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ApiHelper } from '@/utils/apiHelper'
import { chooseFileFlexible, uploadFile } from '@/utils/uploadHelper'
import { smartBack } from '@/utils/navigation'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

function goBack() {
  smartBack()
}

const parcel = ref({ packageNo: '' })
const packageType = ref('2')
// package label files (may include pdf)
const packageLabelFiles = ref([])
// sender appearance images (formerly packingListImages)
const senderImages = ref([])
// package status: 0 计划中, 1 在途, 2 入库, 9 异常 (default 0)
const packageStatus = ref(0)
const packageStatusIndex = ref(0)
const packageStatusValues = [0,1,2,9]
const packageStatusNames = ['计划中','在途','入库','异常']
const isSaving = ref(false)
const savedOnce = ref(false)

const owners = ref([])
const ownerIndex = ref(0)
const ownerNames = computed(() => owners.value.map(o => o?.name || o?.username || ''))
// sender info
const senderName = ref('')
const senderId = ref(null)
const senderIndex = ref(0)
const senderList = ref([])
const senderNames = computed(() => senderList.value.map(u => u?.name || u?.username || ''))
// receiver (select from user list)
const receiverIndex = ref(0)
const receiverId = ref(null)
const receiverNames = computed(() => senderList.value.map(u => u?.name || u?.username || ''))
const currentUserName = computed(() => userStore.userInfo?.name || userStore.userInfo?.username || '')

function onPackageStatusChange(e) { const idx = Number(e.detail.value); packageStatusIndex.value = idx; packageStatus.value = packageStatusValues[idx] }

function onOwnerChange(e) { ownerIndex.value = Number(e.detail.value) }
function onPackageTypeChange(e) { const v = e && e.detail && e.detail.value; if (v !== undefined) packageType.value = String(v) }
function onSenderChange(e) { const idx = Number(e.detail.value); senderIndex.value = idx; const sel = senderList.value[idx]; senderId.value = sel ? (sel.id || sel.userId) : null; senderName.value = sel ? (sel.name || sel.username) : '' }
function onReceiverChange(e) { const idx = Number(e.detail.value); receiverIndex.value = idx; const sel = senderList.value[idx]; receiverId.value = sel ? (sel.id || sel.userId) : null }

// demands: multi-select owner requirements
const demands = ref([])
const demandsOptions = [
  { code: 0, label: '仅寄存' },
  { code: 1, label: '拆包验货' },
  { code: 2, label: '测试' },
  { code: 3, label: '维修' },
  { code: 4, label: '加固' },
  { code: 5, label: '分箱' }
]
function toggleDemand(code) {
  const idx = demands.value.indexOf(code)
  if (idx === -1) demands.value.push(code)
  else demands.value.splice(idx,1)
}

async function loadSenderList() {
  try {
    const res = await ApiHelper.get('/users/all')
    if (res && res.code === 1 && Array.isArray(res.data)) {
      // filter out admin/system user with id===1
      senderList.value = res.data.filter(u => Number(u.id || u.userId) !== 1)
      senderIndex.value = 0
      receiverIndex.value = 0
      const first = senderList.value[0]
      receiverId.value = first ? (first.id || first.userId) : null
    }
  } catch (e) { console.warn('loadSenderList failed', e) }
}

async function loadOwners() {
  try {
    const res = await ApiHelper.get('/users/all')
    if (res && res.code === 1 && Array.isArray(res.data) && res.data.length) { owners.value = res.data.filter(u => Number(u.id || u.userId) !== 1); ownerIndex.value = 0; return }
  } catch (err) { console.warn('loadOwners failed', err) }
  // fallback: current user only when not admin
  if (userStore.userInfo && Number(userStore.userInfo.id) !== 1) { owners.value = [userStore.userInfo]; ownerIndex.value = 0 }
}

// load sender list as well (used when packageType == '2')
loadSenderList()

// new type codes: PACKAGE_LABEL supports pdf upload, PACKAGE_SENDER for sender images
const imageTypeConfig = { PACKAGE_LABEL: { allow_multiple: false, max_count: 1 }, PACKAGE_SENDER: { allow_multiple: true, max_count: 10 } }
const canAddMoreLabel = computed(() => { const cfg = imageTypeConfig.PACKAGE_LABEL; if (!cfg.allow_multiple) return packageLabelFiles.value.length === 0; return packageLabelFiles.value.length < cfg.max_count })
const canAddMoreSender = computed(() => senderImages.value.length < imageTypeConfig.PACKAGE_SENDER.max_count)

async function uploadImage(filePath, moduleType, recordId, imageType) {
  // wrapper to the shared upload helper — keeps existing call sites unchanged
  return uploadFile(filePath, moduleType, recordId, imageType)
}

// choose package label (supports images and pdf)
async function choosePackageLabel() {
  if (!canAddMoreLabel.value) { uni.showToast({ title: `最多只能上传${imageTypeConfig.PACKAGE_LABEL.max_count}个文件`, icon: 'none' }); return }
  try {
    const files = await chooseFileFlexible({ count: 1, allowPdf: true })
    if (!files || !files.length) return
    const f = files[0]
    const filePath = f.path
    if (!filePath) return
    const temp = { fileUrl: filePath, name: f.name || 'file', uploaded: false, uploading: true, isPdf: !!f.isPdf }
    packageLabelFiles.value.push(temp)
    try {
      if (parcel.value.parcelId) {
        const uploadResult = await uploadFile(filePath, 'PARCEL', parcel.value.parcelId, 'PACKAGE_LABEL')
        temp.id = uploadResult.id
        const host = ApiHelper.getHost()
        temp.fileUrl = uploadResult.imageUrl && uploadResult.imageUrl.startsWith('http') ? uploadResult.imageUrl : (host + (uploadResult.imageUrl || ''))
        temp.uploaded = true
        temp.uploading = false
      } else { temp.uploading = false }
    } catch (e) { const idx = packageLabelFiles.value.indexOf(temp); if (idx > -1) packageLabelFiles.value.splice(idx,1); uni.showToast({ title: '上传失败', icon: 'none' }) }
  } catch (err) { console.warn('choosePackageLabel failed', err); uni.showToast({ title: '选择文件失败', icon: 'none' }) }
}

// choose sender appearance images (formerly choosePackingImage), type PACKAGE_SENDER
async function chooseSenderImage() {
  if (!canAddMoreSender.value) { uni.showToast({ title: `最多只能上传${imageTypeConfig.PACKAGE_SENDER.max_count}张图片`, icon: 'none' }); return }
  uni.chooseImage({ count: imageTypeConfig.PACKAGE_SENDER.max_count - senderImages.value.length, sizeType: ['compressed'], sourceType: ['camera','album'], success: async (res) => {
    for (const filePath of res.tempFilePaths) {
      const tempImg = { imageUrl: filePath, thumbnailUrl: filePath, uploaded: false, uploading: true }
      senderImages.value.push(tempImg)
      try {
        if (parcel.value.parcelId) {
          const uploadResult = await uploadImage(filePath, 'PARCEL', parcel.value.parcelId, 'PACKAGE_SENDER')
          tempImg.id = uploadResult.id
          const host = ApiHelper.getHost()
          tempImg.imageUrl = uploadResult.imageUrl && uploadResult.imageUrl.startsWith('http') ? uploadResult.imageUrl : (host + (uploadResult.imageUrl || ''))
          tempImg.thumbnailUrl = uploadResult.thumbnailUrl && uploadResult.thumbnailUrl.startsWith('http') ? uploadResult.thumbnailUrl : (host + (uploadResult.thumbnailUrl || uploadResult.imageUrl || ''))
          tempImg.uploaded = true
          tempImg.uploading = false
        } else { tempImg.uploading = false }
      } catch (e) { const idx = senderImages.value.indexOf(tempImg); if (idx > -1) senderImages.value.splice(idx,1); uni.showToast({ title: '上传失败', icon: 'none' }) }
    }
  }})
}

async function removePackageLabel(index) { const f = packageLabelFiles.value[index]; try { if (f.id && f.uploaded) await ApiHelper.deleteImage(f.id); packageLabelFiles.value.splice(index,1); uni.showToast({ title: '删除成功', icon: 'success' }) } catch (e) { console.error(e); uni.showToast({ title: '删除失败', icon: 'none' }) } }

async function removeSenderImage(index) { const img = senderImages.value[index]; try { if (img.id && img.uploaded) await ApiHelper.deleteImage(img.id); senderImages.value.splice(index,1); uni.showToast({ title: '删除成功', icon: 'success' }) } catch (e) { console.error(e); uni.showToast({ title: '删除失败', icon: 'none' }) } }

function previewImageFull(imageUrl) {
  if (!imageUrl) return
  const host = ApiHelper.getHost()
  const fullUrl = imageUrl.startsWith('http') ? imageUrl : (host + imageUrl)
  // if PDF, open document; otherwise use image preview
  if ((fullUrl || '').toLowerCase().endsWith('.pdf')) {
    uni.openDocument({ filePath: fullUrl })
  } else {
    uni.previewImage({ urls: [fullUrl], current: fullUrl })
  }
}

function handleLabelClick(f) {
  if (!f) return
  const url = f.fileUrl
  if (!url) return
  if ((url || '').toLowerCase().endsWith('.pdf')) {
    uni.openDocument({ filePath: url })
  } else {
    previewImageFull(url)
  }
}

async function persistParcel(status = 1) {
  if (!parcel.value.packageNo || parcel.value.packageNo.trim() === '') { uni.showToast({ title: '请填写运单号', icon: 'none' }); return null }
    const payload = {
    packageNo: parcel.value.packageNo,
    packageType: Number(packageType.value),
    // owner is current logged-in user (不可编辑)
    ownerId: userStore.userInfo?.id,
    // receiver selected from user list (fallback to current user)
    receiverId: receiverId.value || userStore.userInfo?.id,
    // preserve existing `status` parameter (used for save/submit flow)
    status,
    // package shipping status (0:计划中,1:在途,2:入库,9:异常)
    packageStatus: Number(packageStatus.value)
  }
    // include demands as comma-separated string when present
    if (demands.value && demands.value.length) payload.demands = demands.value.join(',')

    // include receiverName when a receiver is selected
    try {
      const recv = (senderList.value && senderList.value[receiverIndex.value]) || null
      const recvName = recv ? (recv.name || recv.username) : (receiverNames && receiverNames[receiverIndex.value])
      if (recvName) payload.receiverName = recvName
    } catch (e) { /* ignore */ }

    // include sender fields per packageType; ensure senderName is sent when sender selected from user list
    try {
      const selSender = (senderList.value && senderList.value[senderIndex.value]) || null
      if (selSender) {
        payload.senderId = selSender.id || selSender.userId || senderId.value || null
        payload.senderName = selSender.name || selSender.username || senderName.value || ''
      } else {
        // fallback to freeform senderName input when packageType === '1' or no user selected
        if (senderName.value) payload.senderName = senderName.value
        if (senderId.value) payload.senderId = senderId.value
      }
    } catch (e) { /* ignore */ }
  if (parcel.value.parcelId) payload.parcelId = parcel.value.parcelId
  let res = await ApiHelper.post('/parcels', payload)
  if (!(res && res.code === 1)) throw new Error(res?.msg || '保存包裹失败')
  const data = res.data
  let newId = null
  if (data !== null && data !== undefined) { newId = (data.parcelId || data.id || data); if (newId !== undefined && newId !== null) parcel.value.parcelId = newId }
  else if (payload.parcelId) { newId = payload.parcelId; parcel.value.parcelId = newId }
  return newId
}

async function loadParcelById(id) {
  try {
    if (!id) return
    const res = await ApiHelper.get(`/parcels/${id}`)
    if (res && res.code === 1 && res.data) {
      const returned = res.data
      const keepReceiver = receiverImages.value && receiverImages.value.length
      const keepPacking = packingListImages.value && packingListImages.value.length
      Object.assign(parcel.value, returned)
      if (returned.receiverImages && Array.isArray(returned.receiverImages)) receiverImages.value = returned.receiverImages
      else if (!keepReceiver) receiverImages.value = []
      if (returned.packingListImages && Array.isArray(returned.packingListImages)) packingListImages.value = returned.packingListImages
      else if (!keepPacking) packingListImages.value = []
    }
  } catch (e) { console.warn('loadParcelById failed', e) }
}

async function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '保存中...' })
  try {
    let id = parcel.value.parcelId
    if (!id) { id = await persistParcel(Number(packageStatus.value)); if (!id) throw new Error('没有返回包裹ID') }
    else { await persistParcel(Number(packageStatus.value)) }
    // upload package label files (supports pdf)
    for (const f of packageLabelFiles.value) {
      if (!f.uploaded && f.fileUrl) {
        const r = await uploadImage(f.fileUrl, 'PARCEL', parcel.value.parcelId, 'PACKAGE_LABEL')
        f.id = r.id
        const host = ApiHelper.getHost()
        f.fileUrl = r.imageUrl && r.imageUrl.startsWith('http') ? r.imageUrl : (host + (r.imageUrl || ''))
        f.uploaded = true
      }
    }
    // upload sender appearance images
    for (const img of senderImages.value) {
      if (!img.uploaded && img.imageUrl) {
        const r = await uploadImage(img.imageUrl, 'PARCEL', parcel.value.parcelId, 'PACKAGE_SENDER')
        img.id = r.id
        const host = ApiHelper.getHost()
        img.imageUrl = r.imageUrl && r.imageUrl.startsWith('http') ? r.imageUrl : (host + (r.imageUrl || ''))
        img.thumbnailUrl = r.thumbnailUrl && r.thumbnailUrl.startsWith('http') ? r.thumbnailUrl : (host + (r.thumbnailUrl || r.imageUrl || ''))
        img.uploaded = true
      }
    }

    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadParcelById(parcel.value.parcelId)
  } catch (e) { console.error('保存包裹失败', e); uni.hideLoading(); uni.showToast({ title: '保存失败: ' + (e?.message || ''), icon: 'none' }) } finally { isSaving.value = false }
}

async function handleSubmit() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '提交中...' })
  try {
    let id = parcel.value.parcelId
    if (!id) { id = await persistParcel(2); if (!id) throw new Error('没有返回包裹ID') }
    else { await persistParcel(2) }
    // upload package label files (supports pdf)
    for (const f of packageLabelFiles.value) {
      if (!f.uploaded && f.fileUrl) {
        const r = await uploadImage(f.fileUrl, 'PARCEL', parcel.value.parcelId, 'PACKAGE_LABEL')
        f.id = r.id
        const host = ApiHelper.getHost()
        f.fileUrl = r.imageUrl && r.imageUrl.startsWith('http') ? r.imageUrl : (host + (r.imageUrl || ''))
        f.uploaded = true
      }
    }
    // upload sender appearance images
    for (const img of senderImages.value) {
      if (!img.uploaded && img.imageUrl) {
        const r = await uploadImage(img.imageUrl, 'PARCEL', parcel.value.parcelId, 'PACKAGE_SENDER')
        img.id = r.id
        const host = ApiHelper.getHost()
        img.imageUrl = r.imageUrl && r.imageUrl.startsWith('http') ? r.imageUrl : (host + (r.imageUrl || ''))
        img.thumbnailUrl = r.thumbnailUrl && r.thumbnailUrl.startsWith('http') ? r.thumbnailUrl : (host + (r.thumbnailUrl || r.imageUrl || ''))
        img.uploaded = true
      }
    }

    uni.hideLoading()
    uni.showToast({ title: '提交成功', icon: 'success' })
    savedOnce.value = true
    setTimeout(() => { uni.navigateBack() }, 600)
  } catch (e) { console.error('提交包裹失败', e); uni.hideLoading(); uni.showToast({ title: '提交失败: ' + (e?.message || ''), icon: 'none' }) } finally { isSaving.value = false }
}

function handleNext() {
  if (!parcel.value.parcelId) { uni.showToast({ title: '请先保存包裹再下一步', icon: 'none' }); return }
  const ownerIdForRoute = userStore.userInfo?.id
  try { uni.setStorageSync('parcelTransfer', { parcelId: parcel.value.parcelId, packageNo: parcel.value.packageNo, ownerId: ownerIdForRoute }) } catch (e) { console.warn('setStorageSync failed', e) }
  uni.navigateTo({ url: `/pages/parcel-add/item-entry?parcelId=${parcel.value.parcelId}&packageNo=${encodeURIComponent(parcel.value.packageNo)}&ownerId=${ownerIdForRoute}` })
}

onLoad((options) => {
  if (!userStore.userInfo?.id) userStore.checkLoginStatus()
  loadOwners()
  if (options && (typeof options.packageType !== 'undefined')) {
    packageType.value = String(options.packageType)
  } else {
    nextTick(() => { packageType.value = '2' })
  }
})

// modal picker state for custom pickers (sender/receiver/owner)
const showModal = ref(false)
const modalList = ref([])
const modalTitle = ref('')
const modalField = ref('')
const modalSelected = ref(-1)

function openModal(field, list, title) {
  modalField.value = field
  modalList.value = Array.isArray(list) ? list : []
  modalTitle.value = title || ''
  if (field === 'sender') modalSelected.value = senderIndex.value
  else if (field === 'receiver') modalSelected.value = receiverIndex.value
  else if (field === 'owner') modalSelected.value = ownerIndex.value
  else if (field === 'packageStatus') modalSelected.value = packageStatusIndex.value
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function selectModal(idx) {
  if (modalField.value === 'sender') {
    senderIndex.value = idx
    const sel = senderList.value[idx]
    senderId.value = sel ? (sel.id || sel.userId) : null
    senderName.value = sel ? (sel.name || sel.username) : ''
  } else if (modalField.value === 'receiver') {
    receiverIndex.value = idx
    const sel = senderList.value[idx]
    receiverId.value = sel ? (sel.id || sel.userId) : null
  } else if (modalField.value === 'packageStatus') {
    packageStatusIndex.value = idx
    packageStatus.value = packageStatusValues[idx]
  } else if (modalField.value === 'owner') {
    ownerIndex.value = idx
  }
  showModal.value = false
}
</script>

<style lang="scss" scoped>
/* reuse styles from parcel-incoming/create.vue */
.page-container { height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title { color:#fff; font-size:34rpx; font-weight:700 }
.topbar .back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%); z-index:1001; }
.topbar .back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18); cursor:pointer }
.topbar .back-icon svg { width:32rpx; height:32rpx }
.step-indicator { background:#fff; padding:30rpx; text-align:center; font-size:32rpx; font-weight:bold; color:#409EFF; border-bottom:1rpx solid #eee }
.step-content { flex:1; padding:20rpx; padding-bottom:20rpx }
.info-card { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.card-title { display:block; font-size:30rpx; font-weight:700; color:#333; margin-bottom:12rpx }
.info-row { display:flex; justify-content:flex-start; align-items:center; gap:12rpx; padding:9rpx 0; border-bottom:none; font-size:24rpx }
.info-row:last-child { padding-bottom:0 }
.label { width:160rpx; color:#666; margin-right:12rpx; text-align:left; font-size:22rpx }
.form-input { width:auto; flex:1; height:70rpx; border:none; border-bottom:1rpx solid #e6e6e6; border-radius:0; padding:0 8rpx; font-size:22rpx }
.small-input { width:200rpx }
.two-col-row { display:flex; justify-content:space-between; gap:20rpx }
.two-col-row .col { display:flex; align-items:center; gap:12rpx; flex:1 }
.two-col-row .owner-col { flex:1 }
.two-col-row .receiver-col { flex:1 }

.demand-options { display:flex; flex-wrap:wrap; gap:10rpx }
.demand-option { padding:8rpx 12rpx; border-radius:8rpx; background:#f5f5f5; color:#333; font-size:22rpx; cursor:pointer }
.demand-option.active { background:#409EFF; color:#fff }

/* left-align labels and values for owner and receiver columns */
.owner-col .label, .receiver-col .label { text-align:left; width:auto; margin-right:12rpx }
.owner-col .readonly-display, .receiver-col .receiver-display { justify-content:flex-start }
.three-col-row { display:flex; justify-content:space-between; gap:20rpx }
.three-col-row .col { display:flex; align-items:center; gap:12rpx; flex:1 }
.three-col-row .owner-col { flex:1 }
.three-col-row .sender-col { flex:1 }
.three-col-row .receiver-col { flex:1 }
.readonly-display { height:70rpx; display:flex; align-items:center; padding:0 20rpx; border:none; background:transparent; color:#333 }
.picker-display { height:70rpx; display:flex; align-items:center; padding:0 8rpx; border:none; border-bottom:1rpx solid #e6e6e6; background:transparent; color:#333 }
.picker-display.editable { cursor:pointer }
.receiver-display { height:70rpx; display:flex; align-items:center; padding:0 20rpx; border:none; background:transparent; color:#666 }
.readonly-display { border:none }
.section { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.section-title { display:block; font-size:30rpx; font-weight:bold; color:#333; margin-bottom:20rpx }
.photo-list { display:flex; flex-wrap:wrap; gap:20rpx }
.photo-item { width:200rpx; height:200rpx; border-radius:12rpx; position:relative; overflow:hidden }
.photo-item image{ width:100%; height:100% }
.delete-btn { position:absolute; top:-8rpx; right:-8rpx; width:38rpx; height:38rpx; background:#ff4d4f; color:#fff; border-radius:50%; text-align:center; line-height:38rpx; font-size:24rpx; z-index:10 }
.add-photo { width:200rpx; height:200rpx; border:2rpx dashed #ddd; border-radius:12rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#999 }
.add-icon { font-size:60rpx; line-height:1 }
.add-text { font-size:24rpx; margin-top:10rpx }
.pdf-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f3f3f3; color:#c0392b; font-weight:700 }
.action-btns { display:flex; gap:20rpx; padding:20rpx 0 0 0; margin-top:20rpx }
.action-btns .btn { flex:1; height:60rpx; line-height:60rpx; font-size:26rpx; border-radius:8rpx; border:none; padding:0 40rpx }
.btn-cancel, .btn-default { background:#fff; border:1rpx solid #ddd; color:#666 }
.btn-primary { background:#409EFF; color:#fff }
.btn-submit { background:#67C23A; color:#fff }
.radio-group { display:flex; gap:40rpx; align-items:center }
.radio-item { display:flex; align-items:center; gap:12rpx; font-size:24rpx; color:#333 }
.radio-item radio, .radio-item .uni-radio { transform: scale(1.1); }

/* modal styles */
/* modal styles moved to components/ModalPicker.vue */
</style>
