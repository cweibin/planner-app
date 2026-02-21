import React, { useEffect, useState } from 'react';
import {
  BoardColumns,
  BoardFilterParams,
  fetchBoardTasks,
  Task,
  TaskPriority,
  TaskStatus,
  updateTaskStatus,
} from '../services/tasks';
import { Category } from '../services/categories';
import { Role } from '../services/roles';
import { formatBeijing, formatBeijingFromUtc, nowBeijing, toBeijing, toBeijingFromUtc } from '../utils/time';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled'];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '#e3f2fd',
  in_progress: '#fff3e0',
  done: '#e8f5e9',
  cancelled: '#eeeeee',
};

const OVERDUE_COLOR = '#ffe5e5';

const PRIORITY_STYLES: Record<
  Task['priority'],
  { label: string; background: string; color: string }
> = {
  high: { label: '高', background: '#ffe5e5', color: '#d32f2f' },
  medium: { label: '中', background: '#e3f2fd', color: '#1565c0' },
  low: { label: '低', background: '#e0f2f1', color: '#00796b' },
};

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const sortTasks = (tasks: Task[]) =>
  [...tasks].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    const aDue = a.due_date
      ? toBeijing(a.due_date)?.valueOf() ?? Number.POSITIVE_INFINITY
      : Number.POSITIVE_INFINITY;
    const bDue = b.due_date
      ? toBeijing(b.due_date)?.valueOf() ?? Number.POSITIVE_INFINITY
      : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });

const normalizeColumns = (columns: BoardColumns): BoardColumns => ({
  todo: sortTasks(columns.todo ?? []),
  in_progress: sortTasks(columns.in_progress ?? []),
  done: sortTasks(columns.done ?? []),
  cancelled: sortTasks(columns.cancelled ?? []),
});

interface Props {
  title?: string;
  onStatusChange?: () => void;
  dueFrom?: string;
  dueTo?: string;
  refreshKey?: number;
  onRequestCompleteTime?: (task: Task) => Promise<string | null>;
  onTaskSelect?: (task: Task) => void;
  categories?: Category[];
  roles?: Role[];
  priorityFilter?: TaskPriority;
  categoryFilter?: number;
  searchText?: string;
  filters?: React.ReactNode;
  roleId?: number;
  statusLabelOverrides?: Partial<Record<TaskStatus, string>>;
  leftColumn?: {
    title: string;
    tasks: Task[];
    loading?: boolean;
    emptyText?: string;
  };
}

export const TaskBoardSection: React.FC<Props> = ({
  title = '任务看板',
  onStatusChange,
  dueFrom,
  dueTo,
  refreshKey,
  onRequestCompleteTime,
  onTaskSelect,
  categories = [],
  roles = [],
  priorityFilter,
  categoryFilter,
  searchText,
  filters,
  roleId,
  statusLabelOverrides,
  leftColumn,
}) => {
  const [columns, setColumns] = useState<BoardColumns | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ task: Task; from: TaskStatus } | null>(null);
  const isPastSelection = !!dueTo && (() => {
    const target = toBeijing(dueTo);
    return target ? target.isBefore(nowBeijing()) : false;
  })();
  const statusLabels = { ...STATUS_LABEL, ...statusLabelOverrides };
  const requestKey = [
    dueFrom ?? '',
    dueTo ?? '',
    priorityFilter ?? '',
    categoryFilter ?? '',
    searchText ?? '',
    roleId ?? '',
    refreshKey ?? '',
  ].join('|');

  const formatBeijingTime = (value?: string | null) => formatBeijing(value);

  useEffect(() => {
    const load = async () => {
      const params: BoardFilterParams = {
        dueFrom,
        dueTo,
        priority: priorityFilter,
        categoryId: categoryFilter,
        q: searchText,
        roleId,
      };
      const data = await fetchBoardTasks(params);
      setColumns(normalizeColumns(data));
    };
    setColumns(null);
    void load();
  }, [requestKey]);

  const handleDragStart = (task: Task, status: TaskStatus) => {
    setDraggedTask({ task, from: status });
  };

  const handleDrop = async (status: TaskStatus) => {
    if (!draggedTask || !columns) return;
    const { task, from } = draggedTask;
    if (from === status) {
      setDraggedTask(null);
      return;
    }
    let completedAt: string | null = null;
    if (status === 'done' && onRequestCompleteTime) {
      completedAt = await onRequestCompleteTime(task);
      if (!completedAt) {
        setDraggedTask(null);
        return;
      }
    }
    const next: BoardColumns = {
      todo: [...columns.todo],
      in_progress: [...columns.in_progress],
      done: [...columns.done],
      cancelled: [...columns.cancelled],
    };
    next[from] = next[from].filter((t) => t.id !== task.id);
    next[status] = [{ ...task, status }, ...next[status]];
    setColumns(normalizeColumns(next));
    setDraggedTask(null);

    try {
      await updateTaskStatus(task.id, status, completedAt ?? undefined);
      onStatusChange?.();
    } catch {
      // 简单忽略错误
    }
  };

  const allowDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  const renderTaskCard = (
    task: Task,
    options: {
      status: TaskStatus;
      isOverdue: boolean;
      showOverdueIcon: boolean;
      draggable?: boolean;
      showStatusTag?: boolean;
    },
  ) => {
    const cardColor = options.isOverdue ? OVERDUE_COLOR : STATUS_COLOR[options.status];
    const handleClick = () => {
      if (draggedTask) return;
      onTaskSelect?.(task);
    };
    const categoryName =
      task.category_id && categories.length > 0
        ? categories.find((c) => c.id === task.category_id)?.name
        : undefined;
    const displayCategory = categoryName
      ? categoryName.length > 8
        ? `${categoryName.slice(0, 8)}...`
        : categoryName
      : null;
    const roleName =
      task.role_id && roles.length > 0
        ? roles.find((role) => role.id === task.role_id)?.name
        : undefined;
    const roleBadge = roleName
      ? roleName.length > 5
        ? `${roleName.slice(0, 5)}...`
        : roleName
      : null;
    const draggable = options.draggable ?? true;
    const statusTime =
      options.status === 'done'
        ? task.completed_at
        : options.status === 'cancelled'
        ? task.cancelled_at
        : null;
    const isLateCompleted =
      options.status === 'done' &&
      !!task.completed_at &&
      !!task.due_date &&
      !!toBeijingFromUtc(task.completed_at) &&
      !!toBeijing(task.due_date) &&
      toBeijingFromUtc(task.completed_at)!.isAfter(toBeijing(task.due_date)!);
    const statusTimeLabel =
      options.status === 'done'
        ? statusTime
          ? `完成 ${formatBeijingFromUtc(statusTime)}`
          : '完成时间未记录'
        : options.status === 'cancelled'
        ? statusTime
          ? `取消 ${formatBeijingFromUtc(statusTime)}`
          : '取消时间未记录'
        : task.due_date
        ? `截止 ${formatBeijingTime(task.due_date)}`
        : '无截止时间';
    const showStatusTag = options.showStatusTag && task.status === 'in_progress';
    return (
      <div
        key={task.id}
        draggable={draggable}
        onClick={handleClick}
        onDragStart={draggable ? () => handleDragStart(task, options.status) : undefined}
        style={{
          marginBottom: 8,
          padding: '8px 10px',
          borderRadius: 6,
          backgroundColor: cardColor,
          border: options.isOverdue ? '1px solid #f5b5b5' : '1px solid transparent',
          cursor: draggable ? 'grab' : 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          <span>{task.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {options.showOverdueIcon && (
              <span
                title="已超时"
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 999,
                  backgroundColor: '#ffdede',
                  color: '#d32f2f',
                  border: '1px solid rgba(211,47,47,0.2)',
                }}
              >
                ⏰
              </span>
            )}
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 999,
                backgroundColor: PRIORITY_STYLES[task.priority].background,
                color: PRIORITY_STYLES[task.priority].color,
                border: '1px solid rgba(0,0,0,0.04)',
              }}
            >
              {PRIORITY_STYLES[task.priority].label}
            </span>
          </div>
        </div>
        {displayCategory && (
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
            分类：
            <span title={categoryName}>{displayCategory}</span>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#555',
          }}
        >
          <span>{statusTimeLabel}</span>
          {roleBadge && (
            <span
              title={roleName}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 24,
                height: 22,
                padding: '0 6px',
                borderRadius: 999,
                backgroundColor: '#e6f0ff',
                color: '#1e3a8a',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {roleBadge}
            </span>
          )}
        </div>
        {isLateCompleted && (
          <div style={{ marginTop: 6 }}>
            <span
              title="已超时完成"
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 999,
                backgroundColor: '#ffe5e5',
                color: '#d32f2f',
                border: '1px solid rgba(211,47,47,0.2)',
                fontWeight: 600,
              }}
            >
              超时
            </span>
          </div>
        )}
        {showStatusTag && (
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 999,
                backgroundColor: '#fff3e0',
                color: '#e65100',
                border: '1px solid rgba(230,81,0,0.2)',
                fontWeight: 600,
              }}
            >
              进行中
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="card">
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h2>
      {filters && <div style={{ marginBottom: 12 }}>{filters}</div>}
      {!columns && <div>加载中...</div>}
      {columns && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: leftColumn
              ? 'repeat(5, minmax(0, 1fr))'
              : 'repeat(4, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {leftColumn && (
            <div className="card" style={{ background: '#fafafa' }}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{leftColumn.title}</span>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {leftColumn.tasks?.length ?? 0}
                </span>
              </h3>
              <div
                style={{
                  minHeight: 80,
                  padding: 4,
                  backgroundColor: '#f7f7f7',
                  borderRadius: 6,
                }}
              >
                {leftColumn.loading && <div>加载中...</div>}
                {!leftColumn.loading && leftColumn.tasks.length === 0 && (
                  <div style={{ fontSize: 12, color: '#999', padding: 4 }}>
                    {leftColumn.emptyText ?? '暂无剩余任务'}
                  </div>
                )}
                {!leftColumn.loading &&
                  leftColumn.tasks.map((task) =>
                    renderTaskCard(task, {
                      status: task.status,
                      isOverdue: true,
                      showOverdueIcon: true,
                      draggable: false,
                      showStatusTag: true,
                    }),
                  )}
              </div>
            </div>
          )}
          {STATUSES.map((status) => (
            <div key={status} className="card" style={{ background: '#fafafa' }}>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{statusLabels[status]}</span>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {columns[status]?.length ?? 0}
                </span>
              </h3>
              <div
                onDragOver={allowDrop}
                onDrop={() => handleDrop(status)}
                style={{
                  minHeight: 80,
                  padding: 4,
                  backgroundColor: '#f7f7f7',
                  borderRadius: 6,
                }}
              >
                {(columns[status] ?? []).map((task) => {
                  const isOverdue =
                    (status === 'in_progress' || status === 'todo') &&
                    !!task.due_date &&
                    (() => {
                      const due = toBeijing(task.due_date);
                      return due ? due.isBefore(nowBeijing()) : false;
                    })();
                  const showOverdueIcon = isOverdue && isPastSelection;
                  return renderTaskCard(task, {
                    status,
                    isOverdue,
                    showOverdueIcon,
                    draggable: true,
                  });
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
