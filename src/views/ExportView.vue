<script setup>
import { ref } from 'vue'
import { useContentStore } from '@/stores/content'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableRow, TableCell, Table, WidthType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

const toast = useToast()
const contentStore = useContentStore()

const selectedLevel = ref(null)
const selectedSections = ref(['objectives', 'activities', 'assessment', 'tools', 'session_pattern'])
const includeAllLevels = ref(false)
const exporting = ref(false)

const levelOptions = [
  { label: 'المستوى الأول', value: 1 },
  { label: 'المستوى الثاني', value: 2 },
  { label: 'المستوى الثالث', value: 3 }
]

const sectionOptions = [
  { label: 'الأهداف العامة والتفصيلية', value: 'objectives' },
  { label: 'الأنشطة', value: 'activities' },
  { label: 'أدوات التقييم', value: 'assessment' },
  { label: 'الأدوات والوسائل', value: 'tools' },
  { label: 'نمط الحصة', value: 'session_pattern' },
  { label: 'أهداف الاستماع والتحدث', value: 'listening' },
  { label: 'ملخص التدرّج', value: 'progression' }
]

async function exportToWord() {
  exporting.value = true
  try {
    const sections = []
    const levelsToExport = includeAllLevels.value ? [1, 2, 3] : (selectedLevel.value ? [selectedLevel.value] : [1, 2, 3])

    // Title page
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'مدرسة الأرض', bold: true, size: 48, font: 'Arial', rightToLeft: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }))
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'دليل معلمات اللغة العربية', bold: true, size: 36, font: 'Arial', rightToLeft: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }))
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'حقيبة المعلمة الشاملة لفقرة اللغة العربية', size: 24, font: 'Arial', rightToLeft: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }))

    // Unit Info
    sections.push(new Paragraph({
      children: [new TextRun({ text: 'معلومات الوحدة التعليمية', bold: true, size: 28, font: 'Arial', rightToLeft: true })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      spacing: { before: 300, after: 200 }
    }))
    const unitInfo = [
      'مدة الوحدة: 12 أسبوع',
      'عدد الحصص: مرتين في الأسبوع',
      'مدة الحصة: 45 دقيقة',
      'بداية كل حصة: قراءة قصة من مكتبة المدرسة'
    ]
    unitInfo.forEach(info => {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `• ${info}`, size: 22, font: 'Arial', rightToLeft: true })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 100 }
      }))
    })

    // Listening Goals
    if (selectedSections.value.includes('listening')) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'أهداف الاستماع والتحدث (مشتركة)', bold: true, size: 28, font: 'Arial', rightToLeft: true })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 300, after: 200 }
      }))
      contentStore.listeningGoals.forEach(goal => {
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: `${goal.stage}: `, bold: true, size: 22, font: 'Arial', rightToLeft: true }),
            new TextRun({ text: goal.goal, size: 22, font: 'Arial', rightToLeft: true })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 100 }
        }))
      })
    }

    // Per-level sections
    for (const lvl of levelsToExport) {
      const level = contentStore.getLevelData(lvl)
      if (!level) continue

      sections.push(new Paragraph({
        children: [new TextRun({ text: `${level.name} (${level.age_range})`, bold: true, size: 30, font: 'Arial', rightToLeft: true })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 400, after: 200 }
      }))

      sections.push(new Paragraph({
        children: [new TextRun({ text: level.description, size: 22, font: 'Arial', rightToLeft: true })],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 }
      }))

      // Objectives
      if (selectedSections.value.includes('objectives') && level.axes) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: 'المحاور والأهداف', bold: true, size: 26, font: 'Arial', rightToLeft: true })],
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200, after: 100 }
        }))
        level.axes.forEach(axis => {
          sections.push(new Paragraph({
            children: [new TextRun({ text: `${axis.name}: ${axis.description}`, bold: true, size: 22, font: 'Arial', rightToLeft: true })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 100, after: 50 }
          }))
          if (axis.sub_items) {
            axis.sub_items.forEach(item => {
              sections.push(new Paragraph({
                children: [new TextRun({ text: `  ✓ ${item}`, size: 20, font: 'Arial', rightToLeft: true })],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 50 }
              }))
            })
          }
        })
      }

      // Session Pattern
      if (selectedSections.value.includes('session_pattern')) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: 'نمط الحصة', bold: true, size: 26, font: 'Arial', rightToLeft: true })],
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200, after: 100 }
        }))
        const pattern = lvl === 3 ? level.session_patterns?.pattern_a?.steps : level.session_pattern
        if (pattern) {
          pattern.forEach(step => {
            sections.push(new Paragraph({
              children: [new TextRun({ text: `${step.order}. ${step.name} (${step.duration} دقيقة)`, size: 22, font: 'Arial', rightToLeft: true })],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 80 }
            }))
          })
        }
      }

      // Activities
      if (selectedSections.value.includes('activities')) {
        const acts = contentStore.getActivities(lvl)
        sections.push(new Paragraph({
          children: [new TextRun({ text: 'الأنشطة', bold: true, size: 26, font: 'Arial', rightToLeft: true })],
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200, after: 100 }
        }))
        for (const [category, catActivities] of Object.entries(acts)) {
          const catName = category === 'phonetic' ? 'الوعي الصوتي' : category === 'visual' ? 'الوعي البصري' : category === 'writing' ? 'الكتابة' : category === 'reading' ? 'القراءة' : category
          sections.push(new Paragraph({
            children: [new TextRun({ text: catName, bold: true, size: 24, font: 'Arial', rightToLeft: true })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 100, after: 80 }
          }))
          catActivities.forEach(act => {
            sections.push(new Paragraph({
              children: [
                new TextRun({ text: `• ${act.name}`, bold: true, size: 22, font: 'Arial', rightToLeft: true }),
                new TextRun({ text: ` (${act.duration} دقيقة - ${act.type})`, size: 20, font: 'Arial', rightToLeft: true })
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 50 }
            }))
            sections.push(new Paragraph({
              children: [new TextRun({ text: `  ${act.description}`, size: 20, font: 'Arial', rightToLeft: true })],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 50 }
            }))
            if (act.tools?.length) {
              sections.push(new Paragraph({
                children: [new TextRun({ text: `  الأدوات: ${act.tools.join('، ')}`, size: 18, font: 'Arial', rightToLeft: true, italics: true })],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 80 }
              }))
            }
          })
        }
      }

      // Assessment
      if (selectedSections.value.includes('assessment')) {
        const assess = contentStore.getAssessment(lvl)
        sections.push(new Paragraph({
          children: [new TextRun({ text: 'أدوات التقييم', bold: true, size: 26, font: 'Arial', rightToLeft: true })],
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200, after: 100 }
        }))
        for (const [cat, questions] of Object.entries(assess)) {
          const catName = cat === 'phonetic' ? 'الوعي الصوتي' : cat === 'visual' ? 'الوعي البصري' : cat === 'writing' ? 'الكتابة' : cat === 'reading' ? 'القراءة' : cat === 'linguistics' ? 'اللغويات' : cat
          sections.push(new Paragraph({
            children: [new TextRun({ text: catName, bold: true, size: 22, font: 'Arial', rightToLeft: true })],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 80, after: 50 }
          }))
          questions.forEach(q => {
            sections.push(new Paragraph({
              children: [new TextRun({ text: `  □ ${q}`, size: 20, font: 'Arial', rightToLeft: true })],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 50 }
            }))
          })
        }
      }
    }

    // Progression table
    if (selectedSections.value.includes('progression')) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'ملخص التدرّج بين المستويات', bold: true, size: 28, font: 'Arial', rightToLeft: true })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 300, after: 200 }
      }))
      contentStore.progressionTable.forEach(row => {
        sections.push(new Paragraph({
          children: [
            new TextRun({ text: `${row.dimension}: `, bold: true, size: 22, font: 'Arial', rightToLeft: true }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 50 }
        }))
        sections.push(new Paragraph({
          children: [new TextRun({ text: `  المستوى الأول: ${row.level1}`, size: 20, font: 'Arial', rightToLeft: true })],
          alignment: AlignmentType.RIGHT, spacing: { after: 30 }
        }))
        sections.push(new Paragraph({
          children: [new TextRun({ text: `  المستوى الثاني: ${row.level2}`, size: 20, font: 'Arial', rightToLeft: true })],
          alignment: AlignmentType.RIGHT, spacing: { after: 30 }
        }))
        sections.push(new Paragraph({
          children: [new TextRun({ text: `  المستوى الثالث: ${row.level3}`, size: 20, font: 'Arial', rightToLeft: true })],
          alignment: AlignmentType.RIGHT, spacing: { after: 100 }
        }))
      })
    }

    // Tools
    if (selectedSections.value.includes('tools')) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: 'الأدوات والوسائل التعليمية', bold: true, size: 28, font: 'Arial', rightToLeft: true })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 300, after: 200 }
      }))
      contentStore.toolsList.forEach(tool => {
        sections.push(new Paragraph({
          children: [new TextRun({ text: `• ${tool.name} (${tool.category}) - المستويات: ${tool.levels.join('، ')}`, size: 22, font: 'Arial', rightToLeft: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 60 }
        }))
      })
    }

    const doc = new Document({
      sections: [{
        properties: { bidi: true },
        children: sections
      }]
    })

    const blob = await Packer.toBlob(doc)
    const fileName = includeAllLevels.value ? 'دليل_معلمات_اللغة_العربية_كامل.docx' : `دليل_المستوى_${selectedLevel.value || 'كامل'}.docx`
    saveAs(blob, fileName)
    toast.add({ severity: 'success', summary: 'تم التصدير', detail: 'تم تصدير الملف بنجاح', life: 3000 })
  } catch (err) {
    console.error('Export error:', err)
    toast.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء التصدير', life: 5000 })
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="export-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-file-export" style="color: #845EF7"></i> تصدير وتقارير</h1>
      <p>تصدير محتوى الدليل إلى ملف Word أو طباعته</p>
    </div>

    <div class="export-grid">
      <!-- Export Options -->
      <div class="custom-card no-hover animate__animated animate__fadeInUp">
        <h2><i class="pi pi-sliders-h" style="color: #845EF7"></i> خيارات التصدير</h2>

        <div class="export-options">
          <div class="option-group">
            <label class="option-label">المستوى</label>
            <div class="level-option">
              <Checkbox v-model="includeAllLevels" :binary="true" inputId="allLevels" />
              <label for="allLevels" style="margin-right: 8px">تصدير جميع المستويات</label>
            </div>
            <Dropdown
              v-if="!includeAllLevels"
              v-model="selectedLevel"
              :options="levelOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="اختر المستوى"
              class="w-full"
              style="margin-top: 8px"
            />
          </div>

          <div class="option-group">
            <label class="option-label">الأقسام المطلوبة</label>
            <MultiSelect
              v-model="selectedSections"
              :options="sectionOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="اختر الأقسام"
              class="w-full"
              display="chip"
            />
          </div>

          <Button
            label="تصدير إلى Word"
            icon="pi pi-file-word"
            class="export-btn"
            :loading="exporting"
            @click="exportToWord"
            size="large"
          />

          <Button
            label="طباعة الصفحة الحالية"
            icon="pi pi-print"
            text
            class="print-btn"
            @click="window.print()"
          />
        </div>
      </div>

      <!-- Preview -->
      <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.1s">
        <h2><i class="pi pi-eye" style="color: #339AF0"></i> معاينة المحتوى</h2>
        <div class="preview-content">
          <div class="preview-item" v-for="section in sectionOptions" :key="section.value">
            <div class="preview-check">
              <i :class="selectedSections.includes(section.value) ? 'pi pi-check-circle' : 'pi pi-circle'"
                 :style="{ color: selectedSections.includes(section.value) ? '#51CF66' : 'var(--text-muted)' }"></i>
            </div>
            <span :style="{ color: selectedSections.includes(section.value) ? 'var(--text-primary)' : 'var(--text-muted)' }">
              {{ section.label }}
            </span>
          </div>

          <div class="preview-summary">
            <div class="summary-item">
              <i class="pi pi-file" style="color: #845EF7"></i>
              <span>المستويات: {{ includeAllLevels ? 'جميع المستويات (3)' : (selectedLevel ? `المستوى ${selectedLevel}` : 'غير محدد') }}</span>
            </div>
            <div class="summary-item">
              <i class="pi pi-list" style="color: #339AF0"></i>
              <span>الأقسام: {{ selectedSections.length }} من {{ sectionOptions.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

h2 {
  font-size: 1.15rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.level-option {
  display: flex;
  align-items: center;
  gap: 4px;
}

.w-full { width: 100%; }

.export-btn {
  background: #845EF7 !important;
  border-color: #845EF7 !important;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
}

.print-btn {
  height: 44px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-color);
  border-radius: 8px;
  font-size: 0.9rem;
}

.preview-summary {
  margin-top: 16px;
  padding: 16px;
  background: #F8F0FF;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .export-grid {
    grid-template-columns: 1fr;
  }
}
</style>
