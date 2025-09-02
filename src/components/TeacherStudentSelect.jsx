import React from 'react';
import { TEACHERS } from '../utils';

export default function TeacherStudentSelect({
  selectedTeacherId, onTeacherChange,
  students, selectedStudentId, onStudentChange
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">Teacher</label>
        <select
          value={selectedTeacherId || ''}
          onChange={(e) => onTeacherChange(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring w-full"
        >
          <option value="" disabled>Select teacher…</option>
          {TEACHERS.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1">Student</label>
        <select
          value={selectedStudentId || ''}
          onChange={(e) => onStudentChange(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring w-full"
          disabled={!selectedTeacherId}
        >
          <option value="" disabled>{selectedTeacherId ? 'Select student…' : 'Select a teacher first'}</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
