<template>
  <view class="page-container">
    <view class="step-indicator">录入包裹</view>

    <scroll-view class="step-content" scroll-y>
      <view class="info-card">
        <view class="info-row">
          <text class="label">包裹号:</text>
          <input class="form-input" v-model="parcel.packageNo" placeholder="请输入包裹号" />
        </view>
        <view class="info-row">
          <text class="label">包裹类型:</text>
          <radio-group :value="packageType" @change="onPackageTypeChange" class="radio-group">
            <label class="radio-item"><radio value="1" :checked="packageType === '1'" />退货</label>
            <label class="radio-item"><radio value="2" :checked="packageType === '2'" />调拨</label>
          </radio-group>
        </view>
          <!-- 货主 / 收货方 两栏 -->
          <view class="info-row two-col-row">
            <view class="col owner-col">
              <text class="label">货主:</text>
              <picker mode="selector" :range="ownerNames" :value="ownerIndex" @change="onOwnerChange">
                <view class="picker-display">{{ ownerNames[ownerIndex] || '请选择货主' }}</view>
              </picker>
            </view>
            <view class="col receiver-col">
              <text class="label">收货方:</text>
              <view class="receiver-display">{{ currentUserName }}</view>
            </view>
          </view>
      </view>

      <view class="section">
        <text class="section-title">收货外观 (Appearance after received)</text>
        <view class="photo-list">
          <view v-for="(img, index) in receiverImages" :key="index" class="photo-item" @click="previewImageFull(img.imageUrl)">
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removeReceiverImage(index)">✕</view>
          </view>
          <view v-if="canAddMoreReceiver" class="add-photo" @click="chooseReceiverImage">
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">装箱单 (Packing List)</text>
        <view class="photo-list">
          <view v-for="(img, index) in packingListImages" :key="index" class="photo-item" @click="previewImageFull(img.imageUrl)">
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removePackingImage(index)">✕</view>
          </view>
          <view v-if="canAddMorePacking" class="add-photo" @click="choosePackingImage">
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>

      <view class="action-btns">
        <button class="btn btn-default" :disabled="isSaving || savedOnce" @click="handleSave">保存</button>
        <button class="btn btn-submit" :disabled="isSaving" @click="handleSubmit">提交</button>
        <button class="btn btn-primary" :disabled="isSaving || !parcel.parcelId" @click="handleNext">下一步</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const parcel = ref({ packageNo: '' })
// keep packageType as a standalone ref so radio-group binding works reliably
// use string values for radio to ensure uni-app radio-group selects correctly
const packageType = ref('2')
const receiverImages = ref([])
const packingListImages = ref([])
const isSaving = ref(false)
const savedOnce = ref(false)

// 货主/收货方相关
const owners = ref([])
const ownerIndex = ref(0)
const ownerNames = computed(() => owners.value.map(o => o?.name || o?.username || ''))
const currentUserName = computed(() => userStore.userInfo?.name || userStore.userInfo?.username || '')

function onOwnerChange(e) {
  ownerIndex.value = Number(e.detail.value)
}

function onPackageTypeChange(e) {
  // uni radio-group emits detail.value as string
  const v = e && e.detail && e.detail.value
  if (v !== undefined) packageType.value = String(v)
}

async function loadOwners() {
  try {
    // 通过 user 控制器的 /all 接口获取所有用户列表，若接口不可用则回退到当前登录用户
    const res = await ApiHelper.get('/users/all')
    // 期望返回格式 { code: 1, data: [ ...users ] }
    if (res && res.code === 1 && Array.isArray(res.data) && res.data.length) {
      owners.value = res.data
      ownerIndex.value = 0
      return
    }
  } catch (err) {
    console.warn('loadOwners failed', err)
  }
  // fallback: current user only
  if (userStore.userInfo) {
    owners.value = [userStore.userInfo]
    ownerIndex.value = 0
  }
}

const imageTypeConfig = {
  PACKAGE_RECEIVER: { allow_multiple: false, max_count: 1 },
  PACKING_LIST: { allow_multiple: true, max_count: 10 }
}

const canAddMoreReceiver = computed(() => {
  const cfg = imageTypeConfig.PACKAGE_RECEIVER
  if (!cfg.allow_multiple) return receiverImages.value.length === 0
  return receiverImages.value.length < cfg.max_count
})

const canAddMorePacking = computed(() => packingListImages.value.length < imageTypeConfig.PACKING_LIST.max_count)

// 上传单张图片到后端（复用验收页实现）
async function uploadImage(filePath, moduleType, recordId, imageType) {
  return new Promise((resolve, reject) => {
    try {
      const uploadUrl = ApiHelper.baseUrl + '/image/manage/upload'
      let username = null
      try {
        const saved = uni.getStorageSync('loginUser')
        if (saved) {
          const u = JSON.parse(saved)
          username = u?.name || u?.username || null
        }
      } catch (e) {}
      const headers = ApiHelper.getAuthHeaders(username ? { username } : {})
      uni.uploadFile({
        url: uploadUrl,
        filePath,
        name: 'file',
        header: headers,
        formData: { moduleType, recordId, imageType },
        success: (uploadRes) => {
          try {
            const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
            if (data && data.code === 1) resolve(data.data)
            else reject(new Error((data && data.msg) || '上传失败'))
          } catch (err) { reject(err) }
        },
        fail: (err) => reject(err)
      })
    } catch (err) { reject(err) }
  })
}

async function chooseReceiverImage() {
  if (!canAddMoreReceiver.value) {
    uni.showToast({ title: `最多只能上传${imageTypeConfig.PACKAGE_RECEIVER.max_count}张图片`, icon: 'none' })
    return
  }
  uni.chooseImage({ count: imageTypeConfig.PACKAGE_RECEIVER.max_count - receiverImages.value.length, sizeType: ['compressed'], sourceType: ['camera','album'], success: async (res) => {
    for (const filePath of res.tempFilePaths) {
      const tempImg = { imageUrl: filePath, thumbnailUrl: filePath, uploaded: false, uploading: true }
      receiverImages.value.push(tempImg)
      // if parcel has id, upload immediately; else keep for upload after save
      try {
        if (parcel.value.parcelId) {
          const uploadResult = await uploadImage(filePath, 'PARCEL', parcel.value.parcelId, 'PACKAGE_RECEIVER')
          tempImg.id = uploadResult.id
          const host = ApiHelper.getHost()
          tempImg.imageUrl = uploadResult.imageUrl && uploadResult.imageUrl.startsWith('http') ? uploadResult.imageUrl : (host + (uploadResult.imageUrl || ''))
          tempImg.thumbnailUrl = uploadResult.thumbnailUrl && uploadResult.thumbnailUrl.startsWith('http') ? uploadResult.thumbnailUrl : (host + (uploadResult.thumbnailUrl || uploadResult.imageUrl || ''))
          tempImg.uploaded = true
          tempImg.uploading = false
        } else {
          tempImg.uploading = false
        }
      } catch (e) {
        const idx = receiverImages.value.indexOf(tempImg)
        if (idx > -1) receiverImages.value.splice(idx,1)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  }})
}

async function choosePackingImage() {
  if (!canAddMorePacking.value) { uni.showToast({ title: `最多只能上传${imageTypeConfig.PACKING_LIST.max_count}张图片`, icon: 'none' }); return }
  uni.chooseImage({ count: imageTypeConfig.PACKING_LIST.max_count - packingListImages.value.length, sizeType: ['compressed'], sourceType: ['camera','album'], success: async (res) => {
    for (const filePath of res.tempFilePaths) {
      const tempImg = { imageUrl: filePath, thumbnailUrl: filePath, uploaded: false, uploading: true }
      packingListImages.value.push(tempImg)
      try {
        if (parcel.value.parcelId) {
          const uploadResult = await uploadImage(filePath, 'PARCEL', parcel.value.parcelId, 'PACKING_LIST')
          tempImg.id = uploadResult.id
          const host = ApiHelper.getHost()
          tempImg.imageUrl = uploadResult.imageUrl && uploadResult.imageUrl.startsWith('http') ? uploadResult.imageUrl : (host + (uploadResult.imageUrl || ''))
          tempImg.thumbnailUrl = uploadResult.thumbnailUrl && uploadResult.thumbnailUrl.startsWith('http') ? uploadResult.thumbnailUrl : (host + (uploadResult.thumbnailUrl || uploadResult.imageUrl || ''))
          tempImg.uploaded = true
          tempImg.uploading = false
        } else {
          tempImg.uploading = false
        }
      } catch (e) {
        const idx = packingListImages.value.indexOf(tempImg)
        if (idx > -1) packingListImages.value.splice(idx,1)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    }
  }})
}

async function removeReceiverImage(index) {
  const img = receiverImages.value[index]
  try {
    if (img.id && img.uploaded) await ApiHelper.deleteImage(img.id)
    receiverImages.value.splice(index,1)
    uni.showToast({ title: '删除成功', icon: 'success' })
  } catch (e) { console.error(e); uni.showToast({ title: '删除失败', icon: 'none' }) }
}

async function removePackingImage(index) {
  const img = packingListImages.value[index]
  try {
    if (img.id && img.uploaded) await ApiHelper.deleteImage(img.id)
    packingListImages.value.splice(index,1)
    uni.showToast({ title: '删除成功', icon: 'success' })
  } catch (e) { console.error(e); uni.showToast({ title: '删除失败', icon: 'none' }) }
}

function previewImageFull(imageUrl) {
  if (!imageUrl) return
  const host = ApiHelper.getHost()
  const fullUrl = imageUrl.startsWith('http') ? imageUrl : (host + imageUrl)
  uni.previewImage({ urls: [fullUrl], current: fullUrl })
}

async function persistParcel(status = 1) {
  if (!parcel.value.packageNo || parcel.value.packageNo.trim() === '') {
    uni.showToast({ title: '请填写包裹号', icon: 'none' })
    return null
  }
  const payload = {
    packageNo: parcel.value.packageNo,
    packageType: Number(packageType.value),
    ownerId: (owners.value[ownerIndex.value] && (owners.value[ownerIndex.value].id || owners.value[ownerIndex.value].userId)) || userStore.userInfo?.id,
    receiverId: userStore.userInfo?.id,
    status // 1: saved, 2: submitted
  }

  // if we already have a parcelId, include it so backend `save` treats this as update
  if (parcel.value.parcelId) payload.parcelId = parcel.value.parcelId

  let res
  // Always POST to /parcels. Backend `save` handles both create and update
  // when `parcelId` is present in the payload.
  res = await ApiHelper.post('/parcels', payload)

  // treat code===1 as success even if res.data is null (backend may return null on update)
  if (!(res && res.code === 1)) {
    throw new Error(res?.msg || '保存包裹失败')
  }

  const data = res.data
  let newId = null
  if (data !== null && data !== undefined) {
    // backend may return an object containing parcelId or id, or return the id directly
    newId = (data.parcelId || data.id || data)
    if (newId !== undefined && newId !== null) parcel.value.parcelId = newId
  } else if (payload.parcelId) {
    // update case: backend returned null but update succeeded — keep existing parcelId
    newId = payload.parcelId
    parcel.value.parcelId = newId
  }

  return newId
}

// load parcel details by id and merge into local state
async function loadParcelById(id) {
  try {
    if (!id) return
    const res = await ApiHelper.get(`/parcels/${id}`)
    if (res && res.code === 1 && res.data) {
      const returned = res.data
      // merge returned fields into parcel.value but do not overwrite local images unless server returned them
      const keepReceiver = receiverImages.value && receiverImages.value.length
      const keepPacking = packingListImages.value && packingListImages.value.length
      Object.assign(parcel.value, returned)
      if (returned.receiverImages && Array.isArray(returned.receiverImages)) receiverImages.value = returned.receiverImages
      else if (!keepReceiver) receiverImages.value = []
      if (returned.packingListImages && Array.isArray(returned.packingListImages)) packingListImages.value = returned.packingListImages
      else if (!keepPacking) packingListImages.value = []
    }
  } catch (e) {
    console.warn('loadParcelById failed', e)
  }
}

async function handleSave() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '保存中...' })
  try {
    let id = parcel.value.parcelId
    if (!id) {
      id = await persistParcel(1)
      if (!id) throw new Error('没有返回包裹ID')
    } else {
      // ensure saved status remains at least 1
      await persistParcel(1)
    }
    for (const img of receiverImages.value) {
      if (!img.uploaded && img.imageUrl) {
        const r = await uploadImage(img.imageUrl, 'PARCEL', parcel.value.parcelId, 'PACKAGE_RECEIVER')
        img.id = r.id
        const host = ApiHelper.getHost()
        img.imageUrl = r.imageUrl && r.imageUrl.startsWith('http') ? r.imageUrl : (host + (r.imageUrl || ''))
        img.thumbnailUrl = r.thumbnailUrl && r.thumbnailUrl.startsWith('http') ? r.thumbnailUrl : (host + (r.thumbnailUrl || r.imageUrl || ''))
        img.uploaded = true
      }
    }
    for (const img of packingListImages.value) {
      if (!img.uploaded && img.imageUrl) {
        const r = await uploadImage(img.imageUrl, 'PARCEL', parcel.value.parcelId, 'PACKING_LIST')
        img.id = r.id
        const host = ApiHelper.getHost()
        img.imageUrl = r.imageUrl && r.imageUrl.startsWith('http') ? r.imageUrl : (host + (r.imageUrl || ''))
        img.thumbnailUrl = r.thumbnailUrl && r.thumbnailUrl.startsWith('http') ? r.thumbnailUrl : (host + (r.thumbnailUrl || r.imageUrl || ''))
        img.uploaded = true
      }
    }

    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    // refresh parcel data from server (ensure parcelId populated)
    await loadParcelById(parcel.value.parcelId)
    // remain on the page to allow subsequent updates
  } catch (e) {
    console.error('保存包裹失败', e)
    uni.hideLoading()
    uni.showToast({ title: '保存失败: ' + (e?.message || ''), icon: 'none' })
  } finally {
    isSaving.value = false
  }
}

async function handleSubmit() {
  if (isSaving.value) return
  isSaving.value = true
  uni.showLoading({ title: '提交中...' })
  try {
    let id = parcel.value.parcelId
    if (!id) {
      id = await persistParcel(2)
      if (!id) throw new Error('没有返回包裹ID')
    } else {
      // update status to 2
      await persistParcel(2)
    }

    // upload pending images
    for (const img of receiverImages.value) {
      if (!img.uploaded && img.imageUrl) {
        const r = await uploadImage(img.imageUrl, 'PARCEL', parcel.value.parcelId, 'PACKAGE_RECEIVER')
        img.id = r.id
        const host = ApiHelper.getHost()
        img.imageUrl = r.imageUrl && r.imageUrl.startsWith('http') ? r.imageUrl : (host + (r.imageUrl || ''))
        img.thumbnailUrl = r.thumbnailUrl && r.thumbnailUrl.startsWith('http') ? r.thumbnailUrl : (host + (r.thumbnailUrl || r.imageUrl || ''))
        img.uploaded = true
      }
    }
    for (const img of packingListImages.value) {
      if (!img.uploaded && img.imageUrl) {
        const r = await uploadImage(img.imageUrl, 'PARCEL', parcel.value.parcelId, 'PACKING_LIST')
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
    // 回退到待收列表
    setTimeout(() => {
      uni.navigateBack()
    }, 600)
  } catch (e) {
    console.error('提交包裹失败', e)
    uni.hideLoading()
    uni.showToast({ title: '提交失败: ' + (e?.message || ''), icon: 'none' })
  } finally {
    isSaving.value = false
  }
}

function goBack() { uni.navigateBack() }

function handleNext() {
  if (!parcel.value.parcelId) {
    uni.showToast({ title: '请先保存包裹再下一步', icon: 'none' })
    return
  }
  // navigate to item entry page and pass parcelId and packageNo
  // include ownerId so item-entry page can pre-fill owner for items
  const ownerIdForRoute = (owners.value[ownerIndex.value] && (owners.value[ownerIndex.value].id || owners.value[ownerIndex.value].userId)) || userStore.userInfo?.id
  // store transfer data as a fallback for native runtimes where route options may be unreliable
  try {
    uni.setStorageSync('parcelTransfer', { parcelId: parcel.value.parcelId, packageNo: parcel.value.packageNo, ownerId: ownerIdForRoute })
  } catch (e) { console.warn('setStorageSync failed', e) }
  uni.navigateTo({ url: `/pages/parcel-incoming/item-entry?parcelId=${parcel.value.parcelId}&packageNo=${encodeURIComponent(parcel.value.packageNo)}&ownerId=${ownerIdForRoute}` })
}

onLoad(() => {
  if (!userStore.userInfo?.id) userStore.checkLoginStatus()
  // load owners and ensure radio default selection after component load
  loadOwners()
  nextTick(() => {
    packageType.value = '2'
  })
})
</script>

<style lang="scss" scoped>
/* reuse styles from 验收页面 for consistent look */
.page-container { height:100vh; display:flex; flex-direction:column; background:#f8f8f8 }
.step-indicator { background:#fff; padding:30rpx; text-align:center; font-size:32rpx; font-weight:bold; color:#409EFF; border-bottom:1rpx solid #eee }
.step-content { flex:1; padding:20rpx; padding-bottom:20rpx }
.info-card { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
  .info-row { display:flex; justify-content:flex-start; align-items:center; margin-bottom:20rpx; font-size:28rpx }
  .label { width:auto; color:#999; margin-right:20rpx; text-align:right }
  .form-input { width:460rpx; flex:none; height:70rpx; border:1rpx solid #ddd; border-radius:8rpx; padding:0 20rpx; font-size:24rpx }
  .two-col-row { display:flex; justify-content:space-between; gap:20rpx }
  .two-col-row .col { display:flex; align-items:center; gap:12rpx }
  .two-col-row .owner-col { flex:1 }
  .two-col-row .receiver-col { flex:1 }
  .picker-display { height:70rpx; display:flex; align-items:center; padding:0 20rpx; border:1rpx solid #ddd; border-radius:8rpx; background:#fff; color:#333 }
  .receiver-display { height:70rpx; display:flex; align-items:center; padding:0 20rpx; border:1rpx solid #f0f0f0; border-radius:8rpx; background:#fafafa; color:#666 }
.section { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.section-title { display:block; font-size:30rpx; font-weight:bold; color:#333; margin-bottom:20rpx }
.photo-list { display:flex; flex-wrap:wrap; gap:20rpx }
.photo-item { width:200rpx; height:200rpx; border-radius:12rpx; position:relative; overflow:hidden }
.photo-item image{ width:100%; height:100% }
.delete-btn { position:absolute; top:-8rpx; right:-8rpx; width:38rpx; height:38rpx; background:#ff4d4f; color:#fff; border-radius:50%; text-align:center; line-height:38rpx; font-size:24rpx; z-index:10 }
.add-photo { width:200rpx; height:200rpx; border:2rpx dashed #ddd; border-radius:12rpx; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#999 }
.add-icon { font-size:60rpx; line-height:1 }
.add-text { font-size:24rpx; margin-top:10rpx }
.action-btns { display:flex; gap:20rpx; padding:20rpx 0 0 0; margin-top:20rpx }
.action-btns .btn { flex:1; height:80rpx; line-height:80rpx; font-size:30rpx; border-radius:12rpx; border:none }
.btn-cancel, .btn-default { background:#fff; border:1rpx solid #ddd; color:#666 }
.btn-primary { background:#409EFF; color:#fff }
.btn-submit { background:#67C23A; color:#fff }
/* radio group styles for 包裹类型 */
.radio-group { display:flex; gap:40rpx; align-items:center }
.radio-item { display:flex; align-items:center; gap:12rpx; font-size:24rpx; color:#333 }
.radio-item radio, .radio-item .uni-radio { transform: scale(1.1); }
</style>

