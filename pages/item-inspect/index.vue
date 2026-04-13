<template>
  <ItemQuery title="商品查验" fixedParam="keeperId" otherPicker="owner" :inspect="true" :showInspectButton="false" />
</template>

<script setup>
import ItemQuery from '@/components/ItemQuery.vue'
</script>

<style scoped>
/* simple wrapper styles - reuse component styles */
.page-container{ height:100vh }
</style>
