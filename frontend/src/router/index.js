import { createRouter, createWebHistory } from 'vue-router'

import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'
import Items from '@/views/Items.vue'
import Offices from '@/views/Offices.vue'
import Suppliers from '@/views/Suppliers.vue'
import Personnel from '@/views/Personnel.vue'
import ItemRequests from '@/views/ItemRequests.vue'
import PropertyReceipts from '@/views/PropertyReceipts.vue'
import Returns from '@/views/Returns.vue'
import Incidents from '@/views/Incidents.vue'
import AuditLogs from '@/views/AuditLogs.vue'


const router = createRouter({
  history: createWebHistory(),
  
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/items',
    name: 'Items',
    component: Items,
    meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/offices',
    name: 'Offices',
    component: Offices,
    meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: Suppliers,
    meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/personnel',
    name: 'Personnel',
    component: Personnel,
    meta: { roles: ['Administrator'] }
  },
  {
    path: '/request',
    name: 'ItemRequest',
    component: ItemRequests,
    meta: { roles: ['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'] }
  },
    {
    path: '/receipts',
    name: 'PropertyReceipts',
    component: PropertyReceipts,
    meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/returns',
    name: 'Returns',
    component: Returns,
    meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/incidents',
    name: 'Incidents',
    component: Incidents,
    meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/audit-logs',
    name: 'AuditSLogs',
    component: AuditLogs,
    meta: { roles: ['Administrator'] }
  }
]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('accessToken')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.name !== 'Login' && !token) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && token) {
    return { name: 'Dashboard' }
  }

  if (to.meta.roles && !to.meta.roles.includes(user?.role)) {
    return user?.role === 'Teacher' || user?.role === 'Non-Teaching Staff'
      ? { name: 'ItemRequest' }
      : { name: 'Dashboard' }
  }
})

export default router
