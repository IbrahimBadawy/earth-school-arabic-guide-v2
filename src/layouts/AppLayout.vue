<script setup>
import { ref } from 'vue'
import AppBar from '@/components/common/AppBar.vue'
import AppSidebar from '@/components/common/AppSidebar.vue'

const sidebarVisible = ref(true)
const mobileMenuOpen = ref(false)

function toggleSidebar() {
  if (window.innerWidth <= 768) {
    mobileMenuOpen.value = !mobileMenuOpen.value
  } else {
    sidebarVisible.value = !sidebarVisible.value
  }
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div class="app-layout">
    <AppSidebar
      :visible="sidebarVisible"
      :mobileOpen="mobileMenuOpen"
      @close-mobile="closeMobileMenu"
    />
    <div class="main-content" :class="{ 'sidebar-collapsed': !sidebarVisible }">
      <AppBar @toggle-sidebar="toggleSidebar" :sidebarVisible="sidebarVisible" />
      <div class="page-container">
        <slot />
      </div>
    </div>
    <!-- Mobile overlay -->
    <div
      v-if="mobileMenuOpen"
      class="mobile-overlay"
      @click="closeMobileMenu"
    ></div>
  </div>
</template>

<style scoped>
.mobile-overlay {
  display: none;
}

@media (max-width: 768px) {
  .mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 998;
    animation: fadeIn 0.3s ease;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
