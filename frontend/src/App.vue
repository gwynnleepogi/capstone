<template>
  <div class="layout">

    <!-- Mobile Header -->
    <div class="mobile-header">
      <h2>Property Inventory</h2>

      <button class="hamburger" @click="menuOpen = !menuOpen">
        <i class="bi bi-list"></i>
      </button>
    </div>


    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'show-menu': menuOpen }">

      <div class="sidebar-title">
        <h2>Property Inventory</h2>
      </div>

      <nav class="d-flex flex-column gap-2">

        <router-link to="/" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-grid"></i>
          Dashboard
        </router-link>

        <router-link to="/items" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-box"></i>
          Items
        </router-link>

        <router-link to="/offices" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-building"></i>
          Offices
        </router-link>

        <router-link to="/suppliers" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-truck"></i>
          Suppliers
        </router-link>

        <router-link to="/personnel" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-people"></i>
          Personnel
        </router-link>

        <router-link to="/request" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-file-earmark-text"></i>
          Item Requests
        </router-link>

        <router-link to="/receipts" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-receipt"></i>
          Receipts
        </router-link>

        <router-link to="/returns" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-arrow-return-left"></i>
          Returns
        </router-link>

        <router-link to="/incidents" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-exclamation-triangle"></i>
          Incidents
        </router-link>

        <router-link to="/audit-logs" class="nav-link" @click="menuOpen = false">
          <i class="bi bi-clock-history"></i>
          Audit Logs
        </router-link>

      </nav>

    </aside>


    <!-- Main Content -->
    <main class="content">
      <router-view/>
    </main>

  </div>
</template>


<script>
export default {

  name: 'App',

  data() {
    return {
      menuOpen: false
    }
  }

}
</script>


<style>

*{
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body{
  font-family: Arial, sans-serif;
}

.layout{
  display: flex;
  min-height: 100vh;
}


/* Sidebar */

.sidebar{
  width: 250px;
  min-height: 100vh;
  padding: 25px 15px;
  background: #2F5D3A;
  flex-shrink: 0;
}

.sidebar-title{
  text-align: center;
  margin-bottom: 30px;
}

.sidebar-title h2{
  color: white;
  font-size: 20px;
}

.sidebar .nav-link{
  color: white;
  text-decoration: none;
  padding: 11px 15px;
  border-radius: 6px;
  transition: .25s ease;
}

.sidebar .nav-link i{
  margin-right: 10px;
}

.sidebar .nav-link:hover{
  background: #4F7F52;
}

.sidebar .nav-link.router-link-active{
  background: #E8C547;
  color: #2F5D3A;
}


/* Content */

.content{
  flex: 1;
  min-width: 0;
  padding: 30px;
  background: #F7F5E8;
}


/* Mobile Header */

.mobile-header{
  display: none;
}


/* Mobile */

@media (max-width: 768px){

  .layout{
    display: block;
  }

  .mobile-header{
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #2F5D3A;
    padding: 12px 15px;
  }

  .mobile-header h2{
    color: white;
    font-size: 18px;
    margin: 0;
  }

  .hamburger{
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
  }

  .sidebar{
    display: none;
    width: 100%;
    min-height: auto;
    padding: 15px;
  }

  .sidebar.show-menu{
    display: block;
  }

  .sidebar-title{
    display: none;
  }

  .sidebar nav{
    gap: 5px !important;
  }

  .sidebar .nav-link{
    padding: 10px 12px;
  }

  .content{
    width: 100%;
    padding: 15px;
  }

}


/* Small phone */

@media (max-width: 480px){

  .content{
    padding: 12px;
  }

}

</style>