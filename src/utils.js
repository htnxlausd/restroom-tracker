import { format } from 'date-fns'

export const TEACHERS = [
  { id: 'lizette-lozano', name: 'Lizette Lozano' },
  { id: 'yadira-reina', name: 'Yadira Reina' },
];

export function slugifyName(n) {
  return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function laDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfWeekMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

export function addDays(d, days) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function weekDaysMondayToFriday(anyDate = new Date()) {
  const start = startOfWeekMonday(anyDate);
  return Array.from({ length: 5 }).map((_, i) => {
    const d = addDays(start, i);
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });
    return { date: d, key: laDateKey(d), label };
  });
}

export function formatTime(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return format(d, 'h:mm:ss a');
}
export function formatDate(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return format(d, 'EEE, MMM d');
}
