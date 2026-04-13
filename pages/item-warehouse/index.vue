<template>
  <ItemQuery title="仓库库存" fixedParam="keeperId" otherPicker="owner" :showInspectButton="false"></ItemQuery>
</template>

<script setup>
import ItemQuery from '@/components/ItemQuery.vue'
</script>

<style scoped>
/* wrapper uses shared component styles */
</style>