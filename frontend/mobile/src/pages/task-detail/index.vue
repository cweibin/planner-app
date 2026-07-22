<template>
  <view class="page" v-if="task">
    <LogoutButton />
    <view class="edit-nav" @click="toggleEdit">{{ isEditing ? t('task.cancel') : t('habit.edit') }}</view>
    <view class="card">
      <text class="title">{{ task.title }}</text>
      <text class="subtitle">{{ statusText(task.status) }} · {{ priorityText(task.priority) }}</text>
    </view>

    <view class="card" v-if="isEditing">
      <text class="label">{{ t('task.detail.edit') }}</text>
      <view class="form-field">
        <text class="field-label">{{ t('task.detail.edit.title') }}</text>
        <input class="input" v-model="editTitle" :placeholder="t('task.title.empty')" />
      </view>
      <view class="form-field">
        <text class="field-label">{{ t('task.detail.edit.desc') }}</text>
        <textarea class="textarea" v-model="editDescription" :placeholder="t('task.desc.ph')" />
      </view>
      <view class="form-field">
        <text class="field-label">{{ t('task.priority') }}</text>
        <picker :range="priorityOptions" range-key="label" :value="editPriorityIndex" @change="onEditPriorityChange">
          <view class="picker-input">{{ priorityOptions[editPriorityIndex]?.label || t('priority.medium') }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="field-label">{{ t('task.detail.category') }}</text>
        <view class="picker-row">
          <picker class="picker-flex" :range="editCategoryOptions" range-key="label" :value="editCategoryIndex" @change="onEditCategoryChange">
            <view class="picker-input">{{ editCategoryOptions[editCategoryIndex]?.label || t('task.detail.uncategorized') }}</view>
          </picker>
          <view class="picker-manage" @click="openCategoryManager">{{ t('task.category.manage') }}</view>
        </view>
      </view>
      <view class="form-field">
        <text class="field-label">{{ t('task.detail.role') }}</text>
        <picker :range="editRoleOptions" range-key="label" :value="editRoleIndex" @change="onEditRoleChange">
          <view class="picker-input">{{ editRoleOptions[editRoleIndex]?.label || t('task.detail.unassigned') }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="field-label">{{ t('task.plan.start') }}</text>
        <view class="picker-row">
          <picker mode="date" :value="editStartDate" @change="onEditStartDateChange">
            <view class="picker-input">{{ editStartDate || t('task.not.set') }}</view>
          </picker>
          <picker mode="time" :value="editStartTime" @change="onEditStartTimeChange">
            <view class="picker-input time">{{ editStartTime || '09:00' }}</view>
          </picker>
        </view>
      </view>
      <view class="form-field">
        <text class="field-label">{{ t('task.due.time') }}</text>
        <view class="picker-row">
          <picker mode="date" :value="editDueDate" @change="onEditDueDateChange">
            <view class="picker-input">{{ editDueDate || t('task.not.set') }}</view>
          </picker>
          <picker mode="time" :value="editDueTime" @change="onEditDueTimeChange">
            <view class="picker-input time">{{ editDueTime || '23:59' }}</view>
          </picker>
        </view>
      </view>
      <view class="action-row">
        <button class="btn" size="mini" @click="cancelEdit">{{ t('task.cancel') }}</button>
        <button class="btn primary" size="mini" :disabled="saving" @click="saveEdit">
          {{ saving ? t('task.saving') : t('task.save') }}
        </button>
      </view>
    </view>

    <view class="card">
      <view class="info-row">
        <text class="label">{{ t('task.detail.role') }}</text>
        <text class="value">{{ roleName }}</text>
      </view>
      <view class="info-row">
        <text class="label">{{ t('task.detail.category') }}</text>
        <text class="value">{{ categoryName }}</text>
      </view>
      <view class="info-row">
        <text class="label">{{ t('task.detail.plan.date') }}</text>
        <text class="value">{{ planLabel }}</text>
      </view>
      <view class="info-row">
        <text class="label">{{ t('task.detail.created') }}</text>
        <text class="value">{{ createdLabel }}</text>
      </view>
      <view class="info-row">
        <text class="label">{{ t('task.detail.updated') }}</text>
        <text class="value">{{ updatedLabel }}</text>
      </view>
      <view class="info-row" v-if="task.completed_at">
        <text class="label">{{ t('task.detail.completed') }}</text>
        <text class="value">{{ completedLabel }}</text>
      </view>
      <view class="info-row" v-if="task.cancelled_at">
        <text class="label">{{ t('task.detail.cancelled') }}</text>
        <text class="value">{{ cancelledLabel }}</text>
      </view>
    </view>

    <view class="card" v-if="task.description">
      <text class="label">{{ t('task.detail.desc') }}</text>
      <text class="description">{{ task.description }}</text>
    </view>

    <view class="card">
      <text class="label">{{ t('task.detail.status.ops') }}</text>
      <view class="action-row">
        <button class="btn" size="mini" :disabled="task.status === 'todo'" @click="confirmStatus('todo')">{{ t('task.status.todo') }}</button>
        <button class="btn" size="mini" :disabled="task.status === 'in_progress'" @click="confirmStatus('in_progress')">{{ t('task.status.in_progress') }}</button>
        <button class="btn primary" size="mini" :disabled="task.status === 'done'" @click="openCompletionModal">{{ t('task.status.done') }}</button>
        <button class="btn" size="mini" :disabled="task.status === 'cancelled'" @click="confirmStatus('cancelled')">{{ t('task.status.cancel') }}</button>
      </view>
    </view>

    <view v-if="showCompletionModal" class="modal-mask" @click="closeCompletionModal">
      <view class="modal-card" @click.stop>
        <text class="modal-title">{{ t('task.confirm.complete') }}</text>
        <view class="date-row">
          <picker mode="date" :value="completionDate" @change="onCompletionDateChange">
            <view class="date-input">{{ completionDate || '选择日期' }}</view>
          </picker>
          <picker mode="time" :value="completionClock" @change="onCompletionTimeChange">
            <view class="date-input">{{ completionClock || '选择时间' }}</view>
          </picker>
        </view>
        <view class="modal-actions">
          <button class="btn" size="mini" @click="closeCompletionModal">取消</button>
          <button class="btn primary" size="mini" @click="confirmCompletion">确认完成</button>
        </view>
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
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { ensureAuth } from '../../utils/auth';
import { fetchTask, updateTask, updateTaskStatus } from '../../services/tasks';
import { fetchRoles } from '../../services/roles';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../../services/categories';
import PromptDialog from '../../components/PromptDialog.vue';
import { formatBeijingDate, formatBeijingDateTimeFromUtc, formatBeijingTime } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';
import { t, locale, initLocale } from '../../locale';

const taskId = ref(null);
const task = ref(null);
const roles = ref([]);
const categories = ref([]);
const isEditing = ref(false);
const saving = ref(false);
const editTitle = ref('');
const editDescription = ref('');
const editPriorityIndex = ref(1);
const editCategoryIndex = ref(0);
const editRoleIndex = ref(0);
const editStartDate = ref('');
const editStartTime = ref('09:00');
const editDueDate = ref('');
const editDueTime = ref('23:59');
const showCompletionModal = ref(false);
const completionDate = ref('');
const completionClock = ref('');
const promptVisible = ref(false);
const promptTitle = ref('');
const promptPlaceholder = ref('');
const promptValue = ref('');
const promptType = ref('');

const statusText = (value) => {
  if (value === 'todo') return t('status.todo');
  if (value === 'in_progress') return t('status.in_progress');
  if (value === 'cancelled') return t('status.cancelled');
  return t('status.done');
};

const priorityText = (value) => {
  if (value === 'high') return t('priority.high.full');
  if (value === 'medium') return t('priority.medium.full');
  return t('priority.low.full');
};

const priorityOptions = computed(() => [
  { label: t('priority.high'), value: 'high' },
  { label: t('priority.medium'), value: 'medium' },
  { label: t('priority.low'), value: 'low' },
]);

const editRoleOptions = computed(() => roles.value.map((role) => ({ label: role.name, value: role.id })));
const editCategoryOptions = computed(() => ([
  { label: t('task.detail.uncategorized'), value: null },
  ...categories.value.map((category) => ({ label: category.name, value: category.id })),
]));

const roleName = computed(() => {
  const map = {};
  roles.value.forEach((r) => {
    map[r.id] = r.name;
  });
  return task.value ? map[task.value.role_id] || t('task.detail.unassigned') : '';
});

const categoryName = computed(() => {
  const map = {};
  categories.value.forEach((c) => {
    map[c.id] = c.name;
  });
  return task.value ? map[task.value.category_id] || t('task.detail.uncategorized') : '';
});

const planLabel = computed(() => {
  if (!task.value) return '';
  const start = task.value.start_date ? formatBeijingDate(task.value.start_date) : '-';
  const end = task.value.due_date ? formatBeijingDate(task.value.due_date) : '-';
  return `${start} ~ ${end}`;
});

const createdLabel = computed(() => (task.value?.created_at ? formatBeijingDateTimeFromUtc(task.value.created_at) : '-'));
const updatedLabel = computed(() => (task.value?.updated_at ? formatBeijingDateTimeFromUtc(task.value.updated_at) : '-'));
const completedLabel = computed(() => (task.value?.completed_at ? formatBeijingDateTimeFromUtc(task.value.completed_at) : '-'));
const cancelledLabel = computed(() => (task.value?.cancelled_at ? formatBeijingDateTimeFromUtc(task.value.cancelled_at) : '-'));

const syncEditForm = () => {
  if (!task.value) return;
  editTitle.value = task.value.title || '';
  editDescription.value = task.value.description || '';
  const priorityIdx = priorityOptions.value.findIndex((item) => item.value === task.value.priority);
  editPriorityIndex.value = priorityIdx >= 0 ? priorityIdx : 1;
  const roleIdx = editRoleOptions.value.findIndex((item) => item.value === task.value.role_id);
  editRoleIndex.value = roleIdx >= 0 ? roleIdx : 0;
  const categoryIdx = editCategoryOptions.value.findIndex((item) => item.value === task.value.category_id);
  editCategoryIndex.value = categoryIdx >= 0 ? categoryIdx : 0;
  if (task.value.start_date) {
    editStartDate.value = formatBeijingDate(task.value.start_date);
    editStartTime.value = formatBeijingTime(task.value.start_date);
  } else {
    editStartDate.value = '';
    editStartTime.value = '09:00';
  }
  if (task.value.due_date) {
    editDueDate.value = formatBeijingDate(task.value.due_date);
    editDueTime.value = formatBeijingTime(task.value.due_date);
  } else {
    editDueDate.value = '';
    editDueTime.value = '23:59';
  }
};

const loadTask = async () => {
  if (!taskId.value) return;
  try {
    task.value = await fetchTask(taskId.value);
    if (isEditing.value) {
      syncEditForm();
    }
  } catch {
    task.value = null;
  }
};

const loadMeta = async () => {
  try {
    roles.value = await fetchRoles();
  } catch {
    roles.value = [];
  }
  try {
    categories.value = await fetchCategories();
  } catch {
    categories.value = [];
  }
  if (isEditing.value) {
    syncEditForm();
  }
};

const openCompletionModal = () => {
  if (!task.value) return;
  const now = new Date();
  const dateStr = formatBeijingDate(now.toISOString());
  const time = formatBeijingTime(now.toISOString());
  completionDate.value = dateStr;
  completionClock.value = time;
  showCompletionModal.value = true;
};

const closeCompletionModal = () => {
  showCompletionModal.value = false;
};

const onCompletionDateChange = (event) => {
  completionDate.value = event.detail.value;
};

const onCompletionTimeChange = (event) => {
  completionClock.value = event.detail.value;
};

const buildCompletionValue = () => {
  if (!completionDate.value || !completionClock.value) return '';
  return `${completionDate.value} ${completionClock.value}`;
};

const parseCompletionTime = (value) => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  const date = new Date(withSeconds);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toApiDateTime = (value) => {
  const date = parseCompletionTime(value);
  return date ? date.toISOString() : '';
};

const toLocalDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return '';
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${normalized}`;
};

const toggleEdit = () => {
  if (!task.value) return;
  isEditing.value = !isEditing.value;
  if (isEditing.value) {
    syncEditForm();
  }
};

const cancelEdit = () => {
  isEditing.value = false;
  syncEditForm();
};

const onEditPriorityChange = (event) => {
  editPriorityIndex.value = Number(event.detail.value);
};

const onEditCategoryChange = (event) => {
  editCategoryIndex.value = Number(event.detail.value);
};

const openCategoryManager = () => {
  const actions = [t('category.create'), t('category.rename.current'), t('category.delete.current')];
  uni.showActionSheet({
    itemList: actions,
    success: (res) => {
      if (res.tapIndex === 0) handleCreateCategory();
      if (res.tapIndex === 1) handleRenameCategory();
      if (res.tapIndex === 2) handleDeleteCategory();
    },
  });
};

const openPrompt = (type, title, placeholder, value = '') => {
  promptType.value = type;
  promptTitle.value = title;
  promptPlaceholder.value = placeholder;
  promptValue.value = value;
  promptVisible.value = true;
};

const handleCreateCategory = () => {
  openPrompt('category-create', t('category.create'), t('category.name.ph'));
};

const handleRenameCategory = () => {
  const current = editCategoryOptions.value[editCategoryIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: t('category.select.rename'), icon: 'none' });
    return;
  }
  openPrompt('category-rename', t('category.rename'), t('category.new.name'), current.label);
};

const handleDeleteCategory = () => {
  const current = editCategoryOptions.value[editCategoryIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: t('category.select.delete'), icon: 'none' });
    return;
  }
  uni.showModal({
    title: t('category.delete'),
    content: t('category.confirm.delete', { name: current.label }),
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteCategory(current.value);
        await loadMeta();
        editCategoryIndex.value = 0;
      } catch {
        uni.showToast({ title: t('task.delete.fail'), icon: 'none' });
      }
    },
  });
};

const handlePromptConfirm = async (value) => {
  const name = (value || '').trim();
  if (!name) return;
  if (promptType.value === 'category-create') {
    try {
      await createCategory({ name });
      await loadMeta();
      const idx = editCategoryOptions.value.findIndex((item) => item.label === name);
      if (idx >= 0) editCategoryIndex.value = idx;
    } catch {
      uni.showToast({ title: t('task.add.fail'), icon: 'none' });
    }
  }
  if (promptType.value === 'category-rename') {
    const current = editCategoryOptions.value[editCategoryIndex.value];
    if (!current || current.value === null) return;
    try {
      await updateCategory(current.value, { name });
      await loadMeta();
      const idx = editCategoryOptions.value.findIndex((item) => item.label === name);
      if (idx >= 0) editCategoryIndex.value = idx;
    } catch {
      uni.showToast({ title: t('task.rename.fail'), icon: 'none' });
    }
  }
  promptType.value = '';
};

const onEditRoleChange = (event) => {
  editRoleIndex.value = Number(event.detail.value);
};

const onEditStartDateChange = (event) => {
  editStartDate.value = event.detail.value;
};

const onEditStartTimeChange = (event) => {
  editStartTime.value = event.detail.value;
};

const onEditDueDateChange = (event) => {
  editDueDate.value = event.detail.value;
};

const onEditDueTimeChange = (event) => {
  editDueTime.value = event.detail.value;
};

const saveEdit = async () => {
  if (!task.value || saving.value) return;
  const trimmedTitle = editTitle.value.trim();
  if (!trimmedTitle) {
    uni.showToast({ title: t('task.title.empty'), icon: 'none' });
    return;
  }
  const payload = {
    title: trimmedTitle,
    description: editDescription.value.trim() || null,
    priority: priorityOptions.value[editPriorityIndex.value]?.value || 'medium',
  };
  const categoryId = editCategoryOptions.value[editCategoryIndex.value]?.value;
  if (categoryId !== undefined) payload.category_id = categoryId;
  const roleId = editRoleOptions.value[editRoleIndex.value]?.value;
  if (roleId !== undefined) payload.role_id = roleId;

  const startValue = editStartDate.value
    ? toLocalDateTime(editStartDate.value, editStartTime.value || '09:00')
    : '';
  const dueValue = editDueDate.value
    ? toLocalDateTime(editDueDate.value, editDueTime.value || '23:59')
    : '';

  if (startValue) payload.start_date = startValue;
  if (dueValue) payload.due_date = dueValue;

  if (startValue && dueValue) {
    const startTs = new Date(startValue).getTime();
    const dueTs = new Date(dueValue).getTime();
    if (!Number.isNaN(startTs) && !Number.isNaN(dueTs) && dueTs < startTs) {
      uni.showToast({ title: t('task.due.before.start'), icon: 'none' });
      return;
    }
  }

  saving.value = true;
  try {
    await updateTask(task.value.id, payload);
    isEditing.value = false;
    await loadTask();
  } catch {
    uni.showToast({ title: t('task.save.fail'), icon: 'none' });
  } finally {
    saving.value = false;
  }
};

const confirmCompletion = async () => {
  if (!task.value) return;
  const completionValue = buildCompletionValue();
  const selected = parseCompletionTime(completionValue);
  if (!selected) {
    uni.showToast({ title: t('task.time.invalid'), icon: 'none' });
    return;
  }
  if (selected.getTime() > Date.now()) {
    uni.showToast({ title: t('task.complete.time.invalid'), icon: 'none' });
    return;
  }
  try {
    await updateTaskStatus(task.value.id, 'done', toApiDateTime(completionValue));
    showCompletionModal.value = false;
    await loadTask();
  } catch {
    uni.showToast({ title: t('task.complete.fail'), icon: 'none' });
  }
};

const confirmStatus = (status) => {
  if (!task.value || task.value.status === status) return;
  const label = statusText(status);
  uni.showModal({
    title: t('task.confirm.action'),
    content: t('task.confirm.mark', { label: label }),
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await updateTaskStatus(task.value.id, status);
        await loadTask();
      } catch {
        uni.showToast({ title: t('task.update.fail'), icon: 'none' });
      }
    }
  });
};

onLoad((query) => {
  const id = Number(query.id);
  taskId.value = Number.isNaN(id) ? null : id;
});

onShow(async () => {
  initLocale(); uni.setNavigationBarTitle({ title: t('nav.task.detail') });
  if (!ensureAuth()) return;
  await loadMeta();
  await loadTask();
});
</script>

<style scoped>
.page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.title {
  font-size: 16px;
  font-weight: 700;
}

.subtitle {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #776b7f;
}

.form-field {
  margin-top: 10px;
}

.field-label {
  font-size: 11px;
  color: #776b7f;
  margin-bottom: 6px;
  display: block;
}

.input {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
}

.textarea {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
  min-height: 80px;
}

.picker-input {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
}

.picker-row {
  display: flex;
  gap: 8px;
}

.picker-flex {
  flex: 1;
  min-width: 0;
}

.picker-manage {
  font-size: 11px;
  color: #b76e8a;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-input.time {
  min-width: 70px;
  text-align: center;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(110, 95, 116, 0.4);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 12px;
  color: #776b7f;
}

.value {
  font-size: 12px;
  color: #2b2430;
}

.description {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #2b2430;
  line-height: 1.6;
}

.action-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-card {
  width: 80%;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.modal-title {
  font-size: 14px;
  font-weight: 700;
}

.date-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.date-input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  font-size: 12px;
  text-align: center;
}

.modal-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.edit-nav {
  position: fixed;
  right: 52px;
  top: calc(env(safe-area-inset-top) + 6px);
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #2b2430;
  z-index: 1001;
  box-shadow: 0 10px 22px rgba(70, 48, 78, 0.12);
}
</style>