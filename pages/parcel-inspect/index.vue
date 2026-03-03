<template>
  <view class="page-container">
    <!-- 步骤指示器 -->
    <view class="step-indicator">
      <text v-if="currentStep === 1">包裹信息</text>
      <text v-else>商品 {{ currentItemIndex + 1 }} / {{ itemCount }}</text>
    </view>
    
    
    <!-- Step 1: 包裹信息 -->
    <scroll-view v-if="currentStep === 1" class="step-content" scroll-y>
      <!-- 包裹基本信息 -->
      <view class="info-card">
        <view class="info-row">
          <text class="label">包裹号:</text>
          <text class="value">{{ parcel.packageNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">Process ID:</text>
          <text class="value">{{ parcel.processId || '-' }}</text>
        </view>
      </view>
      
      <!-- 收货外观图片（只读） -->
      <view class="section">
        <text class="section-title">收货外观 (Appearance after received)</text>
        <view class="photo-list">
          <view 
            v-for="(img, index) in receiverImages"
            :key="index"
            class="photo-item"
            @click="previewImageFull(img.imageUrl)"
          >
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removeReceiverImage(index)">✕</view>
          </view>
          <view 
            v-if="canAddMoreReceiver" 
            class="add-photo" 
            @click="chooseReceiverImage"
          >
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>
      
      <!-- 装箱单图片（可上传） -->
      <view class="section">
        <text class="section-title">装箱单 (Packing List)</text>
        <view class="photo-list">
          <view 
            v-for="(img, index) in packingListImages"
            :key="index"
            class="photo-item"
            @click="previewImageFull(img.imageUrl)"
          >
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removePackingImage(index)">✕</view>
          </view>
          <view 
            v-if="canAddMorePacking" 
            class="add-photo" 
            @click="choosePackingImage"
          >
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>
      
      <!-- 待发列表（仅包裹级展示，不展开 item 信息） -->
      <view class="section">
        <text class="section-title">待发列表</text>
        <view class="list-header">
          <text class="col col-itemno">Package No</text>
          <text class="col col-seller">Process ID</text>
          <text class="col col-qty">Items</text>
        </view>
        <view v-if="parcel && parcel.parcelId" class="list-row">
          <text class="col col-itemno">{{ parcel.packageNo || '-' }}</text>
          <text class="col col-seller">{{ parcel.processId || '-' }}</text>
          <text class="col col-qty">{{ itemCount }}</text>
        </view>
        <view v-else class="no-items">暂无包裹数据</view>
      </view>

      <view class="action-btns">
        <button class="btn btn-cancel" @click="goBack">取消</button>
        <button class="btn btn-default" @click="saveParcel">保存</button>
        <button class="btn btn-primary" @click="nextStep">下一步</button>
      </view>
    </scroll-view>
    
    <!-- Step 2+: 商品验收 -->
    <scroll-view v-else-if="currentItem" class="step-content" scroll-y>
      <!-- 商品信息表单 -->
      <view class="form-card">
        <view class="form-row">
          <view class="form-item col">
            <text class="form-label">商品编号 (Item No)</text>
            <text class="form-value">{{ currentItem.itemNo || '-' }}</text>
          </view>
          <view class="form-item col">
            <text class="form-label">数量 (Qty) *</text>
            <input 
              class="form-input" 
              type="digit" 
              v-model="itemForm.qty"
              placeholder="请输入数量"
              @blur="validateQty"
            />
          </view>
        </view>

        <view class="form-row">
          <view class="form-item col">
            <text class="form-label">类别 (Category)</text>
            <picker mode="selector" :range="categoryNames" @change="onCategoryChange" :value="selectedCategoryIndex">
              <view class="form-input" style="display:flex;align-items:center;justify-content:space-between;">
                <text>{{ (categoryNames[selectedCategoryIndex]) || '请选择类别' }}</text>
                <text>▾</text>
              </view>
            </picker>
          </view>
          <view class="form-item col">
            <text class="form-label">商品名 (Sellerpart)</text>
            <input 
              class="form-input" 
              type="text"
              v-model="itemForm.sellerPart"
              placeholder="请输入商品名"
              maxlength="200"
            />
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">客户反馈 (Customer Feedback)</text>
          <text class="form-value">{{ currentItem.customerFeedback || '-' }}</text>
        </view>

        <view class="form-row">
          <view class="form-item col">
            <text class="form-label">是否拆封 (isPacked)</text>
            <radio-group class="radio-group" @change="onUnpackedChange">
              <label class="radio-item">
                <radio value="0" :checked="itemForm.isUnpacked === 0" />
                <text>未拆</text>
              </label>
              <label class="radio-item">
                <radio value="1" :checked="itemForm.isUnpacked === 1" />
                <text>已拆</text>
              </label>
            </radio-group>
          </view>

          <view class="form-item col">
            <text class="form-label">是否良品 (isGood)</text>
            <radio-group class="radio-group" @change="onIsGoodChange">
              <label class="radio-item">
                <radio value="0" :checked="itemForm.isGood === 0" />
                <text>坏件</text>
              </label>
              <label class="radio-item">
                <radio value="1" :checked="itemForm.isGood === 1" />
                <text>良品</text>
              </label>
            </radio-group>
          </view>
        </view>
        
        <view class="form-item">
          <text class="form-label">IQC结果 (IQC Result)</text>
          <input 
            class="form-input" 
            type="text"
            v-model="itemForm.iqcResult"
            placeholder="请输入IQC结果"
            maxlength="500"
          />
        </view>
      </view>
      
      <!-- 商品图片上传 -->
      <view class="section">
        <text class="section-title">商品图片 (Item Images)</text>
        <view class="photo-list">
          <view 
            v-for="(img, index) in itemImages"
            :key="index"
            class="photo-item"
            @click="previewImageFull(img.imageUrl)"
          >
            <image :src="img.thumbnailUrl || img.imageUrl" mode="aspectFill" />
            <view class="delete-btn" @click.stop="removeItemImage(index)">✕</view>
          </view>
          <view 
            v-if="canAddMoreItem" 
            class="add-photo" 
            @click="chooseItemImage"
          >
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>
      
      <!-- 操作按钮 -->
      <view class="action-btns">
        <button class="btn btn-default" @click="previousStep">上一步</button>
        <button class="btn btn-success" @click="handleSaveClick">保存</button>
        <button 
          v-if="currentItemIndex < itemCount - 1"
          class="btn btn-primary" 
          @click="nextStep"
        >
          下一步
        </button>
        <button 
          v-else
          class="btn btn-warning" 
          @click="handleSubmit"
        >
          提交
        </button>
      </view>
    </scroll-view>
    
    <!-- 无商品提示 -->
    <view v-else class="empty-state">
      <text class="empty-icon">📦</text>
      <text class="empty-text">暂无商品需要验收</text>
    </view>

    
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ApiHelper } from '@/utils/apiHelper'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const parcel = ref({})
const currentStep = ref(1)
const currentItemIndex = ref(0)
const isSaving = ref(false)
const debugMessage = ref('')
// persistentDebug kept for possible future use but no UI debug shown
const persistentDebug = ref('')
// detailed inline debug removed

// 显示临时调试信息（右上角，默认会在 duration ms 后消失）
function showDebugMessage(msg, duration = 3000) {
  try {
    debugMessage.value = typeof msg === 'string' ? msg : JSON.stringify(msg)
  } catch (e) {
    debugMessage.value = String(msg)
  }
  if (duration && duration > 0) {
    setTimeout(() => { debugMessage.value = '' }, duration)
  }
}

// 复制 persistentDebug 到剪贴板（便于用户粘贴到这里）
function copyDebugToClipboard() {
  const text = debugMessage.value || ''
  if (!text) {
    try { uni.showToast({ title: '无调试信息可复制', icon: 'none' }) } catch (e) {}
    return
  }
  try {
    uni.setClipboardData({ data: text })
    uni.showToast({ title: '已复制调试信息到剪贴板', icon: 'success' })
  } catch (e) {
    console.warn('复制剪贴板失败', e)
    try { uni.showToast({ title: '复制失败', icon: 'none' }) } catch (err) {}
  }
}

// 图片数据
// 图片类型配置（与后端配置保持一致）
const imageTypeConfig = {
  PACKAGE_RECEIVER: { allow_multiple: false, max_count: 1 },
  PACKING_LIST: { allow_multiple: true, max_count: 10 },
  ITEM_IMAGE: { allow_multiple: true, max_count: 9 }
}

const receiverImages = ref([])
const packingListImages = ref([])
const itemImages = ref([])

// 类别字典（下拉）
const categories = ref([])
const categoriesLoaded = ref(false)
const selectedCategoryIndex = ref(-1)
// 默认使用的字典 group 名；后端实际是页面上显示的 Label（例如 'Category'）
const CATEGORY_GROUP = 'Category'

// picker 需要 string 数组作为 range，维护一个 names 数组以供展示
const categoryNames = computed(() => categories.value.map(d => d.dictName || ''))

// 当前商品表单数据
const itemForm = ref({
  qty: null,
  customerFeedback: '',
  isUnpacked: 0,
  // isGood: 0 = bad, 1 = good (default 1)
  isGood: 1,
  sellerPart: '',
  iqcResult: '',
  dictId: null
})

// 加载指定字典组
async function loadCategories(group = CATEGORY_GROUP, fallbackGroup = null, force = false) {
  if (categoriesLoaded.value && !force) return
  try {
    let res = null

    // helper to try group via /dicts/group then fallback to /dicts
    const tryGroup = async (g) => {
      if (g == null) return null
      try {
        let r = null
        try {
          r = await ApiHelper.get(`/dicts/group/${encodeURIComponent(g)}`)
        } catch (err) {
          r = null
        }
        if (!r || (r && r.code !== 1) || (Array.isArray(r) ? r.length === 0 : (Array.isArray(r.data) && r.data.length === 0))) {
          try {
            r = await ApiHelper.get('/dicts', { group: g, dictGroup: g })
          } catch (err2) {
            r = null
          }
        }
        return r
      } catch (e) { return null }
    }

    // try primary group
    res = await tryGroup(group)

    // if empty and fallback provided, try fallback groups (accept array or single value)
    if ((!res || (res && res.code !== 1) || (Array.isArray(res) ? res.length === 0 : (Array.isArray(res.data) && res.data.length === 0))) && fallbackGroup != null) {
      if (Array.isArray(fallbackGroup)) {
        for (const fg of fallbackGroup) {
          res = await tryGroup(fg)
          if (res && ((Array.isArray(res) && res.length > 0) || (res.code === 1 && Array.isArray(res.data) && res.data.length > 0))) break
        }
      } else {
        res = await tryGroup(fallbackGroup)
      }
    }

    // finally, support array or {code:1,data:[]}
    let items = []
    if (Array.isArray(res)) items = res
    else if (res && res.code === 1 && Array.isArray(res.data)) items = res.data

    const normalize = (arr) => (arr || []).map(d => ({
      dictId: d?.dictId ?? d?.id ?? d?.value ?? null,
      dictName: d?.dictName ?? d?.name ?? d?.label ?? d?.dict_name ?? '' ,
      isValid: d?.isValid ?? d?.valid ?? d?.enabled ?? undefined
    }))

    const normalized = normalize(items)
    categories.value = normalized.filter(d => d && (d.isValid === undefined || d.isValid === 1))
  } catch (e) {
    console.warn('加载字典失败', e)
    categories.value = []
  }
  categoriesLoaded.value = true
}

function onCategoryChange(e) {
  const idx = parseInt(e.detail.value)
  if (!isNaN(idx) && categories.value[idx]) {
    selectedCategoryIndex.value = idx
    itemForm.value.dictId = categories.value[idx].dictId
  }
}

// 计算属性
const itemCount = computed(() => {
  const items = parcel.value.items || parcel.value.itemList || []
  return items.length
})

const currentItem = computed(() => {
  const items = parcel.value.items || parcel.value.itemList || []
  return items[currentItemIndex.value]
})

// 计算属性：判断是否可以添加更多图片
const canAddMoreReceiver = computed(() => {
  const config = imageTypeConfig.PACKAGE_RECEIVER
  if (!config.allow_multiple) {
    return receiverImages.value.length === 0
  }
  return receiverImages.value.length < config.max_count
})

const canAddMorePacking = computed(() => {
  const config = imageTypeConfig.PACKING_LIST
  return packingListImages.value.length < config.max_count
})

const canAddMoreItem = computed(() => {
  const config = imageTypeConfig.ITEM_IMAGE
  return itemImages.value.length < config.max_count
})

onLoad((options) => {
  // 确保用户信息已加载
  if (!userStore.userInfo?.id) {
    userStore.checkLoginStatus()
  }
  // 打印 ApiHelper 调试信息（基于运行环境帮助排查 APK/模拟器网络问题）
  try { ApiHelper.debugInfo() } catch (e) { console.warn('ApiHelper.debugInfo 调用失败', e) }

  // 支持接收图片数据
  if (options.receiverImages) {
    try {
      const imgs = JSON.parse(decodeURIComponent(options.receiverImages))
      receiverImages.value = Array.isArray(imgs) ? imgs : []
    } catch (e) { receiverImages.value = [] }
  }
  if (options.packingListImages) {
    try {
      const imgs = JSON.parse(decodeURIComponent(options.packingListImages))
      packingListImages.value = Array.isArray(imgs) ? imgs : []
    } catch (e) { packingListImages.value = [] }
  }
  if (options.parcelId) {
    loadParcelDetail(options.parcelId)
  }
  // 在启动时显示简短的调试信息，方便在 APK 上直接看到 baseUrl/host/platform
    // do not show persistent debug info in production UI
})

function truncate(str, n = 120) {
  if (!str) return ''
  const s = typeof str === 'string' ? str : JSON.stringify(str)
  return s.length > n ? s.slice(0, n) + '...' : s
}

// 获取当前用户ID
function getCurrentUserId() {
  // 优先从 store 获取（字段名是 id 而不是 userId）
  if (userStore.userInfo?.id) {
    return userStore.userInfo.id
  }
  
  // 备用方案：从本地存储获取
  try {
    const savedUser = uni.getStorageSync('loginUser')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      return user?.id
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
  
  return null
}

async function loadParcelDetail(parcelId) {
  try {
    const result = await ApiHelper.get(`/parcels/${parcelId}`)
    console.log('loadParcelDetail API 返回:', { parcelId, result })
    if (result.code === 1 && result.data) {
      parcel.value = result.data
      console.log('parcel.value 已设置:', parcel.value)
      // Normalize item identifiers: backend sometimes returns `id` instead of `itemId` (APK/base may differ).
      // Ensure downstream code always can use `item.itemId`.
      try {
        const items = parcel.value.items || parcel.value.itemList || []
        console.log('发现 items 数组长度:', Array.isArray(items) ? items.length : 'not-array', 'parcel.value.items keys:', Object.keys(parcel.value || {}))
        if (Array.isArray(items)) {
          items.forEach(it => {
            if (!it) return
            // If backend uses `id`, map it to `itemId` for consistency
            if (!it.itemId && it.id) {
              it.itemId = it.id
            }
            // Some responses may nest item id under other keys; add more fallbacks as needed
            // Normalize common field name variants to avoid missing data in APK/native builds
            if (it.qty === undefined || it.qty === null) {
              it.qty = it.quantity ?? it.count ?? it.Qty ?? null
            }
            if (!it.customerFeedback) {
              it.customerFeedback = it.feedback ?? it.customer_feedback ?? ''
            }
            if (!it.itemNo) {
              it.itemNo = it.sku ?? it.code ?? it.productCode ?? it.itemNo
            }
            // 预先加载字典，确保 picker 可用。尝试常见的 fallback keys（与网页版一致）
            try { loadCategories(CATEGORY_GROUP, ['Hardware', 2]).catch(() => {}) } catch (e) {}
          })
          // Ensure parcel.value.items points to the normalized array
          if (!parcel.value.items) parcel.value.items = items
        }
        console.log('normalize items 完成，parcel.value.items 长度:', (parcel.value.items || []).length)
        // no debug UI changes here
      } catch (e) {
        console.warn('normalize items failed', e)
      }
       // 加载图片
       await loadImages(parcelId)
    } else {
      uni.showToast({
        title: result.msg || '加载失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('加载包裹详情失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 加载图片
async function loadImages(parcelId) {
  try {
    console.log('开始加载图片, parcelId:', parcelId)
    const result = await ApiHelper.get('/image/manage/grouped', {
      moduleType: 'PARCEL',
      recordId: parcelId
    })
    console.log('图片API返回结果:', result)
    
    // Always clear previous parcel-level images first to avoid showing stale images
    receiverImages.value = []
    packingListImages.value = []

    if (result && result.code === 1 && result.data) {
      const groupedImages = result.data
      console.log('分组图片数据:', groupedImages)
      
      // 加载收货外观图片 (PACKAGE_RECEIVER)
      if (groupedImages.PACKAGE_RECEIVER && Array.isArray(groupedImages.PACKAGE_RECEIVER)) {
        const host = ApiHelper.getHost()
        receiverImages.value = groupedImages.PACKAGE_RECEIVER.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl && img.imageUrl.startsWith('http') ? img.imageUrl : (host + (img.imageUrl || '')),
          thumbnailUrl: img.thumbnailUrl && img.thumbnailUrl.startsWith('http') ? img.thumbnailUrl : (host + (img.thumbnailUrl || img.imageUrl || '')),
          uploaded: true
        }))
        console.log('收货外观图片已加载:', receiverImages.value)
      } else {
        console.log('没有找到PACKAGE_RECEIVER图片，保持为空')
      }
      
      // 加载装箱单图片 (PACKING_LIST)
      if (groupedImages.PACKING_LIST && Array.isArray(groupedImages.PACKING_LIST)) {
        const host = ApiHelper.getHost()
        packingListImages.value = groupedImages.PACKING_LIST.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl && img.imageUrl.startsWith('http') ? img.imageUrl : (host + (img.imageUrl || '')),
          thumbnailUrl: img.thumbnailUrl && img.thumbnailUrl.startsWith('http') ? img.thumbnailUrl : (host + (img.thumbnailUrl || img.imageUrl || '')),
          uploaded: true
        }))
        console.log('装箱单图片已加载:', packingListImages.value)
      } else {
        console.log('没有找到PACKING_LIST图片，保持为空')
      }
      // no persistent debug write
    } else {
      // 非正常返回时，确保清空，避免显示上一次的数据
      console.log('图片API返回code不正确或无数据，清空包裹级图片')
      receiverImages.value = []
      packingListImages.value = []
      try { uni.showToast({ title: '加载包裹图片返回异常，请查看日志', icon: 'none', duration: 2000 }) } catch (e) {}
      showDebugMessage('包裹图片加载异常')
    }
  } catch (error) {
    console.error('加载图片失败:', error)
    try { uni.showToast({ title: '加载包裹图片失败: ' + (error?.message || ''), icon: 'none', duration: 2500 }) } catch (e) {}
    showDebugMessage('包裹图片加载失败')
  }
}

// 步骤控制
async function nextStep() {
  if (currentStep.value === 1) {
    if (itemCount.value === 0) {
      uni.showToast({
        title: '暂无商品需要验收',
        icon: 'none'
      })
      return
    }
    currentStep.value = 2
    currentItemIndex.value = 0
    await loadItemForm()
    // 不再重复加载包裹图片接口
    // ensure unpacked status and category are freshly applied after navigation
    itemForm.value.isUnpacked = currentItem.value?.isUnpacked ?? 0
    itemForm.value.dictId = currentItem.value?.dictId ?? null
    if (itemForm.value.dictId != null && Array.isArray(categories.value) && categories.value.length > 0) {
      const idx = categories.value.findIndex(d => d.dictId == itemForm.value.dictId)
      selectedCategoryIndex.value = idx >= 0 ? idx : -1
    } else {
      selectedCategoryIndex.value = -1
    }
  } else {
    if (currentItemIndex.value < itemCount.value - 1) {
      saveCurrentItemForm()
      currentItemIndex.value++
      await loadItemForm()
      // reload unpacked and category after navigation between items
      itemForm.value.isUnpacked = currentItem.value?.isUnpacked ?? 0
      itemForm.value.dictId = currentItem.value?.dictId ?? null
      if (itemForm.value.dictId != null && Array.isArray(categories.value) && categories.value.length > 0) {
        const idx = categories.value.findIndex(d => d.dictId == itemForm.value.dictId)
        selectedCategoryIndex.value = idx >= 0 ? idx : -1
      } else {
        selectedCategoryIndex.value = -1
      }
      // 只加载商品图片
    }
  }
  try {
    // 写入持久化调试信息（在 loadItemForm 完成后），便于 APK 上确认代码已执行
    const itemsSummary = Array.isArray(parcel.value.items) ? parcel.value.items.map(i => i.itemId || i.id || i.itemNo || '?') : (Array.isArray(parcel.value.itemList) ? parcel.value.itemList.map(i => i.itemId || i.id || i.itemNo || '?') : [])
    showDebugMessage(`下一步: step ${currentStep.value} idx ${currentItemIndex.value}`, 1500)
    console.log('nextStep executed:', { step: currentStep.value, idx: currentItemIndex.value })
  } catch (e) { console.warn('set persistentDebug failed', e) }
}

async function previousStep() {
  if (currentStep.value === 2 && currentItemIndex.value === 0) {
    currentStep.value = 1
  } else if (currentStep.value === 2) {
    saveCurrentItemForm()
    currentItemIndex.value--
    await loadItemForm()
    // reload unpacked and category after navigating back
    itemForm.value.isUnpacked = currentItem.value?.isUnpacked ?? 0
    itemForm.value.dictId = currentItem.value?.dictId ?? null
    if (itemForm.value.dictId != null && Array.isArray(categories.value) && categories.value.length > 0) {
      const idx = categories.value.findIndex(d => d.dictId == itemForm.value.dictId)
      selectedCategoryIndex.value = idx >= 0 ? idx : -1
    } else {
      selectedCategoryIndex.value = -1
    }
  }
}

// 加载当前商品表单
async function loadItemForm() {
  // 如果正在保存，不重新加载表单，避免覆盖用户输入
  if (isSaving.value) {
    console.log('loadItemForm: 正在保存，跳过重新加载')
    return
  }
  
  console.log('loadItemForm 被调用, currentItemIndex:', currentItemIndex.value)
  try {
    if (console && typeof console.trace === 'function') console.trace('loadItemForm 调用堆栈')
  } catch (e) {}
  console.log('loadItemForm 时 parcel:', parcel.value)
  console.log('计算的 itemCount:', itemCount.value, 'computed items length (parcel.items):', (parcel.value.items || []).length, 'parcel.itemList length:', (parcel.value.itemList || []).length)

  const item = currentItem.value
  // 在 APK 上持久化一些调试信息，便于观察 itemId/索引在原生环境的值
    try {
      // normalize fields so UI shows correct values
      const normQty = item?.qty ?? item?.quantity ?? item?.count ?? item?.Qty ?? null
      const normFeedback = item?.customerFeedback || item?.feedback || item?.customer_feedback || ''
      if (normQty !== undefined) item.qty = normQty
      if (normFeedback !== undefined) item.customerFeedback = normFeedback
    } catch (e) {}
  console.log('当前 currentItem 值:', item)
    if (item) {
    // Reset itemImages first to avoid showing previous item's images
    itemImages.value = []

    // Initialize form from current item. Use empty string as default for iqcResult
    // ensure categories loaded before initializing selected index
    await loadCategories(CATEGORY_GROUP, ['Hardware', 2], true)
    // normalize sellerPart variants
    const normSellerPart = item?.sellerPart || item?.Sellerpart || item?.sellerpart || item?.name || ''
    if (normSellerPart !== undefined) item.sellerPart = normSellerPart

    // normalize isGood variants (default 1)
    const normIsGood = (item?.isGood !== undefined && item?.isGood !== null) ? item.isGood : (item?.is_good ?? 1)
    if (normIsGood !== undefined && normIsGood !== null) item.isGood = normIsGood

    itemForm.value = {
      qty: item.qty ?? null,
      sellerPart: item.sellerPart || '',
      customerFeedback: item.customerFeedback || '',
      isUnpacked: item.isUnpacked ?? 0,
      isGood: item.isGood ?? 1,
      iqcResult: item.iqcResult ?? '',
      dictId: item.dictId ?? null
    }
    // set selectedCategoryIndex based on item.dictId
    if (itemForm.value.dictId != null && Array.isArray(categories.value) && categories.value.length > 0) {
      const idx = categories.value.findIndex(d => (d.dictId == itemForm.value.dictId) || (d.dictName === item.customerFeedback) )
      selectedCategoryIndex.value = idx >= 0 ? idx : -1
    }
    console.log('loadItemForm 后 itemForm.iqcResult:', itemForm.value.iqcResult)

    // 加载商品图片（此调用会再次设置 itemImages）
    // Some environments/backend responses use `id` instead of `itemId`.
    // Prefer item.itemId but fallback to item.id, and normalize back to item.itemId for later use.
    const resolvedItemId = item.itemId || item.id || null
    if (resolvedItemId && !item.itemId) item.itemId = resolvedItemId
    await loadItemImages(resolvedItemId)
  }
}

// 加载商品图片
async function loadItemImages(itemId) {
  try {
    // Clear previous images immediately to avoid showing stale images while loading
    itemImages.value = []

    const result = await ApiHelper.get('/image/manage/grouped', {
      moduleType: 'ITEM',
      recordId: itemId
    })

    console.log('loadItemImages 调用返回:', { itemId, currentItemIndex: currentItemIndex.value, result })

    if (result && result.code === 1 && result.data) {
      const groupedImages = result.data

      // 加载商品图片 (ITEM_IMAGE)
      if (groupedImages.ITEM_IMAGE && Array.isArray(groupedImages.ITEM_IMAGE)) {
        const host = ApiHelper.getHost()
        itemImages.value = groupedImages.ITEM_IMAGE.map(img => {
          const imageUrl = img.imageUrl && img.imageUrl.startsWith('http') ? img.imageUrl : (host + (img.imageUrl || ''))
          const thumbnailUrl = img.thumbnailUrl && img.thumbnailUrl.startsWith('http') ? img.thumbnailUrl : (host + (img.thumbnailUrl || img.imageUrl || ''))
          return {
            id: img.id,
            imageUrl,
            thumbnailUrl,
            uploaded: true
          }
        })
        console.log('加载到 item 图片:', itemImages.value)
        try {
          // no debug UI writes; itemImages already set
        } catch (e) {}
      } else {
        // 没有该 item 的图片，确保为空
        itemImages.value = []
        try { /* no debug UI writes */ } catch (e) {}
      }
    } else {
      // 非正常返回，确保清空
      itemImages.value = []
      try { /* no debug UI writes */ } catch (e) {}
      try { uni.showToast({ title: '加载商品图片返回异常', icon: 'none', duration: 2000 }) } catch (e) {}
      const short = `itemId:${itemId} code:${result?.code} hasData:${!!result?.data}`
      showDebugMessage(truncate(short), 4000)
      try { /* no debug UI writes */ } catch (e) {}
    }
  } catch (error) {
    console.error('加载商品图片失败:', error)
    itemImages.value = []
    try { uni.showToast({ title: '加载商品图片失败: ' + (error?.message || ''), icon: 'none', duration: 2500 }) } catch (e) {}
    showDebugMessage(truncate('itemImages error: ' + (error?.message || '')), 4000)
  }
}

// 保存当前商品表单到临时数据
function saveCurrentItemForm() {
  if (currentItem.value) {
    Object.assign(currentItem.value, itemForm.value)
  }
}

// Qty校验
function validateQty() {
  const qty = parseInt(itemForm.value.qty)
  if (isNaN(qty) || qty < 0) {
    uni.showToast({ title: '请输入有效的数量', icon: 'none' })
    itemForm.value.qty = currentItem.value?.qty || 0
  } else {
    itemForm.value.qty = qty
  }
}

// 拆包状态改变
function onUnpackedChange(e) {
  itemForm.value.isUnpacked = parseInt(e.detail.value)
}

function onIsGoodChange(e) {
  itemForm.value.isGood = parseInt(e.detail.value)
}

// IQC结果输入处理
function onIqcResultInput(e) {
  const value = e.detail.value
  console.log('IQC结果输入:', value)
  itemForm.value.iqcResult = value
  console.log('itemForm.iqcResult 更新后:', itemForm.value.iqcResult)
  console.log('当前 currentItem:', currentItem.value)
  console.log('当前 currentItemIndex:', currentItemIndex.value)
}

// 上传单张图片到后端
async function uploadImage(filePath, moduleType, recordId, imageType) {
  return new Promise((resolve, reject) => {
    try {
      // 构建上传 URL
      const uploadUrl = ApiHelper.baseUrl + '/image/manage/upload'

      // 尝试从本地存储获取用户名，作为后端要求的 header
      let username = null
      try {
        const saved = uni.getStorageSync('loginUser')
        if (saved) {
          const u = JSON.parse(saved)
          username = u?.name || u?.username || null
        }
      } catch (e) {
        // ignore
      }

      const headers = ApiHelper.getAuthHeaders(username ? { username } : {})

      uni.uploadFile({
        url: uploadUrl,
        filePath,
        name: 'file',
        header: headers,
        formData: {
          moduleType,
          recordId,
          imageType
        },
        success: (uploadRes) => {
          try {
            const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
            if (data && data.code === 1) {
              resolve(data.data)
            } else {
              reject(new Error((data && data.msg) || '上传失败'))
            }
          } catch (err) {
            reject(err)
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

// 收货外观图片上传
async function chooseReceiverImage() {
  // 检查本地数量限制
  if (!canAddMoreReceiver.value) {
    uni.showToast({
      title: `最多只能上传${imageTypeConfig.PACKAGE_RECEIVER.max_count}张图片`,
      icon: 'none'
    })
    return
  }
  // 上传前先检查后端实际数量限制
  try {
    await ApiHelper.checkImageLimit('PARCEL', parcel.value.parcelId, 'PACKAGE_RECEIVER')
  } catch (error) {
    console.error('数量限制检查失败:', error)
    uni.showToast({
      title: error.message || '已达到图片数量限制，请稍后重试',
      icon: 'none',
      duration: 3000
    })
    // 重新加载图片确保前后端同步
    await loadImages(parcel.value.parcelId)
    return
  }

  uni.chooseImage({
    count: imageTypeConfig.PACKAGE_RECEIVER.max_count - receiverImages.value.length,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      for (const filePath of res.tempFilePaths) {
        // 添加临时图片显示
        const tempImg = {
          imageUrl: filePath,
          thumbnailUrl: filePath,
          uploaded: false,
          uploading: true
        }
        receiverImages.value.push(tempImg)

        try {
          // 上传到服务器
          const uploadResult = await uploadImage(
            filePath,
            'PARCEL',
            parcel.value.parcelId,
            'PACKAGE_RECEIVER'
          )

          // 更新为服务器URL（确保为绝对 URL）
          tempImg.id = uploadResult.id
          const host = ApiHelper.getHost()
          tempImg.imageUrl = uploadResult.imageUrl && uploadResult.imageUrl.startsWith('http') ? uploadResult.imageUrl : (host + (uploadResult.imageUrl || ''))
          tempImg.thumbnailUrl = uploadResult.thumbnailUrl && uploadResult.thumbnailUrl.startsWith('http') ? uploadResult.thumbnailUrl : (host + (uploadResult.thumbnailUrl || uploadResult.imageUrl || ''))
          tempImg.uploaded = true
          tempImg.uploading = false
        } catch (error) {
          console.error('上传失败:', error)
          // 移除失败的图片
          const index = receiverImages.value.indexOf(tempImg)
          if (index > -1) {
            receiverImages.value.splice(index, 1)
          }
          uni.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 图片选择
async function choosePackingImage() {
  // 检查本地数量限制
  if (!canAddMorePacking.value) {
    uni.showToast({
      title: `最多只能上传${imageTypeConfig.PACKING_LIST.max_count}张图片`,
      icon: 'none'
    })
    return
  }
  // 上传前先检查后端实际数量限制
  try {
    await ApiHelper.checkImageLimit('PARCEL', parcel.value.parcelId, 'PACKING_LIST')
  } catch (error) {
    console.error('数量限制检查失败:', error)
    uni.showToast({
      title: error.message || '已达到图片数量限制，请稍后重试',
      icon: 'none',
      duration: 3000
    })
    // 重新加载图片确保前后端同步
    await loadImages(parcel.value.parcelId)
    return
  }

  uni.chooseImage({
    count: imageTypeConfig.PACKING_LIST.max_count - packingListImages.value.length,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      for (const filePath of res.tempFilePaths) {
        // 添加临时图片显示
        const tempImg = {
          imageUrl: filePath,
          thumbnailUrl: filePath,
          uploaded: false,
          uploading: true
        }
        packingListImages.value.push(tempImg)

        try {
          // 上传到服务器
          const uploadResult = await uploadImage(
            filePath,
            'PARCEL',
            parcel.value.parcelId,
            'PACKING_LIST'
          )

          // 更新为服务器URL（确保为绝对 URL）
          tempImg.id = uploadResult.id
          const host = ApiHelper.getHost()
          tempImg.imageUrl = uploadResult.imageUrl && uploadResult.imageUrl.startsWith('http') ? uploadResult.imageUrl : (host + (uploadResult.imageUrl || ''))
          tempImg.thumbnailUrl = uploadResult.thumbnailUrl && uploadResult.thumbnailUrl.startsWith('http') ? uploadResult.thumbnailUrl : (host + (uploadResult.thumbnailUrl || uploadResult.imageUrl || ''))
           tempImg.uploaded = true
           tempImg.uploading = false
        } catch (error) {
          console.error('上传失败:', error)
          // 移除失败的图片
          const index = packingListImages.value.indexOf(tempImg)
          if (index > -1) {
            packingListImages.value.splice(index, 1)
          }
          uni.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

async function chooseItemImage() {
  // 检查本地数量限制
  if (!canAddMoreItem.value) {
    uni.showToast({
      title: `最多只能上传${imageTypeConfig.ITEM_IMAGE.max_count}张图片`,
      icon: 'none'
    })
    return
  }
  const item = currentItem.value
  if (!item) return
  // 上传前先检查后端实际数量限制
  try {
    await ApiHelper.checkImageLimit('ITEM', item.itemId, 'ITEM_IMAGE')
  } catch (error) {
    console.error('数量限制检查失败:', error)
    uni.showToast({
      title: error.message || '已达到图片数量限制，请稍后重试',
      icon: 'none',
      duration: 3000
    })
    // 重新加载图片确保前后端同步
    await loadItemImages(item.itemId)
    return
  }

  uni.chooseImage({
    count: imageTypeConfig.ITEM_IMAGE.max_count - itemImages.value.length,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      for (const filePath of res.tempFilePaths) {
        // 添加临时图片显示
        const tempImg = {
          imageUrl: filePath,
          thumbnailUrl: filePath,
          uploaded: false,
          uploading: true
        }
        itemImages.value.push(tempImg)

        try {
          // 上传到服务器
          const uploadResult = await uploadImage(
            filePath,
            'ITEM',
            item.itemId,
            'ITEM_IMAGE'
          )

          // 更新为服务器URL（确保为绝对 URL）
          tempImg.id = uploadResult.id
          const host = ApiHelper.getHost()
          tempImg.imageUrl = uploadResult.imageUrl && uploadResult.imageUrl.startsWith('http') ? uploadResult.imageUrl : (host + (uploadResult.imageUrl || ''))
          tempImg.thumbnailUrl = uploadResult.thumbnailUrl && uploadResult.thumbnailUrl.startsWith('http') ? uploadResult.thumbnailUrl : (host + (uploadResult.thumbnailUrl || uploadResult.imageUrl || ''))
           tempImg.uploaded = true
           tempImg.uploading = false
        } catch (error) {
          console.error('上传失败:', error)
          // 移除失败的图片
          const index = itemImages.value.indexOf(tempImg)
          if (index > -1) {
            itemImages.value.splice(index, 1)
          }
          uni.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

async function removeReceiverImage(index) {
  const img = receiverImages.value[index]

  try {
    // 如果是已上传的图片，先调用删除API
    if (img.id && img.uploaded) {
      await ApiHelper.deleteImage(img.id)

      // 删除成功后，等待后端数据库完全更新（避免立即上传时后端检查到旧数据）
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    // API删除成功后，再从本地数组中移除
    receiverImages.value.splice(index, 1)

    uni.showToast({
      title: '删除成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('删除图片失败:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'none'
    })
    // 如果删除失败，重新加载图片恢复状态
    await loadImages(parcel.value.parcelId)
  }
}

async function removePackingImage(index) {
  const img = packingListImages.value[index]

  try {
    // 如果是已上传的图片，先调用删除API
    if (img.id && img.uploaded) {
      await ApiHelper.deleteImage(img.id)

      // 删除成功后，等待后端数据库完全更新
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    // API删除成功后，再从本地数组中移除
    packingListImages.value.splice(index, 1)

    uni.showToast({
      title: '删除成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('删除图片失败:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'none'
    })
    // 如果删除失败，重新加载图片恢复状态
    await loadImages(parcel.value.parcelId)
  }
}

async function removeItemImage(index) {
  const img = itemImages.value[index]

  try {
    // 如果是已上传的图片，先调用删除API
    if (img.id && img.uploaded) {
      await ApiHelper.deleteImage(img.id)

      // 删除成功后，等待后端数据库完全更新
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    // API删除成功后，再从本地数组中移除
    itemImages.value.splice(index, 1)

    uni.showToast({
      title: '删除成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('删除图片失败:', error)
    uni.showToast({
      title: '删除失败',
      icon: 'none'
    })
    // 如果删除失败，重新加载图片恢复状态
    await loadItemImages(currentItem.value.itemId)
  }
}

// 预览原图
function previewImageFull(imageUrl) {
  if (!imageUrl) return
  const host = ApiHelper.getHost()
  const fullUrl = imageUrl.startsWith('http') ? imageUrl : (host + imageUrl)

  uni.previewImage({
    urls: [fullUrl],
    current: fullUrl
  })
}

// 检查图片 URL 在当前运行环境是否可访问（使用 uni.getImageInfo）
function checkImageAccessible(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false)
    try {
      uni.getImageInfo({
        src: url,
        success() { resolve(true) },
        fail(err) { console.warn('getImageInfo fail for', url, err); resolve(false) }
      })
    } catch (e) {
      console.warn('checkImageAccessible exception', e)
      resolve(false)
    }
  })
}

// 保存按钮点击处理（立即保存表单数据）
function handleSaveClick() {
  console.log('=== handleSaveClick 开始 ===')
  console.log('点击时 itemForm.iqcResult:', itemForm.value.iqcResult)

  // 立即保存表单数据到 currentItem
  saveCurrentItemForm()
  console.log('保存后 currentItem.iqcResult:', currentItem.value.iqcResult)

  // 调用实际的保存函数
  handleSave()
}

// 保存
async function handleSave() {
  try {
    // 设置保存标志，防止保存过程中表单被重新加载
    isSaving.value = true

    // 直接保存表单数据到 currentItem，并执行保存（不再弹出确认对话）
    saveCurrentItemForm()
    console.log('保存前 itemForm.iqcResult:', itemForm.value.iqcResult)
    console.log('保存前 currentItem.iqcResult:', currentItem.value.iqcResult)

    uni.showLoading({ title: '保存中...' })

    // 调用API保存当前item
    await saveItemToServer()

    uni.hideLoading()
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    })

    // 如果是最后一个商品，保存成功后返回列表页面
    if (currentItemIndex.value === itemCount.value - 1) {
      setTimeout(() => {
        isSaving.value = false
        uni.navigateBack()
      }, 1000)
    } else {
      // 非最后一个商品，保存后留在当前页面
      isSaving.value = false
    }
  } catch (error) {
    isSaving.value = false
    uni.hideLoading()
    console.error('保存失败:', error)
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    })
  }
}

// 保存商品到服务器
async function saveItemToServer() {
  const item = currentItem.value
  if (!item) return

  console.log('itemForm 完整对象:', JSON.stringify(itemForm.value))
  console.log('itemForm.iqcResult 原始值:', itemForm.value.iqcResult)
  console.log('item 对象:', JSON.stringify(item))

  const currentUserId = getCurrentUserId()

  if (!currentUserId) {
    throw new Error('无法获取用户信息，请重新登录')
  }

  const updateData = {
    itemId: item.itemId,
    qty: itemForm.value.qty,
    customerFeedback: itemForm.value.customerFeedback,
    // include sellerPart (商品名)
    sellerPart: itemForm.value.sellerPart || item.sellerPart || '',
    // include dictId from the category picker
    dictId: itemForm.value.dictId || item.dictId || null,
    isUnpacked: itemForm.value.isUnpacked,
    isGood: itemForm.value.isGood,
    iqcResult: itemForm.value.iqcResult || '',
    itemStatus: 1,
    ownerId: item.ownerId || parcel.value.ownerId || currentUserId,
    keeperId: currentUserId,
    receiveParcelId: parcel.value.parcelId,
    receivePackageNo: parcel.value.packageNo,
    receivedDate: new Date().toISOString().split('T')[0]
  }

  console.log('保存商品数据:', updateData)
  console.log('updateData.iqcResult:', updateData.iqcResult)

  // 附带已上传的商品图片ID，后端期望 item.itemImages 字段
  try {
    const imgs = itemImages.value || []
    updateData.itemImages = imgs
      .filter(i => i && i.id)
      .map(i => ({ id: i.id, url: i.imageUrl, name: i.originalName || '', type: 'ITEM_IMAGE' }))

    const res = await ApiHelper.put('/items', updateData)
    if (!(res && res.code === 1)) {
      throw new Error(res?.msg || '保存商品失败')
    }

    // 更新本地数据
    Object.assign(item, updateData)
  } catch (err) {
    console.error('调用保存商品接口失败:', err)
    throw err
  }
}

// 保存包裹（Step 1 的保存功能）
async function saveParcel() {
  try {
    if (!parcel.value || !parcel.value.parcelId) {
      uni.showToast({ title: '包裹数据缺失，无法保存', icon: 'none' })
      return
    }

    uni.showLoading({ title: '保存包裹中...' })

    // 发送 parcel 对象到后端更新
    const payload = Object.assign({}, parcel.value)
    const result = await ApiHelper.put('/parcels', payload)

    uni.hideLoading()
    if (result && result.code === 1) {
      uni.showToast({ title: '包裹保存成功', icon: 'success' })
      // 重新加载最新包裹数据
      await loadParcelDetail(parcel.value.parcelId)
    } else {
      uni.showToast({ title: result?.msg || '包裹保存失败', icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('保存包裹失败:', error)
    uni.showToast({ title: '包裹保存失败', icon: 'none' })
  }
}

// 提交
async function handleSubmit() {
  try {
    await uni.showModal({
      title: '确认',
      content: '确定要提交验收吗？这将标记包裹为已收货。'
    })

    uni.showLoading({ title: '提交中...' })

    // 步骤1: 保存当前 Item 数据
    console.log('步骤1: 保存当前 Item 数据')
    saveCurrentItemForm()
    await saveItemData()

    // 步骤2: 更新所有 Items 的状态
    console.log('步骤2: 更新所有 Items 的状态')
    await updateAllItems()

    // 步骤3: 更新 Parcel 状态为已收货
    console.log('步骤3: 更新 Parcel 状态为已收货')
    await updateParcelStatus()

    uni.hideLoading()
    uni.showToast({
      title: '验收成功',
      icon: 'success'
    })

    // 步骤4: 返回列表页面（列表页面的 onShow 会自动刷新）
    setTimeout(() => {
      uni.navigateBack({
        delta: 1
      })
    }, 1500)
  } catch (error) {
    uni.hideLoading()
    if (error !== 'cancel') {
      console.error('提交失败:', error)
      uni.showToast({
        title: '提交失败: ' + (error.message || '未知错误'),
        icon: 'none',
        duration: 2000
      })
    }
  }
}

// 保存当前 Item 数据
async function saveItemData() {
  const item = currentItem.value
  if (!item) {
    throw new Error('当前商品不存在')
  }

  const currentDate = new Date().toISOString().split('T')[0]
  const currentUserId = getCurrentUserId()

  if (!currentUserId) {
    console.error('用户信息:', userStore.userInfo)
    console.error('Storage 用户信息:', uni.getStorageSync('loginUser'))
    throw new Error('无法获取用户信息，请重新登录')
  }

  const updateData = {
    itemId: item.itemId,
    // 更新 item 的基本信息
    qty: itemForm.value.qty,
    // dictId from category picker
    dictId: itemForm.value.dictId || item.dictId || null,
    // include sellerPart (商品名)
    sellerPart: itemForm.value.sellerPart || item.sellerPart || '',
    // include isGood
    isGood: itemForm.value.isGood,
    customerFeedback: itemForm.value.customerFeedback || item.customerFeedback,
    isUnpacked: itemForm.value.isUnpacked,
    iqcResult: itemForm.value.iqcResult || '',
    // 标记为已检查
    itemStatus: 1,
    // 设置 owner 信息
    ownerId: item.ownerId || parcel.value.ownerId || currentUserId,
    // 设置 keeper 信息（当前用户）
    keeperId: currentUserId,
    // 设置 receive 信息
    receiveParcelId: parcel.value.parcelId,
    receivePackageNo: parcel.value.packageNo,
    receivedDate: currentDate
  }

  console.log('保存当前商品数据:', updateData)

    try {
      const result = await ApiHelper.put('/items', updateData)
      console.log('保存当前商品成功:', result)
      // 更新本地数据
      Object.assign(item, updateData)
    } catch (error) {
      console.error('保存当前商品失败:', error)
      throw new Error('保存当前商品失败')
    }
}

// 更新所有 Items 的状态
async function updateAllItems() {
  const itemList = parcel.value.items || parcel.value.itemList || []
  const currentDate = new Date().toISOString().split('T')[0]
  const currentUserId = getCurrentUserId()

  if (!currentUserId) {
    throw new Error('无法获取用户信息，请重新登录')
  }

  console.log(`开始更新所有商品状态，共 ${itemList.length} 个商品`)

  // 遍历所有 items，更新状态不是 1 的（未检查的）
  for (let i = 0; i < itemList.length; i++) {
    const item = itemList[i]

    // 跳过已检查的商品（状态为1）
    if (item.itemStatus === 1) {
      console.log(`商品 ${i + 1} (${item.itemNo}) 已检查，跳过`)
      continue
    }

    console.log(`更新商品 ${i + 1} (${item.itemNo}) 状态`)

    const updateData = {
      itemId: item.itemId,
      // 标记为已检查
      itemStatus: 1,
      // 设置 owner 信息
      ownerId: item.ownerId || parcel.value.ownerId || currentUserId,
      // 设置 keeper 信息（当前用户）
      keeperId: currentUserId,
      // 设置 receive 信息
      receiveParcelId: parcel.value.parcelId,
      receivePackageNo: parcel.value.packageNo,
      receivedDate: currentDate
    }

    try {
      const result = await ApiHelper.put('/items', updateData)
      console.log(`商品 ${i + 1} 更新成功:`, result)
      // 更新本地数据
      Object.assign(item, updateData)
    } catch (error) {
      console.error(`商品 ${i + 1} 更新失败:`, error)
      throw new Error(`更新商品 ${item.itemNo || i + 1} 失败`)
    }
  }

  console.log('所有商品状态更新完成')
}

// 更新 Parcel 状态为已收货
async function updateParcelStatus() {
  const currentDate = new Date().toISOString().split('T')[0]
  const updateData = {
    parcelId: parcel.value.parcelId,
    status: 2, // 2 = Received (已收货)
    receivedDate: currentDate
  }

  console.log('更新包裹状态:', updateData)

  try {
    const result = await ApiHelper.put('/parcels', updateData)
    console.log('更新包裹状态成功:', result)
    // 更新本地数据
    parcel.value.status = 2
    parcel.value.receivedDate = updateData.receivedDate
  } catch (error) {
    console.error('更新包裹状态失败:', error)
    throw new Error('更新包裹状态失败')
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f8f8;
}

.step-indicator {
  background: #fff;
  padding: 30rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #409EFF;
  border-bottom: 1rpx solid #eee;
}

/* debug styles removed */

.step-content {
  flex: 1;
  padding: 20rpx;
}

.info-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  margin-bottom: 20rpx;
  font-size: 28rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .label {
    width: 180rpx;
    color: #999;
  }

  .value {
    flex: 1;
    color: #333;
    font-weight: 500;
  }
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.photo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.photo-item {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  position: relative;
  overflow: hidden;

  image {
    width: 100%;
    height: 100%;
  }

  .delete-btn {
    position: absolute;
    top: -8rpx;
    right: -8rpx;
    width: 38rpx;
    height: 38rpx;
    background: #ff4d4f;
    color: #fff;
    border-radius: 50%;
    text-align: center;
    line-height: 38rpx;
    font-size: 24rpx;
    z-index: 10;
  }
}

.add-photo {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;

  .add-icon {
    font-size: 60rpx;
    line-height: 1;
  }

  .add-text {
    font-size: 24rpx;
    margin-top: 10rpx;
  }
}

.no-image {
  width: 100%;
  padding: 40rpx;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}

.list-header, .list-row {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.list-header {
  font-weight: 600;
  color: #666;
}

.list-row {
  background: #fff;
  color: #333;
}

.list-row .col, .list-header .col {
  flex: 1;
  padding: 0 10rpx;
  font-size: 28rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-itemno { flex: 2; }
.col-seller { flex: 4; }
.col-qty { flex: 1; text-align: right; }

.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.form-row {
  display: flex;
  gap: 20rpx;
}

.form-row .col {
  flex: 1;
}

.form-item {
  margin-bottom: 30rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 15rpx;
}

.form-value {
  display: block;
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.form-input {
  width: 100%;
  height: 70rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;

  &.readonly {
    background: #f5f5f5;
    color: #999;
  }
}

.form-textarea {
  width: 100%;
  min-height: 150rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.5;
}

.radio-group {
  display: flex;
  gap: 40rpx;
}

.radio-item {
  display: flex;
  align-items: center;
  font-size: 28rpx;

  radio {
    margin-right: 10rpx;
  }
}

.action-btns {
  display: flex;
  gap: 20rpx;
  padding: 30rpx 20rpx;
  background: #fff;

  .btn {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    font-size: 30rpx;
    border-radius: 12rpx;
    border: none;

    &::after {
      border: none;
    }

    &.btn-cancel, &.btn-default {
      background: #fff;
      border: 1rpx solid #ddd;
      color: #666;
    }

    &.btn-primary {
      background: #409EFF;
      color: #fff;
    }

    &.btn-success {
      background: #67C23A;
      color: #fff;
    }

    &.btn-warning {
      background: #E6A23C;
      color: #fff;
    }
  }
}

.empty-state {
  flex: 1;
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

/* Debug styles removed */
</style>
