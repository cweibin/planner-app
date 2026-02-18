<template>
  <view class="page">
    <LogoutButton />
    <FloatingAddButton :disable="false" />
    <view class="card">
      <view class="section-title">每日任务与习惯打卡情况</view>
      <view class="chart">
        <view class="bar" v-for="item in timeStats" :key="item.date">
          <text class="bar-label">{{ item.label }}</text>
          <view class="bar-row">
            <view class="bar-fill tasks" :style="{ width: item.tasks * 12 + 'px' }" />
            <text class="bar-value">{{ item.tasks }}</text>
          </view>
          <view class="bar-row">
            <view class="bar-fill habits" :style="{ width: item.habits * 12 + 'px' }" />
            <text class="bar-value">{{ item.habits }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">完成趋势</view>
      <view class="trend">
        <view class="trend-col" v-for="item in trendStats" :key="item.date">
          <view class="trend-bar tasks" :style="{ height: item.tasks * 6 + 'px' }" />
          <view class="trend-bar habits" :style="{ height: item.habits * 6 + 'px' }" />
          <text class="trend-label">{{ item.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { ensureAuth } from '../../utils/auth';
import { fetchTimeStats, fetchTrends } from '../../services/stats';
import LogoutButton from '../../components/LogoutButton.vue';
import FloatingAddButton from '../../components/FloatingAddButton.vue';

const timeStats = ref([]);
const trendStats = ref([]);

const toLabel = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[1]}-${parts[2]}`;
};

const loadStats = async () => {
  try {
    const [timeData, trendData] = await Promise.all([fetchTimeStats(7), fetchTrends(7)]);
    timeStats.value = (timeData?.data || []).map((item) => ({
      date: item.date,
      label: toLabel(item.date),
      tasks: item.tasks_due || 0,
      habits: item.habit_checkins || 0,
    }));
    trendStats.value = (trendData?.data || []).map((item) => ({
      date: item.date,
      label: toLabel(item.date),
      tasks: item.completed_tasks || 0,
      habits: item.habit_checkins || 0,
    }));
  } catch {
    timeStats.value = [];
    trendStats.value = [];
  }
};

onShow(() => {
  if (!ensureAuth()) return;
  void loadStats();
});
</script>

<style scoped>
.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-label {
  font-size: 12px;
  color: var(--muted);
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bar-fill {
  height: 10px;
  border-radius: 6px;
}

.bar-fill.tasks {
  background: #3b82f6;
}

.bar-fill.habits {
  background: #22c55e;
}

.bar-value {
  font-size: 11px;
  color: var(--muted);
}

.trend {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 140px;
}

.trend-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.trend-bar {
  width: 12px;
  border-radius: 6px;
}

.trend-bar.tasks {
  background: #3b82f6;
}

.trend-bar.habits {
  background: #22c55e;
}

.trend-label {
  font-size: 10px;
  color: var(--muted);
}
</style>
