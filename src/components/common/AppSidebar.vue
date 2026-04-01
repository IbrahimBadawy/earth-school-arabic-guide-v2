<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { computed, onMounted } from 'vue'

defineProps({
  visible: Boolean,
  mobileOpen: Boolean
})
const emit = defineEmits(['close-mobile'])
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const contentStore = useContentStore()

onMounted(() => { contentStore.fetchLevels() })

const menuItems = computed(() => {
  const items = [
    { label: 'الرئيسية', icon: 'pi pi-home', to: '/', color: 'var(--primary-color)' },
    { type: 'divider', label: 'المستويات' },
  ]
  // Dynamic levels from DB
  ;(contentStore.levelsData || []).forEach(lvl => {
    items.push({ label: `${lvl.name} (${lvl.age_range})`, icon: lvl.icon, to: `/level/${lvl.id}`, color: lvl.color })
  })
  items.push(
    { type: 'divider', label: 'الدليل' },
    { label: 'الأهداف العامة والتفصيلية', icon: 'pi pi-flag', to: '/objectives', color: '#339AF0' },
    { label: 'أدوات التقييم', icon: 'pi pi-check-circle', to: '/assessment', color: '#51CF66' },
    { label: 'الأدوات والوسائل', icon: 'pi pi-wrench', to: '/tools', color: '#FF6B6B' },
    { label: 'مكتبة الأنشطة', icon: 'pi pi-palette', to: '/activities', color: '#FF9F43' },
    { type: 'divider', label: 'المساعدة' },
    { label: 'الأسئلة الشائعة ونصائح', icon: 'pi pi-question-circle', to: '/faq', color: '#20C997' },
    { type: 'divider', label: 'التصدير' },
    { label: 'تصدير وتقارير', icon: 'pi pi-file-export', to: '/export', color: '#845EF7' }
  )

  if (authStore.isAdmin) {
    items.push(
      { type: 'divider', label: 'الإدارة' },
      { label: 'إدارة المستخدمين', icon: 'pi pi-users', to: '/admin/users', color: '#E64980' },
      { label: 'إدارة المحتوى', icon: 'pi pi-cog', to: '/admin/content', color: '#FF9F43' },
      { label: 'التقارير', icon: 'pi pi-chart-bar', to: '/admin/reports', color: '#20C997' }
    )
  }

  return items
})

function isActive(path) {
  return route.path === path
}

function navigate(path) {
  router.push(path)
  emit('close-mobile')
}
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{ visible, 'mobile-open': mobileOpen }"
  >
    <div class="sidebar-header">
      <div class="school-logo">
        <img src="/LOGO.png" alt="مدرسة الأرض" class="sidebar-logo-img" />
        <div class="school-info">
          <h3>مدرسة الأرض</h3>
          <span class="school-subtitle">فقرة اللغة العربية</span>
        </div>
      </div>
    </div>

    <nav class="sidebar-nav">
      <template v-for="(item, index) in menuItems" :key="index">
        <div v-if="item.type === 'divider'" class="nav-divider">
          <span>{{ item.label }}</span>
        </div>
        <button
          v-else
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          @click="navigate(item.to)"
        >
          <span class="nav-icon" :style="{ color: item.color }">
            <i :class="item.icon"></i>
          </span>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="isActive(item.to)" class="active-indicator"></span>
        </button>
      </template>
    </nav>

    <div class="sidebar-footer">
      <div class="role-badge" :class="authStore.isAdmin ? 'admin' : 'teacher'">
        <i :class="authStore.isAdmin ? 'pi pi-shield' : 'pi pi-user'"></i>
        <span>{{ authStore.isAdmin ? 'مدير النظام' : 'معلمة' }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: white;
  border-left: 1px solid var(--border-color);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  overflow-y: auto;
}

.app-sidebar:not(.visible) {
  transform: translateX(100%);
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.school-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-logo-img {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
}

.logo-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-light);
  border-radius: 12px;
}

.school-info h3 {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin: 0;
}

.school-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.sidebar-nav {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.nav-divider {
  padding: 16px 12px 8px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  position: relative;
  text-align: right;
}

.nav-item:hover {
  background: var(--bg-color);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--primary-light);
  color: var(--primary-dark);
  font-weight: 600;
}

.nav-icon {
  width: 24px;
  text-align: center;
  font-size: 1rem;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-indicator {
  width: 4px;
  height: 20px;
  background: var(--primary-color);
  border-radius: 2px;
  position: absolute;
  right: -12px;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.role-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
}

.role-badge.admin {
  background: #FFF3E0;
  color: #E65100;
}

.role-badge.teacher {
  background: var(--primary-light);
  color: var(--primary-dark);
}

@media (max-width: 768px) {
  .app-sidebar {
    transform: translateX(100%);
  }
  .app-sidebar.mobile-open {
    transform: translateX(0);
  }
}
</style>
