<template>
  <view class="page">
    <LogoutButton />
    <FloatingAddButton :disable="false" />
    <view class="welcome card">
      <view class="welcome-left">
        <view class="welcome-row">
          <text class="welcome-title">早上好</text>
          <text v-if="userDisplay" class="welcome-user">{{ userDisplay }}</text>
        </view>
      </view>
      <view class="welcome-right">
        <view class="role-inline">
          <text class="label">角色</text>
          <picker :range="roleOptions" range-key="label" @change="onRoleChange">
            <view class="picker-input">{{ roleLabel }}</view>
          </picker>
          <view class="role-manage" @click="openRoleManager">管理</view>
        </view>
      </view>
    </view>
    <view class="card header">
      <view class="month-bar">
        <view class="month-select">
          <text class="month-hint">选择月份：</text>
          <view class="month-input" @click="openMonthPicker">{{ monthDisplay }}</view>
        </view>
        <view class="month-actions">
          <button class="btn" size="mini" @click="shiftMonth(-1)">&lt;</button>
          <button class="btn primary" size="mini" @click="goCurrentMonth">本月</button>
          <button class="btn" size="mini" @click="shiftMonth(1)">&gt;</button>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="calendar-header">
        <text v-for="d in weekDays" :key="d" class="calendar-label">{{ d }}</text>
      </view>
      <view class="calendar-grid">
        <view
          v-for="day in calendarDays"
          :key="day.key"
          class="calendar-day"
          :class="{ active: day.date === selectedDate, today: day.isToday, full: day.isFullDone, empty: !day.isCurrentMonth }"
          @click="handleDaySelect(day)"
        >
          <template v-if="day.isCurrentMonth">
            <text class="day-number">{{ day.day }}</text>
            <text class="ratio">{{ day.ratioText }}</text>
          </template>
        </view>
      </view>
      <view class="legend">
        <text class="legend-dot" />
        <text class="legend-text">已完成 / 总任务数</text>
      </view>
    </view>

    <view v-if="showMonthPicker" class="modal-mask" @click="closeMonthPicker">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择月份</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closeMonthPicker">取消</button>
            <button class="btn primary" size="mini" @click="confirmMonthPicker">确定</button>
          </view>
        </view>
        <picker-view
          class="month-picker"
          :value="[monthPickerIndex]"
          indicator-style="height: 42px;"
          @change="onMonthPickerChange"
        >
          <picker-view-column>
            <view v-for="item in monthList" :key="item.value" class="picker-item">{{ item.label }}</view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>

    <PromptDialog
      v-model:visible="promptVisible"
      :title="promptTitle"
      :placeholder="promptPlaceholder"
      :value="promptValue"
      @confirm="handlePromptConfirm"
    />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { ensureAuth, getRoleId, setRoleId } from '../../utils/auth';
import { fetchBoardTasks } from '../../services/tasks';
import { createRole, deleteRole, fetchRoles, updateRole } from '../../services/roles';
import { fetchProfile } from '../../services/auth';
import { formatBeijingDate, formatBeijingDateFromUtc, formatDate } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';
import PromptDialog from '../../components/PromptDialog.vue';
import FloatingAddButton from '../../components/FloatingAddButton.vue';

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
const todayStr = formatDate(new Date());
const currentMonth = ref(new Date());
const selectedDate = ref(todayStr);
const tasksByStatus = ref({
  todo: [],
  in_progress: [],
  done: [],
  cancelled: []
});
const loading = ref(false);
const roleOptions = ref([{ label: '全部', value: null }]);
const selectedRoleIndex = ref(0);
const userProfile = ref(null);
const actionSheetOpen = ref(false);
const promptVisible = ref(false);
const promptTitle = ref('');
const promptPlaceholder = ref('');
const promptValue = ref('');
const promptType = ref('');

const currentMonthLabel = computed(() => {
  const date = currentMonth.value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
});

const monthDisplay = computed(() => currentMonthLabel.value);

const selectedRoleId = computed(() => roleOptions.value[selectedRoleIndex.value]?.value ?? null);
const roleLabel = computed(() => roleOptions.value[selectedRoleIndex.value]?.label ?? '全部');
const userDisplay = computed(() => {
  const profile = userProfile.value;
  if (!profile) return '';
  return profile.email || profile.phone_number || '';
});

const showMonthPicker = ref(false);
const monthList = ref([]);
const monthPickerIndex = ref(0);
const pendingMonth = ref('');
const MONTH_WINDOW = 12;
const MONTH_EXTEND = 6;

const isTaskActiveOnDate = (task, dateStr) => {
  const start = task.start_date ? formatBeijingDate(task.start_date) : '';
  const end = task.due_date ? formatBeijingDate(task.due_date) : '';
  const effectiveStart = start || end;
  const effectiveEnd = end || start;
  if (!effectiveStart || !effectiveEnd) return false;
  return dateStr >= effectiveStart && dateStr <= effectiveEnd;
};

const getTaskStatusCountsForDate = (dateStr) => {
  const todoTasks = (tasksByStatus.value.todo || []).filter((t) => isTaskActiveOnDate(t, dateStr));
  const inProgressTasks = (tasksByStatus.value.in_progress || []).filter((t) => isTaskActiveOnDate(t, dateStr));
  const doneTasks = (tasksByStatus.value.done || []).filter(
    (t) => t.completed_at && formatBeijingDateFromUtc(t.completed_at) === dateStr,
  );
  const cancelledTasks = (tasksByStatus.value.cancelled || []).filter(
    (t) => t.cancelled_at && formatBeijingDateFromUtc(t.cancelled_at) === dateStr,
  );
  return {
    todo: todoTasks.length,
    inProgress: inProgressTasks.length,
    done: doneTasks.length,
    cancelled: cancelledTasks.length,
  };
};

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];
  const totalCells = startOffset + totalDays;
  for (let i = 0; i < totalCells; i += 1) {
    const day = i - startOffset + 1;
    if (day <= 0) {
      days.push({ key: `empty-${i}`, isCurrentMonth: false });
      continue;
    }
    const dateStr = formatDate(new Date(year, month, day));
    const counts = getTaskStatusCountsForDate(dateStr);
    const isFuture = dateStr > todayStr;
    const completionBase = counts.todo + counts.inProgress + counts.done;
    const isFullDone = !isFuture && completionBase > 0 && counts.done === completionBase;
    const ratioText = isFuture
      ? `待办 ${counts.todo}`
      : `${counts.done}/${completionBase}`;
    days.push({
      key: dateStr,
      date: dateStr,
      day,
      ratioText,
      isFullDone,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }
  return days;
});

const shiftMonth = (offset) => {
  const next = new Date(currentMonth.value);
  next.setMonth(next.getMonth() + offset);
  currentMonth.value = next;
};

const goCurrentMonth = () => {
  currentMonth.value = new Date();
};

const handleDaySelect = (day) => {
  if (!day.isCurrentMonth || !day.date) return;
  selectedDate.value = day.date;
  uni.setStorageSync('planner_selected_date', day.date);
  uni.switchTab({ url: '/pages/home/index' });
};

const formatMonthValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatMonthLabel = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;

const parseMonthValue = (value) => {
  const parts = value.split('-').map((item) => Number(item));
  if (parts.length < 2) return null;
  return new Date(parts[0], parts[1] - 1, 1);
};

const buildMonthList = (centerDate) => {
  const center = new Date(centerDate.getFullYear(), centerDate.getMonth(), 1);
  const list = [];
  for (let offset = -MONTH_WINDOW; offset <= MONTH_WINDOW; offset += 1) {
    const date = new Date(center);
    date.setMonth(date.getMonth() + offset);
    list.push({ value: formatMonthValue(date), label: formatMonthLabel(date) });
  }
  return list;
};

const openMonthPicker = () => {
  const list = buildMonthList(currentMonth.value);
  monthList.value = list;
  pendingMonth.value = formatMonthValue(currentMonth.value);
  const idx = list.findIndex((item) => item.value === pendingMonth.value);
  monthPickerIndex.value = idx >= 0 ? idx : MONTH_WINDOW;
  showMonthPicker.value = true;
};

const closeMonthPicker = () => {
  showMonthPicker.value = false;
};

const extendMonthList = (direction) => {
  if (direction === 'prev') {
    const first = monthList.value[0]?.value || formatMonthValue(currentMonth.value);
    const base = parseMonthValue(first);
    if (!base) return;
    const extra = [];
    for (let i = MONTH_EXTEND; i >= 1; i -= 1) {
      const date = new Date(base);
      date.setMonth(date.getMonth() - i);
      extra.push({ value: formatMonthValue(date), label: formatMonthLabel(date) });
    }
    monthList.value = [...extra, ...monthList.value];
    monthPickerIndex.value += MONTH_EXTEND;
  } else if (direction === 'next') {
    const last = monthList.value[monthList.value.length - 1]?.value || formatMonthValue(currentMonth.value);
    const base = parseMonthValue(last);
    if (!base) return;
    const extra = [];
    for (let i = 1; i <= MONTH_EXTEND; i += 1) {
      const date = new Date(base);
      date.setMonth(date.getMonth() + i);
      extra.push({ value: formatMonthValue(date), label: formatMonthLabel(date) });
    }
    monthList.value = [...monthList.value, ...extra];
  }
};

const onMonthPickerChange = (event) => {
  const idx = Number(event.detail.value?.[0] ?? event.detail.value);
  monthPickerIndex.value = idx;
  const item = monthList.value[idx];
  if (item) {
    pendingMonth.value = item.value;
  }
  if (idx <= 3) {
    extendMonthList('prev');
  } else if (idx >= monthList.value.length - 4) {
    extendMonthList('next');
  }
};

const confirmMonthPicker = () => {
  const date = parseMonthValue(pendingMonth.value);
  if (date) {
    currentMonth.value = date;
  }
  showMonthPicker.value = false;
};

const onRoleChange = (event) => {
  selectedRoleIndex.value = Number(event.detail.value);
  const roleId = selectedRoleId.value;
  setRoleId(roleId || null);
  void refresh();
};

const openPrompt = (type, title, placeholder, value = '') => {
  promptType.value = type;
  promptTitle.value = title;
  promptPlaceholder.value = placeholder;
  promptValue.value = value;
  promptVisible.value = true;
};

const handleCreateRole = () => {
  openPrompt('role-create', '新增角色', '请输入角色名称');
};

const handleRenameRole = () => {
  const current = roleOptions.value[selectedRoleIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: '请选择要重命名的角色', icon: 'none' });
    return;
  }
  openPrompt('role-rename', '重命名角色', '请输入新名称', current.label);
};

const handleDeleteRole = () => {
  const current = roleOptions.value[selectedRoleIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: '请选择要删除的角色', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '删除角色',
    content: `确定删除「${current.label}」吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteRole(current.value);
        await loadRoles();
        selectedRoleIndex.value = 0;
        setRoleId(null);
        void refresh();
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' });
      }
    },
  });
};

const handlePromptConfirm = async (value) => {
  const name = (value || '').trim();
  if (!name) return;
  if (promptType.value === 'role-create') {
    try {
      await createRole(name);
      await loadRoles();
      const idx = roleOptions.value.findIndex((item) => item.label === name);
      if (idx >= 0) {
        selectedRoleIndex.value = idx;
        setRoleId(roleOptions.value[idx].value);
      }
    } catch {
      uni.showToast({ title: '新增失败', icon: 'none' });
    }
  }
  if (promptType.value === 'role-rename') {
    const current = roleOptions.value[selectedRoleIndex.value];
    if (!current || current.value === null) return;
    try {
      await updateRole(current.value, name);
      await loadRoles();
      const idx = roleOptions.value.findIndex((item) => item.label === name);
      if (idx >= 0) {
        selectedRoleIndex.value = idx;
        setRoleId(roleOptions.value[idx].value);
      }
    } catch {
      uni.showToast({ title: '重命名失败', icon: 'none' });
    }
  }
  promptType.value = '';
};

const openRoleManager = () => {
  const actions = ['新增角色', '重命名当前角色', '删除当前角色'];
  actionSheetOpen.value = true;
  uni.showActionSheet({
    itemList: actions,
    success: (res) => {
      if (res.tapIndex === 0) handleCreateRole();
      if (res.tapIndex === 1) handleRenameRole();
      if (res.tapIndex === 2) handleDeleteRole();
    },
    fail: () => {
      actionSheetOpen.value = false;
    },
    complete: () => {
      actionSheetOpen.value = false;
    },
  });
};

const buildLocalRangeForMonth = (year, month) => {
  const startLocal = formatDate(new Date(year, month, 1));
  const endLocal = formatDate(new Date(year, month + 1, 0));
  return {
    dueFrom: `${startLocal}T00:00:00`,
    dueTo: `${endLocal}T23:59:59`,
  };
};

const loadMonthTasks = async () => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const { dueFrom, dueTo } = buildLocalRangeForMonth(year, month);
  const roleId = selectedRoleId.value ?? getRoleId();
  const data = await fetchBoardTasks({
    dueFrom,
    dueTo,
    roleId: roleId ?? undefined,
  });
  tasksByStatus.value = {
    todo: data?.todo || [],
    in_progress: data?.in_progress || [],
    done: data?.done || [],
    cancelled: data?.cancelled || [],
  };
};

const syncMonthToDate = (dateStr) => {
  if (!dateStr) return;
  const parts = dateStr.split('-');
  if (parts.length < 2) return;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (Number.isNaN(year) || Number.isNaN(month)) return;
  currentMonth.value = new Date(year, month, 1);
};

const refresh = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    await loadMonthTasks();
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
};

watch(currentMonth, () => {
  void refresh();
});

const loadRoles = async () => {
  try {
    const data = await fetchRoles();
    roleOptions.value = [
      { label: '全部', value: null },
      ...data.map((role) => ({ label: role.name, value: role.id })),
    ];
  } catch {
    roleOptions.value = [{ label: '全部', value: null }];
  }
};

const syncRoleSelection = () => {
  const stored = getRoleId();
  const idx = roleOptions.value.findIndex((item) => item.value === stored);
  selectedRoleIndex.value = idx >= 0 ? idx : 0;
};

const loadProfile = async () => {
  try {
    userProfile.value = await fetchProfile();
  } catch {
    userProfile.value = null;
  }
};

onShow(async () => {
  if (!ensureAuth()) return;
  await loadProfile();
  await loadRoles();
  syncRoleSelection();
  const stored = uni.getStorageSync('planner_selected_date');
  if (stored) {
    selectedDate.value = stored;
    syncMonthToDate(stored);
  } else {
    selectedDate.value = todayStr;
    syncMonthToDate(todayStr);
  }
  void refresh();
});
</script>

<style scoped>
.page {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.welcome {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(135deg, #faeef4 40%, #e8ecff 100%);
}

.welcome-title {
  font-size: 18px;
  font-weight: 700;
}

.welcome-left {
  padding-top: 4px;
}

.welcome-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.welcome-user {
  font-size: 12px;
  color: var(--muted);
}

.welcome-right {
  min-width: 0;
  padding-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.role-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-inline .label {
  font-size: 10px;
}

.picker-input {
  padding: 4px 6px;
  border-radius: 10px;
  border: 1px solid var(--line);
  font-size: 10px;
}

.role-manage {
  font-size: 10px;
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
}

.label {
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.header {
  background: #fff;
  padding: 12px;
}

.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.month-actions {
  display: flex;
  gap: 6px;
}

.month-actions .btn {
  font-size: 12px;
  padding: 6px 10px;
  line-height: 1;
}

.month-select {
  display: flex;
  align-items: center;
  gap: 6px;
}

.month-hint {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.month-input {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--line);
  font-size: 12px;
  background: #fff;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 8px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-day {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 4px 4px;
  text-align: center;
  font-size: 12px;
  background: #fff;
  min-height: 44px;
}

.calendar-day.full {
  background: #e8f7ef;
  border-color: #b8e7cf;
}

.calendar-day.full .ratio {
  color: var(--muted);
}

.calendar-day.empty {
  background: transparent;
  border-color: transparent;
}

.calendar-day.active {
  border-color: #3b82f6;
  background: #dbeafe;
  font-weight: 700;
}

.calendar-day.full.active {
  background: #e8f7ef;
  border-color: #b8e7cf;
}

.calendar-day.today {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.15);
}

.day-number {
  display: block;
  font-weight: 700;
}

.ratio {
  display: block;
  font-size: 10px;
  color: var(--muted);
  margin-top: 2px;
}

.legend {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  justify-content: center;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
}

.modal-card {
  width: 80%;
  max-width: 320px;
  background: #fff;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid var(--line);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.modal-title {
  font-size: 12px;
}

.modal-actions {
  display: flex;
  gap: 6px;
}

.month-picker {
  height: 210px;
}

.picker-item {
  height: 42px;
  line-height: 42px;
  text-align: center;
  font-size: 13px;
}
</style>
