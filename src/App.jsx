
import logo from './school_logo.png';
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { X as XIcon } from "lucide-react";
import { db } from './firebase';

function Gate({ children }) {
  const PAGE_PASSWORD_HASH = "fc4ec433f9f79454a7e4588eff2d3ff9e3a1f062af1dd806a06e8d839387b386";
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  useEffect(() => { setUnlocked(localStorage.getItem("rt_gate_ok") === "1"); }, []);
  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  async function handleUnlock(e){ e.preventDefault(); const h=await sha256(input);
    if(h===PAGE_PASSWORD_HASH){ localStorage.setItem("rt_gate_ok","1"); setUnlocked(true);} else alert("Incorrect password.");
  }
  if(!unlocked) return (<div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
    <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm space-y-4">
      <h1 className="text-xl font-semibold text-center">Enter Password</h1>
      <form onSubmit={handleUnlock} className="space-y-3">
        <input type="password" className="w-full border rounded p-2" placeholder="Password" value={input} onChange={(e)=>setInput(e.target.value)} autoFocus/>
        <button type="submit" className="w-full bg-black text-white rounded p-2">Unlock</button>
      </form>
      <p className="text-xs text-gray-500 text-center">Protected access</p>
    </div></div>);  
  return children;
}

// dynamic import
async function loadFirestore(){ return await import('firebase/firestore'); }

export default function App(){
  const PIN_CODE = "2022";
  const [teachers, setTeachers] = useState({
    "Lizette Lozano": ["Abner M.","Alexia P.","Angel C.","Carter W.","Emaily C.","Genesis P.","Jonathan E."],
    "Yadira Reina": ["Sofia A.","Issac G.","Marisa P.","Ariana R.","Alondra C.","Thanh D.","Maya F.","Samuel S.","Abner M.","Angel C."]
  });
  const [active, setActive] = useState({});
  const [logs, setLogs] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [newStudent, setNewStudent] = useState("");

  function pacificDateString(){ return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date()); }
  function pacificDateKey(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}-${parts.find(p=>p.type==='day').value}`;
  }

  const [todayPacific, setTodayPacific] = useState(pacificDateString());

  useEffect(()=>{ // Setup cleanup and log retrieval for each day
    const key=pacificDateKey(); const stored=localStorage.getItem('rt_pacific_date');
    if(stored!==key){
      (async()=>{ try{ if(stored){ const {collection,query,where,getDocs,deleteDoc}=await loadFirestore();
        const qDel=query(collection(db,'rt_logs'),where('dateKey','==',stored)); const snap=await getDocs(qDel);
        for(const d of snap.docs) await deleteDoc(d.ref); } }catch(e){ console.warn('Cleanup failed',e);} })();
      setLogs([]); setActive({}); localStorage.setItem('rt_pacific_date',key);
    }
    setTodayPacific(pacificDateString());
    const id=setInterval(()=>{ const k=pacificDateKey(); const s=localStorage.getItem('rt_pacific_date');
      if(k!==s){ setLogs([]); setActive({}); localStorage.setItem('rt_pacific_date',k); setTodayPacific(pacificDateString()); }
    },60000);
    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{ // Listen to Firestore updates
    let unsub=()=>{};
    (async()=>{
      const {collection,query,where,orderBy,onSnapshot}=await loadFirestore();
      const key=pacificDateKey();
      const q=query(collection(db,'rt_logs'),where('dateKey','==',key),orderBy('ts','asc'));
      unsub=onSnapshot(q,(snap)=>{
        const docs=snap.docs.map(d=>({id:d.id,...d.data()}));
        const formatted=docs.map(d=>({
          id:d.id, teacher:d.teacher, name:d.name, action:d.action,
          time:d.ts&&d.ts.toDate? new Date(d.ts.toDate()).toLocaleTimeString() : new Date().toLocaleTimeString()
        }));
        setLogs(formatted);
        const act={};
        formatted.forEach(l=>{ if(l.action==='OUT') act[l.name]=l.time; else if(l.action==='IN') delete act[l.name]; });
        setActive(act);
      });
    })();
    return ()=>unsub();
  },[todayPacific]);

  const promptPin=()=>{ const entered=window.prompt("Enter PIN"); return entered===PIN_CODE; };

  const canSignOut = selectedTeacher && selectedStudent && !active[selectedStudent] && teachers[selectedTeacher]?.includes(selectedStudent);
  const canSignIn  = selectedTeacher && selectedStudent && !!active[selectedStudent] && teachers[selectedTeacher]?.includes(selectedStudent);

  const handleSignOut = async () => {
    if(!canSignOut) return;
    try{
      const { addDoc, collection, serverTimestamp } = await loadFirestore();
      const nowPT = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit',second:'2-digit'}).format(new Date());
      setActive(prev=>({ ...prev, [selectedStudent]: nowPT })); // optimistic update
      setLogs(prev=>[...prev, { teacher: selectedTeacher, name: selectedStudent, action: 'OUT', time: nowPT, date: pacificDateKey() }]);

      await addDoc(collection(db,'rt_logs'),{
        dateKey: pacificDateKey(), teacher: selectedTeacher, name: selectedStudent, action: 'OUT', ts: serverTimestamp()
      });
    }catch(e){
      setActive(prev=>{ const c={...prev}; delete c[selectedStudent]; return c; });
      alert('Failed to log OUT: ' + (e?.message || e));
    }
  };

  const handleSignIn = async () => {
    if(!canSignIn) return;
    try{
      const { addDoc, collection, serverTimestamp } = await loadFirestore();
      const prevOut = active[selectedStudent];
      setActive(prev=>{ const c={...prev}; delete c[selectedStudent]; return c; }); // optimistic update
      setLogs(prev=>[...prev, { teacher: selectedTeacher, name: selectedStudent, action: 'IN', time: new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit',second:'2-digit'}).format(new Date()), date: pacificDateKey() }]);

      await addDoc(collection(db,'rt_logs'),{
        dateKey: pacificDateKey(), teacher: selectedTeacher, name: selectedStudent, action: 'IN', ts: serverTimestamp()
      });
    }catch(e){
      setActive(prev=>({ ...prev, [selectedStudent]: prevOut || 'OUT' }));
      alert('Failed to log IN: ' + (e?.message || e));
    }
  };

  return (<div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
    <Card className="w-full max-w-3xl">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col items-center mb-4">
          <img src={logo} alt="School Logo" className="w-32 mb-2" />
          <h1 className="text-3xl font-bold text-center">🚻 Restroom Tracker | Taft DHH</h1>
        </div>
        <div className="mb-2">
          <h2 className="text-xl font-semibold">Activity Log — {todayPacific}</h2>
          <p className="text-sm text-gray-600">Showing all entries for today. Logs clear automatically daily at 11:59 PM Pacific.</p>
        </div>
        <div className="flex space-x-2">
          <select className="p-2 border rounded w-1/2" value={selectedTeacher} onChange={(e)=>{setSelectedTeacher(e.target.value); setSelectedStudent("");}}>
            <option value="">-- Teacher --</option>
            {Object.keys(teachers).sort((a,b)=>a.localeCompare(b)).map(t=>(<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        {selectedTeacher && (<div className="flex space-x-2">
          <select className="p-2 border rounded w-1/2" value={selectedStudent} onChange={(e)=>setSelectedStudent(e.target.value)}>
            <option value="">-- Student --</option>
            {[...teachers[selectedTeacher]].sort((a,b)=>a.localeCompare(b)).map(n=>(<option key={n} value={n}>{n}</option>))}
          </select>
        </div>)}
        <div className="flex space-x-2">
          <Button className={`px-4 py-2 rounded ${canSignOut?'bg-red-500 text-white':'bg-gray-300 text-gray-600 cursor-not-allowed'}`} onClick={handleSignOut} disabled={!canSignOut}>Out</Button>
          <Button className={`px-4 py-2 rounded ${canSignIn?'bg-green-500 text-white':'bg-gray-300 text-gray-600 cursor-not-allowed'}`} onClick={handleSignIn} disabled={!canSignIn}>In</Button>
        </div>
      </CardContent>
    </Card>
  </div>);
}
