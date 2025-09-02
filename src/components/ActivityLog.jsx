import React from 'react';
import { formatDate, formatTime } from '../utils';

export default function ActivityLog({
  teacherName,
  logs, viewType, setViewType,
  onDeleteLast
}) {
  const filtered = logs.filter(l => l.type === viewType);
  const isLastId = logs.length ? logs[logs.length - 1].id : null;
  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Activity Log — {teacherName || '—'}</h2>
          <p className="text-xs text-gray-500">Showing entries for today</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('out')}
            className={`px-3 py-1.5 rounded-lg border text-sm ${viewType==='out' ? 'bg-red-600 text-white border-red-600' : 'border-red-300 text-red-600'}`}
          >
            Out
          </button>
          <button
            onClick={() => setViewType('in')}
            className={`px-3 py-1.5 rounded-lg border text-sm ${viewType==='in' ? 'bg-green-600 text-white border-green-600' : 'border-green-300 text-green-600'}`}
          >
            In
          </button>
        </div>
      </div>

      <ol className="mt-4 space-y-2 list-decimal list-inside">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500">No entries yet.</p>
        )}
        {filtered.map((l) => {
          const isLast = l.id === isLastId;
          return (
            <li key={l.id} className="flex items-center justify-between gap-2 border-b pb-2">
              <div>
                <div className="font-medium">{l.studentName}</div>
                <div className="text-xs text-gray-500">{formatDate(l.timestamp)} • {formatTime(l.timestamp)}</div>
              </div>
              {isLast && (
                <button
                  onClick={onDeleteLast}
                  title="Remove last log"
                  className="text-red-600 hover:text-red-700"
                  aria-label="Remove last log"
                >
                  ✖
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
