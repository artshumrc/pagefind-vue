import { createRouter, createWebHistory } from 'vue-router';
import Index1 from '../Index1.vue';
import Index2 from '../Index2.vue';
import Home from '../Home.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home // Use a dedicated home component instead of App.vue
  },
  {
    path: '/index1',
    name: 'Index 1',
    component: Index1
  },
  {
    path: '/index2',
    name: 'Index 2',
    component: Index2
  }
];

const router = createRouter({
  history: createWebHistory('/'),
  routes
});

export default router;