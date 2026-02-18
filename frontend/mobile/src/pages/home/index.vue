<template>
  <view class="page">
    <LogoutButton />
    <FloatingAddButton :disable="showDatePicker || showRolePicker || showPriorityPicker || showCategoryPicker || actionSheetOpen" />
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
          <view class="picker-input" @click="openRolePicker">{{ roleLabel }}</view>
          <view class="role-manage" @click="openRoleManager">管理</view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="date-row">
        <view class="date-left">
          <text class="label">选择日期：</text>
          <view class="date-input" @click="openDatePicker">{{ selectedDateLabel }}</view>
        </view>
        <view class="date-actions">
          <button class="btn" size="mini" @click="shiftDate(-1)">&lt;</button>
          <button class="btn primary" size="mini" @click="goToday">今天</button>
          <button class="btn" size="mini" @click="shiftDate(1)">&gt;</button>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="filter-row">
        <view class="filter-item">
          <view class="picker-input" @click="openPriorityPicker">{{ priorityDisplayLabel }}</view>
        </view>
        <view class="filter-item">
          <view class="picker-input" @click="openCategoryPicker">{{ categoryDisplayLabel }}</view>
        </view>
      </view>
      <view class="search-row">
        <input class="search-input" v-model="searchText" placeholder="搜索任务" />
        <button class="btn" size="mini" @click="resetFilters">清除筛选</button>
      </view>
    </view>

    <view v-if="showDatePicker" class="modal-mask" @click="closeDatePicker">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择日期</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closeDatePicker">取消</button>
            <button class="btn primary" size="mini" @click="confirmDatePicker">确定</button>
          </view>
        </view>
        <picker-view
          class="date-picker"
          :value="[datePickerIndex]"
          indicator-style="height: 42px;"
          @change="onPickerChange"
        >
          <picker-view-column>
            <view v-for="item in dateList" :key="item.value" class="picker-item">{{ item.label }}</view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>

    <view v-if="showRolePicker" class="modal-mask" @click="closeRolePicker">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择角色</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closeRolePicker">取消</button>
            <button class="btn primary" size="mini" @click="confirmRolePicker">确定</button>
          </view>
        </view>
        <picker-view
          class="date-picker"
          :value="[rolePickerIndex]"
          indicator-style="height: 42px;"
          @change="onRolePickerChange"
        >
          <picker-view-column>
            <view v-for="item in roleOptions" :key="item.value ?? item.label" class="picker-item">{{ item.label }}</view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>

    <view v-if="showPriorityPicker" class="modal-mask" @click="closePriorityPicker">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择优先级</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closePriorityPicker">取消</button>
            <button class="btn primary" size="mini" @click="confirmPriorityPicker">确定</button>
          </view>
        </view>
        <picker-view
          class="date-picker"
          :value="[priorityPickerIndex]"
          indicator-style="height: 42px;"
          @change="onPriorityPickerChange"
        >
          <picker-view-column>
            <view v-for="item in priorityOptions" :key="item.value" class="picker-item">{{ item.label }}</view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>

    <view v-if="showCategoryPicker" class="modal-mask" @click="closeCategoryPicker">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择分类</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closeCategoryPicker">取消</button>
            <button class="btn primary" size="mini" @click="confirmCategoryPicker">确定</button>
          </view>
        </view>
        <picker-view
          class="date-picker"
          :value="[categoryPickerIndex]"
          indicator-style="height: 42px;"
          @change="onCategoryPickerChange"
        >
          <picker-view-column>
            <view v-for="item in categoryOptions" :key="item.value ?? item.label" class="picker-item">{{ item.label }}</view>
          </picker-view-column>
        </picker-view>
      </view>
    </view>

    <view
      class="card highlight"
      v-if="yesterdayRemainingView.length"
      :class="{ collapsed: collapsedSections.yesterday }"
    >
      <view
        class="section-header clickable"
        :class="{ collapsed: collapsedSections.yesterday }"
        @click="toggleSection('yesterday')"
      >
        <view class="section-left">
          <text class="section-title">昨天剩余</text>
          <text class="section-meta">{{ yesterdayRemainingView.length }} 项</text>
        </view>
        <text class="section-toggle">{{ collapsedSections.yesterday ? '▼' : '▲' }}</text>
      </view>
      <view v-show="!collapsedSections.yesterday">
        <view
          class="swipe-row"
          :class="{ 'no-swipe': !canSwipe(task), 'is-swipe-active': isSwipeActive(task) }"
          v-for="task in yesterdayRemainingView"
          :key="task.id"
          @touchstart="onSwipeStart($event, task)"
          @touchmove="onSwipeMove($event, task)"
          @touchend="onSwipeEnd(task)"
          @touchcancel="onSwipeEnd(task)"
        >
          <view v-if="canSwipe(task)" class="swipe-actions">
            <view class="swipe-btn done" @click.stop="markDone(task)">
              <text class="swipe-icon">✓</text>
              <text class="swipe-text">完成</text>
            </view>
            <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
              <text class="swipe-icon">✕</text>
              <text class="swipe-text">取消</text>
            </view>
          </view>
          <view
            class="task-card"
            :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
            :style="swipeStyle(task)"
            @click="openTask(task.id)"
          >
            <view class="task-info">
              <text class="task-title">{{ task.title }}</text>
              <text class="task-meta">截止 {{ task.dueLabel }} · {{ task.roleName }}</text>
            </view>
            <view class="task-tags">
              <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
              <text class="tag status">{{ statusText(task.status) }}</text>
              <text v-if="task.isOverdue" class="tag overdue">超时</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-header">
        <text class="section-title">今日任务</text>
        <text class="section-meta">{{ todayTotalCount }} 项</text>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayTodo }"
          @click="toggleSection('todayTodo')"
        >
          <view class="section-left">
            <text class="section-title">今日待办</text>
            <text class="section-meta">{{ todayTodoView.length }} 项</text>
          </view>
          <text class="section-toggle">{{ collapsedSections.todayTodo ? '▼' : '▲' }}</text>
        </view>
        <view v-show="!collapsedSections.todayTodo">
          <view
            class="swipe-row"
            :class="{ 'no-swipe': !canSwipe(task), 'is-swipe-active': isSwipeActive(task) }"
            v-for="task in todayTodoView"
            :key="task.id"
            @touchstart="onSwipeStart($event, task)"
            @touchmove="onSwipeMove($event, task)"
            @touchend="onSwipeEnd(task)"
            @touchcancel="onSwipeEnd(task)"
          >
            <view v-if="canSwipe(task)" class="swipe-actions">
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">完成</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">取消</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @click="openTask(task.id)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">截止 {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayTodoView.length" class="empty">暂无任务</view>
        </view>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayInProgress }"
          @click="toggleSection('todayInProgress')"
        >
          <view class="section-left">
            <text class="section-title">进行中</text>
            <text class="section-meta">{{ todayInProgressView.length }} 项</text>
          </view>
          <text class="section-toggle">{{ collapsedSections.todayInProgress ? '▼' : '▲' }}</text>
        </view>
        <view v-show="!collapsedSections.todayInProgress">
          <view
            class="swipe-row"
            :class="{ 'no-swipe': !canSwipe(task), 'is-swipe-active': isSwipeActive(task) }"
            v-for="task in todayInProgressView"
            :key="task.id"
            @touchstart="onSwipeStart($event, task)"
            @touchmove="onSwipeMove($event, task)"
            @touchend="onSwipeEnd(task)"
            @touchcancel="onSwipeEnd(task)"
          >
            <view v-if="canSwipe(task)" class="swipe-actions">
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">完成</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">取消</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @click="openTask(task.id)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">截止 {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayInProgressView.length" class="empty">暂无任务</view>
        </view>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayDone }"
          @click="toggleSection('todayDone')"
        >
          <view class="section-left">
            <text class="section-title">已完成</text>
            <text class="section-meta">{{ todayDoneView.length }} 项</text>
          </view>
          <text class="section-toggle">{{ collapsedSections.todayDone ? '▼' : '▲' }}</text>
        </view>
        <view v-show="!collapsedSections.todayDone">
          <view
            class="swipe-row"
            :class="{ 'no-swipe': !canSwipe(task), 'is-swipe-active': isSwipeActive(task) }"
            v-for="task in todayDoneView"
            :key="task.id"
            @touchstart="onSwipeStart($event, task)"
            @touchmove="onSwipeMove($event, task)"
            @touchend="onSwipeEnd(task)"
            @touchcancel="onSwipeEnd(task)"
          >
            <view v-if="canSwipe(task)" class="swipe-actions">
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">完成</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">取消</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @click="openTask(task.id)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">截止 {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayDoneView.length" class="empty">暂无任务</view>
        </view>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayCancelled }"
          @click="toggleSection('todayCancelled')"
        >
          <view class="section-left">
            <text class="section-title">已取消</text>
            <text class="section-meta">{{ todayCancelledView.length }} 项</text>
          </view>
          <text class="section-toggle">{{ collapsedSections.todayCancelled ? '▼' : '▲' }}</text>
        </view>
        <view v-show="!collapsedSections.todayCancelled">
          <view
            class="swipe-row"
            :class="{ 'no-swipe': !canSwipe(task), 'is-swipe-active': isSwipeActive(task) }"
            v-for="task in todayCancelledView"
            :key="task.id"
            @touchstart="onSwipeStart($event, task)"
            @touchmove="onSwipeMove($event, task)"
            @touchend="onSwipeEnd(task)"
            @touchcancel="onSwipeEnd(task)"
          >
            <view v-if="canSwipe(task)" class="swipe-actions">
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">完成</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">取消</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @click="openTask(task.id)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">截止 {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayCancelledView.length" class="empty">暂无任务</view>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { ensureAuth, getRoleId, hasRoleSelection, setRoleId } from '../../utils/auth';
import { fetchProfile } from '../../services/auth';
import { fetchCategories } from '../../services/categories';
import { fetchRoles, createRole, updateRole, deleteRole } from '../../services/roles';
import { fetchBoardTasks, fetchTasks, updateTaskStatus } from '../../services/tasks';
import { formatBeijingDate, formatBeijingTime, formatDate } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';
import FloatingAddButton from '../../components/FloatingAddButton.vue';

const selectedDate = ref(formatDate(new Date()));
const priorityOptions = [
  { label: '全部', value: null },
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' }
];
const categoryOptions = ref([{ label: '全部', value: null }]);
const roleOptions = ref([{ label: '全部', value: null }]);
const selectedPriorityIndex = ref(0);
const selectedCategoryIndex = ref(0);
const selectedRoleIndex = ref(0);
const searchText = ref('');
const tasksByStatus = ref({
  todo: [],
  in_progress: [],
  done: [],
  cancelled: []
});
const yesterdayRemaining = ref([]);
const roles = ref([]);
const loading = ref(false);
const userProfile = ref(null);
const collapsedSections = ref({
  yesterday: true,
  todayTodo: true,
  todayInProgress: true,
  todayDone: true,
  todayCancelled: true,
});
const swipeOpenId = ref(null);
const swipingId = ref(null);
const swipeStartX = ref(0);
const swipeStartY = ref(0);
const swipeBaseX = ref(0);
const swipeTranslateX = ref(0);
const SWIPE_ACTION_WIDTH = 140;

const parseDateString = (value) => {
  const parts = value.split('-').map((item) => Number(item));
  if (parts.length < 3) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const selectedDateLabel = computed(() => {
  const date = parseDateString(selectedDate.value);
  return `${selectedDate.value} ${weekDays[date.getDay()]}`;
});

const showDatePicker = ref(false);
const showRolePicker = ref(false);
const showPriorityPicker = ref(false);
const showCategoryPicker = ref(false);
const actionSheetOpen = ref(false);
const dateList = ref([]);
const datePickerIndex = ref(0);
const pendingDate = ref(selectedDate.value);
const rolePickerIndex = ref(0);
const pendingRoleIndex = ref(0);
const priorityPickerIndex = ref(0);
const pendingPriorityIndex = ref(0);
const categoryPickerIndex = ref(0);
const pendingCategoryIndex = ref(0);
const DATE_WINDOW = 30;
const DATE_EXTEND = 30;

const selectedPriority = computed(() => priorityOptions[selectedPriorityIndex.value]?.value ?? null);
const selectedCategoryId = computed(() => categoryOptions.value[selectedCategoryIndex.value]?.value ?? null);
const isUncategorizedSelected = computed(() => selectedCategoryId.value === 0);
const selectedRoleId = computed(() => roleOptions.value[selectedRoleIndex.value]?.value ?? null);
const priorityLabel = computed(() => priorityOptions[selectedPriorityIndex.value]?.label ?? '全部');
const categoryLabel = computed(() => categoryOptions.value[selectedCategoryIndex.value]?.label ?? '全部');
const roleLabel = computed(() => roleOptions.value[selectedRoleIndex.value]?.label ?? '全部');

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
const priorityDisplayLabel = computed(() => `优先级-${priorityLabel.value}`);
const categoryDisplayLabel = computed(() => `分类-${categoryLabel.value}`);
const roleMap = computed(() => {
  const map = {};
  roles.value.forEach((role) => {
    map[role.id] = role.name;
  });
  return map;
});

const userDisplay = computed(() => {
  const profile = userProfile.value;
  if (!profile) return '';
  return profile.email || profile.phone_number || '';
});

const sortTasks = (list) => {
  const weights = { high: 3, medium: 2, low: 1 };
  return [...list].sort((a, b) => {
    const diff = (weights[b.priority] || 0) - (weights[a.priority] || 0);
    if (diff !== 0) return diff;
    const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });
};

const decorateTask = (task) => {
  const dueLabel = task.due_date
    ? `${formatBeijingDate(task.due_date)} ${formatBeijingTime(task.due_date)}`
    : '未设置';
  const dueDate = task.due_date ? formatBeijingDate(task.due_date) : '';
  const isOverdue =
    !!dueDate
    && selectedDate.value > dueDate
    && task.status !== 'done'
    && task.status !== 'cancelled';
  return {
    ...task,
    dueLabel,
    roleName: roleMap.value[task.role_id] || '未分配',
    isOverdue
  };
};

const todayTotalCount = computed(() => {
  const { todo, in_progress, done, cancelled } = tasksByStatus.value;
  return (todo || []).length + (in_progress || []).length + (done || []).length + (cancelled || []).length;
});

const todayTodoView = computed(() => sortTasks(tasksByStatus.value.todo || []).map(decorateTask));
const todayInProgressView = computed(() => sortTasks(tasksByStatus.value.in_progress || []).map(decorateTask));
const todayDoneView = computed(() => sortTasks(tasksByStatus.value.done || []).map(decorateTask));
const todayCancelledView = computed(() => sortTasks(tasksByStatus.value.cancelled || []).map(decorateTask));
const yesterdayRemainingView = computed(() => sortTasks(yesterdayRemaining.value).map(decorateTask));

const buildDateList = (centerDate) => {
  const center = parseDateString(centerDate);
  const list = [];
  for (let offset = -DATE_WINDOW; offset <= DATE_WINDOW; offset += 1) {
    const date = new Date(center);
    date.setDate(date.getDate() + offset);
    const value = formatDate(date);
    list.push({ value, label: `${value} ${weekDays[date.getDay()]}` });
  }
  return list;
};

const buildLocalRangeForDate = (dateStr) => {
  if (!dateStr) {
    return { dueFrom: undefined, dueTo: undefined };
  }
  return {
    dueFrom: `${dateStr}T00:00:00`,
    dueTo: `${dateStr}T23:59:59`,
  };
};

const openDatePicker = () => {
  const list = buildDateList(selectedDate.value);
  dateList.value = list;
  pendingDate.value = selectedDate.value;
  const idx = list.findIndex((item) => item.value === pendingDate.value);
  datePickerIndex.value = idx >= 0 ? idx : DATE_WINDOW;
  showDatePicker.value = true;
};

const closeDatePicker = () => {
  showDatePicker.value = false;
};

const extendDateList = (direction) => {
  if (direction === 'prev') {
    const first = dateList.value[0]?.value || selectedDate.value;
    const base = parseDateString(first);
    const extra = [];
    for (let i = DATE_EXTEND; i >= 1; i -= 1) {
      const date = new Date(base);
      date.setDate(date.getDate() - i);
      const value = formatDate(date);
      extra.push({ value, label: `${value} ${weekDays[date.getDay()]}` });
    }
    dateList.value = [...extra, ...dateList.value];
    datePickerIndex.value += DATE_EXTEND;
  } else if (direction === 'next') {
    const last = dateList.value[dateList.value.length - 1]?.value || selectedDate.value;
    const base = parseDateString(last);
    const extra = [];
    for (let i = 1; i <= DATE_EXTEND; i += 1) {
      const date = new Date(base);
      date.setDate(date.getDate() + i);
      const value = formatDate(date);
      extra.push({ value, label: `${value} ${weekDays[date.getDay()]}` });
    }
    dateList.value = [...dateList.value, ...extra];
  }
};

const onPickerChange = (event) => {
  const idx = Number(event.detail.value?.[0] ?? event.detail.value);
  datePickerIndex.value = idx;
  const item = dateList.value[idx];
  if (item) {
    pendingDate.value = item.value;
  }
  if (idx <= 3) {
    extendDateList('prev');
  } else if (idx >= dateList.value.length - 4) {
    extendDateList('next');
  }
};

const confirmDatePicker = () => {
  selectedDate.value = pendingDate.value;
  uni.setStorageSync('planner_selected_date', selectedDate.value);
  showDatePicker.value = false;
};

const openRolePicker = () => {
  pendingRoleIndex.value = selectedRoleIndex.value;
  rolePickerIndex.value = selectedRoleIndex.value;
  showRolePicker.value = true;
};

const closeRolePicker = () => {
  showRolePicker.value = false;
};

const onRolePickerChange = (event) => {
  const idx = Number(event.detail.value?.[0] ?? event.detail.value);
  rolePickerIndex.value = idx;
  pendingRoleIndex.value = idx;
};

const confirmRolePicker = () => {
  const idx = pendingRoleIndex.value;
  selectedRoleIndex.value = idx;
  const roleId = roleOptions.value[idx]?.value ?? null;
  setRoleId(roleId || null);
  showRolePicker.value = false;
};

const openPriorityPicker = () => {
  pendingPriorityIndex.value = selectedPriorityIndex.value;
  priorityPickerIndex.value = selectedPriorityIndex.value;
  showPriorityPicker.value = true;
};

const closePriorityPicker = () => {
  showPriorityPicker.value = false;
};

const onPriorityPickerChange = (event) => {
  const idx = Number(event.detail.value?.[0] ?? event.detail.value);
  priorityPickerIndex.value = idx;
  pendingPriorityIndex.value = idx;
};

const confirmPriorityPicker = () => {
  const idx = pendingPriorityIndex.value;
  selectedPriorityIndex.value = idx;
  showPriorityPicker.value = false;
};

const openCategoryPicker = () => {
  pendingCategoryIndex.value = selectedCategoryIndex.value;
  categoryPickerIndex.value = selectedCategoryIndex.value;
  showCategoryPicker.value = true;
};

const closeCategoryPicker = () => {
  showCategoryPicker.value = false;
};

const onCategoryPickerChange = (event) => {
  const idx = Number(event.detail.value?.[0] ?? event.detail.value);
  categoryPickerIndex.value = idx;
  pendingCategoryIndex.value = idx;
};

const confirmCategoryPicker = () => {
  const idx = pendingCategoryIndex.value;
  selectedCategoryIndex.value = idx;
  showCategoryPicker.value = false;
};

const handleCreateRole = () => {
  uni.showModal({
    title: '新增角色',
    editable: true,
    placeholderText: '请输入角色名称',
    success: async (res) => {
      if (!res.confirm) return;
      const name = (res.content || '').trim();
      if (!name) return;
      try {
        await createRole(name);
        await loadRoles();
        const idx = roleOptions.value.findIndex((item) => item.label === name);
        if (idx >= 0) {
          selectedRoleIndex.value = idx;
          setRoleId(roleOptions.value[idx].value);
        }
      } catch (err) {
        uni.showToast({ title: '新增失败', icon: 'none' });
      }
    },
  });
};

const handleRenameRole = () => {
  const current = roleOptions.value[selectedRoleIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: '请选择要重命名的角色', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '重命名角色',
    editable: true,
    placeholderText: '请输入新名称',
    success: async (res) => {
      if (!res.confirm) return;
      const name = (res.content || '').trim();
      if (!name) return;
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
    },
  });
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
        applyDefaultRole();
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' });
      }
    },
  });
};

const resetFilters = () => {
  selectedPriorityIndex.value = 0;
  selectedCategoryIndex.value = 0;
  applyDefaultRole();
  searchText.value = '';
};

const shiftDate = (offset) => {
  const date = parseDateString(selectedDate.value);
  date.setDate(date.getDate() + offset);
  selectedDate.value = formatDate(date);
  uni.setStorageSync('planner_selected_date', selectedDate.value);
};

const goToday = () => {
  selectedDate.value = formatDate(new Date());
  uni.setStorageSync('planner_selected_date', selectedDate.value);
};

const priorityText = (value) => {
  if (value === 'high') return '高';
  if (value === 'medium') return '中';
  return '低';
};

const statusText = (value) => {
  if (value === 'todo') return '待办';
  if (value === 'in_progress') return '进行中';
  if (value === 'cancelled') return '已取消';
  return '已完成';
};

const openTask = (taskId) => {
  if (!taskId) return;
  resetSwipe();
  uni.navigateTo({ url: `/pages/task-detail/index?id=${taskId}` });
};

const canSwipe = (task) => {
  if (!task) return false;
  return task.status !== 'done' && task.status !== 'cancelled';
};

const isSwipeActive = (task) => {
  if (!task?.id) return false;
  return swipingId.value === task.id || swipeOpenId.value === task.id;
};

const swipeStyle = (task) => {
  if (!canSwipe(task)) return {};
  const taskId = task.id;
  if (swipingId.value === taskId) {
    return { transform: `translateX(${swipeTranslateX.value}px)` };
  }
  if (swipeOpenId.value === taskId) {
    return { transform: `translateX(-${SWIPE_ACTION_WIDTH}px)` };
  }
  return {};
};

const resetSwipe = () => {
  swipeOpenId.value = null;
  swipingId.value = null;
  swipeTranslateX.value = 0;
};

const onSwipeStart = (event, task) => {
  if (!task?.id || !canSwipe(task)) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  const taskId = task.id;
  if (swipeOpenId.value && swipeOpenId.value !== taskId) {
    swipeOpenId.value = null;
  }
  swipingId.value = taskId;
  swipeStartX.value = touch.clientX;
  swipeStartY.value = touch.clientY;
  swipeBaseX.value = swipeOpenId.value === taskId ? -SWIPE_ACTION_WIDTH : 0;
  swipeTranslateX.value = swipeBaseX.value;
};

const onSwipeMove = (event, task) => {
  if (!task?.id || swipingId.value !== task.id) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  const deltaX = touch.clientX - swipeStartX.value;
  const deltaY = touch.clientY - swipeStartY.value;
  if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 4) return;
  let next = swipeBaseX.value + deltaX;
  if (next > 0) next = 0;
  if (next < -SWIPE_ACTION_WIDTH) next = -SWIPE_ACTION_WIDTH;
  swipeTranslateX.value = next;
};

const onSwipeEnd = (task) => {
  if (!task?.id || swipingId.value !== task.id) return;
  const wasOpen = swipeBaseX.value < 0;
  if (wasOpen) {
    if (swipeTranslateX.value > -SWIPE_ACTION_WIDTH + 10) {
      swipeOpenId.value = null;
    } else {
      swipeOpenId.value = task.id;
    }
  } else if (swipeTranslateX.value <= -SWIPE_ACTION_WIDTH / 2) {
    swipeOpenId.value = task.id;
  } else {
    swipeOpenId.value = null;
  }
  swipingId.value = null;
  swipeTranslateX.value = 0;
};

const markDone = async (task) => {
  if (!task?.id || task.status === 'done') return;
  try {
    await updateTaskStatus(task.id, 'done');
    resetSwipe();
    await refreshAll();
  } catch {
    uni.showToast({ title: '标记失败', icon: 'none' });
  }
};

const markCancelled = async (task) => {
  if (!task?.id || task.status === 'cancelled') return;
  try {
    await updateTaskStatus(task.id, 'cancelled');
    resetSwipe();
    await refreshAll();
  } catch {
    uni.showToast({ title: '标记失败', icon: 'none' });
  }
};

const toggleSection = (key) => {
  if (!collapsedSections.value[key] && key === 'yesterday' && !yesterdayRemainingView.value.length) {
    return;
  }
  collapsedSections.value[key] = !collapsedSections.value[key];
};

const loadCategories = async () => {
  try {
    const data = await fetchCategories();
    const options = [
      { label: '全部', value: null },
      { label: '未分类', value: 0 },
    ];
    data.forEach((item) => {
      options.push({ label: item.name, value: item.id });
    });
    categoryOptions.value = options;
  } catch {
    // ignore
  }
};

const loadRoles = async () => {
  try {
    const data = await fetchRoles();
    roles.value = data;
    roleOptions.value = [
      { label: '全部', value: null },
      ...data.map((role) => ({ label: role.name, value: role.id })),
    ];
  } catch {
    // ignore
  }
};

const loadBoardTasks = async () => {
  const { dueFrom, dueTo } = buildLocalRangeForDate(selectedDate.value);
  const roleId = selectedRoleId.value ?? getRoleId();
  const categoryId = selectedCategoryId.value;
  const apiCategoryId = categoryId === 0 ? undefined : categoryId;
  const data = await fetchBoardTasks({
    dueFrom,
    dueTo,
    priority: selectedPriority.value || undefined,
    categoryId: apiCategoryId ?? undefined,
    q: searchText.value.trim() || undefined,
    roleId: roleId ?? undefined,
  });
  let nextTasks = {
    todo: data?.todo || [],
    in_progress: data?.in_progress || [],
    done: data?.done || [],
    cancelled: data?.cancelled || [],
  };
  if (isUncategorizedSelected.value) {
    const filterList = (list) => (list || []).filter((task) => task.category_id === null);
    nextTasks = {
      todo: filterList(nextTasks.todo),
      in_progress: filterList(nextTasks.in_progress),
      done: filterList(nextTasks.done),
      cancelled: filterList(nextTasks.cancelled),
    };
  }
  tasksByStatus.value = nextTasks;
};

const loadYesterdayRemaining = async () => {
  const roleId = selectedRoleId.value ?? getRoleId();
  const categoryId = selectedCategoryId.value;
  const apiCategoryId = categoryId === 0 ? undefined : categoryId;
  const params = {
    priority: selectedPriority.value || undefined,
    category_id: apiCategoryId ?? undefined,
    q: searchText.value.trim() || undefined,
    role_id: roleId ?? undefined,
    order: 'priority_desc',
  };
  const [todoList, inProgressList] = await Promise.all([
    fetchTasks({ ...params, status: 'todo' }),
    fetchTasks({ ...params, status: 'in_progress' }),
  ]);
  let merged = [...todoList, ...inProgressList];
  if (isUncategorizedSelected.value) {
    merged = merged.filter((task) => task.category_id === null);
  }
  const filtered = merged.filter((task) => {
    if (!task.due_date) return false;
    const dueDate = formatBeijingDate(task.due_date);
    return dueDate < selectedDate.value;
  });
  yesterdayRemaining.value = filtered;
};

const refreshAll = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    await Promise.all([loadBoardTasks(), loadYesterdayRemaining()]);
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
};

let searchTimer = null;
watch([selectedDate, selectedPriorityIndex, selectedCategoryIndex, selectedRoleIndex], () => {
  void refreshAll();
});

watch(searchText, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void refreshAll();
  }, 300);
});

const syncRoleSelection = () => {
  if (!hasRoleSelection()) {
    applyDefaultRole();
    return;
  }
  const stored = getRoleId();
  if (stored === null) {
    selectedRoleIndex.value = 0;
    return;
  }
  const idx = roleOptions.value.findIndex((item) => item.value === stored);
  selectedRoleIndex.value = idx >= 0 ? idx : 0;
};

const applyDefaultRole = () => {
  const personalIndex = roleOptions.value.findIndex((item) => item.label === '个人');
  if (personalIndex > 0) {
    selectedRoleIndex.value = personalIndex;
    setRoleId(roleOptions.value[personalIndex].value);
  } else {
    selectedRoleIndex.value = 0;
    setRoleId(null);
  }
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
  const stored = uni.getStorageSync('planner_selected_date');
  if (stored) {
    selectedDate.value = stored;
  } else {
    selectedDate.value = formatDate(new Date());
  }
  await loadRoles();
  syncRoleSelection();
  const prompted = uni.getStorageSync('planner_role_prompted');
  if (!prompted) {
    uni.setStorageSync('planner_role_prompted', '1');
    openRolePicker();
  }
  await loadCategories();
  await refreshAll();
});
</script>

<style scoped>
.page {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page .card {
  padding: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  text-align: center;
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

.welcome-date {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--font-small);
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

.role-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.welcome-right {
  min-width: 0;
  padding-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.role-inline .label {
  font-size: 10px;
}

.role-inline .picker-input {
  font-size: 10px;
  padding: 4px 6px;
  margin-top: 0;
}

.role-manage {
  font-size: 10px;
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
}


.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: nowrap;
}

.date-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.label {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.date-input {
  padding: 5px 8px;
  border-radius: 10px;
  border: 1px solid var(--line);
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.date-actions {
  display: flex;
  gap: 6px;
}

.date-actions .btn {
  white-space: nowrap;
  font-size: 12px;
  text-align: center;
  line-height: 1;
  padding: 6px 10px;
}

.filter-row {
  display: flex;
  gap: 8px;
}

.filter-item {
  flex: 1;
}

.picker-input {
  margin-top: 6px;
  padding: 5px 8px;
  border-radius: 10px;
  border: 1px solid var(--line);
  font-size: 12px;
}

.search-row {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 5px 8px;
  font-size: 12px;
}

.search-row .btn {
  font-size: 12px;
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
  font-weight: 700;
}

.modal-actions {
  display: flex;
  gap: 8px;
}

.date-picker {
  height: 210px;
}

.picker-item {
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.section-header.collapsed {
  margin-bottom: 0;
}

.section-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.clickable {
  cursor: pointer;
}

.section-toggle {
  font-size: 12px;
  color: var(--muted);
}

.subsection + .subsection {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
}

.subsection {
  padding-left: 8px;
}

.card.collapsed {
  padding-bottom: 6px;
}

.section-title {
  font-weight: 700;
}

.section-meta {
  font-size: 12px;
  color: var(--muted);
}

.task-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px;
  transition: transform 0.2s ease;
  background: #fff;
}

.task-card.swiping {
  transition: none;
}

.swipe-row {
  position: relative;
  overflow: hidden;
  margin-bottom: 6px;
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 140px;
  padding: 0;
  opacity: 0;
  transform: translateX(8px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  border-radius: 10px;
  overflow: hidden;
}

.swipe-row.is-swipe-active .swipe-actions {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.swipe-btn {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.swipe-icon {
  font-size: 16px;
  line-height: 1;
}

.swipe-text {
  font-size: 12px;
  line-height: 1;
}

.swipe-btn.done {
  background: #4aa3df;
}

.swipe-btn.cancel {
  background: #f39a5a;
}

.task-card.overdue {
  border-color: #f29aa0;
  background: #fff6f7;
}

.task-card:active {
  transform: scale(0.98);
}

.task-title {
  font-size: 14px;
  font-weight: 700;
}

.task-meta {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--muted);
}

.task-tags {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.tag {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid var(--line);
  color: var(--muted);
}

.tag.high {
  background: #ffe5e5;
  color: #d32f2f;
  border-color: #f5b5b5;
}

.tag.medium {
  background: #e3f2fd;
  color: #1565c0;
  border-color: #b6d6f7;
}

.tag.low {
  background: #e0f2f1;
  color: #00796b;
  border-color: #b5e3df;
}

.tag.status {
  background: #f3f4f6;
  color: #64748b;
}

.tag.overdue {
  background: #ffe5e7;
  color: #c62828;
  border-color: #f2b1b6;
}

.empty {
  font-size: 12px;
  color: var(--muted);
}

</style>
