<template>
  <view v-if="state.visible" class="global-image-viewer" @click.self="close">
    <swiper class="viewer-swiper" :current="state.index">
      <swiper-item v-for="(src, i) in state.images" :key="i" class="viewer-item">
        <image :src="src" mode="widthFix" class="viewer-image" />
      </swiper-item>
    </swiper>
    <view class="viewer-close" @click.stop="close">
      <svg class="viewer-close-icon" viewBox="0 0 1024 1024"><path fill="#fff" d="M512 470.4L806.4 176 848 217.6 553.6 512 848 806.4 806.4 848 512 553.6 217.6 848 176 806.4 470.4 512 176 217.6 217.6 176 512 470.4z"/></svg>
    </view>
  </view>
</template>

<script setup>
import state, { closeImageViewer } from '@/stores/imageViewer'
import { watch, onMounted } from 'vue'

console.log('[GlobalImageViewer] setup (module loaded)')

onMounted(() => {
  console.log('[GlobalImageViewer] mounted, initial visible=', state.visible)
})

watch(() => state.visible, (v) => { console.log('[GlobalImageViewer] visible ->', v, 'images:', state.images) }, { immediate: true })

function close() {
  console.log('[GlobalImageViewer] close called')
  closeImageViewer()
}
</script>

<style scoped>
.global-image-viewer{ position:fixed; left:0; right:0; top:0; bottom:0; background:#000; z-index:2147483647; display:flex; align-items:center; justify-content:center }
.viewer-swiper{ width:100%; height:100% }
.viewer-item{ display:flex; align-items:center; justify-content:center; height:100% }
.viewer-image{ width:100%; height:100% }
.viewer-close{ position:absolute; top:28rpx; right:24rpx; width:88rpx; height:88rpx; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.45); border-radius:44rpx }
.viewer-close-icon{ width:40rpx; height:40rpx }
</style>
