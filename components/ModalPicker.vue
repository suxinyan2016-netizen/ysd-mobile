<template>
  <view v-if="show" class="modal-overlay" @click.self="onClose">
    <view class="modal bottom-sheet">
      <view class="modal-title">{{ title }}</view>
      <view class="modal-list">
        <view v-for="(opt, idx) in list" :key="idx" class="modal-item" @click="onSelect(idx)">{{ opt }}</view>
      </view>
      <view class="modal-cancel" @click="onClose">取消</view>
    </view>
  </view>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
const props = defineProps({ show: { type: Boolean, default: false }, title: { type: String, default: '' }, list: { type: Array, default: () => [] } })
const emits = defineEmits(['select', 'close'])
function onSelect(idx) { emits('select', idx) }
function onClose() { emits('close') }
</script>

<style scoped>
.modal-overlay { position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.35); display:flex; align-items:flex-end; justify-content:center; z-index:2000 }
.modal.bottom-sheet { width:100%; background:#fff; border-top-left-radius:16rpx; border-top-right-radius:16rpx; padding:20rpx }
.modal-title { font-size:28rpx; font-weight:600; color:#333; padding:10rpx 0 }
.modal-list { max-height:56vh; overflow:auto }
.modal-item { padding:18rpx 12rpx; font-size:22rpx; border-bottom:1rpx solid #f0f0f0; color:#333 }
.modal-cancel { padding:14rpx 0; text-align:center; color:#409EFF; font-size:22rpx }
</style>
