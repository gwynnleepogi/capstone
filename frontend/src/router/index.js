import { createRouter, createWebHistory } from 'vue-router'

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
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/items',
    name: 'Items',
    component: Items
  },
  {
    path: '/offices',
    name: 'Offices',
    component: Offices
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: Suppliers
  },
  {
    path: '/personnel',
    name: 'Personnel',
    component: Personnel
  },
  {
    path: '/request',
    name: 'ItemRequest',
    component: ItemRequests
  },
    {
    path: '/receipts',
    name: 'PropertyReceipts',
    component: PropertyReceipts
  },
  {
    path: '/returns',
    name: 'Returns',
    component: Returns
  },
  {
    path: '/incidents',
    name: 'Incidents',
    component: Incidents
  },
  {
    path: '/audit-logs',
    name: 'AuditSLogs',
    component: AuditLogs
  }
]
})

export default router
