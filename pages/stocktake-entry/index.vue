<template>
  <view class="page-container">
    <view class="topbar">
      <view class="back" @click="goBack">
        <view class="back-icon">
          <view class="back-chevron"></view>
        </view>
      </view>
      <view class="title">盘点录入</view>
    </view>

    <scroll-view class="step-content" scroll-y>
      <view class="info-card">
        <text class="card-title">盘点信息</text>
        <view class="info-row">
          <text class="label">货架:</text>
          <text class="value">{{ stocktakeInfo.slot || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">盘点日期:</text>
          <text class="value">{{ formatDate(stocktakeInfo.stocktakeTime) }}</text>
        </view>
      </view>

      <view class="section">
        <view class="result-list">
          <view v-for="(item, index) in results" :key="item.resultId || index" class="result-item">
            <view class="item-header-row">
              <text class="item-index">{{ index + 1 }}</text>
            </view>
            <view class="item-row">
              <view class="item-field item-name-field">
                <text class="field-label">商品名:</text>
                <input class="form-input" v-model="item.itemName" placeholder="请输入商品名" />
              </view>
            </view>
            <view class="item-row">
              <view class="item-field item-qty-field">
                <text class="field-label">实盘数:</text>
                <input class="form-input" type="number" v-model="item.qty" placeholder="请输入数量" />
              </view>
              <view class="item-field item-remark-field">
                <text class="field-label">备注:</text>
                <input class="form-input" v-model="item.remark" placeholder="请输入备注" />
              </view>
              <button class="delete-btn" @click="deleteRow(index)">删除</button>
            </view>
          </view>
        </view>
        <view class="add-row">
          <button class="add-btn" @click="addRow">新增</button>
        </view>
      </view>

      <view class="action-btns">
        <button class="btn btn-close" @click="handleClose">关闭</button>
        <button class="btn btn-save" :disabled="isSaving" @click="handleSave">保存</button>
        <button class="btn btn-confirm" :disabled="isSaving" @click="handleConfirm">确认</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { ApiHelper } from '@/utils/apiHelper'
import { smartBack } from '@/utils/navigation'

const stocktakeId = ref(null)
const stocktakeInfo = ref({})
const results = ref([])
const isSaving = ref(false)

function getQueryParam(name){ try{ if (typeof getCurrentPages === 'function'){ const rp = getCurrentPages()[getCurrentPages().length-1]; const search = rp && rp.options ? rp.options : (rp && rp.$route && rp.$route.query ? rp.$route.query : {}); if (search && search[name]) return search[name] } if (typeof window !== 'undefined' && window.location) { const sp = new URLSearchParams(window.location.search); return sp.get(name) } }catch(e){} return null }

function formatDate(dateStr){
  if (!dateStr) return '-'
  try{
    const d = new Date(dateStr)
    return d.toISOString().split('T')[0]
  }catch(e){ return dateStr }
}

async function loadStocktakeInfo(){
  if (!stocktakeId.value) return
  try{
    const res = await ApiHelper.get(`/stocktakes/${stocktakeId.value}`)
    if (res && res.code === 1 && res.data){
      stocktakeInfo.value = res.data
    }
  }catch(e){ console.error('load stocktake info failed', e) }
}

async function loadResults(){
  if (!stocktakeId.value) return
  try{
    const res = await ApiHelper.get(`/stocktakes/${stocktakeId.value}/results`)
    if (res && res.code === 1 && res.data){
      results.value = Array.isArray(res.data) ? res.data : []
    }
  }catch(e){ console.error('load results failed', e) }
}

function addRow(){
  results.value.push({
    itemName: '',
    qty: null,
    remark: '',
    resultId: null,
    stocktakeId: stocktakeId.value
  })
  // 滚动到底部
  setTimeout(() => {
    uni.pageScrollTo({
      scrollTop: 999999,
      duration: 300
    })
  }, 100)
}

function deleteRow(index){
  results.value.splice(index, 1)
}

async function handleSave(){ if (isSaving.value) return; 
  // 校验商品名重复
  const nameMap = {}
  for (let i = 0; i < results.value.length; i++) {
    const name = results.value[i].itemName?.trim()
    if (name) {
      if (nameMap[name]) {
        uni.showToast({ title: `商品名"${name}"重复，请修改`, icon: 'none' })
        return
      }
      nameMap[name] = true
    }
  }
  isSaving.value = true; uni.showLoading({ title: '保存中...' })
  try{
    const payload = { results: results.value }
    const res = await ApiHelper.put(`/stocktakes/${stocktakeId.value}/results`, payload)
    if (!(res && res.code === 1)) { const serverMsg = res && (res.msg || res.message || JSON.stringify(res)); uni.hideLoading(); uni.showToast({ title: '保存失败: ' + (serverMsg || ''), icon: 'none' }); return }
    uni.hideLoading(); uni.showToast({ title: '保存成功', icon: 'success' })
  }catch(e){ console.error(e); uni.hideLoading(); uni.showToast({ title: '保存失败: ' + (e?.message||''), icon: 'none' }) }
  finally{ isSaving.value = false }
}

async function handleConfirm(){ if (isSaving.value) return; 
  uni.showModal({
    title: '确认提交',
    content: '是否确认提交盘点结果？',
    success: async (res) => {
      if (res.confirm) {
        isSaving.value = true
        uni.showLoading({ title: '提交中...' })
        try{
          const confirmRes = await ApiHelper.put(`/stocktakes/${stocktakeId.value}/confirm`)
          if (!(confirmRes && confirmRes.code === 1)) { const serverMsg = confirmRes && (confirmRes.msg || confirmRes.message || JSON.stringify(confirmRes)); uni.hideLoading(); uni.showToast({ title: '提交失败: ' + (serverMsg || ''), icon: 'none' }); return }
          uni.hideLoading(); uni.showToast({ title: '提交成功', icon: 'success' })
          try{ uni.setStorageSync && uni.setStorageSync('stocktakeListRefresh', Date.now()) }catch(e){}
          setTimeout(()=>{ try{ uni.navigateBack() }catch(e){} }, 400)
        }catch(e){ console.error(e); uni.hideLoading(); uni.showToast({ title: '提交失败: ' + (e?.message||''), icon: 'none' }) }
        finally{ isSaving.value = false }
      }
    }
  })
}

function handleClose(){ smartBack() }

onLoad((opts) => {
  if (!opts) return
  if (opts.stocktakeId) stocktakeId.value = opts.stocktakeId
})

import { onMounted } from 'vue'
onMounted(() => { 
  loadStocktakeInfo()
  loadResults() 
})
</script>

<style scoped>
.page-container { height:100vh; display:flex; flex-direction:column; background:#f8f8f8; padding-top:88rpx }
.topbar { height:88rpx; background:#082567; color:#fff; display:flex; align-items:center; justify-content:center; position:fixed; top:0; left:0; right:0; z-index:999 }
.topbar .title { color:#fff; font-size:34rpx; font-weight:700 }
.topbar .back { position:absolute; left:12rpx; top:50%; transform:translateY(-50%); z-index:1001; }
.topbar .back-icon { width:56rpx; height:56rpx; background:rgba(255,255,255,0.12); border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6rpx 16rpx rgba(0,0,0,0.18); cursor:pointer }
.back-chevron{ width:18rpx; height:18rpx; border-top:4rpx solid #fff; border-left:4rpx solid #fff; transform:rotate(-45deg); margin-left:8rpx; box-sizing:border-box }
.step-content { flex:1; padding:20rpx }
.info-card { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.card-title { display:block; font-size:30rpx; font-weight:700; color:#333; margin-bottom:12rpx }
.info-row { display:flex; justify-content:flex-start; align-items:center; gap:12rpx; padding:9rpx 0; border-bottom:none; font-size:24rpx }
.info-row:last-child { padding-bottom:0 }
.label { width:160rpx; color:#666; margin-right:12rpx; text-align:left; font-size:22rpx }
.value { flex:1; color:#333; font-size:24rpx }
.section { background:#fff; border-radius:16rpx; padding:30rpx; margin-bottom:20rpx }
.add-row { display:flex; justify-content:center; padding-top:20rpx }
.add-btn { background:#9254de; color:#fff; border:none; padding:0 80rpx; height:60rpx; line-height:60rpx; border-radius:8rpx; font-size:26rpx }
.result-list { display:flex; flex-direction:column; gap:16rpx }
.result-item { background:#f7f9ff; border-radius:12rpx; padding:20rpx }
.item-header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12rpx }
.item-index { font-size:22rpx; font-weight:600; color:#9254de }
.item-row { display:flex; align-items:center; gap:12rpx; margin-bottom:12rpx }
.item-row:last-child { margin-bottom:0 }
.item-field { display:flex; align-items:center; flex:1 }
.item-name-field { flex:1 }
.item-qty-field { flex:0 0 160rpx }
.item-remark-field { flex:1 }
.field-label { width:80rpx; color:#666; font-size:22rpx; flex-shrink:0 }
.form-input { flex:1; height:60rpx; border:1rpx solid #e6e6e6; border-radius:6rpx; padding:0 12rpx; font-size:22rpx }
.delete-btn { background:#ff4d4f; color:#fff; border:none; padding:0 20rpx; height:48rpx; line-height:48rpx; border-radius:6rpx; font-size:20rpx; flex-shrink:0 }
.action-btns { display:flex; gap:20rpx; padding:20rpx 0 0 0; margin-top:20rpx }
.action-btns .btn { flex:1; height:60rpx; line-height:60rpx; font-size:26rpx; border-radius:8rpx; border:none; padding:0 40rpx }
.btn-close { background:#fff; border:1rpx solid #ddd; color:#666 }
.btn-save { background:#409EFF; color:#fff }
.btn-confirm { background:#67C23A; color:#fff }
</style>
