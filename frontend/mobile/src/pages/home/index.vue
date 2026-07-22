<template>
  <view class="page">
    <LogoutButton />
    <FloatingAddButton :disable="showDatePicker || showRolePicker || showPriorityPicker || showCategoryPicker || actionSheetOpen" />
    <view class="welcome card">
      <view class="welcome-left">
        <view class="welcome-row">
          <text class="welcome-title">{{ t('greeting') }}</text>
          <text class="welcome-user profile-link" @click="openCompleteProfile">{{ userDisplay || t('complete.profile') }}</text>
          <text class="welcome-edit" @click="openCompleteProfile">✎</text>
        </view>
      </view>
      <view class="welcome-right">
        <view class="role-inline">
          <text class="label">{{ t('role') }}</text>
          <view class="picker-input" @click="openRolePicker">{{ roleLabel }}</view>
          <view class="role-manage" @click="openRoleManager">{{ t('role.manage') }}</view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="date-row">
        <view class="date-left">
          <text class="label">{{ t('select.date') }}</text>
          <view class="date-input" @click="openDatePicker">{{ selectedDateLabel }}</view>
        </view>
        <view class="date-actions">
          <view class="btn" @click="shiftDate(-1)">‹</view>
          <view class="btn primary" @click="goToday">{{ t('today') }}</view>
          <view class="btn" @click="shiftDate(1)">›</view>
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
        <input class="search-input" v-model="searchText" :placeholder="t('search.task')" />
        <button class="btn" size="mini" @click="resetFilters">{{ t('clear.filter') }}</button>
      </view>
    </view>



    <view v-if="showDatePicker" class="modal-mask" @click="closeDatePicker">
      <view class="modal-card" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ t('modal.select.date') }}</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closeDatePicker">{{ t('modal.cancel') }}</button>
            <button class="btn primary" size="mini" @click="confirmDatePicker">{{ t('modal.confirm') }}</button>
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
          <text class="modal-title">{{ t('modal.select.role') }}</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closeRolePicker">{{ t('modal.cancel') }}</button>
            <button class="btn primary" size="mini" @click="confirmRolePicker">{{ t('modal.confirm') }}</button>
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
          <text class="modal-title">{{ t('modal.select.priority') }}</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closePriorityPicker">{{ t('modal.cancel') }}</button>
            <button class="btn primary" size="mini" @click="confirmPriorityPicker">{{ t('modal.confirm') }}</button>
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
          <text class="modal-title">{{ t('modal.select.category') }}</text>
          <view class="modal-actions">
            <button class="btn" size="mini" @click="closeCategoryPicker">{{ t('modal.cancel') }}</button>
            <button class="btn primary" size="mini" @click="confirmCategoryPicker">{{ t('modal.confirm') }}</button>
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

    <PromptDialog
      v-model:visible="promptVisible"
      :title="promptTitle"
      :placeholder="promptPlaceholder"
      :value="promptValue"
      @confirm="handlePromptConfirm"
    />

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
          <text class="section-title">{{ t('home.yesterday') }}</text>
          <text class="section-meta">{{ yesterdayRemainingView.length }} {{ t('item.count') }}</text>
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
            <view class="swipe-btn view" @click.stop="openTask(task.id)">
              <text class="swipe-icon">🔍</text>
              <text class="swipe-text">{{ t('swipe.view') }}</text>
            </view>
            <view class="swipe-btn done" @click.stop="markDone(task)">
              <text class="swipe-icon">✓</text>
              <text class="swipe-text">{{ t('swipe.complete') }}</text>
            </view>
            <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
              <text class="swipe-icon">✕</text>
              <text class="swipe-text">{{ t('swipe.cancel') }}</text>
            </view>
          </view>
          <view
            class="task-card"
            :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
            :style="swipeStyle(task)"
            @touchend.stop="handleTaskTouchEnd($event, task)"
            @click.stop="handleTaskClick(task)"
          >
            <view class="task-info">
              <text class="task-title">{{ task.title }}</text>
              <text class="task-meta">{{ t('home.due') }} {{ task.dueLabel }} · {{ task.roleName }}</text>
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
        <text class="section-title">{{ t('home.today') }}</text>
        <text class="section-meta">{{ todayTotalCount }} {{ t('item.count') }}</text>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayTodo }"
          @click="toggleSection('todayTodo')"
        >
          <view class="section-left">
            <text class="section-title">{{ t('home.today.todo') }}</text>
            <text class="section-meta">{{ todayTodoView.length }} {{ t('item.count') }}</text>
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
              <view class="swipe-btn view" @click.stop="openTask(task.id)">
                <text class="swipe-icon">🔍</text>
                <text class="swipe-text">{{ t('swipe.view') }}</text>
              </view>
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">{{ t('swipe.complete') }}</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">{{ t('swipe.cancel') }}</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @touchend.stop="handleTaskTouchEnd($event, task)"
              @click.stop="handleTaskClick(task)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">{{ t('home.due') }} {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayTodoView.length" class="empty">{{ t('home.no.tasks') }}</view>
        </view>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayInProgress }"
          @click="toggleSection('todayInProgress')"
        >
          <view class="section-left">
            <text class="section-title">{{ t('home.in_progress') }}</text>
            <text class="section-meta">{{ todayInProgressView.length }} {{ t('item.count') }}</text>
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
              <view class="swipe-btn view" @click.stop="openTask(task.id)">
                <text class="swipe-icon">🔍</text>
                <text class="swipe-text">{{ t('swipe.view') }}</text>
              </view>
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">{{ t('swipe.complete') }}</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">{{ t('swipe.cancel') }}</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @touchend.stop="handleTaskTouchEnd($event, task)"
              @click.stop="handleTaskClick(task)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">{{ t('home.due') }} {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayInProgressView.length" class="empty">{{ t('home.no.tasks') }}</view>
        </view>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayDone }"
          @click="toggleSection('todayDone')"
        >
          <view class="section-left">
            <text class="section-title">{{ t('home.done') }}</text>
            <text class="section-meta">{{ todayDoneView.length }} {{ t('item.count') }}</text>
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
              <view class="swipe-btn view" @click.stop="openTask(task.id)">
                <text class="swipe-icon">🔍</text>
                <text class="swipe-text">{{ t('swipe.view') }}</text>
              </view>
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">{{ t('swipe.complete') }}</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">{{ t('swipe.cancel') }}</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @touchend.stop="handleTaskTouchEnd($event, task)"
              @click.stop="handleTaskClick(task)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">{{ t('home.due') }} {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayDoneView.length" class="empty">{{ t('home.no.tasks') }}</view>
        </view>
      </view>

      <view class="subsection">
        <view
          class="section-header clickable"
          :class="{ collapsed: collapsedSections.todayCancelled }"
          @click="toggleSection('todayCancelled')"
        >
          <view class="section-left">
            <text class="section-title">{{ t('home.cancelled') }}</text>
            <text class="section-meta">{{ todayCancelledView.length }} {{ t('item.count') }}</text>
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
              <view class="swipe-btn view" @click.stop="openTask(task.id)">
                <text class="swipe-icon">🔍</text>
                <text class="swipe-text">{{ t('swipe.view') }}</text>
              </view>
              <view class="swipe-btn done" @click.stop="markDone(task)">
                <text class="swipe-icon">✓</text>
                <text class="swipe-text">{{ t('swipe.complete') }}</text>
              </view>
              <view class="swipe-btn cancel" @click.stop="markCancelled(task)">
                <text class="swipe-icon">✕</text>
                <text class="swipe-text">{{ t('swipe.cancel') }}</text>
              </view>
            </view>
            <view
              class="task-card"
              :class="{ overdue: task.isOverdue, swiping: swipingId === task.id }"
              :style="swipeStyle(task)"
              @touchend.stop="handleTaskTouchEnd($event, task)"
              @click.stop="handleTaskClick(task)"
            >
              <view class="task-info">
                <text class="task-title">{{ task.title }}</text>
                <text class="task-meta">{{ t('home.due') }} {{ task.dueLabel }} · {{ task.roleName }}</text>
              </view>
              <view class="task-tags">
                <text class="tag" :class="task.priority">{{ priorityText(task.priority) }}</text>
                <text class="tag status">{{ statusText(task.status) }}</text>
                <text v-if="task.isOverdue" class="tag overdue">超时</text>
              </view>
            </view>
          </view>
          <view v-if="!todayCancelledView.length" class="empty">{{ t('home.no.tasks') }}</view>
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
import { createTaskFromVoiceBlob } from '../../services/voice';
import { formatBeijingDate, formatBeijingTime, formatDate } from '../../utils/date';
import { t, locale, initLocale } from '../../locale';
import LogoutButton from '../../components/LogoutButton.vue';
import PromptDialog from '../../components/PromptDialog.vue';
import FloatingAddButton from '../../components/FloatingAddButton.vue';

const selectedDate = ref(formatDate(new Date()));
const priorityOptions = computed(() => [
  { label: t('filter.all'), value: null },
  { label: t('priority.high'), value: 'high' },
  { label: t('priority.medium'), value: 'medium' },
  { label: t('priority.low'), value: 'low' }
]);
const categoryOptions = ref([{ label: t('role.all'), value: null }]);
const roleOptions = ref([{ label: t('role.all'), value: null }]);
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
const SWIPE_ACTION_WIDTH = 240;
const isDragging = ref(false);
const lastTouchTime = ref(0);
const lastTouchTaskId = ref(null);
const DOUBLE_TAP_INTERVAL = 300;
const voiceRecording = ref(false);
const voiceLoading = ref(false);
const voiceError = ref('');
const voiceTranscript = ref('');
const voiceUsingWav = ref(false);
const voiceCandidates = ref([]);
const voicePendingStatus = ref('');
const voiceDraft = ref(null);
const voiceDraftForm = ref({
  title: '',
  description: '',
  start_date: '',
  due_date: '',
});
const voiceSuggestedId = ref(null);

const buildVoiceDraftForm = (draft) => ({
  title: draft?.title || '',
  description: draft?.description || '',
  start_date: draft?.start_date
    ? `${formatBeijingDate(draft.start_date)} ${formatBeijingTime(draft.start_date)}`
    : '',
  due_date: draft?.due_date
    ? `${formatBeijingDate(draft.due_date)} ${formatBeijingTime(draft.due_date)}`
    : '',
});

const normalizeVoiceDateInput = (value) => {
  if (!value) return '';
  return value.includes('T') ? value : value.replace(' ', 'T');
};

let mediaRecorder = null;
let mediaStream = null;
let audioContext = null;
let processorNode = null;
let pcmChunks = [];
let inputSampleRate = 48000;

const parseDateString = (value) => {
  const parts = value.split('-').map((item) => Number(item));
  if (parts.length < 3) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const weekDays = computed(() => [t('weekday.sun.full'), t('weekday.mon.full'), t('weekday.tue.full'), t('weekday.wed.full'), t('weekday.thu.full'), t('weekday.fri.full'), t('weekday.sat.full')]);

const selectedDateLabel = computed(() => {
  const date = parseDateString(selectedDate.value);
  return `${selectedDate.value} ${weekDays.value[date.getDay()]}`;
});

const showDatePicker = ref(false);
const showRolePicker = ref(false);
const showPriorityPicker = ref(false);
const showCategoryPicker = ref(false);
const actionSheetOpen = ref(false);
const promptVisible = ref(false);
const promptTitle = ref('');
const promptPlaceholder = ref('');
const promptValue = ref('');
const promptType = ref('');
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

const selectedPriority = computed(() => priorityOptions.value[selectedPriorityIndex.value]?.value ?? null);
const selectedCategoryId = computed(() => categoryOptions.value[selectedCategoryIndex.value]?.value ?? null);
const isUncategorizedSelected = computed(() => selectedCategoryId.value === 0);
const selectedRoleId = computed(() => roleOptions.value[selectedRoleIndex.value]?.value ?? null);
const priorityLabel = computed(() => priorityOptions.value[selectedPriorityIndex.value]?.label ?? t('filter.all'));
const categoryLabel = computed(() => categoryOptions.value[selectedCategoryIndex.value]?.label ?? t('filter.all'));
const roleLabel = computed(() => roleOptions.value[selectedRoleIndex.value]?.label ?? t('role.all'));

const openCompleteProfile = () => uni.navigateTo({ url: '/pages/complete-profile/index' });
const openRoleManager = () => {
  const actions = [t('role.create'), t('role.rename.current'), t('role.delete.current')];
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
const priorityDisplayLabel = computed(() => `${t('priority.label')}-${priorityLabel.value}`);
const categoryDisplayLabel = computed(() => `${t('category')}-${categoryLabel.value}`);
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
  const em = profile.email || '';
  if (em && !em.endsWith('@wechat.local')) return em;
  return profile.phone_number || '';
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
    roleName: roleMap.value[task.role_id] || t('task.detail.unassigned'),
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
    list.push({ value, label: `${value} ${weekDays.value[date.getDay()]}` });
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
      extra.push({ value, label: `${value} ${weekDays.value[date.getDay()]}` });
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
      extra.push({ value, label: `${value} ${weekDays.value[date.getDay()]}` });
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

const openPrompt = (type, title, placeholder, value = '') => {
  promptType.value = type;
  promptTitle.value = title;
  promptPlaceholder.value = placeholder;
  promptValue.value = value;
  promptVisible.value = true;
};

const handleCreateRole = () => {
  openPrompt('role-create', t('role.create'), t('role.name.ph'));
};

const handleRenameRole = () => {
  const current = roleOptions.value[selectedRoleIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: t('role.select.rename'), icon: 'none' });
    return;
  }
  openPrompt('role-rename', t('role.rename.current'), t('role.new.name'), current.label);
};

const handleDeleteRole = () => {
  const current = roleOptions.value[selectedRoleIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: t('role.select.delete'), icon: 'none' });
    return;
  }
  uni.showModal({
    title: t('role.delete.title'),
    content: t('role.delete.confirm', { name: current.label }),
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteRole(current.value);
        await loadRoles();
        applyDefaultRole();
      } catch {
        uni.showToast({ title: t('role.delete.fail'), icon: 'none' });
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
  if (value === 'high') return t('priority.high');
  if (value === 'medium') return t('priority.medium');
  return t('priority.low');
};

const statusText = (value) => {
  if (value === 'todo') return t('status.todo');
  if (value === 'in_progress') return t('status.in_progress');
  if (value === 'cancelled') return t('status.cancelled');
  return t('status.done');
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
  isDragging.value = false;
};

const onSwipeStart = (event, task) => {
  if (!task?.id || !canSwipe(task)) return;
  const touch = event.touches?.[0];
  if (!touch) return;
  const taskId = task.id;
  if (swipeOpenId.value && swipeOpenId.value !== taskId) {
    swipeOpenId.value = null;
  }
  isDragging.value = false;
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
  if (Math.abs(deltaX) > 6 && Math.abs(deltaX) >= Math.abs(deltaY)) {
    isDragging.value = true;
  }
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
  setTimeout(() => {
    isDragging.value = false;
  }, 0);
};

const handleTaskTouchEnd = (_event, task) => {
  if (!task?.id) return;
  if (isDragging.value) return;
  if (swipeOpenId.value === task.id) {
    resetSwipe();
    return;
  }
  const now = Date.now();
  const isDoubleTap =
    lastTouchTaskId.value === task.id
    && now - lastTouchTime.value <= DOUBLE_TAP_INTERVAL;
  lastTouchTime.value = now;
  lastTouchTaskId.value = task.id;
  if (isDoubleTap) {
    lastTouchTime.value = 0;
    lastTouchTaskId.value = null;
    openTask(task.id);
  }
};

const handleTaskClick = (task) => {
  if (!task?.id) return;
  const now = Date.now();
  if (now - lastTouchTime.value < 400) return;
  if (swipeOpenId.value === task.id) {
    resetSwipe();
    return;
  }
  openTask(task.id);
};

const stopVoiceStream = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
};

const handleVoiceBlob = async (blob) => {
  if (!blob) return;
  voiceLoading.value = true;
  voiceError.value = '';
  try {
    const result = await createTaskFromVoiceBlob(blob);
    voiceTranscript.value = result?.transcript || '';
    if (result?.draft) {
      voiceDraft.value = result.draft;
      voiceDraftForm.value = buildVoiceDraftForm(result.draft);
      return;
    }
    if (result?.candidates?.length) {
      voiceCandidates.value = result.candidates;
      voicePendingStatus.value = result.status || '';
      if (result.suggested_task) {
        applyVoiceCandidate(result.suggested_task);
      }
      return;
    }
    await refreshAll();
  } catch (err) {
    const message = err?.message || String(err);
    voiceError.value = message || '语音解析失败';
  } finally {
    voiceLoading.value = false;
    voiceRecording.value = false;
  }
};

const startVoiceRecording = async () => {
  voiceError.value = '';
  voiceTranscript.value = '';
  voiceUsingWav.value = false;
  voiceCandidates.value = [];
  voicePendingStatus.value = '';
  voiceDraft.value = null;
  voiceDraftForm.value = buildVoiceDraftForm(null);
  // #ifdef H5
  if (!navigator.mediaDevices?.getUserMedia) {
    voiceError.value = '当前浏览器不支持录音';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStream = stream;
    const canOpus = typeof MediaRecorder !== 'undefined'
      && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus');
    if (canOpus) {
      voiceUsingWav.value = false;
      const chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/ogg;codecs=opus' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        stopVoiceStream();
        if (!chunks.length) {
          voiceError.value = '未获取到录音数据';
          voiceRecording.value = false;
          return;
        }
        const blob = new Blob(chunks, { type: 'audio/ogg;codecs=opus' });
        void handleVoiceBlob(blob);
      };
      mediaRecorder.start();
      voiceRecording.value = true;
      return;
    }

    if (typeof AudioContext === 'undefined') {
      voiceError.value = '当前浏览器不支持录音';
      stopVoiceStream();
      return;
    }

    voiceUsingWav.value = true;
    audioContext = new AudioContext();
    inputSampleRate = audioContext.sampleRate;
    const source = audioContext.createMediaStreamSource(stream);
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    pcmChunks = [];
    processorNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      pcmChunks.push(new Float32Array(input));
    };
    source.connect(processorNode);
    processorNode.connect(audioContext.destination);
    voiceRecording.value = true;
  } catch (err) {
    voiceError.value = '无法获取麦克风权限';
    stopVoiceStream();
  }
  // #endif
  // #ifndef H5
  uni.showToast({ title: '当前平台暂不支持语音输入', icon: 'none' });
  // #endif
};

const stopVoiceRecording = () => {
  if (voiceUsingWav.value) {
    if (processorNode) processorNode.disconnect();
    if (audioContext) audioContext.close();
    processorNode = null;
    audioContext = null;
    stopVoiceStream();
    const pcm = flattenFloat32(pcmChunks);
    pcmChunks = [];
    if (!pcm.length) {
      voiceError.value = '未获取到录音数据';
      voiceRecording.value = false;
      return;
    }
    const wavBlob = encodeWav(pcm, inputSampleRate, 16000);
    void handleVoiceBlob(wavBlob);
    return;
  }
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
};

const toggleVoiceRecording = () => {
  if (voiceLoading.value) return;
  if (voiceRecording.value) {
    stopVoiceRecording();
  } else {
    void startVoiceRecording();
  }
};

const clearVoiceDraft = () => {
  voiceDraft.value = null;
  voiceDraftForm.value = buildVoiceDraftForm(null);
};

const applyVoiceCandidate = async (task) => {
  if (!task?.id) return;
  if (!voicePendingStatus.value) {
    voiceError.value = '无法确定目标状态';
    return;
  }
  uni.showModal({
    title: '确认更新状态',
    content: `任务：${task.title}\n目标状态：${voicePendingStatus.value}\n确认更新？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        voiceLoading.value = true;
        await updateTaskStatus(task.id, voicePendingStatus.value);
        voiceCandidates.value = [];
        await refreshAll();
      } catch {
        voiceError.value = '更新任务失败';
      } finally {
        voiceLoading.value = false;
      }
    },
  });
};

const confirmVoiceDraft = async () => {
  if (!voiceDraft.value) return;
  const draft = voiceDraft.value;
  const title = voiceDraftForm.value.title.trim();
  if (!title) {
    voiceError.value = '标题不能为空';
    return;
  }
  const start = normalizeVoiceDateInput(voiceDraftForm.value.start_date);
  const due = normalizeVoiceDateInput(voiceDraftForm.value.due_date);
  try {
    voiceLoading.value = true;
    uni.setStorageSync('voiceDraft', {
      title,
      description: voiceDraftForm.value.description.trim() || '',
      priority: draft.priority,
      start_date: start || '',
      due_date: due || '',
      is_recurring: draft.is_recurring,
      recurring_rule: draft.recurring_rule || '',
      role_id: draft.role_id || null,
      category_id: draft.category_id || null,
    });
    clearVoiceDraft();
    uni.navigateTo({ url: '/pages/task-create/index?from=voice' });
  } catch {
    voiceError.value = '跳转创建页失败';
  } finally {
    voiceLoading.value = false;
  }
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
      { label: t('filter.all'), value: null },
      { label: t('category.uncategorized'), value: 0 },
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
      { label: t('role.all'), value: null },
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

const flattenFloat32 = (chunks) => {
  const total = chunks.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
};

const downsampleBuffer = (buffer, inputRate, targetRate) => {
  if (inputRate === targetRate) return buffer;
  const ratio = inputRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offset = 0;
  for (let i = 0; i < newLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = offset; j < nextOffset && j < buffer.length; j += 1) {
      sum += buffer[j];
      count += 1;
    }
    result[i] = count ? sum / count : 0;
    offset = nextOffset;
  }
  return result;
};

const encodeWav = (buffer, inputRate, targetRate) => {
  const pcm = downsampleBuffer(buffer, inputRate, targetRate);
  const wavBuffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(wavBuffer);
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.length * 2, true);
  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    let s = Math.max(-1, Math.min(1, pcm[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
    offset += 2;
  }
  return new Blob([wavBuffer], { type: 'audio/wav' });
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
  initLocale(); uni.setNavigationBarTitle({ title: t('nav.home') });
  await loadProfile();
  const em = userProfile.value && userProfile.value.email;
  if (em && em.endsWith('@wechat.local')) {
    uni.reLaunch({ url: '/pages/complete-profile/index' });
    return;
  }
  const stored = uni.getStorageSync('planner_selected_date');
  if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    selectedDate.value = stored;
  } else {
    selectedDate.value = formatDate(new Date());
    uni.setStorageSync('planner_selected_date', selectedDate.value);
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
  color: #776b7f;
  font-size: 12px;
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
  color: #776b7f;
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
  color: #b76e8a;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid rgba(110, 95, 116, 0.4);
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
  color: #776b7f;
  white-space: nowrap;
}

.date-input {
  height: 30px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  box-sizing: border-box;
}

.date-actions {
  display: flex;
  gap: 6px;
}

.date-actions .btn {
  width: 30px;
  height: 30px;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  background: #fff;
  color: #2b2430;
  box-sizing: border-box;
}
.date-actions .btn.primary {
  width: 46px;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #b76e8a;
  border-color: #b76e8a;
  color: #fff;
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
  border: 1px solid rgba(110, 95, 116, 0.4);
  font-size: 12px;
}

.search-row {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 10px;
  padding: 5px 8px;
  font-size: 12px;
}

.search-row .btn {
  font-size: 12px;
}

.voice-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-status {
  font-size: 12px;
  color: #776b7f;
}

.voice-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #776b7f;
}

.voice-error {
  margin-top: 6px;
  font-size: 12px;
  color: #e05353;
}

.voice-transcript {
  margin-top: 6px;
  font-size: 12px;
  color: #475569;
}

.voice-candidates {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.voice-candidates-title {
  font-size: 12px;
  color: #776b7f;
}

.voice-candidates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.voice-draft {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.voice-draft-title {
  font-size: 12px;
  font-weight: 700;
}

.voice-draft-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-draft-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.voice-draft-label {
  font-size: 12px;
  color: #64748b;
}

.voice-draft-input {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  background: #fff;
}

.voice-draft-textarea {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  min-height: 64px;
  background: #fff;
}

.voice-draft-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
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
  border: 1px solid rgba(110, 95, 116, 0.4);
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
  color: #776b7f;
}

.subsection + .subsection {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed rgba(110, 95, 116, 0.4);
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
  color: #776b7f;
}

.task-card {
  border: 1px solid rgba(110, 95, 116, 0.4);
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
  width: 240px;
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

.swipe-btn.view {
  background: #6fa9d8;
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
  color: #776b7f;
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
  border: 1px solid rgba(110, 95, 116, 0.4);
  color: #776b7f;
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
  color: #776b7f;
}

.profile-entry {
  margin-top: 6px;
  font-size: 12px;
  color: #b76e8a;
  text-align: right;
}
.profile-link { color: #b76e8a; font-weight: 600; }
.welcome-edit {
  margin-left: 4px;
  font-size: 13px;
  color: #b76e8a;
}
</style>
