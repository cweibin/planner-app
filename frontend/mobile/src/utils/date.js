export function formatDate(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date).replace(/\//g, '-');
}

export function parseDateTime(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasZone = /Z|[+-]\d{2}:?\d{2}$/.test(normalized);
  const withZone = hasZone ? normalized : `${normalized}+08:00`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function parseDateTimeFromUtc(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasZone = /Z|[+-]\d{2}:?\d{2}$/.test(normalized);
  if (!normalized.includes('T')) {
    const date = new Date(`${normalized}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const withZone = hasZone ? normalized : `${normalized}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function isBeijingTimezone() {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) return tz === 'Asia/Shanghai';
  }
  return new Date().getTimezoneOffset() === -480;
}

export function formatBeijingDateTime(value) {
  const date = parseDateTime(value);
  if (!date) return '';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date).replace(/\//g, '-');
}

export function formatBeijingDateTimeFromUtc(value) {
  const date = parseDateTimeFromUtc(value);
  if (!date) return '';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date).replace(/\//g, '-');
}

export function formatBeijingDate(value) {
  const date = parseDateTime(value);
  if (!date) return '';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date).replace(/\//g, '-');
}

export function formatBeijingDateFromUtc(value) {
  const date = parseDateTimeFromUtc(value);
  if (!date) return '';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date).replace(/\//g, '-');
}

export function formatBeijingTime(value) {
  const date = parseDateTime(value);
  if (!date) return '';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

export function formatBeijingTimeFromUtc(value) {
  const date = parseDateTimeFromUtc(value);
  if (!date) return '';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}
