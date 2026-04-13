import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp, createApp as createClientApp, h } from 'vue'
import { createPinia } from 'pinia'
import GlobalImageViewer from '@/components/GlobalImageViewer.vue'
export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // Mount a separate small app for the global image viewer so it is always present
  if (typeof document !== 'undefined'){
    try{
      const root = document.createElement('div')
      root.id = 'global-image-viewer-root'
      document.body.appendChild(root)
      const viewerApp = createClientApp({ render: () => h(GlobalImageViewer) })
      viewerApp.mount(root)
    }catch(e){ console.warn('mount global image viewer failed', e) }
  }

  return {
    app
  }
}
// #endif