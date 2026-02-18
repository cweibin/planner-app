<template>
  <view class="tab-bar">
    <view class="tab-item" :class="{ active: selected === 0 }" @click="switchTab(list[0].pagePath)">
      <text>首页</text>
    </view>
    <view class="tab-item" :class="{ active: selected === 1 }" @click="switchTab(list[1].pagePath)">
      <text>日历</text>
    </view>

    <view class="tab-item" :class="{ active: selected === 2 }" @click="switchTab(list[2].pagePath)">
      <text>习惯</text>
    </view>
    <view class="tab-item" :class="{ active: selected === 3 }" @click="switchTab(list[3].pagePath)">
      <text>统计</text>
    </view>
  </view>

</template>

<script setup>
import { onMounted, ref } from 'vue';

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
  border-top: 1px solid var(--line);
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
  color: var(--muted);
}

.tab-item.active {
  color: var(--accent);
  font-weight: 700;
}

.tab-item:nth-child(2) {
  margin-right: 18px;
}

.tab-item:nth-child(3) {
  margin-left: 18px;
}

</style>
