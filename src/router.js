import Vue from 'vue'
import Router from 'vue-router'
import User from './routes/User.vue'
import Screen from './routes/Screen.vue'
import Admin from "./routes/Admin";
import Manage from "./routes/admin/Manage";

Vue.use(Router)

export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            text: 'User',
            component: User
        },
        {
            path: '/screen',
            text: 'Screen',
            component: Screen
        },
        {
            path: '/admin',
            text: 'Admin',
            component: Admin
        },
        {
            path: '/admin/manage',
            text: 'Manage',
            component: Manage
        }
    ]
})