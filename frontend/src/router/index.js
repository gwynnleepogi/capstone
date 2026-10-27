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
import Transfers from '@/views/Transfers.vue'
import Incidents from '@/views/Incidents.vue'
import ReturnProperty from '@/views/ReturnProperty.vue'
import ItemDetails from '@/views/ItemDetails.vue'
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
      path: '/public-item/:id',
      name: 'PublicItemDetails',
      redirect: to => ({
        name: 'Items',
        query: { item: to.params.id }
      })
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
    path: '/my-returns',
    name: 'ReturnProperty',
    component: ReturnProperty,
      meta: { roles: ['Teacher', 'Non-Teaching Staff'] }
  },
  {
    path: '/item-details/:id',
    name: 'ItemDetails',
    component: ItemDetails,
      meta: { roles: ['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'] }
  },
  {
    path: '/returns',
    name: 'Returns',
    component: Returns,
      meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/transfers',
    name: 'Transfers',
    component: Transfers,
      meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/incidents',
    name: 'Incidents',
    component: Incidents,
      meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/returns-incidents',
    name: 'ReturnIncidents',
    redirect: { name: 'Returns' },
      meta: { roles: ['Administrator', 'Personnel'] }
  },
  {
    path: '/audit-logs',
    name: 'AuditSLogs',
    component: AuditLogs,
      meta: { roles: ['Administrator', 'Personnel', 'Teacher', 'Non-Teaching Staff'] }
  }
]
})

router.beforeEach((to) => {
  if (to.meta.public) {
    return true
  }

  const token = localStorage.getItem('accessToken')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.name !== 'Login' && !token) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'Login' && token) {
    if (
      typeof to.query.redirect === 'string' &&
      to.query.redirect.startsWith('/') &&
      !to.query.redirect.startsWith('//')
    ) {
      return to.query.redirect
    }

    return { name: 'Dashboard' }
  }

  // Scanned item links point to /items?item=ID, but only Administrator / Personnel
  // can open the Items page. Everyone else gets the read-only details page.
  if (
    to.name === 'Items' &&
    typeof to.query.item === 'string' &&
    to.query.item &&
    (user?.role === 'Teacher' || user?.role === 'Non-Teaching Staff')
  ) {
    return { name: 'ItemDetails', params: { id: to.query.item } }
  }

  if (to.meta.roles && !to.meta.roles.includes(user?.role)) {
    return user?.role === 'Teacher' || user?.role === 'Non-Teaching Staff'
      ? { name: 'ItemRequest' }
      : { name: 'Dashboard' }
  }
})

export default router