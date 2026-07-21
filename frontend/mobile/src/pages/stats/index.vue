<template>
  <view class="page">
    <LogoutButton />
    <FloatingAddButton :disable="false" />

    <!-- 上方：每日任务完成情况（已完成/未完成 堆叠柱状图） -->
    <view class="card">
      <view class="chart-head">
        <text class="section-title">每日任务完成情况</text>
        <view class="legend">
          <view class="legend-item"><view class="legend-dot done" /><text class="legend-text">已完成</text></view>
          <view class="legend-item"><view class="legend-dot pending" /><text class="legend-text">未完成</text></view>
        </view>
      </view>
      <view class="chart">
        <view class="bar" v-for="item in taskStats" :key="item.date">
          <text class="bar-label">{{ item.label }}</text>
          <view class="stack">
            <view class="seg done" :style="{ width: Math.min(item.done, 20) * 12 + 'px' }" />
            <view class="seg pending" :style="{ width: Math.min(item.pending, 20) * 12 + 'px' }" />
          </view>
          <text class="bar-value">{{ item.done }}/{{ item.done + item.pending }}</text>
        </view>
      </view>
    </view>

    <!-- 下方：完成趋势（折线图） -->
    <view class="card">
      <view class="chart-head">
        <text class="section-title">完成趋势</text>
        <view class="legend">
          <view class="legend-item"><view class="legend-dot done" /><text class="legend-text">已完成任务</text></view>
          <view class="legend-item"><view class="legend-dot habits" /><text class="legend-text">习惯打卡</text></view>
        </view>
      </view>
      <view class="trend">
        <view class="trend-col" v-for="item in trendStats" :key="item.date">
          <view class="trend-bars">
            <view class="trend-bar-wrap">
              <text v-if="item.completed > 0" class="trend-val completed">{{ item.completed }}</text>
              <view class="trend-bar completed" :style="{ height: Math.max(2, item.completed * 12) + 'px' }" />
            </view>
            <view class="trend-bar-wrap">
              <text v-if="item.habits > 0" class="trend-val habits">{{ item.habits }}</text>
              <view class="trend-bar habits" :style="{ height: Math.max(2, item.habits * 12) + 'px' }" />
            </view>
          </view>
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

const taskStats = ref([]);
const trendStats = ref([]);

const toLabel = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : dateStr;
};

const loadStats = async () => {
  try {
    const [timeData, trendData] = await Promise.all([fetchTimeStats(7), fetchTrends(7)]);
    taskStats.value = (timeData?.data || []).map((item) => ({
      date: item.date,
      label: toLabel(item.date),
      done: item.tasks_done || 0,
      pending: item.tasks_pending || 0,
    }));
    trendStats.value = (trendData?.data || []).map((item) => ({
      date: item.date,
      label: toLabel(item.date),
      completed: item.completed_tasks || 0,
      habits: item.habit_checkins || 0,
    }));
  } catch (e) {
    taskStats.value = [];
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

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #2b2430;
}

.legend {
  display: flex;
  gap: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend-dot.done {
  background: #3b82f6;
}

.legend-dot.pending {
  background: #c9bcd0;
}

.legend-dot.habits {
  background: #22c55e;
}

.legend-text {
  font-size: 11px;
  color: #776b7f;
}

/* 上方：堆叠条形图 */
.chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-label {
  width: 48px;
  font-size: 12px;
  color: #776b7f;
  flex-shrink: 0;
}

.stack {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 0;
}

.seg {
  height: 14px;
}

.seg.done {
  background: #3b82f6;
  border-radius: 6px 0 0 6px;
}

.seg.pending {
  background: #c9bcd0;
  border-radius: 0 6px 6px 0;
}

.seg.done:only-child {
  border-radius: 6px;
}

.bar-value {
  font-size: 11px;
  color: #776b7f;
  flex-shrink: 0;
}

/* 下方：分组柱状图（已完成任务 / 习惯打卡） */
.trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 160px;
}

.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 140px;
}

.trend-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}

.trend-val {
  font-size: 9px;
  line-height: 1;
  margin-bottom: 2px;
}

.trend-val.completed {
  color: #3b82f6;
}

.trend-val.habits {
  color: #22c55e;
}

.trend-bar {
  width: 10px;
  border-radius: 4px 4px 0 0;
}

.trend-bar.completed {
  background: #3b82f6;
}

.trend-bar.habits {
  background: #22c55e;
}

.trend-label {
  font-size: 10px;
  color: #776b7f;
}
</style>
