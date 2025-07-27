import { createRouter, createWebHistory } from 'vue-router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import User from './routes/User.vue';
import Screen from './routes/Screen.vue';
import Admin from "./routes/Admin.vue";
import Manage from "./routes/admin/Manage.vue";
import Switch from "./routes/admin/Switch.vue";
import Comment from "./routes/admin/Comment.vue";
import Login from "./routes/admin/Login.vue";
import Live from "@/routes/Live.vue";
import Broadcast from "@/routes/Broadcast.vue";

const routes = [
    {
        path: '/',
        component: User,
        meta: { requireAuth: false },
    },
    {
        path: '/screen',
        component: Screen,
        meta: { requireAuth: false },
    },
    {
        path: '/live',
        component: Live,
        meta: { requireAuth: false },
    },
    {
        path: '/broadcast',
        component: Broadcast,
        meta: { requireAuth: true },
    },
    {
        path: '/admin/login',
        component: Login,
        meta: { requireAuth: false },
    },
    {
        path: '/admin',
        component: Admin,
        meta: { requireAuth: true },
    },
    {
        path: '/admin/manage',
        component: Manage,
        meta: { requireAuth: true },
    },
    {
        path: '/admin/switch',
        component: Switch,
        meta: { requireAuth: true },
    },
    {
        path: '/admin/comment',
        component: Comment,
        meta: { requireAuth: true },
    },
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

router.beforeEach((to, from, next) => {
    const auth = getAuth();
    if (to.path === '/admin/logout') {
        signOut(auth).then(() => next('/admin/login'));
    } else {
        const requiresAuth = to.matched.some(record => record.meta.requireAuth);
        if (requiresAuth) {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe(); // Auth state listenerを解除
                if (user) {
                    next();
                } else {
                    next('/admin/login');
                }
            });
        } else {
            next();
        }
    }
});

export default router;