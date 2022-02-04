import Vue from 'vue'
import Router from 'vue-router'
import User from './routes/User.vue'
import Screen from './routes/Screen.vue'
import Admin from "./routes/Admin";

Vue.use(Router)

export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            name: 'User',
            component: User
        },
        {
            path: '/screen',
            name: 'Screen',
            component: Screen
        },
        {
            path: '/admin',
            name: 'Admin',
            component: Admin
        }
    ]
})