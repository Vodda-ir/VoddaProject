function parseMinutes(value) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || '').trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatMinutes(value) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Backend convention: Saturday=0 … Friday=6. */
export function voddaWeekday(date) {
  return (date.getDay() + 1) % 7;
}

/**
 * Split a teacher work-time range into bookable starts for one calendar date.
 * Slots use the selected service duration and exclude starts less than the
 * configured lead time from now.
 */
export function generateBookingSlots(workTimes, duration, date, now = new Date(), leadMinutes = 5) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return [];
  if (!Number.isInteger(duration) || duration <= 0 || duration > 240) return [];

  const weekday = voddaWeekday(date);
  const minimumStart = now.getTime() + leadMinutes * 60_000;
  const seen = new Set();
  const result = [];

  for (const range of workTimes || []) {
    if (range?.active === false || Number(range?.weekday) !== weekday) continue;
    const from = parseMinutes(range.from);
    const to = parseMinutes(range.to);
    if (from === null || to === null || from >= to) continue;

    for (let minute = from; minute + duration <= to; minute += duration) {
      const start = new Date(date);
      start.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      if (start.getTime() < minimumStart) continue;
      const key = start.toISOString();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        key,
        label: formatMinutes(minute),
        endLabel: formatMinutes(minute + duration),
        start,
      });
    }
  }

  return result.sort((left, right) => left.start.getTime() - right.start.getTime());
}

export function nextCalendarDates(count = 14, now = new Date()) {
  const safeCount = Math.max(1, Math.min(60, Math.trunc(count) || 14));
  return Array.from({ length: safeCount }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
}
