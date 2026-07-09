<template>
  <ItemQuery title="货主库存" fixedParam="ownerId" otherPicker="keeper"></ItemQuery>
</template>

<script setup>
import ItemQuery from '@/components/ItemQuery.vue'
import { onShow } from '@dcloudio/uni-app'

onShow(() => {
  try { uni.$emit('itemQueryRefresh') } catch(e) {}
})
</script>

<style scoped>
/* wrapper uses shared component styles */
</style>