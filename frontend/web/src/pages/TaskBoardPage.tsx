import React, { useEffect, useState } from 'react';
import { BoardColumns, fetchBoardTasks, Task, TaskStatus, updateTaskStatus } from '../services/tasks';
import { formatBeijing } from '../utils/time';

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

export const TaskBoardPage: React.FC = () => {
  const [columns, setColumns] = useState<BoardColumns | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ task: Task; from: TaskStatus } | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchBoardTasks({});
      setColumns(data);
    };
    void load();
  }, []);

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
    // 乐观更新 UI
    const next: BoardColumns = {
      todo: [...columns.todo],
      in_progress: [...columns.in_progress],
      done: [...columns.done],
      cancelled: [...columns.cancelled],
    };
    next[from] = next[from].filter((t) => t.id !== task.id);
    next[status] = [{ ...task, status }, ...next[status]];
    setColumns(next);
    setDraggedTask(null);

    try {
      await updateTaskStatus(task.id, status);
    } catch {
      // 若失败，可考虑重新加载；这里暂时忽略
    }
  };

  const allowDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  if (!columns) {
    return <div>加载中...</div>;
  }

  const formatBeijingTime = (value?: string | null) => formatBeijing(value);

  return (
    <div>
      <h1 className="page-title">任务看板</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {STATUSES.map((status) => (
          <div key={status} className="card">
            <h2
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 14,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{STATUS_LABEL[status]}</span>
              <span style={{ fontSize: 12, color: '#666' }}>
                {columns[status]?.length ?? 0}
              </span>
            </h2>
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
              {(columns[status] ?? []).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task, status)}
                  style={{
                    marginBottom: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    backgroundColor: STATUS_COLOR[status],
                    cursor: 'grab',
                  }}
                >
                  <div style={{ fontSize: 13, marginBottom: 4 }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>
                    {task.due_date ? `截止 ${formatBeijingTime(task.due_date)}` : '无截止时间'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
