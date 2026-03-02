import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(createPinia()) // Pinia debe registrarse ANTES del router
app.use(router)

app.mount('#app')
