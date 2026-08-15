<template>
  <view class="tab-bar">
    <view class="tab-item" :class="{ active: selected === 0 }" @click="switchTab(list[0].pagePath)">
      <text>{{ t('tab.home') }}</text>
    </view>
    <view class="tab-item" :class="{ active: selected === 1 }" @click="switchTab(list[1].pagePath)">
      <text>{{ t('tab.calendar') }}</text>
    </view>

    <view class="tab-item" :class="{ active: selected === 2 }" @click="switchTab(list[2].pagePath)">
      <text>{{ t('tab.habits') }}</text>
    </view>
    <view class="tab-item" :class="{ active: selected === 3 }" @click="switchTab(list[3].pagePath)">
      <text>{{ t('tab.stats') }}</text>
    </view>
  </view>

</template>

<script setup>
import { onMounted, ref } from 'vue';
import { t, initLocale } from '../locale';

const list = [
  { pagePath: 'pages/home/index', text: '首页' },
  { pagePath: 'pages/calendar/index', text: '日历' },
  { pagePath: 'pages/habits/index', text: '习惯' },
  { pagePath: 'pages/stats/index', text: '统计' },
];

const selected = ref(0);

const updateSelected = () => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1]?.route;
  const index = list.findIndex((item) => item.pagePath === current);
  selected.value = index >= 0 ? index : 0;
};

const switchTab = (path) => {
  if (!path) return;
  uni.switchTab({ url: `/${path}` });
};

onMounted(() => {
  initLocale();
  updateSelected();
});
</script>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 58px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fffdfd;
  border-top: 1px solid rgba(110, 95, 116, 0.4);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 1000;
}

.tab-item {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: #776b7f;
}

.tab-item.active {
  color: #b76e8a;
  font-weight: 700;
}

.tab-item:nth-child(2) {
  margin-right: 18px;
}

.tab-item:nth-child(3) {
  margin-left: 18px;
}

</style>
