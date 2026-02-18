<template>
  <view class="page" v-if="task">
    <LogoutButton />
    <view class="edit-nav" @click="toggleEdit">{{ isEditing ? '取消' : '编辑' }}</view>
    <view class="card">
      <text class="title">{{ task.title }}</text>
      <text class="subtitle">{{ statusText(task.status) }} · {{ priorityText(task.priority) }}</text>
    </view>

    <view class="card" v-if="isEditing">
      <text class="label">编辑内容</text>
      <view class="form-field">
        <text class="field-label">任务标题 *</text>
        <input class="input" v-model="editTitle" placeholder="请输入任务标题" />
      </view>
      <view class="form-field">
        <text class="field-label">描述</text>
        <textarea class="textarea" v-model="editDescription" placeholder="补充说明（可选）" />
      </view>
      <view class="form-field">
        <text class="field-label">优先级</text>
        <picker :range="priorityOptions" range-key="label" :value="editPriorityIndex" @change="onEditPriorityChange">
          <view class="picker-input">{{ priorityOptions[editPriorityIndex]?.label || '中' }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="field-label">分类</text>
        <view class="picker-row">
          <picker class="picker-flex" :range="editCategoryOptions" range-key="label" :value="editCategoryIndex" @change="onEditCategoryChange">
            <view class="picker-input">{{ editCategoryOptions[editCategoryIndex]?.label || '未分类' }}</view>
          </picker>
          <view class="picker-manage" @click="openCategoryManager">管理</view>
        </view>
      </view>
      <view class="form-field">
        <text class="field-label">角色</text>
        <picker :range="editRoleOptions" range-key="label" :value="editRoleIndex" @change="onEditRoleChange">
          <view class="picker-input">{{ editRoleOptions[editRoleIndex]?.label || '未分配' }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="field-label">计划开始</text>
        <view class="picker-row">
          <picker mode="date" :value="editStartDate" @change="onEditStartDateChange">
            <view class="picker-input">{{ editStartDate || '未设置' }}</view>
          </picker>
          <picker mode="time" :value="editStartTime" @change="onEditStartTimeChange">
            <view class="picker-input time">{{ editStartTime || '09:00' }}</view>
          </picker>
        </view>
      </view>
      <view class="form-field">
        <text class="field-label">截止时间</text>
        <view class="picker-row">
          <picker mode="date" :value="editDueDate" @change="onEditDueDateChange">
            <view class="picker-input">{{ editDueDate || '未设置' }}</view>
          </picker>
          <picker mode="time" :value="editDueTime" @change="onEditDueTimeChange">
            <view class="picker-input time">{{ editDueTime || '23:59' }}</view>
          </picker>
        </view>
      </view>
      <view class="action-row">
        <button class="btn" size="mini" @click="cancelEdit">取消</button>
        <button class="btn primary" size="mini" :disabled="saving" @click="saveEdit">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </view>
    </view>

    <view class="card">
      <view class="info-row">
        <text class="label">角色</text>
        <text class="value">{{ roleName }}</text>
      </view>
      <view class="info-row">
        <text class="label">分类</text>
        <text class="value">{{ categoryName }}</text>
      </view>
      <view class="info-row">
        <text class="label">计划日期</text>
        <text class="value">{{ planLabel }}</text>
      </view>
      <view class="info-row">
        <text class="label">创建时间</text>
        <text class="value">{{ createdLabel }}</text>
      </view>
      <view class="info-row">
        <text class="label">更新时间</text>
        <text class="value">{{ updatedLabel }}</text>
      </view>
      <view class="info-row" v-if="task.completed_at">
        <text class="label">实际完成</text>
        <text class="value">{{ completedLabel }}</text>
      </view>
      <view class="info-row" v-if="task.cancelled_at">
        <text class="label">取消时间</text>
        <text class="value">{{ cancelledLabel }}</text>
      </view>
    </view>

    <view class="card" v-if="task.description">
      <text class="label">描述</text>
      <text class="description">{{ task.description }}</text>
    </view>

    <view class="card">
      <text class="label">状态操作</text>
      <view class="action-row">
        <button class="btn" size="mini" :disabled="task.status === 'todo'" @click="confirmStatus('todo')">标记待办</button>
        <button class="btn" size="mini" :disabled="task.status === 'in_progress'" @click="confirmStatus('in_progress')">标记进行中</button>
        <button class="btn primary" size="mini" :disabled="task.status === 'done'" @click="openCompletionModal">标记完成</button>
        <button class="btn" size="mini" :disabled="task.status === 'cancelled'" @click="confirmStatus('cancelled')">取消任务</button>
      </view>
    </view>

    <view v-if="showCompletionModal" class="modal-mask" @click="closeCompletionModal">
      <view class="modal-card" @click.stop>
        <text class="modal-title">确认完成时间</text>
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
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { ensureAuth } from '../../utils/auth';
import { fetchTask, updateTask, updateTaskStatus } from '../../services/tasks';
import { fetchRoles } from '../../services/roles';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../../services/categories';
import { formatBeijingDate, formatBeijingDateTime, formatBeijingTime } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';

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

const statusText = (value) => {
  if (value === 'todo') return '待办';
  if (value === 'in_progress') return '进行中';
  if (value === 'cancelled') return '已取消';
  return '已完成';
};

const priorityText = (value) => {
  if (value === 'high') return '高优先级';
  if (value === 'medium') return '中优先级';
  return '低优先级';
};

const priorityOptions = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
];

const editRoleOptions = computed(() => roles.value.map((role) => ({ label: role.name, value: role.id })));
const editCategoryOptions = computed(() => ([
  { label: '未分类', value: null },
  ...categories.value.map((category) => ({ label: category.name, value: category.id })),
]));

const roleName = computed(() => {
  const map = {};
  roles.value.forEach((r) => {
    map[r.id] = r.name;
  });
  return task.value ? map[task.value.role_id] || '未分配' : '';
});

const categoryName = computed(() => {
  const map = {};
  categories.value.forEach((c) => {
    map[c.id] = c.name;
  });
  return task.value ? map[task.value.category_id] || '未分类' : '';
});

const planLabel = computed(() => {
  if (!task.value) return '';
  const start = task.value.start_date ? formatBeijingDate(task.value.start_date) : '-';
  const end = task.value.due_date ? formatBeijingDate(task.value.due_date) : '-';
  return `${start} ~ ${end}`;
});

const createdLabel = computed(() => (task.value?.created_at ? formatBeijingDateTime(task.value.created_at) : '-'));
const updatedLabel = computed(() => (task.value?.updated_at ? formatBeijingDateTime(task.value.updated_at) : '-'));
const completedLabel = computed(() => (task.value?.completed_at ? formatBeijingDateTime(task.value.completed_at) : '-'));
const cancelledLabel = computed(() => (task.value?.cancelled_at ? formatBeijingDateTime(task.value.cancelled_at) : '-'));

const syncEditForm = () => {
  if (!task.value) return;
  editTitle.value = task.value.title || '';
  editDescription.value = task.value.description || '';
  const priorityIdx = priorityOptions.findIndex((item) => item.value === task.value.priority);
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
  const actions = ['新增分类', '重命名当前分类', '删除当前分类'];
  uni.showActionSheet({
    itemList: actions,
    success: (res) => {
      if (res.tapIndex === 0) handleCreateCategory();
      if (res.tapIndex === 1) handleRenameCategory();
      if (res.tapIndex === 2) handleDeleteCategory();
    },
  });
};

const handleCreateCategory = () => {
  uni.showModal({
    title: '新增分类',
    editable: true,
    placeholderText: '请输入分类名称',
    success: async (res) => {
      if (!res.confirm) return;
      const name = (res.content || '').trim();
      if (!name) return;
      try {
        await createCategory({ name });
        await loadMeta();
        const idx = editCategoryOptions.value.findIndex((item) => item.label === name);
        if (idx >= 0) editCategoryIndex.value = idx;
      } catch {
        uni.showToast({ title: '新增失败', icon: 'none' });
      }
    },
  });
};

const handleRenameCategory = () => {
  const current = editCategoryOptions.value[editCategoryIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: '请选择要重命名的分类', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '重命名分类',
    editable: true,
    placeholderText: '请输入新名称',
    success: async (res) => {
      if (!res.confirm) return;
      const name = (res.content || '').trim();
      if (!name) return;
      try {
        await updateCategory(current.value, { name });
        await loadMeta();
        const idx = editCategoryOptions.value.findIndex((item) => item.label === name);
        if (idx >= 0) editCategoryIndex.value = idx;
      } catch {
        uni.showToast({ title: '重命名失败', icon: 'none' });
      }
    },
  });
};

const handleDeleteCategory = () => {
  const current = editCategoryOptions.value[editCategoryIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: '请选择要删除的分类', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '删除分类',
    content: `确定删除「${current.label}」吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await deleteCategory(current.value);
        await loadMeta();
        editCategoryIndex.value = 0;
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' });
      }
    },
  });
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
    uni.showToast({ title: '请输入任务标题', icon: 'none' });
    return;
  }
  const payload = {
    title: trimmedTitle,
    description: editDescription.value.trim() || null,
    priority: priorityOptions[editPriorityIndex.value]?.value || 'medium',
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
      uni.showToast({ title: '截止时间不能早于开始时间', icon: 'none' });
      return;
    }
  }

  saving.value = true;
  try {
    await updateTask(task.value.id, payload);
    isEditing.value = false;
    await loadTask();
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
};

const confirmCompletion = async () => {
  if (!task.value) return;
  const completionValue = buildCompletionValue();
  const selected = parseCompletionTime(completionValue);
  if (!selected) {
    uni.showToast({ title: '时间格式无效', icon: 'none' });
    return;
  }
  if (selected.getTime() > Date.now()) {
    uni.showToast({ title: '完成时间不能晚于当前时间', icon: 'none' });
    return;
  }
  try {
    await updateTaskStatus(task.value.id, 'done', toApiDateTime(completionValue));
    showCompletionModal.value = false;
    await loadTask();
  } catch {
    uni.showToast({ title: '完成失败', icon: 'none' });
  }
};

const confirmStatus = (status) => {
  if (!task.value || task.value.status === status) return;
  const label = statusText(status);
  uni.showModal({
    title: '确认操作',
    content: `确定标记为${label}吗？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await updateTaskStatus(task.value.id, status);
        await loadTask();
      } catch {
        uni.showToast({ title: '更新失败', icon: 'none' });
      }
    }
  });
};

onLoad((query) => {
  const id = Number(query.id);
  taskId.value = Number.isNaN(id) ? null : id;
});

onShow(async () => {
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
  border: 1px solid var(--line);
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
  color: var(--muted);
}

.form-field {
  margin-top: 10px;
}

.field-label {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 6px;
  display: block;
}

.input {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
}

.textarea {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
  min-height: 80px;
}

.picker-input {
  border: 1px solid var(--line);
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
  color: var(--accent);
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
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
  border-bottom: 1px dashed var(--line);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 12px;
  color: var(--muted);
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
  border: 1px solid var(--line);
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
  border: 1px solid var(--line);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text);
  z-index: 1001;
  box-shadow: var(--shadow);
}
</style>
