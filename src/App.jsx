import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Settings } from "lucide-react";
import jsPDF from "jspdf";
import logo from "./school_logo.png"; // Place this file in src/

export default function App() {
  // ===== Config =====
  const PIN_CODE = "2022"; // PIN for managing students
  const START_H = 8, START_M = 30; // for PDF export window
  const END_H = 15, END_M = 35;    // for PDF export window
  const PACIFIC_TZ = "America/Los_Angeles"; // daily reset reference

  // ===== Teachers & Students (persisted) =====
  const [teachers, setTeachers] = useState(() => {
    const saved = localStorage.getItem("rt_teachers");
    return saved
      ? JSON.parse(saved)
      : {
          "Lizette Lozano": ["Alice", "Ben", "Charlie"],
          "Yadira Reina": ["Diana", "Ethan", "Frank"],
        };
  });

  // ===== Selections =====
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  // ===== Active OUT map (who is currently out) =====
  const [active, setActive] = useState(() => {
    const saved = localStorage.getItem("rt_active");
    return saved ? JSON.parse(saved) : {};
  });

  // ===== Activity logs (persisted; oldest → latest) =====
  // Each log: { id, teacher, name, action: 'OUT'|'IN', time: localized, ts: Date }
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem("rt_logs");
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map(l => ({
        ...l,
        ts: l.ts ? new Date(l.ts) : new Date(),
        id: l.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      }));
    } catch {
      return [];
    }
  });

  // ===== Persist important state =====
  useEffect(() => localStorage.setItem("rt_teachers", JSON.stringify(teachers)), [teachers]);
  useEffect(() => localStorage.setItem("rt_active", JSON.stringify(active)), [active]);
  useEffect(() => {
    localStorage.setItem(
      "rt_logs",
      JSON.stringify(logs.map(l => ({ ...l, ts: l.ts instanceof Date ? l.ts.toISOString() : l.ts })))
    );
  }, [logs]);

  // ===== Daily clear at 11:59 PM Pacific Time =====
  const getPacificParts = (d = new Date()) => {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: PACIFIC_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "shortOffset",
    });
    const parts = fmt.formatToParts(d);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    let offset = "-08:00";
    if (map.timeZoneName && map.timeZoneName.startsWith("GMT")) {
      const m = map.timeZoneName.match(/GMT([+-]\\d{1,2})(?::?(\\d{2}))?/);
      if (m) {
        const hh = (m[1].length === 2 ? m[1] : (m[1][0] + m[1][1].padStart(2, "0")));
        const mm = m[2] || "00";
        offset = `${hh}:${mm}`;
      }
    }
    return { y: map.year, M: map.month, d: map.day, offset };
  };

  const pacificDateAt = (base = new Date(), hh = 23, mm = 59, ss = 0) => {
    const p = getPacificParts(base);
    const iso = `${p.y}-${p.M}-${p.d}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}${p.offset}`;
    return new Date(iso);
  };

  const getLastResetBoundary = (now = new Date()) => {
    const today2359 = pacificDateAt(now, 23, 59, 0);
    if (now >= today2359) return today2359;
    const yest = new Date(now); yest.setDate(yest.getDate() - 1);
    return pacificDateAt(yest, 23, 59, 0);
  };

  const getNextResetBoundary = (now = new Date()) => {
    const today2359 = pacificDateAt(now, 23, 59, 0);
    if (now < today2359) return today2359;
    const tom = new Date(now); tom.setDate(tom.getDate() + 1);
    return pacificDateAt(tom, 23, 59, 0);
  };

  useEffect(() => {
    const lastResetIso = localStorage.getItem("rt_last_reset");
    const lastReset = lastResetIso ? new Date(lastResetIso).getTime() : 0;
    const lastBoundary = getLastResetBoundary().getTime();

    if (lastReset < lastBoundary) {
      setLogs([]);
      setActive({});
      localStorage.setItem("rt_last_reset", new Date().toISOString());
    }

    const nextBoundary = getNextResetBoundary();
    const ms = Math.max(0, nextBoundary.getTime() - Date.now());
    const timer = setTimeout(() => {
      setLogs([]);
      setActive({});
      localStorage.setItem("rt_last_reset", new Date().toISOString());
    }, ms);
    return () => clearTimeout(timer);
  }, []);

  // ===== Helpers =====
  const isTodayLocal = (d) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };

  // ===== Actions =====
  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const canOut = !!selectedTeacher && !!selectedStudent && !active[selectedStudent];
  const canIn = !!selectedTeacher && !!selectedStudent && !!active[selectedStudent];

  const handleSignOut = () => {
    if (!selectedTeacher || !selectedStudent || active[selectedStudent]) return;
    const ts = new Date();
    const entry = { id: makeId(), teacher: selectedTeacher, name: selectedStudent, action: "OUT", time: ts.toLocaleTimeString(), ts };
    setActive({ ...active, [selectedStudent]: entry.time });
    setLogs((prev) => [...prev, entry]);
  };

  const handleSignIn = () => {
    if (!selectedTeacher || !selectedStudent || !active[selectedStudent]) return;
    const ts = new Date();
    const entry = { id: makeId(), teacher: selectedTeacher, name: selectedStudent, action: "IN", time: ts.toLocaleTimeString(), ts };
    const nextActive = { ...active }; delete nextActive[selectedStudent];
    setActive(nextActive);
    setLogs((prev) => [...prev, entry]);
  };

  // ===== PDF per teacher (filtered to today's 8:30–3:35) =====
  const START_MINS = START_H * 60 + START_M;
  const END_MINS = END_H * 60 + END_M;
  const inWindowLocal = (d) => {
    const m = d.getHours() * 60 + d.getMinutes();
    return m >= START_MINS && m < END_MINS;
  };

  const handleDownloadPDF = (teacher) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${teacher} Restroom Activity Log`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Entries from today between 8:30 AM and 3:35 PM`, 20, 28);

    const list = logs.filter(l => l.teacher === teacher && l.ts && isTodayLocal(l.ts) && inWindowLocal(l.ts));
    if (list.length === 0) {
      doc.text("No activity logged yet.", 20, 44);
    } else {
      let y = 44;
      list.forEach((log, i) => {
        const line = `${i + 1}. ${log.name} - ${log.action} at ${log.time}`;
        doc.text(line, 20, y);
        y += 8;
        if (y > 280) { doc.addPage(); y = 20; }
      });
    }
    doc.save(`${teacher.replace(/ /g, "_")}_restroom_log_today.pdf`);
  };

  // ===== Manage Students (Add / Edit / Delete, each requires PIN) =====
  const [newStudent, setNewStudent] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null); // original name being edited
  const [editValue, setEditValue] = useState("");

  const promptPin = () => {
    const entered = prompt("Enter 4-digit PIN:");
    return entered === PIN_CODE;
  };

  const addStudent = () => {
    if (!selectedTeacher || !newStudent.trim()) return;
    if (!promptPin()) return alert("Incorrect PIN.");
    const name = newStudent.trim();
    if (teachers[selectedTeacher].includes(name)) return alert("That name already exists.");
    setTeachers({ ...teachers, [selectedTeacher]: [...teachers[selectedTeacher], name] });
    setNewStudent("");
  };

  const removeStudent = (student) => {
    if (!selectedTeacher) return;
    if (!promptPin()) return alert("Incorrect PIN.");
    setTeachers({ ...teachers, [selectedTeacher]: teachers[selectedTeacher].filter(s => s !== student) });
    if (selectedStudent === student) setSelectedStudent("");
    // If student is currently OUT, remove from active
    if (active[student]) {
      const nextActive = { ...active };
      delete nextActive[student];
      setActive(nextActive);
    }
  };

  const startEditStudent = (student) => {
    setEditingStudent(student);
    setEditValue(student);
  };

  const cancelEditStudent = () => {
    setEditingStudent(null);
    setEditValue("");
  };

  const saveEditStudent = () => {
    if (!selectedTeacher || !editingStudent) return;
    const trimmed = editValue.trim();
    if (!trimmed) return alert("Name cannot be empty.");
    if (trimmed === editingStudent) return cancelEditStudent();
    if (teachers[selectedTeacher].includes(trimmed)) return alert("That name already exists.");
    if (!promptPin()) return alert("Incorrect PIN.");

    // Update teachers list
    const updatedList = teachers[selectedTeacher].map(s => (s === editingStudent ? trimmed : s));
    setTeachers({ ...teachers, [selectedTeacher]: updatedList });

    // Update active map key if needed
    if (active[editingStudent]) {
      const nextActive = { ...active };
      nextActive[trimmed] = nextActive[editingStudent];
      delete nextActive[editingStudent];
      setActive(nextActive);
    }

    // Update logs for this teacher where name matches
    setLogs(prev =>
      prev.map(l => (l.teacher === selectedTeacher && l.name === editingStudent ? { ...l, name: trimmed } : l))
    );

    // Update selection if currently selected
    if (selectedStudent === editingStudent) setSelectedStudent(trimmed);

    cancelEditStudent();
  };

  // ===== Derived: SHOW ONLY TODAY'S LOGS (no hour filter) =====
  const logsByTeacherToday = useMemo(() => {
    const grouped = { "Lizette Lozano": [], "Yadira Reina": [] };
    logs.forEach((l) => {
      if (!l.ts) return;
      const d = l.ts instanceof Date ? l.ts : new Date(l.ts);
      if (isTodayLocal(d)) {
        if (!grouped[l.teacher]) grouped[l.teacher] = [];
        grouped[l.teacher].push(l);
      }
    });
    return grouped;
  }, [logs]);

  const renderTeacherLogs = (teacher) => {
    const list = logsByTeacherToday[teacher] || [];
    if (list.length === 0) return <p className="text-gray-500">No activity logged yet</p>;
    return (
      <div className="space-y-2">
        {list.map((log, idx) => (
          <div key={log.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
            <span className="font-semibold w-8">{idx + 1}.</span>
            <span className="flex-1">{log.name}</span>
            <span className={log.action === "OUT" ? "text-red-600 font-medium" : "text-green-600 font-medium"}>{log.action}</span>
            <span className="text-gray-500 text-sm w-28 text-right">{log.time}</span>
          </div>
        ))}
      </div>
    );
  };

  const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex flex-col items-center mb-6">
        <img src={logo} alt="School Logo" className="w-32 h-auto mb-2 max-w-full" />
        <h1 className="text-2xl md:text-3xl font-bold text-center">🚻 Restroom Tracker | Taft DHH</h1>
        <p className="text-lg font-semibold text-gray-700 text-center">{todayDate}</p>
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
        {/* Left: Controls */}
        <Card className="shadow">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-3">Select</h2>

            {/* Teacher */}
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Teacher</label>
              <select
                className="w-full border rounded p-2"
                value={selectedTeacher}
                onChange={(e) => { setSelectedTeacher(e.target.value); setSelectedStudent(""); }}
              >
                <option value="">-- Teacher --</option>
                {Object.keys(teachers).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Student */}
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">Student</label>
              <select
                className="w-full border rounded p-2"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={!selectedTeacher}
              >
                <option value="">-- Student --</option>
                {selectedTeacher && teachers[selectedTeacher].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Add student (PIN) */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add new student"
                value={newStudent}
                onChange={(e) => setNewStudent(e.target.value)}
                className="flex-1 border rounded p-2"
              />
              <Button onClick={addStudent} className="bg-blue-500 hover:bg-blue-600">Add</Button>
            </div>

            {/* Out / In */}
            <div className="flex gap-2">
              <Button onClick={handleSignOut} disabled={!canOut} className={`w-1/2 ${canOut ? "bg-red-500 hover:bg-red-600" : "bg-red-300 cursor-not-allowed"}`}>Out</Button>
              <Button onClick={handleSignIn} disabled={!canIn} className={`w-1/2 ${canIn ? "bg-green-500 hover:bg-green-600" : "bg-green-300 cursor-not-allowed"}`}>In</Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Activity Log */}
        <Card className="shadow relative">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-semibold">Activity Log</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">Showing all entries for <strong>today</strong>. Logs clear automatically at <strong>11:59 PM Pacific</strong>.</p>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Lizette Lozano</h3>
                  <Button onClick={() => handleDownloadPDF("Lizette Lozano")} className="bg-gray-300 hover:bg-gray-400 text-sm">Download PDF</Button>
                </div>
                {renderTeacherLogs("Lizette Lozano")}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Yadira Reina</h3>
                  <Button onClick={() => handleDownloadPDF("Yadira Reina")} className="bg-gray-300 hover:bg-gray-400 text-sm">Download PDF</Button>
                </div>
                {renderTeacherLogs("Yadira Reina")}
              </div>
            </div>

            {/* Manage Students toggle */}
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Manage Students {selectedTeacher ? `(${selectedTeacher})` : ""}</h3>
                <Button onClick={() => setShowManage(v => !v)} className="bg-gray-500 hover:bg-gray-600 rounded-full p-2">
                  <Settings className="h-5 w-5 text-white" />
                </Button>
              </div>

              {showManage && selectedTeacher && (
                <div className="mt-2 space-y-1">
                  {teachers[selectedTeacher].map((student) => (
                    <div key={student} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      {editingStudent === student ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            className="border rounded p-1 flex-1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Edit name"
                          />
                          <Button onClick={saveEditStudent} className="bg-green-500 hover:bg-green-600 text-xs px-2 py-1">
                            Save
                          </Button>
                          <Button onClick={cancelEditStudent} className="bg-gray-300 hover:bg-gray-400 text-xs px-2 py-1">
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1">{student}</span>
                          <div className="flex items-center gap-2">
                            <Button onClick={() => startEditStudent(student)} className="bg-amber-400 hover:bg-amber-500 text-xs px-2 py-1">
                              Edit
                            </Button>
                            <Button onClick={() => removeStudent(student)} className="bg-red-400 hover:bg-red-500 text-xs px-2 py-1">
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showManage && !selectedTeacher && (
                <p className="text-xs text-gray-500 mt-2">Select a teacher above to manage students.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
