import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vue-sonner/style.css'

import App from './App.vue'
import router from './app/router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
