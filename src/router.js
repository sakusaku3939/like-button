import Vue from 'vue'
import Router from 'vue-router'
import User from './routes/User.vue'
import Screen from './routes/Screen.vue'
import Admin from "./routes/Admin";
import Manage from "./routes/admin/Manage";
import Switch from "./routes/admin/Switch";

Vue.use(Router)

export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            component: User
        },
        {
            path: '/screen',
            component: Screen
        },
        {
            path: '/admin',
            component: Admin
        },
        {
            path: '/admin/manage',
            component: Manage
        },
        {
            path: '/admin/switch',
            component: Switch
        },
    ]
})