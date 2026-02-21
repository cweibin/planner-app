import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatBeijingDate, nowBeijing, toBeijing } from '../utils/time';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Task,
  completeTask,
  fetchBoardTasks,
  fetchTodayTasks,
  TaskPriority,
} from '../services/tasks';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { TaskBoardSection } from '../components/TaskBoardSection';
import { Category, fetchCategories } from '../services/categories';
import { Role } from '../services/roles';
import { SubTask, fetchSubtasks } from '../services/subtasks';
import { NewTaskPage } from './NewTaskPage';
import { DatePicker } from '../components/DatePicker';
import { VoiceTaskInput } from '../components/VoiceTaskInput';

interface DashboardPageProps {
  roles: Role[];
  currentRoleId: number | 'all' | null;
  onRoleChange?: (roleId: number | 'all') => void;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const sortTasks = (list: Task[]) =>
  [...list].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    const aDue = a.due_date ? toBeijing(a.due_date)?.valueOf() ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
    const bDue = b.due_date ? toBeijing(b.due_date)?.valueOf() ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });

export const DashboardPage: React.FC<DashboardPageProps> = ({
  roles,
  currentRoleId,
  onRoleChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);
  const [completionPrompt, setCompletionPrompt] = useState<{
    task: Task;
    resolve: (value: string | null) => void;
  } | null>(null);
  const [completionTime, setCompletionTime] = useState('');

  const [priorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter] = useState<'all' | 'todo' | 'in_progress' | 'done' | 'cancelled'>('todo');
  const [searchText] = useState('');
  const selectedDate = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      const parsed = toBeijing(dateParam);
      if (parsed && parsed.isValid()) {
        return formatBeijingDate(dateParam);
      }
    }
    return nowBeijing().format('YYYY-MM-DD');
  }, [location.search]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [boardPriorityFilter, setBoardPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<number | 'all'>('all');
  const [boardSearchText, setBoardSearchText] = useState('');

  const [subtasksMap, setSubtasksMap] = useState<Record<number, SubTask[]>>({});
  const dueFrom = `${selectedDate}T00:00:00`;
  const dueTo = `${selectedDate}T23:59:59`;
  const boardRangeStart = dueFrom;
  const boardRangeEnd = dueTo;
  const [yesterdayRemainingTasks, setYesterdayRemainingTasks] = useState<Task[]>([]);

  const isCreatingTask = location.pathname === '/tasks/new';
  const roleFilterId =
    typeof currentRoleId === 'number' ? currentRoleId : undefined;
  const defaultRoleId =
    typeof currentRoleId === 'number' ? currentRoleId : roles[0]?.id ?? null;

  const loadTasks = useCallback(async () => {
    try {
      const priority = priorityFilter === 'all' ? undefined : priorityFilter;
      const categoryId = categoryFilter === 'all' ? undefined : categoryFilter;
      const data = await fetchTodayTasks(
        priority,
        searchText || undefined,
        categoryId,
        statusFilter,
        dueFrom,
        dueTo,
        roleFilterId,
      );
      setTasks(data);
    } catch {
      // 忽略错误
    }
  }, [categoryFilter, priorityFilter, searchText, dueFrom, dueTo, statusFilter, roleFilterId]);

  const loadYesterdayRemainingTasks = useCallback(async () => {
    try {
      // 获取截止日期早于所选日期的未完成任务（状态为 todo 或 in_progress）
      const priority = boardPriorityFilter === 'all' ? undefined : boardPriorityFilter;
      const categoryId = boardCategoryFilter === 'all' ? undefined : boardCategoryFilter;
      const q = boardSearchText || undefined;
      const [todoTasks, inProgressTasks] = await Promise.all([
        fetchTodayTasks(
          priority,
          q,
          categoryId,
          'todo',
          undefined,
          undefined,
          roleFilterId,
        ),
        fetchTodayTasks(
          priority,
          q,
          categoryId,
          'in_progress',
          undefined,
          undefined,
          roleFilterId,
        ),
      ]);
      const merged = [...todoTasks, ...inProgressTasks];
      const todayStart = toBeijing(selectedDate)?.startOf('day');
      const filtered = merged.filter((task) => {
        if (task.due_date) {
          const due = toBeijing(task.due_date);
          return !!todayStart && !!due && due.isBefore(todayStart);
        }
        return false;
      });
      setYesterdayRemainingTasks(sortTasks(filtered));
    } catch {
      // 忽略错误
    }
  }, [roleFilterId, selectedDate, boardPriorityFilter, boardCategoryFilter, boardSearchText]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch {
      // 忽略错误
    }
  };

  const refreshBoard = useCallback(() => {
    setBoardRefreshKey((prev) => prev + 1);
  }, []);


  const loadSubtasksForTasks = async (taskList: Task[]) => {
    const idsToLoad = taskList.map((t) => t.id).filter((id) => !(id in subtasksMap));
    if (idsToLoad.length === 0) return;
    try {
      for (const id of idsToLoad) {
        const subs = await fetchSubtasks(id);
        setSubtasksMap((prev) => ({ ...prev, [id]: subs }));
      }
    } catch {
      // 忽略加载子任务错误
    }
  };

  const handleSubtasksChange = useCallback((taskId: number, subtasks: SubTask[]) => {
    setSubtasksMap((prev) => ({ ...prev, [taskId]: subtasks }));
  }, []);

  const handleTaskUpdated = useCallback(
    async (updatedTask: Task) => {
      setSelectedTask(updatedTask);
      await loadTasks();
      await loadYesterdayRemainingTasks();
      refreshBoard();
    },
    [loadTasks, loadYesterdayRemainingTasks, refreshBoard],
  );

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    void loadYesterdayRemainingTasks();
  }, [loadYesterdayRemainingTasks]);

  const handleDateChange = (nextDate: string) => {
    const params = new URLSearchParams(location.search);
    params.set('date', nextDate);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);


  useEffect(() => {
    if (tasks.length > 0) {
      void loadSubtasksForTasks(tasks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const requestCompletionTime = useCallback(
    (task: Task) =>
      new Promise<string | null>((resolve) => {
        setCompletionTime(nowBeijing().format('YYYY-MM-DDTHH:mm'));
        setCompletionPrompt({ task, resolve });
      }),
    [],
  );

  const handleConfirmCompletion = () => {
    if (!completionPrompt) return;
    const selected = completionTime || nowBeijing().format('YYYY-MM-DDTHH:mm');
    const selectedTime = toBeijing(selected);
    if (!selectedTime || !selectedTime.isValid()) {
      window.alert('请选择有效的完成时间');
      return;
    }
    if (selectedTime.isAfter(nowBeijing())) {
      window.alert('完成时间不能晚于当前时间');
      return;
    }
    completionPrompt.resolve(selectedTime.toISOString());
    setCompletionPrompt(null);
  };

  const handleCancelCompletion = () => {
    if (completionPrompt) {
      completionPrompt.resolve(null);
    }
    setCompletionPrompt(null);
  };

  const handleComplete = async (task: Task) => {
    try {
      const completedAt = await requestCompletionTime(task);
      if (!completedAt) {
        return;
      }
      const shouldJump = yesterdayRemainingTasks.some((t) => t.id === task.id);
      await completeTask(task.id, completedAt);
      setSelectedTask(null);
      await loadTasks();
      await loadYesterdayRemainingTasks();
      refreshBoard();
      if (shouldJump) {
        const completionDate = formatBeijingDate(completedAt);
        handleDateChange(completionDate);
      }
    } catch {
      // 忽略错误
    }
  };

  const quickButtonStyle: React.CSSProperties = {
    height: 36,
    padding: '6px 16px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  };

  return (
    <div>
      <h1 className="page-title">今日概览</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="button secondary"
            style={quickButtonStyle}
            onClick={() => {
              const next = toBeijing(selectedDate)?.subtract(1, 'day').format('YYYY-MM-DD');
              if (next) handleDateChange(next);
            }}
          >
            前一天
          </button>
          <button
            className="button secondary"
            style={quickButtonStyle}
            onClick={() => handleDateChange(nowBeijing().format('YYYY-MM-DD'))}
          >
            今天
          </button>
          <button
            className="button secondary"
            style={quickButtonStyle}
            onClick={() => {
              const next = toBeijing(selectedDate)?.add(1, 'day').format('YYYY-MM-DD');
              if (next) handleDateChange(next);
            }}
          >
            后一天
          </button>
        </div>
        <span style={{ fontSize: 13, color: '#64748b' }}>选择日期：</span>
        <DatePicker
          value={selectedDate}
          onChange={handleDateChange}
          className="calendar-date-picker"
        />
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#666' }}>
              快速添加：默认创建为所选日期任务，可设置起止日期与重复
            </span>
            <button
              className="button"
              onClick={() => navigate(`/tasks/new?date=${selectedDate}`)}
            >
              添加任务
            </button>
            <VoiceTaskInput
              onTaskCreated={async () => {
                await loadTasks();
                await loadYesterdayRemainingTasks();
                refreshBoard();
              }}
            />
          </div>
        </section>
        <TaskBoardSection
          title="今日看板"
          onStatusChange={() => {
            void loadTasks();
            void loadYesterdayRemainingTasks();
            refreshBoard();
          }}
          onRequestCompleteTime={requestCompletionTime}
          dueFrom={boardRangeStart}
          dueTo={boardRangeEnd}
          refreshKey={boardRefreshKey}
          categories={categories}
          priorityFilter={boardPriorityFilter === 'all' ? undefined : boardPriorityFilter}
          categoryFilter={boardCategoryFilter === 'all' ? undefined : boardCategoryFilter}
          searchText={boardSearchText || undefined}
          roleId={roleFilterId}
          roles={roles}
          statusLabelOverrides={{ todo: '今日待办' }}
          leftColumn={{
            title: "昨天剩余",
            tasks: yesterdayRemainingTasks,
            loading: false,
            emptyText: "暂无剩余任务",
          }}
          filters={
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                fontSize: 13,
              }}
            >
              <span>优先级：</span>
              <select
                className="input"
                style={{ width: 120 }}
                value={boardPriorityFilter}
                onChange={(e) =>
                  setBoardPriorityFilter(e.target.value as 'all' | TaskPriority)
                }
              >
                <option value="all">全部</option>
                <option value="high">高优先级</option>
                <option value="medium">普通</option>
                <option value="low">低优先级</option>
              </select>
              <span>分类：</span>
              <select
                className="input"
                style={{ width: 140 }}
                value={boardCategoryFilter}
                onChange={(e) =>
                  setBoardCategoryFilter(
                    e.target.value === 'all' ? 'all' : Number(e.target.value),
                  )
                }
              >
                <option value="all">全部</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                className="input"
                style={{ width: 180 }}
                placeholder="搜索任务"
                value={boardSearchText}
                onChange={(e) => setBoardSearchText(e.target.value)}
              />
              <button
                className="button secondary"
                onClick={() => {
                  setBoardPriorityFilter('all');
                  setBoardCategoryFilter('all');
                  setBoardSearchText('');
                }}
              >
                清除筛选
              </button>
            </div>
          }
          onTaskSelect={(task) => setSelectedTask(task)}
        />
      </div>
      {isCreatingTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'flex-end',
            zIndex: 40,
            paddingTop: 56,
            height: '100vh',
            boxSizing: 'border-box',
          }}
          onClick={() => navigate(`/?date=${selectedDate}`)}
        >
          <div
            style={{ width: 420, maxWidth: '100%', height: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <NewTaskPage
              variant="panel"
              onClose={() => navigate(`/?date=${selectedDate}`)}
              roleId={defaultRoleId}
              roles={roles}
              onRoleChange={onRoleChange}
              onTaskCreated={refreshBoard}
            />
          </div>
        </div>
      )}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          categories={categories}
          onCategoriesChange={setCategories}
          roles={roles}
          currentRoleId={defaultRoleId}
          isYesterdayRemaining={yesterdayRemainingTasks.some((t) => t.id === selectedTask.id)}
          onRoleSwitch={onRoleChange}
          onClose={() => setSelectedTask(null)}
          onComplete={async () => handleComplete(selectedTask)}
          onSubtasksChange={handleSubtasksChange}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
      {completionPrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 16,
          }}
          onClick={handleCancelCompletion}
        >
          <div
            style={{
              width: 360,
              maxWidth: '100%',
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 12px 30px rgba(15,23,42,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>确认实际完成时间</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              {completionPrompt.task.title}
            </div>
            <input
              type="datetime-local"
              className="input"
              style={{ width: '100%' }}
              value={completionTime}
              max={nowBeijing().format('YYYY-MM-DDTHH:mm')}
              onChange={(e) => setCompletionTime(e.target.value)}
            />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              仅支持选择当前时间及以前
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="button secondary" onClick={handleCancelCompletion}>
                取消
              </button>
              <button className="button" onClick={handleConfirmCompletion}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
