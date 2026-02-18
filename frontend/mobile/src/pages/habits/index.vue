<template>
  <view class="page">
    <LogoutButton />
    <FloatingAddButton :disable="false" />
    <view class="stats-grid">
      <view class="stats-card">
        <text class="stats-value">{{ totalHabits }}</text>
        <text class="stats-label">习惯总数</text>
      </view>
      <view class="stats-card">
        <text class="stats-value">{{ activeHabitsCount }}</text>
        <text class="stats-label">进行中</text>
      </view>
      <view class="stats-card">
        <text class="stats-value">{{ todayCompleteText }}</text>
        <text class="stats-label">今天完成</text>
      </view>
      <view class="stats-card">
        <text class="stats-value">{{ weekRate }}%</text>
        <text class="stats-label">本周完成率</text>
      </view>
    </view>
    <view class="card">
      <view class="section-header-row">
        <view class="section-title">近一周习惯追踪</view>
        <picker
          :range="statusFilterOptions"
          range-key="label"
          :value="statusFilterIndex"
          @change="onStatusFilterChange"
        >
          <view class="filter-chip">{{ statusFilterLabel }}</view>
        </picker>
      </view>
      <view class="week-nav">
        <button class="btn" size="mini" @click="shiftWeek(-1)">上周</button>
        <text class="week-label">{{ weekLabel }}</text>
        <button class="btn" size="mini" @click="shiftWeek(1)">下周</button>
      </view>
      <view v-for="habit in filteredHabits" :key="habit.id" class="habit-block">
        <view
          class="swipe-row"
          :class="{ 'is-swipe-active': isSwipeActive(habit) }"
          @touchstart="onSwipeStart($event, habit)"
          @touchmove="onSwipeMove($event, habit)"
          @touchend="onSwipeEnd(habit)"
          @touchcancel="onSwipeEnd(habit)"
        >
          <view class="swipe-actions">
            <picker
              class="action-block status"
              :range="statusOptions"
              range-key="label"
              :value="statusIndex(habit)"
              @change="onStatusChange($event, habit)"
            >
              <view class="block-inner">
                <text class="block-icon">↻</text>
                <text class="block-text">{{ statusLabel(habit.status) }}</text>
              </view>
            </picker>
            <view class="action-block edit" @click.stop="editHabit(habit)">
              <view class="block-inner">
                <text class="block-icon">✎</text>
                <text class="block-text">编辑</text>
              </view>
            </view>
            <view class="action-block delete" @click.stop="deleteHabitConfirm(habit)">
              <view class="block-inner">
                <text class="block-icon">✕</text>
                <text class="block-text">删除</text>
              </view>
            </view>
          </view>
          <view
            class="habit-card"
            :class="{ swiping: swipingId === habit.id }"
            :style="swipeStyle(habit)"
            @click="openHabitDetail(habit)"
          >
            <view class="habit-info">
              <text class="habit-title">{{ habit.name }}</text>
              <text class="habit-meta">
                本周完成率 {{ getWeekCheckIns(habit) }}/{{ getWeekTarget(habit) }} 次 ({{ getWeekRate(habit) }}%)
              </text>
              <text class="habit-meta">目标：{{ getTargetLabel(habit) }}</text>
              <text class="habit-meta">计划日期：{{ getPlanLabel(habit) }}</text>
            </view>
            <view class="habit-actions">
              <button class="btn habit-checkin" size="mini" @click.stop="handleCheckIn(habit, todayStr)">打卡</button>
            </view>
          </view>
        </view>
        <view class="habit-week">
          <view
            v-for="day in weekDays"
            :key="day.date"
            class="week-cell"
            :class="{
              checked: isWeekComplete(habit) || isDayChecked(habit, day.date),
              today: day.date === todayStr,
              disabled: !canCheckIn(habit)
            }"
            @click="handleCheckIn(habit, day.date)"
          >
            <text class="week-day">{{ day.day }}</text>
            <text v-if="getCheckInTime(habit, day.date)" class="week-time">{{ getCheckInTime(habit, day.date) }}</text>
            <text v-if="getCheckInTime(habit, day.date)" class="check-icon">✓</text>
          </view>
        </view>
      </view>
      <view v-if="!filteredHabits.length" class="empty">暂无习惯</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { ensureAuth } from '../../utils/auth';
import { fetchHabits, fetchCheckIns, checkInHabit, cancelCheckIn, updateHabit, deleteHabit } from '../../services/habits';
import { formatBeijingTime, formatDate } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';
import FloatingAddButton from '../../components/FloatingAddButton.vue';

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return formatDate(d);
};

const habits = ref([]);
const checkInDates = ref({});
const currentWeekStart = ref(startOfWeek(new Date()));
const todayStr = formatDate(new Date());
const swipeOpenId = ref(null);
const swipingId = ref(null);
const swipeStartX = ref(0);
const swipeStartY = ref(0);
const swipeBaseX = ref(0);
const swipeTranslateX = ref(0);
const SWIPE_ACTION_WIDTH = 225;
const isDragging = ref(false);

const statusOptions = [
  { label: '进行中', value: 'active' },
  { label: '暂停', value: 'paused' },
  { label: '已完成', value: 'completed' },
];

const statusFilterOptions = [
  { label: '全部', value: 'all' },
  ...statusOptions,
];
const statusFilterIndex = ref(1);
const statusFilterLabel = computed(() => statusFilterOptions[statusFilterIndex.value]?.label || '进行中');
const statusFilterValue = computed(() => statusFilterOptions[statusFilterIndex.value]?.value || 'active');

const filteredHabits = computed(() => {
  if (statusFilterValue.value === 'all') return habits.value;
  return habits.value.filter((habit) => habit.status === statusFilterValue.value);
});

const statusLabel = (status) => {
  const found = statusOptions.find((item) => item.value === status);
  return found?.label || '进行中';
};

const statusIndex = (habit) => {
  const idx = statusOptions.findIndex((item) => item.value === habit?.status);
  return idx >= 0 ? idx : 0;
};

const onStatusFilterChange = (event) => {
  statusFilterIndex.value = Number(event.detail.value);
};

const parseDateString = (value) => {
  const parts = value.split('-').map((item) => Number(item));
  if (parts.length < 3) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const addDays = (dateStr, offset) => {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + offset);
  return formatDate(d);
};

const weekDays = computed(() => {
  const start = currentWeekStart.value;
  return Array.from({ length: 7 }, (_, idx) => {
    const date = addDays(start, idx);
    return { date, day: Number(date.split('-')[2]) };
  });
});

const weekLabel = computed(() => {
  const start = currentWeekStart.value;
  const end = addDays(start, 6);
  return `${start} - ${end}`;
});

const totalHabits = computed(() => habits.value.length);

const activeHabitsCount = computed(() => habits.value.filter((h) => h.status === 'active').length);

const todayCompleteCount = computed(() => {
  const today = todayStr;
  return habits.value.filter((habit) => {
    const dates = checkInDates.value[habit.id] || {};
    return !!dates[today];
  }).length;
});

const todayCompleteText = computed(() => {
  const total = activeHabitsCount.value;
  return `${todayCompleteCount.value}/${total}`;
});

const weekRate = computed(() => {
  const activeHabits = habits.value.filter((h) => h.status === 'active');
  if (!activeHabits.length) return 0;
  let totalCheckIns = 0;
  let totalTarget = 0;
  activeHabits.forEach((habit) => {
    totalCheckIns += getWeekCheckIns(habit);
    totalTarget += getWeekTarget(habit);
  });
  if (!totalTarget) return 0;
  return Math.round((totalCheckIns / totalTarget) * 100);
});

const getTargetValue = (habit) => {
  const raw = Number(habit.target_value ?? habit.target_count ?? 0);
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
};

const getWeekTarget = (habit) => {
  const target = getTargetValue(habit);
  return habit.target_type === 'daily' ? target * 7 : target;
};

const getWeekCheckIns = (habit) => {
  const dates = checkInDates.value[habit.id] || {};
  return Object.keys(dates).filter((d) => d >= currentWeekStart.value && d <= addDays(currentWeekStart.value, 6)).length;
};

const getWeekRate = (habit) => {
  const target = getWeekTarget(habit);
  if (!target) return 0;
  return Math.round((getWeekCheckIns(habit) / target) * 100);
};

const isWeekComplete = (habit) => {
  const target = getWeekTarget(habit);
  return target > 0 && getWeekCheckIns(habit) >= target;
};

const isDayChecked = (habit, date) => {
  const dates = checkInDates.value[habit.id] || {};
  return !!dates[date];
};

const getCheckInTime = (habit, date) => {
  const dates = checkInDates.value[habit.id] || {};
  return dates[date] || '';
};

const getTargetLabel = (habit) => {
  const target = getTargetValue(habit);
  return habit.target_type === 'daily' ? `每天 ${target} 次` : `每周 ${target} 次`;
};

const getPlanLabel = (habit) => {
  const start = habit.plan_start_date || '-';
  const end = habit.plan_end_date || '-';
  return `${start} ~ ${end}`;
};

const canCheckIn = (habit) => {
  if (habit.status !== 'active') return false;
  if (habit.plan_end_date && habit.plan_end_date < todayStr) return false;
  return true;
};

const loadHabits = async () => {
  try {
    habits.value = await fetchHabits();
  } catch {
    habits.value = [];
  }
};

const loadCheckIns = async () => {
  const start = currentWeekStart.value;
  const end = addDays(start, 6);
  const checkInsMap = {};
  for (const habit of habits.value) {
    try {
      const checkIns = await fetchCheckIns(habit.id, start, end);
      const map = {};
      checkIns.forEach((c) => {
        const raw = c.check_in_time;
        if (raw) {
          const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
          const hasZone = /Z|[+-]\d{2}:\d{2}$/.test(normalized);
          map[c.check_in_date] = formatBeijingTime(hasZone ? normalized : `${normalized}Z`);
        }
      });
      checkInsMap[habit.id] = map;
    } catch {
      checkInsMap[habit.id] = {};
    }
  }
  checkInDates.value = checkInsMap;
};

const isSwipeActive = (habit) => {
  if (!habit?.id) return false;
  return swipingId.value === habit.id || swipeOpenId.value === habit.id;
};

const swipeStyle = (habit) => {
  if (!habit?.id) return {};
  const habitId = habit.id;
  if (swipingId.value === habitId) {
    return { transform: `translateX(${swipeTranslateX.value}px)` };
  }
  if (swipeOpenId.value === habitId) {
    return { transform: `translateX(-${SWIPE_ACTION_WIDTH}px)` };
  }
  return {};
};

const onSwipeStart = (event, habit) => {
  if (!habit?.id) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  const habitId = habit.id;
  if (swipeOpenId.value && swipeOpenId.value !== habitId) {
    swipeOpenId.value = null;
  }
  isDragging.value = false;
  swipingId.value = habitId;
  swipeStartX.value = touch.clientX;
  swipeStartY.value = touch.clientY;
  swipeBaseX.value = swipeOpenId.value === habitId ? -SWIPE_ACTION_WIDTH : 0;
  swipeTranslateX.value = swipeBaseX.value;
};

const onSwipeMove = (event, habit) => {
  if (!habit?.id || swipingId.value !== habit.id) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  const deltaX = touch.clientX - swipeStartX.value;
  const deltaY = touch.clientY - swipeStartY.value;
  if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 4) return;
  if (Math.abs(deltaX) > 6 && Math.abs(deltaX) >= Math.abs(deltaY)) {
    isDragging.value = true;
  }
  let next = swipeBaseX.value + deltaX;
  if (next > 0) next = 0;
  if (next < -SWIPE_ACTION_WIDTH) next = -SWIPE_ACTION_WIDTH;
  swipeTranslateX.value = next;
};

const onSwipeEnd = (habit) => {
  if (!habit?.id || swipingId.value !== habit.id) return;
  const wasOpen = swipeBaseX.value < 0;
  if (wasOpen) {
    if (swipeTranslateX.value > -SWIPE_ACTION_WIDTH + 10) {
      swipeOpenId.value = null;
    } else {
      swipeOpenId.value = habit.id;
    }
  } else if (swipeTranslateX.value <= -SWIPE_ACTION_WIDTH / 2) {
    swipeOpenId.value = habit.id;
  } else {
    swipeOpenId.value = null;
  }
  swipingId.value = null;
  swipeTranslateX.value = 0;
  setTimeout(() => {
    isDragging.value = false;
  }, 0);
};

const onStatusChange = async (event, habit) => {
  if (!habit?.id) return;
  const idx = Number(event.detail.value);
  const next = statusOptions[idx]?.value || 'active';
  if (next === habit.status) return;
  try {
    await updateHabit(habit.id, { status: next });
    await loadHabits();
    await loadCheckIns();
  } catch {
    uni.showToast({ title: '状态更新失败', icon: 'none' });
  }
};

const editHabit = (habit) => {
  if (!habit?.id) return;
  uni.navigateTo({ url: `/pages/habit-create/index?id=${habit.id}` });
};

const resetSwipe = () => {
  swipeOpenId.value = null;
  swipingId.value = null;
  swipeTranslateX.value = 0;
  isDragging.value = false;
};

const openHabitDetail = (habit) => {
  if (!habit?.id) return;
  if (isDragging.value) return;
  if (swipeOpenId.value === habit.id) {
    resetSwipe();
    return;
  }
  uni.navigateTo({ url: `/pages/habit-create/index?id=${habit.id}` });
};

const deleteHabitConfirm = (habit) => {
  if (!habit?.id) return;
  uni.showModal({
    title: '删除习惯',
    content: `确定删除「${habit.name}」吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteHabit(habit.id);
        swipeOpenId.value = null;
        await loadHabits();
        await loadCheckIns();
      } catch (err) {
        const message = habit.status !== 'active' ? '仅可删除进行中的习惯' : '删除失败';
        uni.showToast({ title: message, icon: 'none' });
      }
    },
  });
};

const handleCheckIn = async (habit, date) => {
  if (!canCheckIn(habit)) return;
  const dates = checkInDates.value[habit.id] || {};
  const alreadyChecked = !!dates[date];
  try {
    if (alreadyChecked) {
      await cancelCheckIn(habit.id, date);
    } else {
      await checkInHabit(habit.id, date);
    }
    await loadCheckIns();
  } catch {
    // ignore
  }
};

const shiftWeek = (offset) => {
  currentWeekStart.value = addDays(currentWeekStart.value, offset * 7);
};

watch(currentWeekStart, () => {
  if (habits.value.length > 0) {
    void loadCheckIns();
  }
});

onShow(async () => {
  if (!ensureAuth()) return;
  currentWeekStart.value = startOfWeek(new Date());
  await loadHabits();
  if (habits.value.length > 0) {
    await loadCheckIns();
  }
});
</script>

<style scoped>
.page {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stats-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px;
  background: #fff;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stats-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.stats-label {
  font-size: 11px;
  color: var(--muted);
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.filter-chip {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  background: #fff;
}

.habit-block {
  margin-top: 8px;
}

.habit-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  transition: transform 0.2s ease;
}

.habit-card.swiping {
  transition: none;
}

.swipe-row {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 225px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  padding: 0;
  opacity: 0;
  transform: translateX(8px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  border-radius: 12px;
  overflow: hidden;
}

.swipe-row.is-swipe-active .swipe-actions {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.action-block {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.action-block.status {
  background: #1f9bd1;
}

.action-block.edit {
  background: #4c7ff0;
}

.action-block.delete {
  background: #f08a84;
}

.block-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.block-icon {
  font-size: 18px;
  line-height: 1;
}

.block-text {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.habit-info {
  flex: 1;
  min-width: 0;
}

.habit-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.habit-checkin {
  flex-shrink: 0;
}

.habit-title {
  font-size: 14px;
  font-weight: 700;
}

.habit-meta {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.habit-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-top: 6px;
}

.week-cell {
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: center;
  padding: 4px 0;
  font-size: 12px;
  position: relative;
}

.week-cell.checked {
  background: #22c55e;
  color: #fff;
  border-color: #16a34a;
}

.week-cell.today {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.15);
}

.week-cell.disabled {
  opacity: 0.6;
}

.week-day {
  display: block;
  font-weight: 600;
}

.week-time {
  display: block;
  font-size: 10px;
  margin-top: 2px;
}

.check-icon {
  position: absolute;
  right: 4px;
  top: 2px;
  font-size: 10px;
}

.rate {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  text-align: center;
}

.week-nav {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.week-label {
  font-size: 12px;
  color: var(--muted);
}

.empty {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  padding: 16px 0;
}
</style>
