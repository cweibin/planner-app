import React, { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Task,
  TaskPriority,
  UpdateTaskPayload,
  cancelTask,
  createTask,
  deleteTask,
  updateTaskStatus,
  updateTask,
} from '../services/tasks';
import {
  Category,
  createCategory,
  deleteCategory,
  updateCategory,
} from '../services/categories';
import { Role } from '../services/roles';
import {
  SubTask,
  createSubtask,
  createSubtaskWithOptions,
  deleteSubtask,
  fetchSubtasks,
  toggleSubtaskCompleted,
  updateSubtask,
} from '../services/subtasks';

interface Props {
  task: Task;
  categories: Category[];
  onCategoriesChange?: (categories: Category[]) => void;
  roles: Role[];
  currentRoleId: number | null;
  isYesterdayRemaining?: boolean;
  onRoleSwitch?: (roleId: number | 'all') => void;
  onClose: () => void;
  onComplete: () => Promise<void>;
  onSubtasksChange?: (taskId: number, subtasks: SubTask[]) => void;
  onTaskUpdated?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<Props> = ({
  task,
  categories,
  onCategoriesChange,
  roles,
  currentRoleId,
  isYesterdayRemaining = false,
  onRoleSwitch,
  onClose,
  onComplete,
  onSubtasksChange,
  onTaskUpdated,
}) => {
  const [currentTask, setCurrentTask] = useState<Task>(task);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<number, string>>({});
  const [draggingSubtaskId, setDraggingSubtaskId] = useState<number | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const categoryAddOption = '__add__';
  const categoryRenameOption = '__rename__';
  const categoryDeleteOption = '__delete__';
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [duplicateRoleId, setDuplicateRoleId] = useState<number | null>(
    currentRoleId ?? task.role_id ?? roles[0]?.id ?? null,
  );
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [dueExtensionPrompt, setDueExtensionPrompt] = useState<{
    resolve: (value: string | null) => void;
  } | null>(null);
  const [dueExtensionTime, setDueExtensionTime] = useState('');
  const isFetchingRef = useRef(false);

  const requestDueExtensionTime = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        setDueExtensionTime(dayjs().format('YYYY-MM-DDTHH:mm'));
        setDueExtensionPrompt({ resolve });
      }),
    [],
  );

  const handleConfirmDueExtension = () => {
    if (!dueExtensionPrompt) return;
    const selected = dueExtensionTime || dayjs().format('YYYY-MM-DDTHH:mm');
    const selectedTime = dayjs(selected);
    if (!selectedTime.isValid()) {
      window.alert('请选择有效的截止时间');
      return;
    }
    dueExtensionPrompt.resolve(selectedTime.toISOString());
    setDueExtensionPrompt(null);
  };

  const handleCancelDueExtension = () => {
    if (dueExtensionPrompt) {
      dueExtensionPrompt.resolve(null);
    }
    setDueExtensionPrompt(null);
  };

  const getExtendedDueDate = async (action: 'todo' | 'in_progress' | 'cancel') => {
    if (!currentTask.due_date) return null;
    const due = dayjs(currentTask.due_date);
    const now = dayjs();
    if (!due.isValid()) return null;
    if (!due.isBefore(now)) return null;
    if ((action === 'todo' || action === 'in_progress') && isYesterdayRemaining) {
      return await requestDueExtensionTime();
    }
    const confirmed = window.confirm('该任务截止时间早于当前时间，是否更新截止时间到当前时间？');
    if (!confirmed) return null;
    return now.toISOString();
  };

  useEffect(() => {
    setCurrentTask(task);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? '');
    setDuplicateRoleId(currentRoleId ?? task.role_id ?? roles[0]?.id ?? null);
  }, [task]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setDuplicateRoleId(currentRoleId ?? task.role_id ?? roles[0]?.id ?? null);
  }, [currentRoleId, task.role_id, roles]);

  useEffect(() => {
    const load = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoadingSubtasks(true);
      try {
        const data = await fetchSubtasks(task.id);
        setSubtasks(data);
      } finally {
        setLoadingSubtasks(false);
        isFetchingRef.current = false;
      }
    };
    void load();
  }, [task.id]);

  useEffect(() => {
    onSubtasksChange?.(task.id, subtasks);
  }, [task.id, subtasks, onSubtasksChange]);

  useEffect(() => {
    setSubtaskDrafts((prev) => {
      const next: Record<number, string> = {};
      subtasks.forEach((st) => {
        next[st.id] = prev[st.id] ?? st.title;
      });
      return next;
    });
  }, [subtasks]);

  const handleUpdate = async (payload: UpdateTaskPayload) => {
    setSaving(true);
    setUpdateError(null);
    try {
      const updated = await updateTask(task.id, payload);
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch {
      setUpdateError('更新失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTask = async () => {
    setSaving(true);
    setUpdateError(null);
    try {
      const payload: UpdateTaskPayload = { status: 'cancelled' };
      const extendedDueDate = await getExtendedDueDate('cancel');
      if (extendedDueDate) {
        payload.due_date = extendedDueDate;
      }
      const updated = await updateTask(currentTask.id, payload);
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch {
      setUpdateError('取消失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const handleSetInProgress = async () => {
    setSaving(true);
    setUpdateError(null);
    try {
      const payload: UpdateTaskPayload = { status: 'in_progress' };
      const extendedDueDate = await getExtendedDueDate('in_progress');
      if (extendedDueDate) {
        payload.due_date = extendedDueDate;
      }
      const updated = await updateTask(currentTask.id, payload);
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch {
      setUpdateError('更新状态失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const handleSetTodo = async () => {
    setSaving(true);
    setUpdateError(null);
    try {
      const payload: UpdateTaskPayload = { status: 'todo' };
      const extendedDueDate = await getExtendedDueDate('todo');
      if (extendedDueDate) {
        payload.due_date = extendedDueDate;
      }
      const updated = await updateTask(currentTask.id, payload);
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch {
      setUpdateError('更新状态失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDuplicatePrompt = () => {
    setDuplicateRoleId(currentRoleId ?? currentTask.role_id ?? roles[0]?.id ?? null);
    setShowDuplicatePrompt(true);
  };

  const handleDuplicateTask = async () => {
    const targetRoleId =
      duplicateRoleId ?? currentRoleId ?? currentTask.role_id ?? undefined;
    setSaving(true);
    setUpdateError(null);
    try {
      const created = await createTask({
        title: `${currentTask.title} (copy)`,
        description: currentTask.description ?? undefined,
        priority: currentTask.priority,
        category_id: currentTask.category_id ?? undefined,
        start_date: currentTask.start_date ?? undefined,
        due_date: currentTask.due_date ?? undefined,
        is_recurring: currentTask.is_recurring ?? false,
        recurring_rule: currentTask.recurring_rule ?? undefined,
        role_id: targetRoleId,
      });
      if (subtasks.length > 0) {
        await Promise.all(
          subtasks.map((subtask) =>
            createSubtaskWithOptions(created.id, {
              title: subtask.title,
              is_completed: subtask.is_completed,
              sort_order: subtask.sort_order,
            }),
          ),
        );
      }
      onTaskUpdated?.(currentTask);
      if (targetRoleId) {
        onRoleSwitch?.(targetRoleId);
      }
    } catch {
      setUpdateError('复用失败，请稍后再试');
    } finally {
      setSaving(false);
      setShowDuplicatePrompt(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('确定删除该任务？')) return;
    if (!window.confirm('再次确认删除？此操作不可撤销。')) return;
    setSaving(true);
    setUpdateError(null);
    try {
      await deleteTask(task.id);
      onTaskUpdated?.(currentTask);
      onClose();
    } catch {
      setUpdateError('删除失败，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value: dayjs.Dayjs) => value.format('YYYY-MM-DDTHH:mm:00');

  const handleStartDateChange = async (value: string) => {
    if (!value) {
      await handleUpdate({ start_date: null });
      return;
    }
    const time = currentTask.start_date
      ? dayjs(currentTask.start_date).format('HH:mm')
      : '09:00';
    const nextStart = dayjs(`${value}T${time}`);
    const payload: UpdateTaskPayload = { start_date: formatDateTime(nextStart) };
    if (currentTask.due_date) {
      const currentDue = dayjs(currentTask.due_date);
      if (currentDue.isBefore(nextStart)) {
        payload.due_date = formatDateTime(nextStart);
      }
    }
    await handleUpdate(payload);
  };

  const handleStartTimeChange = async (value: string) => {
    if (!currentTask.start_date) return;
    const date = dayjs(currentTask.start_date).format('YYYY-MM-DD');
    const nextStart = dayjs(`${date}T${value}`);
    const payload: UpdateTaskPayload = { start_date: formatDateTime(nextStart) };
    if (currentTask.due_date) {
      const currentDue = dayjs(currentTask.due_date);
      if (currentDue.isBefore(nextStart)) {
        payload.due_date = formatDateTime(nextStart);
      }
    }
    await handleUpdate(payload);
  };

  const handleDueDateChange = async (value: string) => {
    if (!value) {
      await handleUpdate({ due_date: null });
      return;
    }
    const time = currentTask.due_date
      ? dayjs(currentTask.due_date).format('HH:mm')
      : '18:00';
    const nextDue = dayjs(`${value}T${time}`);
    const payload: UpdateTaskPayload = { due_date: formatDateTime(nextDue) };
    if (currentTask.start_date) {
      const currentStart = dayjs(currentTask.start_date);
      if (currentStart.isAfter(nextDue)) {
        payload.start_date = formatDateTime(nextDue);
      }
    }
    await handleUpdate(payload);
  };

  const handleDueTimeChange = async (value: string) => {
    if (!currentTask.due_date) return;
    const date = dayjs(currentTask.due_date).format('YYYY-MM-DD');
    const nextDue = dayjs(`${date}T${value}`);
    const payload: UpdateTaskPayload = { due_date: formatDateTime(nextDue) };
    if (currentTask.start_date) {
      const currentStart = dayjs(currentTask.start_date);
      if (currentStart.isAfter(nextDue)) {
        payload.start_date = formatDateTime(nextDue);
      }
    }
    await handleUpdate(payload);
  };

  const startDateValue = currentTask.start_date
    ? dayjs(currentTask.start_date).format('YYYY-MM-DD')
    : '';
  const startTimeValue = currentTask.start_date
    ? dayjs(currentTask.start_date).format('HH:mm')
    : '';
  const dueDateValue = currentTask.due_date
    ? dayjs(currentTask.due_date).format('YYYY-MM-DD')
    : '';
  const dueTimeValue = currentTask.due_date
    ? dayjs(currentTask.due_date).format('HH:mm')
    : '';

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    const created = await createSubtask(task.id, newSubtaskTitle.trim());
    setSubtasks((prev) => [...prev, created]);
    setSubtaskDrafts((prev) => ({ ...prev, [created.id]: created.title }));
    setNewSubtaskTitle('');
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSubtask();
  };

  const handleToggleSubtask = async (st: SubTask) => {
    const updated = await toggleSubtaskCompleted(st);
    setSubtasks((prev) => prev.map((x) => (x.id === st.id ? updated : x)));
  };

  const handleDeleteSubtask = async (st: SubTask) => {
    await deleteSubtask(st.id);
    setSubtasks((prev) => prev.filter((x) => x.id !== st.id));
    setSubtaskDrafts((prev) => {
      const next = { ...prev };
      delete next[st.id];
      return next;
    });
  };

  const handleUpdateSubtaskTitle = async (st: SubTask) => {
    const draft = subtaskDrafts[st.id] ?? st.title;
    const nextTitle = draft.trim();
    if (!nextTitle || nextTitle === st.title) {
      setSubtaskDrafts((prev) => ({ ...prev, [st.id]: st.title }));
      return;
    }
    const updated = await updateSubtask(st.id, { title: nextTitle });
    setSubtasks((prev) => prev.map((x) => (x.id === st.id ? updated : x)));
    setSubtaskDrafts((prev) => ({ ...prev, [st.id]: updated.title }));
  };

  const handleCategorySelect = async (value: string) => {
    if (value === categoryAddOption) {
      const name = window.prompt('请输入分类名称');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) {
        setCategoryError('请输入分类名称');
        return;
      }
      setCategoryError(null);
      try {
        const created = await createCategory(trimmed);
        const next = [...localCategories, created];
        setLocalCategories(next);
        onCategoriesChange?.(next);
        await handleUpdate({ category_id: created.id });
      } catch {
        setCategoryError('新增分类失败，请稍后再试');
      }
      return;
    }
    if (value === categoryRenameOption) {
      if (!currentTask.category_id) {
        setCategoryError('请选择需要重命名的分类');
        return;
      }
      const current = localCategories.find(
        (category) => category.id === currentTask.category_id,
      );
      const name = window.prompt('重命名分类', current?.name ?? '');
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) {
        setCategoryError('请输入分类名称');
        return;
      }
      setCategoryError(null);
      try {
        const updated = await updateCategory(currentTask.category_id, trimmed);
        const next = localCategories.map((category) =>
          category.id === updated.id ? updated : category,
        );
        setLocalCategories(next);
        onCategoriesChange?.(next);
      } catch {
        setCategoryError('分类重命名失败，请稍后再试');
      }
      return;
    }
    if (value === categoryDeleteOption) {
      if (!currentTask.category_id) {
        setCategoryError('请选择需要删除的分类');
        return;
      }
      if (!window.confirm('确定删除该分类？')) return;
      setCategoryError(null);
      try {
        await deleteCategory(currentTask.category_id);
        const next = localCategories.filter(
          (category) => category.id !== currentTask.category_id,
        );
        setLocalCategories(next);
        onCategoriesChange?.(next);
        await handleUpdate({ category_id: null });
      } catch {
        setCategoryError('分类删除失败，请稍后再试');
      }
      return;
    }
    await handleUpdate({
      category_id: value === 'none' ? null : Number(value),
    });
  };

  const handleReorderSubtasks = async (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;
    const sourceIndex = subtasks.findIndex((st) => st.id === sourceId);
    const targetIndex = subtasks.findIndex((st) => st.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const next = [...subtasks];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setSubtasks(next);
    try {
      await Promise.all(
        next.map((item, index) => {
          if (item.sort_order === index) return Promise.resolve(item);
          return updateSubtask(item.id, { sort_order: index });
        }),
      );
    } catch {
      // 忽略排序更新失败
    }
  };

  return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
          zIndex: 50,
          paddingTop: 56,
          height: '100vh',
          boxSizing: 'border-box',
        }}
        onClick={onClose}
      >
        <div
          className="card"
          style={{ maxWidth: 520, width: '100%', height: '100%', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
          <input
            className="input"
            style={{ fontSize: 18, fontWeight: 600, flex: 1 }}
            value={editingTitle}
            disabled={saving}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={() => {
              const nextTitle = editingTitle.trim();
              if (!nextTitle || nextTitle === currentTask.title) return;
              void handleUpdate({ title: nextTitle });
            }}
          />
          <button
            className="button secondary"
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: 12, height: 36 }}
          >
            关闭
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <textarea
            className="input"
            style={{ minHeight: 80, resize: 'vertical' }}
            placeholder="任务详情（可选）"
            value={editingDescription}
            disabled={saving}
            onChange={(e) => setEditingDescription(e.target.value)}
            onBlur={() => {
              const nextDescription = editingDescription.trim();
              const currentDescription = currentTask.description ?? '';
              if (nextDescription === currentDescription) return;
              void handleUpdate({
                description: nextDescription || undefined,
              });
            }}
          />
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
          <div>
            状态：
            {currentTask.status === 'todo'
              ? '待办'
              : currentTask.status === 'in_progress'
              ? '进行中'
              : currentTask.status === 'done'
              ? '已完成'
              : '已取消'}
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>开始日期：</span>
                <input
                  className="input"
                  type="date"
                  value={startDateValue}
                  disabled={saving}
                  onChange={(e) => void handleStartDateChange(e.target.value)}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>开始时间：</span>
                <input
                  className="input"
                  type="time"
                  value={startTimeValue}
                  disabled={saving || !currentTask.start_date}
                  onChange={(e) => void handleStartTimeChange(e.target.value)}
                />
              </label>
            </div>
            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>截止日期：</span>
                <input
                  className="input"
                  type="date"
                  value={dueDateValue}
                  disabled={saving}
                  onChange={(e) => void handleDueDateChange(e.target.value)}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>截止时间：</span>
                <input
                  className="input"
                  type="time"
                  value={dueTimeValue}
                  disabled={saving || !currentTask.due_date}
                  onChange={(e) => void handleDueTimeChange(e.target.value)}
                />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span>优先级：</span>
            <select
              className="input"
              style={{ width: 120 }}
              value={currentTask.priority}
              disabled={saving}
              onChange={(e) =>
                handleUpdate({ priority: e.target.value as TaskPriority })
              }
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span>分类：</span>
            <select
              className="input"
              style={{ width: 180 }}
              value={currentTask.category_id ?? 'none'}
              disabled={saving}
              onChange={(e) => void handleCategorySelect(e.target.value)}
            >
              <option value={categoryAddOption}>新增分类...</option>
              <option value={categoryRenameOption}>重命名当前分类</option>
              <option value={categoryDeleteOption}>删除当前分类</option>
              <option value="none">无分类</option>
              {localCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          {categoryError && (
            <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 4 }}>
              {categoryError}
            </div>
          )}
          {updateError && (
            <div style={{ color: '#d32f2f', marginTop: 6 }}>{updateError}</div>
          )}
        </div>

        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>子任务</h3>
          {loadingSubtasks && <div style={{ fontSize: 13 }}>加载子任务...</div>}
          {!loadingSubtasks && subtasks.length === 0 && (
            <div style={{ fontSize: 13, color: '#666' }}>暂时还没有子任务。</div>
          )}
          {!loadingSubtasks && subtasks.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {subtasks.map((st) => (
                <li
                  key={st.id}
                  draggable
                  onDragStart={() => setDraggingSubtaskId(st.id)}
                  onDragEnd={() => setDraggingSubtaskId(null)}
                  onDragOver={(e) => {
                    if (!draggingSubtaskId || draggingSubtaskId === st.id) return;
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!draggingSubtaskId || draggingSubtaskId === st.id) return;
                    void handleReorderSubtasks(draggingSubtaskId, st.id);
                    setDraggingSubtaskId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={st.is_completed}
                      onChange={() => handleToggleSubtask(st)}
                    />
                    <input
                      className="input"
                      style={{
                        fontSize: 12,
                        padding: '2px 6px',
                        height: 28,
                        textDecoration: st.is_completed ? 'line-through' : 'none',
                      }}
                      value={subtaskDrafts[st.id] ?? st.title}
                      onChange={(e) =>
                        setSubtaskDrafts((prev) => ({ ...prev, [st.id]: e.target.value }))
                      }
                      onBlur={() => void handleUpdateSubtaskTitle(st)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !(e as unknown as { isComposing?: boolean }).isComposing) {
                          e.preventDefault();
                          void handleUpdateSubtaskTitle(st);
                        }
                      }}
                    />
                  </div>
                  <button
                    className="button secondary"
                    style={{ padding: '2px 6px', fontSize: 11 }}
                    onClick={() => handleDeleteSubtask(st)}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddSubtask} style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <input
              className="input"
              style={{ fontSize: 12, padding: '6px 8px' }}
              placeholder="添加子任务"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !(e as unknown as { isComposing?: boolean }).isComposing) {
                  e.preventDefault();
                  void addSubtask();
                }
              }}
            />
            <button className="button" type="submit" style={{ fontSize: 12, padding: '6px 12px' }}>
              添加
            </button>
          </form>
        </section>

        {(currentTask.created_at ||
          currentTask.updated_at ||
          currentTask.completed_at ||
          currentTask.cancelled_at) && (
          <div style={{ fontSize: 12, color: '#777', marginBottom: 12 }}>
            {currentTask.created_at && (
              <div>创建时间：{dayjs(currentTask.created_at).format('YYYY-MM-DD HH:mm')}</div>
            )}
            {currentTask.updated_at && (
              <div>更新时间：{dayjs(currentTask.updated_at).format('YYYY-MM-DD HH:mm')}</div>
            )}
            {currentTask.status === 'done' && (
              <div>
                实际完成时间：
                {currentTask.completed_at
                  ? dayjs(currentTask.completed_at).format('YYYY-MM-DD HH:mm')
                  : '未记录'}
              </div>
            )}
            {currentTask.status === 'cancelled' && (
              <div>
                取消时间：
                {currentTask.cancelled_at
                  ? dayjs(currentTask.cancelled_at).format('YYYY-MM-DD HH:mm')
                  : '未记录'}
              </div>
            )}
          </div>
        )}

        {showDuplicatePrompt && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60,
            }}
            onClick={() => setShowDuplicatePrompt(false)}
          >
            <div
              className="card"
              style={{
                width: 360,
                maxWidth: '90%',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>复用到角色</div>
              {roles.length > 0 ? (
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={duplicateRoleId ?? roles[0]?.id ?? ''}
                  onChange={(e) => setDuplicateRoleId(Number(e.target.value))}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: 12, color: '#888' }}>暂无可选角色</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="button secondary"
                  onClick={() => setShowDuplicatePrompt(false)}
                  disabled={saving}
                >
                  取消
                </button>
                <button className="button" onClick={handleDuplicateTask} disabled={saving}>
                  确认复用
                </button>
              </div>
            </div>
          </div>
        )}

        {dueExtensionPrompt && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 70,
              padding: 16,
            }}
            onClick={handleCancelDueExtension}
          >
            <div
              className="card"
              style={{
                width: 360,
                maxWidth: '90%',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>是否延长截止时间</div>
              <div style={{ fontSize: 12, color: '#666' }}>默认当前时间，可自行调整后确认</div>
              <input
                type="datetime-local"
                className="input"
                value={dueExtensionTime}
                onChange={(e) => setDueExtensionTime(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="button secondary" onClick={handleCancelDueExtension}>
                  不延长
                </button>
                <button className="button" onClick={handleConfirmDueExtension}>
                  确认延长
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {currentTask.status !== 'done' && currentTask.status !== 'cancelled' && (
              <>
                {currentTask.status !== 'todo' && (
                  <button className="button secondary" onClick={handleSetTodo} disabled={saving}>
                    标记待办
                  </button>
                )}
                {currentTask.status !== 'in_progress' && (
                  <button className="button secondary" onClick={handleSetInProgress} disabled={saving}>
                    标记进行中
                  </button>
                )}
                <button className="button" onClick={onComplete} disabled={saving}>
                  标记完成
                </button>
                <button
                  className="button secondary"
                  onClick={handleCancelTask}
                  disabled={saving}
                >
                  取消任务
                </button>
              </>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <button className="button secondary" onClick={handleOpenDuplicatePrompt} disabled={saving}>
              复用任务
            </button>
            <button
              className="button secondary"
              onClick={handleDeleteTask}
              disabled={saving}
              style={{ color: '#d32f2f', border: '1px solid #f5b5b5' }}
            >
              删除任务
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
