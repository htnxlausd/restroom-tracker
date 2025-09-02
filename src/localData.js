import { TEACHERS, slugifyName, laDateKey, startOfWeekMonday, addDays } from './utils';

const STORAGE_KEY = 'rt_state_v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notify();
}

function defaultState() {
  const s = { teachers: {}, logs: {} };
  for (const t of TEACHERS) {
    s.teachers[t.id] = { name: t.name, students: {} };
  }
  return s;
}

export function ensureSeedData() {
  const s = state || load() || defaultState();
  const seed = {
    'lizette-lozano': [
      'Abner M.','Alexia P.','Angel C.','Carter W.','Emaily C.','Genesis P.','Jonathan E.'
    ],
    'yadira-reina': [
      'Sofia A.','Issac G.','Marisa P.','Ariana R.','Alondra C.','Thanh D.','Maya F.','Samuel S.','Abner M.','Angel C.'
    ]
  };
  for (const tid in seed) {
    for (const name of seed[tid]) {
      const id = slugifyName(name);
      if (!s.teachers[tid].students[id]) {
        s.teachers[tid].students[id] = { name, isOut: false };
      }
    }
  }
  save(s);
}

const listeners = new Set();
function notify() { listeners.forEach(cb => cb()); }
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) notify();
});
export function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }

export function getStudents(teacherId) {
  const s = state || load() || defaultState();
  const list = Object.entries(s.teachers[teacherId]?.students || {}).map(([id, v]) => ({ id, ...v }));
  return list.sort((a,b) => a.name.localeCompare(b.name));
}

export function addStudent(teacherId, name) {
  const s = state || load() || defaultState();
  const id = slugifyName(name);
  s.teachers[teacherId].students[id] = { name, isOut: false };
  save(s);
}
export function renameStudent(teacherId, id, newName) {
  const s = state || load() || defaultState();
  if (s.teachers[teacherId].students[id]) {
    s.teachers[teacherId].students[id].name = newName;
    save(s);
  }
}
export function removeStudent(teacherId, id) {
  const s = state || load() || defaultState();
  delete s.teachers[teacherId].students[id];
  save(s);
}

function upsertLog(log, state) {
  const s = state || load() || defaultState();
  const key = log.dateKey;
  if (!s.logs[key]) s.logs[key] = [];
  s.logs[key].push(log);
  save(s);
}

export function watchTodayLogs(teacherId, cb) {
  const run = () => {
    const s = state || load() || defaultState();
    const key = laDateKey(new Date());
    const list = (s.logs[key] || []).filter(l => l.teacherId === teacherId).sort((a,b) => a.timestamp - b.timestamp);
    cb(list);
  };
  run();
  const unsub = subscribe(run);
  return () => unsub && unsub();
}

export function signOut(teacher, student) {
    if (!teacher || !student) throw new Error('Select a teacher and student first.');
    const s = load() || defaultState();
    const stu = s.teachers[teacher.id].students[student.id];
    if (!stu) throw new Error('Student not found.');
    if (stu.isOut) return;
    stu.isOut = true;
    upsertLog({
    id: crypto.randomUUID(),
    teacherId: teacher.id,
    teacherName: teacher.name,
    studentId: student.id,
    studentName: stu.name,
    type: 'out',
    timestamp: Date.now(),
    dateKey: laDateKey(new Date()),
  });
}

export function signIn(teacher, student) {
    if (!teacher || !student) throw new Error('Select a teacher and student first.');
    const s = load() || defaultState();
    const stu = s.teachers[teacher.id].students[student.id];
    if (!stu) throw new Error('Student not found.');
    if (!stu.isOut) return;
    stu.isOut = false;
    upsertLog({
    id: crypto.randomUUID(),
    teacherId: teacher.id,
    teacherName: teacher.name,
    studentId: student.id,
    studentName: stu.name,
    type: 'in',
    timestamp: Date.now(),
    dateKey: laDateKey(new Date()),
  });
}

export function deleteLastLogForTeacherToday(teacherId) {
  const s = state || load() || defaultState();
  const key = laDateKey(new Date());
  const list = (s.logs[key] || []).filter(l => l.teacherId === teacherId).sort((a,b) => a.timestamp - b.timestamp);
  if (list.length === 0) return false;
  const last = list[list.length - 1];
  s.logs[key] = (s.logs[key] || []).filter(l => l.id !== last.id);
  const studentLogs = (s.logs[key] || []).filter(l => l.teacherId === teacherId && l.studentId === last.studentId).sort((a,b) => a.timestamp - b.timestamp);
  const stu = s.teachers[teacherId].students[last.studentId];
  if (stu) {
    if (studentLogs.length === 0) stu.isOut = false;
    else stu.isOut = studentLogs[studentLogs.length - 1].type === 'out';
  }
  save(s);
  return true;
}

export function resetAllStatusesAtMidnightIfNeeded() {
  const s = state || load() || defaultState();
  for (const tid of Object.keys(s.teachers)) {
    const students = s.teachers[tid].students;
    for (const sid of Object.keys(students)) {
      students[sid].isOut = false;
    }
  }
  save(s);
}

export function fetchWeekLogs(teacherId, anyDateInWeek = new Date()) {
  const monday = startOfWeekMonday(anyDateInWeek);
  const keys = Array.from({ length: 5 }).map((_, i) => {
    const d = addDays(monday, i);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  });
  const s = state || load() || defaultState();
  const rows = [];
  for (const k of keys) {
    const arr = (s.logs[k] || []).filter(l => l.teacherId === teacherId).sort((a,b) => a.timestamp - b.timestamp);
    rows.push(...arr);
  }
  return rows;
}


export function clearAll() {
  // Remove all app data and notify subscribers
  try {
    localStorage.removeItem('rt_state_v1');
  } finally {
    const ev = new Event('storage');
    // Trigger listeners (some browsers ignore manual storage events)
    try { window.dispatchEvent(ev); } catch { /* noop */ }
  }
}

export function watchLogsForDate(teacherId, dateKey, cb) {
  const run = () => {
    const s = state || load() || defaultState();
    const list = (s.logs[dateKey] || []).filter(l => l.teacherId === teacherId).sort((a,b) => a.timestamp - b.timestamp);
    cb(list);
  };
  run();
  const unsub = subscribe(run);
  return () => unsub && unsub();
}

export function fetchMonthLogs(teacherId, year, month /* 0-indexed */) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const s = state || load() || defaultState();
  const out = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    if ([1,2,3,4,5].includes(d.getDay())) { // Mon–Fri (Mon=1 ... Fri=5)
      const key = laDateKey(d);
      const arr = (s.logs[key] || []).filter(l => l.teacherId === teacherId);
      out.push(...arr);
    }
  }
  // sort by dateKey then timestamp
  out.sort((a,b) => (a.dateKey === b.dateKey ? a.timestamp - b.timestamp : (a.dateKey < b.dateKey ? -1 : 1)));
  return out;
}
