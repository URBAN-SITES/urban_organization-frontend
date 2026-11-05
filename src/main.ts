import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vue-sonner/style.css'

import App from './App.vue'
import { installBootSplash, installStaleChunkReload } from './app/boot'
import router from './app/router'

const app = createApp(App)

app.use(createPinia())
// before app.use(router): the first navigation starts while the router is installed
installBootSplash(router)
installStaleChunkReload(router)
app.use(router)

app.mount('#app')
