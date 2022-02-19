import Vue from 'vue'
import Router from 'vue-router'
import User from './routes/User.vue'
import Screen from './routes/Screen.vue'
import Admin from "./routes/Admin";
import Manage from "./routes/admin/Manage";
import Switch from "./routes/admin/Switch";
import Comment from "./routes/admin/Comment";
import Login from "./routes/admin/Login";
import {getAuth, onAuthStateChanged, signOut} from "firebase/auth";

Vue.use(Router)

const router = new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            component: User,
            meta: {requireAuth: false},
        },
        {
            path: '/screen',
            component: Screen,
            meta: {requireAuth: false},
        },
        {
            path: '/admin/login',
            component: Login,
            meta: {requireAuth: false},
        },
        {
            path: '/admin',
            component: Admin,
            meta: {requireAuth: true},
        },
        {
            path: '/admin/manage',
            component: Manage,
            meta: {requireAuth: true},
        },
        {
            path: '/admin/switch',
            component: Switch,
            meta: {requireAuth: true},
        },
        {
            path: '/admin/comment',
            component: Comment,
            meta: {requireAuth: true},
        },
    ]
})

router.beforeEach((to, from, next) => {
    const auth = getAuth();
    if (to.path === "/admin/logout") {
        signOut(auth).then(() => next("/admin/login"));
    } else {
        const requiresAuth = to.matched.some(record => Object(record.meta).requireAuth);
        if (requiresAuth) {
            onAuthStateChanged(auth, (user) => {
                if (user) next(); else next('/admin/login');
            });
        } else {
            next();
        }
    }
})

export default router;