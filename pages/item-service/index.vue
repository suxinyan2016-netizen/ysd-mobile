<template>
  <ItemService ref="svc" :keeperId="keeperId" :itemStatus="itemStatus" :needTest="needTest" :isTested="isTested" :needRepair="needRepair" :isRepaired="isRepaired" />
</template>

<script setup>
import ItemService from '@/components/ItemService.vue'
import { ref, onMounted } from 'vue'
const svc = ref(null)
const keeperId = ref(null)
const itemStatus = ref(null)
const needTest = ref(null)
const isTested = ref(null)
const needRepair = ref(null)
const isRepaired = ref(null)

function parseParams() {
  try{
    if (typeof getCurrentPages === 'function'){
      const pages = getCurrentPages() || []
      const current = pages[pages.length-1] || {}
      const opts = current.options || {}
      if (opts.keeperId) keeperId.value = opts.keeperId
      if (typeof opts.itemStatus !== 'undefined') itemStatus.value = opts.itemStatus
      if (typeof opts.needTest !== 'undefined') needTest.value = opts.needTest
      if (typeof opts.isTested !== 'undefined') isTested.value = opts.isTested
      if (typeof opts.needRepair !== 'undefined') needRepair.value = opts.needRepair
      if (typeof opts.isRepaired !== 'undefined') isRepaired.value = opts.isRepaired
    } else {
      const params = (function(){ try{ const q = new URLSearchParams(window.location.search); return q }catch(e){ return null } })()
      if (params){ if (params.get('keeperId')) keeperId.value = params.get('keeperId'); if (params.get('itemStatus')) itemStatus.value = params.get('itemStatus') }
    }
  }catch(e){ console.warn('parse route params failed', e) }
}

onMounted(()=>{
  parseParams()
  // initial load
  if (svc.value && svc.value.load) svc.value.load()

  // handle focus navigation and storage-based refresh flag
  const handleFocus = () => {
    parseParams()
    try{
      const flag = (typeof uni !== 'undefined' && uni.getStorageSync) ? uni.getStorageSync('itemServiceRefresh') : null
      if (flag) {
        try{ uni.removeStorageSync && uni.removeStorageSync('itemServiceRefresh') } catch(e){}
          if (svc.value && svc.value.load) return svc.value.load()
      }
    }catch(e){}
    // do not reload on every focus to avoid spurious list queries when navigating
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('focus', handleFocus)
  }
})
</script>

<style scoped>
/* page wrapper minimal styles */
</style>
