import React, { useEffect, useState } from 'react';

const EXPECTED_HEX = "fc4ec433f9f79454a7e4588eff2d3ff9e3a1f062af1dd806a06e8d839387b386";

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const ok = sessionStorage.getItem('rt_auth') === 'ok';
    if (ok) setAuthed(true);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      const hex = await sha256Hex(pw);
      if (hex === EXPECTED_HEX) {
        sessionStorage.setItem('rt_auth', 'ok');
        setAuthed(true);
      } else {
        setErr('Incorrect password.');
      }
    } catch (e) {
      setErr('Error verifying password.');
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6">
          <h1 className="text-xl font-bold text-center">Restroom Tracker | Taft DHH</h1>
          <p className="text-sm text-gray-600 text-center mt-1">Please enter the password to continue.</p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              className="border rounded-lg px-3 py-2 w-full"
              autoFocus
            />
            {err && <div className="text-red-600 text-sm">{err}</div>}
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!pw}
            >
              Enter
            </button>
          </form>
          <p className="text-[11px] text-gray-400 mt-3 text-center">
            Session-only access. Close the tab to require the password again.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
