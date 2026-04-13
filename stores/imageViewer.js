import { reactive } from 'vue'

const state = reactive({
  visible: false,
  images: [],
  index: 0,
})

export function openImageViewer(images = [], index = 0) {
  console.log('[imageViewer] openImageViewer called, images:', images, 'index:', index)
  state.images = images
  state.index = index || 0
  state.visible = true
  // Fallback for environments where the global component didn't mount or is not visible:
  // after a short delay, if the global viewer DOM isn't present, call native/web preview.
  setTimeout(() => {
    try{
      if (typeof document !== 'undefined'){
        const el = document.querySelector('.global-image-viewer')
        if (!el) {
          console.warn('[imageViewer] global viewer not found in DOM — falling back to uni.previewImage')
          if (typeof uni !== 'undefined' && typeof uni.previewImage === 'function'){
            uni.previewImage({ urls: images, current: index || 0 })
          }
        }
      }
    }catch(e){ console.warn('[imageViewer] fallback preview error', e) }
  }, 120)
}

export function closeImageViewer() {
  console.log('[imageViewer] closeImageViewer called')
  state.visible = false
  state.images = []
  state.index = 0
}

export default state
