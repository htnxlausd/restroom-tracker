import React, { useEffect, useMemo, useState } from 'react';
import './index.css';
import TeacherStudentSelect from './components/TeacherStudentSelect';
import ActivityLog from './components/ActivityLog';
import SignSheets from './components/SignSheets';
import SettingsModal from './components/SettingsModal';
import { TEACHERS } from './utils';
import {
  ensureSeedData, getStudents, subscribe, watchTodayLogs,
  addStudent, renameStudent, removeStudent,
  signIn, signOut, deleteLastLogForTeacherToday,
  resetAllStatusesAtMidnightIfNeeded, fetchWeekLogs
} from './localData';
import { generateWeekPdf } from './pdf';

export default function App() {
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const selectedTeacher = useMemo(() => TEACHERS.find(t => t.id === selectedTeacherId), [selectedTeacherId]);

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [lizetteStudents, setLizetteStudents] = useState([]);
  const [yadiraStudents, setYadiraStudents] = useState([]);

  const [logs, setLogs] = useState([]);
  const [viewType, setViewType] = useState('out');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    ensureSeedData();
    const refreshSheets = () => {
      setLizetteStudents(getStudents('lizette-lozano'));
      setYadiraStudents(getStudents('yadira-reina'));
    };
    refreshSheets();
    const unsub = subscribe(refreshSheets);
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) {
      setStudents([]); setSelectedStudentId(''); setLogs([]);
      return;
    }
    setSelectedStudentId('');
    setStudents(getStudents(selectedTeacherId));
    const unsub = watchLogsForDate(selectedTeacherId, activeDateKey, setLogs);
    const unsub2 = subscribe(() => setStudents(getStudents(selectedTeacherId)));
    return () => { unsub && unsub(); unsub2 && unsub2(); };
  }, [selectedTeacherId, activeDateKey]);

  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const canOut = !!(selectedTeacher && selectedStudent && !selectedStudent.isOut);
  const canIn = !!(selectedTeacher && selectedStudent && selectedStudent.isOut);

  function handleOut() {
    setErrorMsg('');
    try { if (canOut) signOut(selectedTeacher, selectedStudent); }
    catch (e) { setErrorMsg(e?.message || 'Failed to sign OUT.'); }
  }
  function handleIn() {
    setErrorMsg('');
    try { if (canIn) signIn(selectedTeacher, selectedStudent); }
    catch (e) { setErrorMsg(e?.message || 'Failed to sign IN.'); }
  }
  function handleDeleteLast() {
    if (!selectedTeacherId) return;
    try { deleteLastLogForTeacherToday(selectedTeacherId); }
    catch (e) { setErrorMsg('Failed to delete last log.'); }
  }
  function handleClear() {
      if (confirm('This will clear all data on this device (students, statuses, and logs). Continue?')) {
        clearAll();
        ensureSeedData(); // re-seed default rosters after clearing
        setSelectedTeacherId('');
        setSelectedStudentId('');
        setLogs([]);
        setLizetteStudents(getStudents('lizette-lozano'));
        setYadiraStudents(getStudents('yadira-reina'));
      }
    }

    function handleDownload(teacher) {
    const logs = fetchWeekLogs(teacher.id, new Date());
    const doc = generateWeekPdf(teacher.name, logs, new Date());
    doc.save(`${teacher.name.replace(/\s+/g,'_')}_Restroom_Tracker_Week.pdf`);
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white sticky top-0 z-10 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Restroom Tracker | Taft DHH</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <TeacherStudentSelect
            selectedTeacherId={selectedTeacherId}
            onTeacherChange={setSelectedTeacherId}
            students={students}
            selectedStudentId={selectedStudentId}
            onStudentChange={setSelectedStudentId}
          />

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-2">
              {errorMsg}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleOut}
              className={`px-4 py-2 rounded-lg text-white ${canOut ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
              disabled={!canOut}
            >
              Out
            </button>
            <button
              onClick={handleIn}
              className={`px-4 py-2 rounded-lg text-white ${canIn ? 'bg-green-600 hover:bg-green-700' : 'bg-green-300 cursor-not-allowed'}`}
              disabled={!canIn}
            >
              In
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="order-2 lg:order-1">
            <SignSheets
              lizetteStudents={lizetteStudents}
              yadiraStudents={yadiraStudents}
            />
          </div>

          <div className="order-1 lg:order-2 space-y-4">
            <ActivityLog
              teacherName={selectedTeacher?.name}
              logs={logs}
              viewType={viewType}
              setViewType={setViewType}
              onDeleteLast={handleDeleteLast}
            />
            <div className="flex justify-end">
              <button
                onClick={() => setSettingsOpen(true)}
                className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-2"
                title="Manage Students"
              >
                <span>⚙️</span> Settings
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
              <h3 className="font-semibold mb-3">Download Weekly PDFs (Mon–Fri)</h3>
              <div className="flex flex-wrap gap-3">
                {TEACHERS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleDownload(t)}
                    className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    Download — {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          teacher={selectedTeacher}
          students={students}
          onAdd={(name) => addStudent(selectedTeacherId, name)}
          onRename={(id, newName) => renameStudent(selectedTeacherId, id, newName)}
          onRemove={(id) => removeStudent(selectedTeacherId, id)}
        />
      </main>

      <footer className="text-center text-xs text-gray-500 py-6">
        Local storage version (no cloud sync).
      </footer>
    </div>
  );
}
