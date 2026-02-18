import React from 'react';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarViewSwitcherProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export const CalendarViewSwitcher: React.FC<CalendarViewSwitcherProps> = ({ view, onChange }) => {
  const views: { value: ViewMode; label: string }[] = [
    { value: 'day', label: '日' },
    { value: 'week', label: '周' },
    { value: 'month', label: '月' },
  ];

  return (
    <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
      {views.map((v) => (
        <button
          key={v.value}
          type="button"
          onClick={() => onChange(v.value)}
          style={{
            padding: '8px 16px',
            border: 'none',
            backgroundColor: view === v.value ? '#3b82f6' : '#fff',
            color: view === v.value ? '#fff' : '#666',
            fontSize: 13,
            fontWeight: view === v.value ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flex: 1,
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (view !== v.value) {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }
          }}
          onMouseLeave={(e) => {
            if (view !== v.value) {
              e.currentTarget.style.backgroundColor = '#fff';
            }
          }}
        >
          {v.label}视图
        </button>
      ))}
    </div>
  );
};
