import React, { useState } from 'react';

export default function SettingsModal({
  open, onClose, teacher, students,
  onAdd, onRename, onRemove
}) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Manage Students — {teacher?.name ?? '—'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Add student</label>
          <div className="mt-1 flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Full name"
              className="border rounded-lg px-3 py-2 w-full"
            />
            <button
              onClick={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(''); } }}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
              disabled={!newName.trim()}
            >Add</button>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2">Current students</h4>
          <ul className="divide-y max-h-64 overflow-auto">
            {students.map(s => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                {editingId === s.id ? (
                  <input
                    className="border rounded px-2 py-1 w-full"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                  />
                ) : (
                  <span>{s.name}</span>
                )}
                <div className="flex gap-2">
                  {editingId === s.id ? (
                    <>
                      <button
                        onClick={() => { onRename(s.id, editValue); setEditingId(null); }}
                        className="text-green-700"
                      >Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(s.id); setEditValue(s.name); }} className="text-blue-700">Rename</button>
                      <button onClick={() => onRemove(s.id)} className="text-red-700">Remove</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">Close</button>
        </div>
      </div>
    </div>
  );
}
