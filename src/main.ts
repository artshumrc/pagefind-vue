import { createApp } from 'vue'
import App from './App.vue'
import router from './router'; // Import the router

createApp(App)
  .use(router) // Use the router instance in your Vue app
  .mount('#app');