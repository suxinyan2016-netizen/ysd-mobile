<template>
  <ItemService ref="svc" :keeperId="keeperId" :itemStatus="itemStatus" :needTest="needTest" :isTested="isTested" :needRepair="needRepair" :isRepaired="isRepaired" />
</template>

<script setup>
import ItemService from '@/components/ItemService.vue'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const svc = ref(null)
const keeperId = ref(null)
const itemStatus = ref(null)
const needTest = ref(null)
const isTested = ref(null)
const needRepair = ref(null)
const isRepaired = ref(null)

// onLoad fires before onMounted and reliably receives URL params on all platforms
onLoad((opts) => {
  if (!opts) return
  if (opts.keeperId != null) keeperId.value = opts.keeperId
  // use != null (not truthy) so that "0" is captured correctly
  if (opts.itemStatus != null) itemStatus.value = opts.itemStatus
  if (opts.needTest != null) needTest.value = opts.needTest
  if (opts.isTested != null) isTested.value = opts.isTested
  if (opts.needRepair != null) needRepair.value = opts.needRepair
  if (opts.isRepaired != null) isRepaired.value = opts.isRepaired
})

function _handleFocus() {
  try{
    const flag = (typeof uni !== 'undefined' && uni.getStorageSync) ? uni.getStorageSync('itemServiceRefresh') : null
    if (flag) {
      try{ uni.removeStorageSync && uni.removeStorageSync('itemServiceRefresh') } catch(e){}
      if (svc.value && svc.value.load) svc.value.load()
    }
  }catch(e){}
}

onMounted(async () => {
  // params are already set by onLoad; nextTick ensures props are propagated to child before load()
  await nextTick()
  if (svc.value && svc.value.load) svc.value.load()

  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', _handleFocus)
    window.addEventListener('focus', _handleFocus)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('focus', _handleFocus)
})
</script>

<style scoped>
/* page wrapper minimal styles */
</style>
