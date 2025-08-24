import logo from './school_logo.png';
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { X as XIcon } from "lucide-react";
import { db } from './firebase';

/**
 * Password gate (client-side)
 */
function Gate({ children }) {
  // sha256('taftdhh2025')
  const PAGE_PASSWORD_HASH = "fc4ec433f9f79454a7e4588eff2d3ff9e3a1f062af1dd806a06e8d839387b386";
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    const ok = sessionStorage.getItem("rt_gate_ok") === "1";
    setUnlocked(ok);
  }, []);

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleUnlock(e) {
    e.preventDefault();
    const h = await sha256(input);
    if (h === PAGE_PASSWORD_HASH) {
      sessionStorage.setItem("rt_gate_ok", "1");
      setUnlocked(true);
    } else {
      alert("Incorrect password.");
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-semibold text-center">Enter Password</h1>
          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              className="w-full border rounded p-2"
              placeholder="Password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full bg-black text-white rounded p-2">Unlock</button>
          </form>
          <p className="text-xs text-gray-500 text-center">Protected access</p>
        </div>
      </div>
    );
  }

  return children;
}

// Lazy-load Firestore APIs when needed (helps keep initial bundle small)
async function loadFirestore() {
  return await import('firebase/firestore');
}

export default function App() {
  const PIN_CODE = "2022";

  const [teachers, setTeachers] = useState({
    "Lizette Lozano": ["Abner M.", "Alexia P.", "Angel C.", "Carter W.", "Emaily C.", "Genesis P.", "Jonathan E."],
    "Yadira Reina": ["Sofia A.", "Issac G.", "Marisa P.", "Ariana R.", "Alondra C.", "Thanh D.", "Maya F.", "Samuel S.", "Abner M.", "Angel C."]
  });

  // active: { [studentName]: timeSignedOut }
  const [active, setActive] = useState({});
  const [logs, setLogs] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [newStudent, setNewStudent] = useState("");

  // === Pacific Time helpers and daily auto-clear ===
  function pacificDateString() {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date());
  }

  function pacificDateKey() {
    // Key like 2025-08-22 in Pacific time
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    return `${y}-${m}-${d}`;
  }

  // Week range (Mon–Fri) string in Pacific Time, uses en-dash
  function weekRangePacificString() {
    const now = new Date();
    const dowStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(now);
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = map[dowStr.slice(0, 3)];
    const daysFromMonday = (dow + 6) % 7; // 0 if Mon, 6 if Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const fmtMonth = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'long' });
    const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', day: 'numeric' });
    const fmtYear = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric' });

    const mMonth = fmtMonth.format(monday);
    const fMonth = fmtMonth.format(friday);
    const mDay = fmtDay.format(monday);
    const fDay = fmtDay.format(friday);
    const mYear = fmtYear.format(monday);
    const fYear = fmtYear.format(friday);

    if (mYear === fYear) {
      if (mMonth === fMonth) {
        return `${mMonth} ${mDay}–${fDay}, ${mYear}`;
      } else {
        return `${mMonth} ${mDay}–${fMonth} ${fDay}, ${mYear}`;
      }
    } else {
      return `${mMonth} ${mDay}, ${mYear}–${fMonth} ${fDay}, ${fYear}`;
    }
  }

  const [todayPacific, setTodayPacific] = useState(pacificDateString());

  useEffect(() => {
    // Clear logs/active if the stored Pacific date key differs from today
    const key = pacificDateKey();
    const stored = localStorage.getItem('rt_pacific_date');
    if (stored !== key) {
      // Optional: also delete Firestore docs from previous day so everyone's views reset together
      (async () => {
        try {
          if (stored) {
            const { collection, query, where, getDocs, deleteDoc } = await loadFirestore();
            const qDel = query(collection(db,'rt_logs'), where('dateKey','==', stored));
            const snap = await getDocs(qDel);
            for (const d of snap.docs) await deleteDoc(d.ref);
          }
        } catch (e) {
          console.warn('Cleanup failed', e);
        }
      })();
      setLogs([]);
      setActive({});
      localStorage.setItem('rt_pacific_date', key);
    }
    setTodayPacific(pacificDateString());
    // Poll every minute to detect day change in PT and clear automatically
    const id = setInterval(() => {
      const k = pacificDateKey();
      const s = localStorage.getItem('rt_pacific_date');
      if (k !== s) {
        setLogs([]);
        setActive({});
        localStorage.setItem('rt_pacific_date', k);
        setTodayPacific(pacificDateString());
      }
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Sync logs from Firestore (today only) and compute 'active'
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { collection, query, where, orderBy, onSnapshot } = await loadFirestore();
      const key = pacificDateKey();
      const q = query(
        collection(db, 'rt_logs'),
        where('dateKey', '==', key),
        orderBy('ts', 'asc')
      );
      unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const formatted = docs.map(d => ({
          id: d.id,
          teacher: d.teacher,
          name: d.name,
          action: d.action,
          time: d.ts && d.ts.toDate ? new Date(d.ts.toDate()).toLocaleTimeString() : new Date().toLocaleTimeString()
        }));
        setLogs(formatted);
        const act = {};
        formatted.forEach(l => {
          if (l.action === 'OUT') act[l.name] = l.time;
          else if (l.action === 'IN') delete act[l.name];
        });
        setActive(act);
      });
    })();
    return () => unsub();
  }, [todayPacific]);

  // Helpers
  const promptPin = () => {
    const entered = window.prompt("Enter PIN");
    return entered === PIN_CODE;
  };

  const canSignOut =
    selectedTeacher &&
    selectedStudent &&
    !active[selectedStudent] &&
    teachers[selectedTeacher]?.includes(selectedStudent);

  const canSignIn =
    selectedTeacher &&
    selectedStudent &&
    !!active[selectedStudent] &&
    teachers[selectedTeacher]?.includes(selectedStudent);

  // Actions (write to Firestore)
  const handleSignOut = async () => {
    if (!canSignOut) return;
    const { addDoc, collection, serverTimestamp } = await loadFirestore();
    await addDoc(collection(db, 'rt_logs'), {
      dateKey: pacificDateKey(),
      teacher: selectedTeacher,
      name: selectedStudent,
      action: 'OUT',
      ts: serverTimestamp()
    });
  };

  const handleSignIn = async () => {
    if (!canSignIn) return;
    const { addDoc, collection, serverTimestamp } = await loadFirestore();
    await addDoc(collection(db, 'rt_logs'), {
      dateKey: pacificDateKey(),
      teacher: selectedTeacher,
      name: selectedStudent,
      action: 'IN',
      ts: serverTimestamp()
    });
  };

  const handleAddStudent = () => {
    if (!selectedTeacher || !newStudent.trim()) return;
    if (!promptPin()) return alert("Incorrect PIN.");
    const name = newStudent.trim();
    if (teachers[selectedTeacher].includes(name)) {
      alert("Student already exists.");
      return;
    }
    setTeachers({
      ...teachers,
      [selectedTeacher]: [...teachers[selectedTeacher], name].sort((a,b)=>a.localeCompare(b))
    });
    setNewStudent("");
  };

  const handleRemoveStudent = (student) => {
    if (!selectedTeacher) return;
    if (!promptPin()) return alert("Incorrect PIN.");
    setTeachers({
      ...teachers,
      [selectedTeacher]: teachers[selectedTeacher].filter((s) => s !== student).sort((a,b)=>a.localeCompare(b))
    });
    if (selectedStudent === student) setSelectedStudent("");
  };

  const handleRemoveLastLog = async (teacher) => {
    const teacherLogs = logs.filter(log => log.teacher === teacher);
    if (teacherLogs.length === 0) return;
    if (!promptPin()) return alert("Incorrect PIN.");
    const lastLog = teacherLogs[teacherLogs.length - 1];
    if (!lastLog.id) return;
    const { deleteDoc, doc } = await loadFirestore();
    await deleteDoc(doc(db, 'rt_logs', lastLog.id));
  };

  const handleDownloadPDF = async (teacher) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const title = `Restroom Activity Log | ${teacher} (${weekRangePacificString()})`;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(title, pageWidth / 2, 18, { align: "center" });

    // Prepare rows by pairing OUT/IN per student
    const teacherLogs = logs.filter(l => l.teacher === teacher);
    const pending = {}; // name -> timeOut
    const rows = [];    // {name, date, out, in}

    // Date column for PDF (M/D/YY in Pacific)
    const datePacific = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    }).format(new Date());

    teacherLogs.forEach((log) => {
      const name = log.name;
      if (log.action === "OUT") {
        if (!pending[name]) {
          pending[name] = log.time;
        } else {
          rows.push({ name, date: datePacific, out: pending[name], in: "" });
          pending[name] = log.time;
        }
      } else if (log.action === "IN") {
        if (pending[name]) {
          rows.push({ name, date: datePacific, out: pending[name], in: log.time });
          delete pending[name];
        } else {
          rows.push({ name, date: datePacific, out: "", in: log.time });
        }
      }
    });
    Object.keys(pending).forEach(name => {
      rows.push({ name, date: datePacific, out: pending[name], in: "" });
    });

    if (rows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text("No activity recorded.", 20, 30);
      doc.save(`${teacher}_restroom_log.pdf`);
      return;
    }

    // Table layout
    const marginLeft = 15;
    const startY = 30;
    const rowH = 8;

    const colW = {
      num: 12,
      name: 60,
      date: 36,
      out: 36,
      in: 36
    };
    const tableWidth = colW.num + colW.name + colW.date + colW.out + colW.in;

    // Header row (dark gray with white text)
    let y = startY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setFillColor(60, 60, 60);
    doc.setTextColor(255, 255, 255);
    doc.rect(marginLeft, y - rowH + 2, tableWidth, rowH, "F");
    doc.text("#", marginLeft + 3, y);
    doc.text("Name", marginLeft + colW.num + 3, y);
    doc.text("Date", marginLeft + colW.num + colW.name + 3, y);
    doc.text("Time Out", marginLeft + colW.num + colW.name + colW.date + 3, y);
    doc.text("Time In", marginLeft + colW.num + colW.name + colW.date + colW.out + 3, y);
    doc.setTextColor(0, 0, 0);

    // Rows
    doc.setFont("helvetica", "normal");
    rows.forEach((r, idx) => {
      y += rowH;
      // Page break
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = startY;
        // Repeat header on new page
        doc.setFont("helvetica", "bold");
        doc.setFillColor(60, 60, 60);
        doc.setTextColor(255, 255, 255);
        doc.rect(marginLeft, y - rowH + 2, tableWidth, rowH, "F");
        doc.text("#", marginLeft + 3, y);
        doc.text("Name", marginLeft + colW.num + 3, y);
        doc.text("Date", marginLeft + colW.num + colW.name + 3, y);
        doc.text("Time Out", marginLeft + colW.num + colW.name + colW.date + 3, y);
        doc.text("Time In", marginLeft + colW.num + colW.name + colW.date + colW.out + 3, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      }

      // Alternating row fill (light gray)
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(marginLeft, y - rowH + 2, tableWidth, rowH, "F");
      }

      const xNum = marginLeft + 3;
      const xName = marginLeft + colW.num + 3;
      const xDate = marginLeft + colW.num + colW.name + 3;
      const xOut = marginLeft + colW.num + colW.name + colW.date + 3;
      const xIn  = marginLeft + colW.num + colW.name + colW.date + colW.out + 3;

      doc.text(String(idx + 1), xNum, y);
      doc.text(r.name, xName, y);
      doc.text(r.date, xDate, y);
      doc.text(r.out || "-", xOut, y);
      doc.text(r.in || "-", xIn, y);
    });

    doc.save(`${teacher}_restroom_log.pdf`);
  };

  const renderLogsByTeacher = (teacher) => {
    const teacherLogs = logs.filter(log => log.teacher === teacher);
    if (teacherLogs.length === 0) return <p className="text-gray-500">No activity yet</p>;
    return teacherLogs.map((log, i) => {
      const isLast = i === teacherLogs.length - 1;
      return (
        <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
          <span className="font-semibold">{i + 1}.</span>
          <span>{log.name}</span>
          <span className={log.action === "OUT" ? "text-red-500" : "text-green-500"}>{log.action}</span>
          <span className="text-gray-400 text-sm">{log.time}</span>
          {isLast && (
            <button
              onClick={() => handleRemoveLastLog(teacher)}
              className="ml-2 text-red-500 hover:text-red-700"
              title="Remove last log"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      );
    });
  };

  return (
    <Gate>
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <Card className="w-full max-w-3xl">
          <CardContent className="p-4 space-y-4">

            {/* Header inside card */}
            <div className="flex flex-col items-center mb-4">
              <img src={logo} alt="School Logo" className="w-32 mb-2" />
              <h1 className="text-3xl font-bold text-center">🚻 Restroom Tracker | Taft DHH</h1>
            </div>

            {/* Activity header & date */}
            <div className="mb-2">
              <h2 className="text-xl font-semibold">Activity Log — {todayPacific}</h2>
              <p className="text-sm text-gray-600">
                Showing all entries for today. Logs clear automatically daily at 11:59 PM Pacific.
              </p>
            </div>

            {/* Teacher select */}
            <div className="flex space-x-2">
              <select
                className="p-2 border rounded w-1/2"
                value={selectedTeacher}
                onChange={(e) => { setSelectedTeacher(e.target.value); setSelectedStudent(""); }}
              >
                <option value="">-- Teacher --</option>
                {Object.keys(teachers).sort((a,b)=>a.localeCompare(b)).map((teacher) => (
                  <option key={teacher} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>

            {/* Student select */}
            {selectedTeacher && (
              <div className="flex space-x-2">
                <select
                  className="p-2 border rounded w-1/2"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="">-- Student --</option>
                  {[...teachers[selectedTeacher]].sort((a,b)=>a.localeCompare(b)).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Out / In buttons */}
            <div className="flex space-x-2">
              <Button
                className={`px-4 py-2 rounded ${canSignOut ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                onClick={handleSignOut}
                disabled={!canSignOut}
              >
                Out
              </Button>
              <Button
                className={`px-4 py-2 rounded ${canSignIn ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                onClick={handleSignIn}
                disabled={!canSignIn}
              >
                In
              </Button>
            </div>

            {/* Add / Remove student (PIN gated) */}
            {selectedTeacher && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="p-2 border rounded w-full"
                  placeholder="Add new student"
                  value={newStudent}
                  onChange={(e) => setNewStudent(e.target.value)}
                />
                <Button className="px-4 py-2 rounded bg-blue-500 text-white" onClick={handleAddStudent}>
                  Add
                </Button>
                {selectedStudent && (
                  <Button className="px-4 py-2 rounded bg-gray-800 text-white" onClick={() => handleRemoveStudent(selectedStudent)}>
                    Remove
                  </Button>
                )}
              </div>
            )}

            {/* Activity Logs per teacher */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(teachers).sort((a,b)=>a.localeCompare(b)).map((teacher) => (
                <div key={teacher} className="border rounded p-3 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">{teacher}</h3>
                    <Button className="px-3 py-1 bg-gray-200" onClick={() => handleDownloadPDF(teacher)}>
                      PDF
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {renderLogsByTeacher(teacher)}
                  </div>
                </div>
              ))}
            </div>

          </CardContent>
        </Card>
      </div>
    </Gate>
  );
}
