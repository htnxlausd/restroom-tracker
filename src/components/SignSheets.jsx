import React from 'react';

function TeacherSheet({ title, students }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="divide-y">
        {students.map(s => (
          <li key={s.id} className="flex items-center justify-between py-2">
            <span>{s.name}</span>
            <span className={`text-xs px-2 py-1 rounded-full border ${s.isOut ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
              {s.isOut ? 'Out' : 'In'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SignSheets({ lizetteStudents, yadiraStudents }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TeacherSheet title="Sign Sheet — Lizette Lozano" students={lizetteStudents} />
      <TeacherSheet title="Sign Sheet — Yadira Reina" students={yadiraStudents} />
    </div>
  )
}
