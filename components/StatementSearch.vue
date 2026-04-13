<template>
  <view class="search-bar">
    <view class="user-picker">
      <view class="search-input" @click="showUserModal = true">{{ selectedUserName || placeholder }}</view>
    </view>
    <view class="date-input" @click="openStartPicker"><text>{{ startDate || '开始日期' }}</text></view>
    <view class="date-input" @click="openEndPicker"><text>{{ endDate || '结束日期' }}</text></view>
    <button class="search-btn" @click="onQueryClick">查询</button>

    <ModalPicker :show="showUserModal" title="请选择用户" :list="userListForModal" @select="onUserSelect" @close="showUserModal=false" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import ModalPicker from '@/components/ModalPicker.vue'

const props = defineProps({ users: { type: Array, default: () => [] }, placeholder: { type: String, default: '请选择人员' }, initialUserId: { type: [String,Number], default: null } })
const emits = defineEmits(['query','select'])

const showUserModal = ref(false)
const selectedUser = ref(null)
const startDate = ref((() => { const d = new Date(); return `${d.getFullYear()}-01-01`; })())
const endDate = ref((() => { const d = new Date(); return d.toISOString().slice(0,10); })())

const userListForModal = computed(() => (props.users || []).map(u => (u.name || u.username || String(u.userId || u.id || ''))))
const selectedUserName = computed(() => selectedUser.value ? (selectedUser.value.name||selectedUser.value.username||'') : '')

function onUserSelect(idx){ try{ const i = Number(idx); if (isNaN(i)) { showUserModal.value=false; return } selectedUser.value = props.users && props.users[i] ? props.users[i] : null; showUserModal.value=false; emits('select', selectedUser.value) }catch(e){ showUserModal.value=false } }

function formatDate(d){ if (!d) return null; try{ return (new Date(d)).toISOString().slice(0,10) }catch(e){ return null } }

function onQueryClick(){ emits('query', { selectedUser: selectedUser.value, startDate: formatDate(startDate.value), endDate: formatDate(endDate.value) }) }

// H5-friendly fallback date picker
function _fallbackHtmlDatePicker(initial, cb){ try{ const inp = document.createElement('input'); inp.type='date'; inp.style.position='fixed'; inp.style.left='10px'; inp.style.top='10px'; inp.style.opacity='0'; inp.style.zIndex='9999'; if(initial) inp.value = initial; document.body.appendChild(inp); const cleanup=()=>{ try{ if(inp && inp.parentNode) document.body.removeChild(inp) }catch(e){} }; const onChange=function(){ cb(inp.value); inp.removeEventListener('change', onChange); cleanup() }; inp.addEventListener('change', onChange); try{ inp.focus() }catch(e){} if(typeof inp.showPicker==='function'){ try{ inp.showPicker() }catch(e){} }else{ const ev1=new MouseEvent('mousedown',{bubbles:true}); const ev2=new MouseEvent('mouseup',{bubbles:true}); const ev3=new MouseEvent('click',{bubbles:true}); try{ inp.dispatchEvent(ev1); inp.dispatchEvent(ev2); inp.dispatchEvent(ev3) }catch(e){} } setTimeout(()=>{ try{ cleanup() }catch(e){} },6000) }catch(e){ cb(null) } }

function openStartPicker(){ try{ if (typeof uni !== 'undefined' && uni.showDatePicker){ uni.showDatePicker({ success: (res) => { if (res && res.value) startDate.value = res.value } }); return } _fallbackHtmlDatePicker(startDate.value, (v)=>{ if (v) startDate.value = v }) }catch(e){} }
function openEndPicker(){ try{ if (typeof uni !== 'undefined' && uni.showDatePicker){ uni.showDatePicker({ success: (res) => { if (res && res.value) endDate.value = res.value } }); return } _fallbackHtmlDatePicker(endDate.value, (v)=>{ if (v) endDate.value = v }) }catch(e){} }
</script>

<style scoped>
.search-bar{ display:flex; gap:8rpx; align-items:center; margin-bottom:12rpx }
.search-input{ flex:1; height:56rpx; background:#fff; border-radius:8rpx; display:flex; align-items:center; padding:0 12rpx }
.date-input{ width:160rpx; height:56rpx; background:#fff; border-radius:8rpx; display:flex; align-items:center; justify-content:center }
.search-btn{ width:120rpx; height:56rpx; background: linear-gradient(90deg,#409EFF,#66B1FF); color:#fff; border-radius:8rpx; display:flex; align-items:center; justify-content:center; font-size:20rpx }
</style>
