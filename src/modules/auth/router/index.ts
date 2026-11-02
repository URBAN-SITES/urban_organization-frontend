import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * Sign-up and password recovery show the image panel on the right instead of the left;
     * switching sides from the login slides the panel across (see AuthShell).
     */
    authAsideRight?: boolean
    /** Office photo shown in the institutional panel. */
    authScene?: 'executive' | 'workstation' | 'boardroom'
  }
}

export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth',
    redirect: { name: 'Login' },
    meta: { requiresAuth: false, guestOnly: true, transitionGroup: 'auth' },
    component: () => import('../components/AuthShell.vue'),
    children: [
      {
        path: '/entrar',
        name: 'Login',
        component: () => import('../views/LoginView.vue'),
      },
      {
        path: '/registrar',
        name: 'Register',
        meta: { authAsideRight: true, authScene: 'workstation' },
        component: () => import('../views/RegisterView.vue'),
      },
      {
        path: '/registrar/codigo',
        name: 'RegisterCode',
        meta: { authAsideRight: true, authScene: 'workstation' },
        component: () => import('../views/VerifyCodeView.vue'),
        props: { flow: 'register' },
      },
      {
        path: '/esqueci-senha',
        name: 'ForgotPassword',
        meta: { authAsideRight: true, authScene: 'boardroom' },
        component: () => import('../views/ForgotPasswordView.vue'),
      },
      {
        path: '/esqueci-senha/codigo',
        name: 'ResetCode',
        meta: { authAsideRight: true, authScene: 'boardroom' },
        component: () => import('../views/VerifyCodeView.vue'),
        props: { flow: 'reset' },
      },
      {
        path: '/esqueci-senha/nova-senha',
        name: 'ResetPassword',
        meta: { authAsideRight: true, authScene: 'boardroom' },
        component: () => import('../views/ResetPasswordView.vue'),
      },
    ],
  },
]
