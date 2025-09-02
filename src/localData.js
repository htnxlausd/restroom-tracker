import { TEACHERS, slugifyName, laDateKey, startOfWeekMonday, addDays } from './utils';

const STORAGE_KEY = 'rt_state_v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
export function save(state) {
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
  const s = load() || defaultState();
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
  const s = load() || defaultState();
  const list = Object.entries(s.teachers[teacherId]?.students || {}).map(([id, v]) => ({ id, ...v }));
  return list.sort((a,b) => a.name.localeCompare(b.name));
}

export function addStudent(teacherId, name) {
  const s = load() || defaultState();
  const id = slugifyName(name);
  s.teachers[teacherId].students[id] = { name, isOut: false };
  save(s);
}
export function renameStudent(teacherId, id, newName) {
  const s = load() || defaultState();
  if (s.teachers[teacherId].students[id]) {
    s.teachers[teacherId].students[id].name = newName;
    save(s);
  }
}
export function removeStudent(teacherId, id) {
  const s = load() || defaultState();
  delete s.teachers[teacherId].students[id];
  save(s);
}

function upsertLog(log, state) {
  const s = state || load() || defaultState();
  const key = log.dateKey;
  if (!s.logs[key]) s.logs[key] = [];
  s.logs[key].push(log);
  return s;
}

export function watchLogsForDate(teacherId, dateKey, cb) {
  const run = () => {
    const s = load() || defaultState();
    const list = (s.logs[dateKey] || []).filter(l => l.teacherId === teacherId).sort((a,b) => a.timestamp - b.timestamp);
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
  }, s);
  save(s);
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
  }, s);
  save(s);
}

export function deleteLastLogForTeacherToday(teacherId) {
  const s = load() || defaultState();
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

export function fetchMonthLogs(teacherId, year, month /* 0-indexed */) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const s = load() || defaultState();
  const out = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    if ([1,2,3,4,5].includes(d.getDay())) { // Mon–Fri
      const key = laDateKey(d);
      const arr = (s.logs[key] || []).filter(l => l.teacherId === teacherId);
      out.push(...arr);
    }
  }
  out.sort((a,b) => (a.dateKey === b.dateKey ? a.timestamp - b.timestamp : (a.dateKey < b.dateKey ? -1 : 1)));
  return out;
}

export function clearAll() {
  try { localStorage.removeItem(STORAGE_KEY); }
  finally {
    try { window.dispatchEvent(new Event('storage')); } catch {}
  }
}
