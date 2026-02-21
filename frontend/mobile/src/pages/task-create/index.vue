<template>
  <view class="page">
    <LogoutButton />
    <view class="card">
      <text class="section-title">快速添加任务</text>
      <view class="form-field">
        <text class="label">任务标题 *</text>
        <textarea
          class="textarea title-textarea"
          :value="title"
          :focus="titleFocus"
          auto-height
          @tap.stop="focusTitle"
          @focus="onFocusTitle"
          @blur="onBlurTitle"
          @input="onTitleInput"
          placeholder="例如：整理本周计划"
        />
      </view>
      <view class="form-field">
        <text class="label">描述</text>
        <textarea
          class="textarea"
          :value="description"
          :focus="descFocus"
          auto-height
          @tap.stop="focusDesc"
          @focus="onFocusDesc"
          @blur="onBlurDesc"
          @input="onDescriptionInput"
          placeholder="补充说明（可选）"
        />
      </view>
      <view class="form-field">
        <text class="label">优先级</text>
        <picker :range="priorityOptions" range-key="label" :value="selectedPriorityIndex" @change="onPriorityChange">
          <view class="picker-input">{{ priorityLabel }}</view>
        </picker>
      </view>
      <view class="form-field">
        <text class="label">分类</text>
        <view class="picker-row">
          <picker class="picker-flex" :range="categoryOptions" range-key="label" :value="selectedCategoryIndex" @change="onCategoryChange">
            <view class="picker-input">{{ categoryLabel }}</view>
          </picker>
          <view class="picker-manage" @click="openCategoryManager">管理</view>
        </view>
      </view>
      <view class="form-field">
        <text class="label">角色</text>
        <picker :range="roleOptions" range-key="label" :value="selectedRoleIndex" @change="onRoleChange">
          <view class="picker-input">{{ roleLabel }}</view>
        </picker>
      </view>
      <view class="form-field">
        <view class="time-grid">
          <view class="time-col">
            <text class="label">计划开始</text>
            <view class="picker-row">
              <picker mode="date" :value="startDate" @change="onStartDateChange">
                <view class="picker-input">{{ startDate || '未设置' }}</view>
              </picker>
              <picker mode="time" :value="startTime" @change="onStartTimeChange">
                <view class="picker-input time">{{ startTime || '09:00' }}</view>
              </picker>
            </view>
          </view>
          <view class="time-col">
            <text class="label">截止时间</text>
            <view class="picker-row">
              <picker mode="date" :value="dueDate" @change="onDueDateChange">
                <view class="picker-input">{{ dueDate || '未设置' }}</view>
              </picker>
              <picker mode="time" :value="dueTime" @change="onDueTimeChange">
                <view class="picker-input time">{{ dueTime || '23:59' }}</view>
              </picker>
            </view>
          </view>
        </view>
      </view>
      <view class="action-row">
        <button class="btn" size="mini" @click="cancel">取消</button>
        <button class="btn primary" size="mini" :disabled="submitting" @click="submit">
          {{ submitting ? '保存中...' : '保存' }}
        </button>
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
import { ensureAuth, getRoleId, setRoleId } from '../../utils/auth';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../../services/categories';
import PromptDialog from '../../components/PromptDialog.vue';
import { fetchRoles } from '../../services/roles';
import { createTask } from '../../services/tasks';
import { formatDate } from '../../utils/date';
import LogoutButton from '../../components/LogoutButton.vue';

const title = ref('');
const description = ref('');
const titleFocus = ref(false);
const descFocus = ref(false);
const startDate = ref('');
const startTime = ref('09:00');
const dueDate = ref('');
const dueTime = ref('23:59');
const submitting = ref(false);

const priorityOptions = [
  { label: '高', value: 'high' },
  { label: '中', value: 'medium' },
  { label: '低', value: 'low' },
];
const selectedPriorityIndex = ref(1);

const categoryOptions = ref([{ label: '未分类', value: null }]);
const selectedCategoryIndex = ref(0);

const roleOptions = ref([{ label: '全部', value: null }]);
const selectedRoleIndex = ref(0);
const promptVisible = ref(false);
const promptTitle = ref('');
const promptPlaceholder = ref('');
const promptValue = ref('');
const promptType = ref('');
const voiceDraft = ref(null);

const priorityLabel = computed(() => priorityOptions[selectedPriorityIndex.value]?.label ?? '中');
const categoryLabel = computed(() => categoryOptions.value[selectedCategoryIndex.value]?.label ?? '未分类');
const roleLabel = computed(() => roleOptions.value[selectedRoleIndex.value]?.label ?? '全部');

const onPriorityChange = (event) => {
  selectedPriorityIndex.value = Number(event.detail.value);
};

const onTitleInput = (event) => {
  title.value = event.detail.value;
};

const onDescriptionInput = (event) => {
  description.value = event.detail.value;
};

const focusTitle = () => {
  titleFocus.value = true;
};

const focusDesc = () => {
  descFocus.value = true;
};

const onFocusTitle = () => {
  titleFocus.value = true;
};

const onBlurTitle = () => {
  titleFocus.value = false;
};

const onFocusDesc = () => {
  descFocus.value = true;
};

const onBlurDesc = () => {
  descFocus.value = false;
};

const onCategoryChange = (event) => {
  selectedCategoryIndex.value = Number(event.detail.value);
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

const openPrompt = (type, title, placeholder, value = '') => {
  promptType.value = type;
  promptTitle.value = title;
  promptPlaceholder.value = placeholder;
  promptValue.value = value;
  promptVisible.value = true;
};

const handleCreateCategory = () => {
  openPrompt('category-create', '新增分类', '请输入分类名称');
};

const handleRenameCategory = () => {
  const current = categoryOptions.value[selectedCategoryIndex.value];
  if (!current || current.value === null) {
    uni.showToast({ title: '请选择要重命名的分类', icon: 'none' });
    return;
  }
  openPrompt('category-rename', '重命名分类', '请输入新名称', current.label);
};

const handleDeleteCategory = () => {
  const current = categoryOptions.value[selectedCategoryIndex.value];
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
        await loadCategories();
        selectedCategoryIndex.value = 0;
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' });
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
      await loadCategories();
      const idx = categoryOptions.value.findIndex((item) => item.label === name);
      if (idx >= 0) selectedCategoryIndex.value = idx;
    } catch {
      uni.showToast({ title: '新增失败', icon: 'none' });
    }
  }
  if (promptType.value === 'category-rename') {
    const current = categoryOptions.value[selectedCategoryIndex.value];
    if (!current || current.value === null) return;
    try {
      await updateCategory(current.value, { name });
      await loadCategories();
      const idx = categoryOptions.value.findIndex((item) => item.label === name);
      if (idx >= 0) selectedCategoryIndex.value = idx;
    } catch {
      uni.showToast({ title: '重命名失败', icon: 'none' });
    }
  }
  promptType.value = '';
};

const onRoleChange = (event) => {
  selectedRoleIndex.value = Number(event.detail.value);
  const roleId = roleOptions.value[selectedRoleIndex.value]?.value ?? null;
  setRoleId(roleId || null);
};

const onStartDateChange = (event) => {
  startDate.value = event.detail.value;
};

const onStartTimeChange = (event) => {
  startTime.value = event.detail.value;
};

const onDueDateChange = (event) => {
  dueDate.value = event.detail.value;
};

const onDueTimeChange = (event) => {
  dueTime.value = event.detail.value;
};

const cancel = () => {
  uni.navigateBack();
};

const toLocalDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return '';
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${normalized}`;
};

const buildDefaultDates = () => {
  const today = formatDate(new Date());
  startDate.value = today;
  dueDate.value = today;
};

const extractDateTimeParts = (value) => {
  if (!value) return { date: '', time: '' };
  const normalized = String(value).replace(' ', 'T');
  const [datePart, timePart] = normalized.split('T');
  const time = timePart ? timePart.slice(0, 5) : '';
  return { date: datePart || '', time };
};

const applyVoiceDraft = (draft) => {
  if (!draft) return;
  title.value = draft.title || '';
  description.value = draft.description || '';
  if (draft.priority) {
    const idx = priorityOptions.findIndex((item) => item.value === draft.priority);
    if (idx >= 0) selectedPriorityIndex.value = idx;
  }
  if (draft.start_date) {
    const { date, time } = extractDateTimeParts(draft.start_date);
    if (date) startDate.value = date;
    if (time) startTime.value = time;
  }
  if (draft.due_date) {
    const { date, time } = extractDateTimeParts(draft.due_date);
    if (date) dueDate.value = date;
    if (time) dueTime.value = time;
  }
  if (draft.role_id) {
    const idx = roleOptions.value.findIndex((item) => item.value === draft.role_id);
    if (idx >= 0) selectedRoleIndex.value = idx;
    setRoleId(draft.role_id);
  }
  if (draft.category_id) {
    const idx = categoryOptions.value.findIndex((item) => item.value === draft.category_id);
    if (idx >= 0) selectedCategoryIndex.value = idx;
  }
};

const submit = async () => {
  const trimmed = title.value.trim();
  if (!trimmed) {
    uni.showToast({ title: '请输入任务标题', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      title: trimmed,
      description: description.value.trim() || null,
      priority: priorityOptions[selectedPriorityIndex.value]?.value ?? 'medium',
    };
    const categoryId = categoryOptions.value[selectedCategoryIndex.value]?.value;
    if (categoryId) payload.category_id = categoryId;
    const roleId = roleOptions.value[selectedRoleIndex.value]?.value ?? getRoleId();
    if (roleId) payload.role_id = roleId;
    const effectiveStartDate = startDate.value || formatDate(new Date());
    const effectiveDueDate = dueDate.value || formatDate(new Date());
    const startValue = toLocalDateTime(effectiveStartDate, startTime.value || '09:00');
    const dueValue = toLocalDateTime(effectiveDueDate, dueTime.value || '23:59');
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
    await createTask(payload);
    uni.showToast({ title: '已创建', icon: 'success' });
    setTimeout(() => {
      uni.switchTab({ url: '/pages/home/index' });
    }, 300);
  } catch (err) {
    const detail = err?.detail;
    let message = '创建失败';
    if (Array.isArray(detail) && detail[0]?.msg) {
      message = detail[0].msg;
    } else if (typeof detail === 'string') {
      message = detail;
    }
    console.error('createTask failed', err);
    uni.showToast({ title: message, icon: 'none' });
  } finally {
    submitting.value = false;
  }
};

const loadCategories = async () => {
  try {
    const data = await fetchCategories();
    categoryOptions.value = [{ label: '未分类', value: null }, ...data.map((item) => ({
      label: item.name,
      value: item.id,
    }))];
  } catch {
    categoryOptions.value = [{ label: '未分类', value: null }];
  }
};

const loadRoles = async () => {
  try {
    const data = await fetchRoles();
    roleOptions.value = [{ label: '全部', value: null }, ...data.map((role) => ({
      label: role.name,
      value: role.id,
    }))];
    const stored = getRoleId();
    const idx = roleOptions.value.findIndex((item) => item.value === stored);
    selectedRoleIndex.value = idx >= 0 ? idx : 0;
  } catch {
    roleOptions.value = [{ label: '全部', value: null }];
  }
};

onLoad(() => {
  const stored = uni.getStorageSync('voiceDraft');
  if (stored) {
    voiceDraft.value = stored;
    uni.removeStorageSync('voiceDraft');
  }
});

onShow(async () => {
  if (!ensureAuth()) return;
  buildDefaultDates();
  await loadRoles();
  await loadCategories();
  if (voiceDraft.value) {
    applyVoiceDraft(voiceDraft.value);
    voiceDraft.value = null;
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

.card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--spacing-lg);
  background: #fff;
  box-shadow: var(--shadow);
}

.section-title {
  font-size: var(--font-body);
  font-weight: 700;
  margin-bottom: var(--spacing-md);
}

.form-field {
  margin-top: 10px;
}

.label {
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 6px;
  display: block;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  background: #fff;
  -webkit-user-select: text;
  user-select: text;
  pointer-events: auto;
}

.textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 11px;
  background: #fff;
  min-height: 96px;
}

.title-textarea {
  min-height: 52px;
}

.picker-input {
  width: 100%;
  box-sizing: border-box;
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

.time-grid {
  display: flex;
  gap: 12px;
}

.time-col {
  flex: 1;
  min-width: 0;
}

.time-col .picker-row {
  gap: 6px;
}

.picker-input.time {
  min-width: 70px;
  text-align: center;
}

.action-row {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
