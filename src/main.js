import {createApp} from 'vue';
import App from './App.vue';
import router from './router';
import VueCookies from 'vue-cookies';
import {LoadingPlugin} from 'vue-loading-overlay';
import 'vue-loading-overlay/dist/css/index.css';

const app = createApp(App);

app.use(router);
app.use(VueCookies)
app.use(LoadingPlugin);
app.mount('#app');
