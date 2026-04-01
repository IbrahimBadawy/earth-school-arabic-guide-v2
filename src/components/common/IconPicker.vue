<script setup>
import { ref, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

const props = defineProps({ modelValue: String })
const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)
const search = ref('')

const iconCategories = {
  'تعليمي': [
    'pi pi-book', 'pi pi-pencil', 'pi pi-palette', 'pi pi-graduation-cap',
    'pi pi-lightbulb', 'pi pi-flag', 'pi pi-star', 'pi pi-star-fill',
    'pi pi-trophy', 'pi pi-bookmark', 'pi pi-bookmark-fill', 'pi pi-file',
    'pi pi-file-edit', 'pi pi-clipboard', 'pi pi-list', 'pi pi-list-check',
    'pi pi-check-circle', 'pi pi-check-square', 'pi pi-verified'
  ],
  'وسائط': [
    'pi pi-volume-up', 'pi pi-volume-down', 'pi pi-video', 'pi pi-image',
    'pi pi-images', 'pi pi-camera', 'pi pi-microphone', 'pi pi-play',
    'pi pi-play-circle', 'pi pi-headphones', 'pi pi-music'
  ],
  'أشخاص': [
    'pi pi-user', 'pi pi-users', 'pi pi-user-plus', 'pi pi-user-edit',
    'pi pi-id-card', 'pi pi-face-smile', 'pi pi-heart', 'pi pi-heart-fill',
    'pi pi-thumbs-up', 'pi pi-thumbs-down', 'pi pi-comments',
    'pi pi-comment', 'pi pi-megaphone', 'pi pi-envelope'
  ],
  'أدوات': [
    'pi pi-wrench', 'pi pi-cog', 'pi pi-sliders-h', 'pi pi-sliders-v',
    'pi pi-box', 'pi pi-briefcase', 'pi pi-building', 'pi pi-home',
    'pi pi-shopping-bag', 'pi pi-shopping-cart', 'pi pi-tag', 'pi pi-tags',
    'pi pi-key', 'pi pi-lock', 'pi pi-unlock', 'pi pi-link',
    'pi pi-paperclip', 'pi pi-print', 'pi pi-qrcode'
  ],
  'أشكال': [
    'pi pi-circle', 'pi pi-circle-fill', 'pi pi-stop', 'pi pi-stop-circle',
    'pi pi-th-large', 'pi pi-table', 'pi pi-tablet', 'pi pi-map',
    'pi pi-map-marker', 'pi pi-compass', 'pi pi-globe', 'pi pi-sun',
    'pi pi-moon', 'pi pi-cloud', 'pi pi-bolt', 'pi pi-sparkles'
  ],
  'حركة': [
    'pi pi-arrow-right', 'pi pi-arrow-left', 'pi pi-arrow-up', 'pi pi-arrow-down',
    'pi pi-arrows-h', 'pi pi-arrows-v', 'pi pi-sync', 'pi pi-refresh',
    'pi pi-undo', 'pi pi-replay', 'pi pi-expand', 'pi pi-compress',
    'pi pi-external-link', 'pi pi-directions', 'pi pi-directions-alt'
  ],
  'بيانات': [
    'pi pi-chart-bar', 'pi pi-chart-line', 'pi pi-chart-pie',
    'pi pi-percentage', 'pi pi-calculator', 'pi pi-calendar',
    'pi pi-clock', 'pi pi-stopwatch', 'pi pi-hourglass',
    'pi pi-history', 'pi pi-bell', 'pi pi-info-circle',
    'pi pi-question-circle', 'pi pi-exclamation-circle', 'pi pi-exclamation-triangle',
    'pi pi-search', 'pi pi-filter', 'pi pi-sort', 'pi pi-eye',
    'pi pi-eye-slash', 'pi pi-bars', 'pi pi-ellipsis-h', 'pi pi-ellipsis-v'
  ],
  'ملفات': [
    'pi pi-file', 'pi pi-file-edit', 'pi pi-file-export', 'pi pi-file-import',
    'pi pi-file-pdf', 'pi pi-file-word', 'pi pi-file-excel',
    'pi pi-folder', 'pi pi-folder-open', 'pi pi-inbox',
    'pi pi-download', 'pi pi-upload', 'pi pi-cloud-download', 'pi pi-cloud-upload',
    'pi pi-save', 'pi pi-copy', 'pi pi-clone', 'pi pi-trash',
    'pi pi-plus', 'pi pi-minus', 'pi pi-times', 'pi pi-check'
  ]
}

const allIcons = computed(() => {
  const all = []
  for (const [cat, icons] of Object.entries(iconCategories)) {
    icons.forEach(ic => all.push({ icon: ic, category: cat }))
  }
  return all
})

const filtered = computed(() => {
  if (!search.value) return iconCategories
  const q = search.value.toLowerCase()
  const result = {}
  for (const [cat, icons] of Object.entries(iconCategories)) {
    const matched = icons.filter(ic => ic.includes(q) || cat.includes(q))
    if (matched.length) result[cat] = matched
  }
  return result
})

function select(icon) {
  emit('update:modelValue', icon)
  showPicker.value = false
}
</script>

<template>
  <div class="icon-picker-wrap">
    <div class="icon-preview-btn" @click="showPicker = true">
      <i :class="modelValue || 'pi pi-box'" class="preview-icon"></i>
      <span class="preview-label">{{ modelValue || 'اختر أيقونة' }}</span>
      <i class="pi pi-chevron-down" style="font-size:0.7rem; color:var(--text-muted)"></i>
    </div>

    <Dialog v-model:visible="showPicker" header="اختر أيقونة" :style="{ width: '600px' }" modal>
      <InputText v-model="search" placeholder="ابحث عن أيقونة..." class="w-full search-box" />

      <div class="icon-gallery">
        <div v-for="(icons, category) in filtered" :key="category" class="icon-cat">
          <h4>{{ category }}</h4>
          <div class="icon-grid">
            <div
              v-for="icon in icons"
              :key="icon"
              class="icon-cell"
              :class="{ selected: modelValue === icon }"
              @click="select(icon)"
              v-tooltip.top="icon.replace('pi pi-', '')"
            >
              <i :class="icon"></i>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.icon-picker-wrap { width: 100%; }
.icon-preview-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; border: 1px solid var(--border-color);
  border-radius: 10px; cursor: pointer; background: white;
  transition: border-color 0.2s;
}
.icon-preview-btn:hover { border-color: var(--primary-color); }
.preview-icon { font-size: 1.2rem; color: var(--text-primary); }
.preview-label { flex: 1; font-size: 0.85rem; color: var(--text-secondary); }
.search-box { margin-bottom: 16px; }
.w-full { width: 100%; }
.icon-gallery { max-height: 400px; overflow-y: auto; }
.icon-cat { margin-bottom: 16px; }
.icon-cat h4 { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; }
.icon-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.icon-cell {
  width: 42px; height: 42px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: 2px solid transparent;
  background: var(--bg-color); transition: all 0.15s;
  font-size: 1.1rem; color: var(--text-secondary);
}
.icon-cell:hover { border-color: var(--primary-color); color: var(--primary-color); transform: scale(1.1); }
.icon-cell.selected { border-color: var(--primary-color); background: var(--primary-light); color: var(--primary-color); }
</style>
