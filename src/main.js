import { createApp } from 'vue'; // Vue 3用のAPI
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(router);
app.mount('#app');
