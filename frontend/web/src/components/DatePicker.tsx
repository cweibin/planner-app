import React from 'react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className = '' }) => {
  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`date-picker-container ${className}`}>
      <input
        className="input"
        type="date"
        value={value}
        onChange={handleDateSelect}
        style={{ width: 140, height: 36 }}
      />
    </div>
  );
};
