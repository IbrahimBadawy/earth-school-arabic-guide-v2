<script setup>
import { useContentStore } from '@/stores/content'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

const contentStore = useContentStore()
const levels = contentStore.levelsData
const listeningGoals = contentStore.listeningGoals
const progression = contentStore.progressionTable
</script>

<template>
  <div class="objectives-view">
    <div class="page-header animate__animated animate__fadeIn">
      <h1><i class="pi pi-flag" style="color: var(--primary-color)"></i> الأهداف العامة والتفصيلية</h1>
      <p>منهج تعليم اللغة العربية الفصحى للأطفال - منهج تصاعدي من ثلاث مستويات</p>
    </div>

    <!-- Listening & Speaking Goals -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-volume-up" style="color: #339AF0"></i> أهداف الاستماع والتحدث (مشتركة بين المستويات الثلاث)</h2>
      <p class="section-desc">المستويات مرتبة تصاعدياً من التعرّض السلبي إلى الإنتاج الفعّال</p>
      <div class="goals-timeline">
        <div
          v-for="(goal, idx) in listeningGoals"
          :key="idx"
          class="goal-item stagger-item"
          :style="{ animationDelay: `${idx * 0.08}s` }"
        >
          <div class="goal-stage-badge">{{ goal.stage }}</div>
          <p>{{ goal.goal }}</p>
        </div>
      </div>
    </div>

    <!-- Reading & Writing Goals per Level -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-book" style="color: #51CF66"></i> أهداف القراءة والكتابة (حسب المستوى)</h2>

      <TabView>
        <TabPanel v-for="level in levels" :key="level.id" :header="level.name">
          <div class="level-objectives" :style="{ '--lc': level.color }">
            <!-- Level 1 specific -->
            <template v-if="level.id === 1">
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="الوعي الصوتي" /></h3>
                <ul class="obj-list">
                  <li>يميّز صوت الحرف منفرداً وفي أول الكلمة</li>
                  <li>يطابق بين كلمات تبدأ بنفس الصوت</li>
                </ul>
              </div>
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="الوعي البصري" /></h3>
                <ul class="obj-list">
                  <li>يربط بين صوت الحرف وشكله منفرداً</li>
                  <li>يستخرج الحرف من شريط التهجئة</li>
                  <li>يتعرّف على اتجاه رسم الحرف بإصبعه</li>
                </ul>
              </div>
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="ما قبل الكتابة" /></h3>
                <ul class="obj-list">
                  <li>يكوّن الخطوط الأساسية المكوّنة للحروف (رأسي، أفقي، منحني، منكسر، دائرة) باستخدام الصلصال والألوان والأصابع</li>
                  <li>يعبّر عن أفكاره برسوم مفهومة له</li>
                </ul>
              </div>
            </template>

            <!-- Level 2 specific -->
            <template v-if="level.id === 2">
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="الوعي الصوتي" /></h3>
                <ul class="obj-list">
                  <li>يحلّل الأصوات القصيرة في الكلمة</li>
                  <li>يدمج صوتين أو ثلاثة لتكوين كلمة</li>
                  <li>يدرك مفهوم الكلمة المنطوقة بعد دمج الأصوات</li>
                  <li>يدرك الأصوات القصيرة الثلاثة للحرف (الحركات: فتحة، ضمة، كسرة)</li>
                </ul>
              </div>
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="الوعي البصري" /></h3>
                <ul class="obj-list">
                  <li>يميّز بين الحروف المتشابهة شكلاً</li>
                  <li>يميّز الحرف بأشكاله الثلاثة (أول، وسط، آخر)</li>
                  <li>يختار الشكل المناسب للحرف في المكان المناسب بصرياً</li>
                  <li>يقرأ كلمات ثنائية وثلاثية</li>
                  <li>يستعين بشريط التهجئة</li>
                </ul>
              </div>
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="الكتابة" /></h3>
                <ul class="obj-list">
                  <li>يكتب الحروف في صورتها المنفصلة المصطلح عليها</li>
                  <li>يميّز الاتجاه الصحيح للكتابة</li>
                  <li>يكتب معظم أو كل أصوات الكلمة بصورتها المنفصلة أو ببعض الاتصال</li>
                  <li>يصف أفكاره برسوم وكلمة أو حرف يعبّر عنها</li>
                </ul>
              </div>
            </template>

            <!-- Level 3 specific -->
            <template v-if="level.id === 3">
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="القراءة" /></h3>
                <ul class="obj-list">
                  <li>يميّز بين الحروف المتشابهة في المخرج</li>
                  <li>يفرّق بين الصوت الطويل والقصير</li>
                  <li>يدرك التاء المربوطة والهمزة</li>
                  <li>يعيد ترتيب كلمات لتكوين جمل صحيحة لغوياً</li>
                  <li>يعي الحروف التي تتصل بما بعدها والتي لا تتصل</li>
                </ul>
              </div>
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="الكتابة" /></h3>
                <ul class="obj-list">
                  <li>يراعي الاتجاه الصحيح للكتابة</li>
                  <li>يكتب كلمات كاملة ويدرك مفهوم الاتصال بين الحروف</li>
                  <li>يستعين بشريط التهجئة</li>
                  <li>يعبّر عن أفكاره برسومات وكلمات كاملة تصف رسمه</li>
                </ul>
              </div>
              <div class="objective-section">
                <h3><Tag :style="{ background: level.color + '20', color: level.color }" value="اللغويات" /></h3>
                <ul class="obj-list">
                  <li>إدراك المرادفات والمضاد</li>
                  <li>إدراك الكلمات ذات الجذر المشترك</li>
                </ul>
              </div>
            </template>
          </div>
        </TabPanel>
      </TabView>
    </div>

    <!-- Progression Table -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-chart-line" style="color: #845EF7"></i> ملخص التدرّج بين المستويات</h2>
      <DataTable :value="progression" stripedRows responsiveLayout="scroll">
        <Column field="dimension" header="البُعد" style="width: 15%; font-weight: 700" />
        <Column field="level1" header="المستوى الأول">
          <template #body="{ data }">
            <span style="color: var(--level1-color)">{{ data.level1 }}</span>
          </template>
        </Column>
        <Column field="level2" header="المستوى الثاني">
          <template #body="{ data }">
            <span style="color: var(--level2-color)">{{ data.level2 }}</span>
          </template>
        </Column>
        <Column field="level3" header="المستوى الثالث">
          <template #body="{ data }">
            <span style="color: var(--level3-color)">{{ data.level3 }}</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
h2 {
  font-size: 1.2rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.goals-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  background: var(--bg-color);
  border-radius: 12px;
  border-right: 4px solid var(--primary-color);
}

.goal-stage-badge {
  background: var(--primary-light);
  color: var(--primary-dark);
  padding: 4px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.goal-item p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.7;
}

.level-objectives {
  padding: 12px 0;
}

.objective-section {
  margin-bottom: 20px;
}

.objective-section h3 {
  margin-bottom: 12px;
}

.obj-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.obj-list li {
  padding: 8px 16px;
  background: var(--bg-color);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  position: relative;
  padding-right: 28px;
}

.obj-list li::before {
  content: '✓';
  position: absolute;
  right: 8px;
  color: var(--lc);
  font-weight: bold;
}
</style>
