<template>
  <view>
    <view class="drp-display" @click="openModal">
      <text>{{ displayText }}</text>
    </view>

    <view v-if="show" class="modal-overlay" @click.self="cancel">
      <view class="modal-box">
        <view class="modal-row">
          <text>开始日期</text>
          <view class="picker-val" @click="openStartPicker">{{ temp[0] || '请选择' }}</view>
        </view>
        <view class="modal-row">
          <text>结束日期</text>
          <view class="picker-val" @click="openEndPicker">{{ temp[1] || '请选择' }}</view>
        </view>
        <view class="modal-actions">
          <button class="btn" @click="cancel">取消</button>
          <button class="btn primary" @click="confirm">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
const props = defineProps({ modelValue: { type: Array, default: () => ['', ''] }, type: { type: String, default: 'date' }, placeholder: { type: String, default: '请选择日期范围' } })
const emit = defineEmits(['update:modelValue'])

const show = ref(false)
const temp = ref([props.modelValue[0] || '', props.modelValue[1] || ''])

watch(() => props.modelValue, (v) => { temp.value = [v && v[0] || '', v && v[1] || ''] })

const displayText = computed(() => {
  if (temp.value[0] && temp.value[1]) return `${temp.value[0]} ~ ${temp.value[1]}`
  return props.placeholder || '请选择日期范围'
})

function openModal(){ temp.value = [props.modelValue && props.modelValue[0] || '', props.modelValue && props.modelValue[1] || '']; show.value = true }
function openStartPicker(){
  try{
    uni.showDatePicker({ success: (res) => { if (res && res.value) temp.value[0] = res.value } })
  }catch(e){ /* ignore */ }
}
function openEndPicker(){
  try{
    uni.showDatePicker({ success: (res) => { if (res && res.value) temp.value[1] = res.value } })
  }catch(e){ /* ignore */ }
}
function confirm(){ emit('update:modelValue', [temp.value[0] || '', temp.value[1] || '']); show.value = false }
function cancel(){ show.value = false }
</script>

<style scoped>
.drp-display{ width:260rpx; height:56rpx; background:#fff; border-radius:8rpx; display:flex; align-items:center; padding:0 12rpx }
.modal-overlay{ position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:3000 }
.modal-box{ width:90%; background:#fff; border-radius:8rpx; padding:18rpx }
.modal-row{ display:flex; align-items:center; justify-content:space-between; padding:10rpx 0 }
.picker-val{ background:#f5f5f5; padding:8rpx 10rpx; border-radius:6rpx }
.modal-actions{ display:flex; justify-content:flex-end; gap:12rpx; margin-top:12rpx }
.btn{ padding:8rpx 18rpx; height:44rpx; border-radius:6rpx; background:#fff; border:1rpx solid #ececec }
.btn.primary{ background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff; border:none }
</style>
