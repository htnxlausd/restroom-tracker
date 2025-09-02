import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { startOfWeekMonday, addDays } from './utils';

export function generateWeekPdf(teacherName, weekLogs, anchorDate = new Date()) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const monday = startOfWeekMonday(anchorDate);
  const friday = addDays(monday, 4);

  doc.setFontSize(16);
  doc.text(`Restroom Tracker | ${teacherName}`, 40, 40);
  doc.setFontSize(11);
  doc.text(`Week: ${monday.toDateString()} – ${friday.toDateString()} (Mon–Fri)`, 40, 60);

  const byDate = new Map();
  for (const log of weekLogs) {
    if (!byDate.has(log.dateKey)) byDate.set(log.dateKey, []);
    byDate.get(log.dateKey).push(log);
  }

  const rows = [];
  const sortedDates = Array.from(byDate.keys()).sort();
  for (const dateKey of sortedDates) {
    const logs = byDate.get(dateKey);
    const byStudent = new Map();
    for (const l of logs) {
      if (!byStudent.has(l.studentName)) byStudent.set(l.studentName, []);
      byStudent.get(l.studentName).push(l);
    }
    for (const [student, arr] of byStudent.entries()) {
      const outs = arr.filter(a => a.type==='out').map(a => new Date(a.timestamp)).map(d => d.toLocaleTimeString());
      const ins  = arr.filter(a => a.type==='in').map(a => new Date(a.timestamp)).map(d => d.toLocaleTimeString());
      rows.push([dateKey, student, outs.join(', '), ins.join(', ')]);
    }
  }

  autoTable(doc, {
    head: [['Date', 'Student', 'Out Times', 'In Times']],
    body: rows,
    startY: 80,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [220, 220, 220] },
    theme: 'grid'
  });

  doc.setProperties({ title: `${teacherName} - Restroom Tracker (Mon-Fri)` });
  return doc;
}

export function generateMonthPdf(teacherName, monthLogs, year, month /* 0-indexed */) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  doc.setFontSize(16);
  doc.text(`Restroom Tracker | ${teacherName}`, 40, 40);
  doc.setFontSize(11);
  doc.text(`Month: ${monthName} (Mon–Fri)`, 40, 60);

  // Group by date, then by student
  const byDate = new Map();
  for (const log of monthLogs) {
    if (!byDate.has(log.dateKey)) byDate.set(log.dateKey, []);
    byDate.get(log.dateKey).push(log);
  }
  const rows = [];
  const sortedDates = Array.from(byDate.keys()).sort();
  for (const dateKey of sortedDates) {
    const logs = byDate.get(dateKey);
    const byStudent = new Map();
    for (const l of logs) {
      if (!byStudent.has(l.studentName)) byStudent.set(l.studentName, []);
      byStudent.get(l.studentName).push(l);
    }
    for (const [student, arr] of byStudent.entries()) {
      const outs = arr.filter(a => a.type==='out').map(a => new Date(a.timestamp)).map(d => d.toLocaleTimeString());
      const ins  = arr.filter(a => a.type==='in').map(a => new Date(a.timestamp)).map(d => d.toLocaleTimeString());
      rows.push([dateKey, student, outs.join(', '), ins.join(', ')]);
    }
  }

  autoTable(doc, {
    head: [['Date', 'Student', 'Out Times', 'In Times']],
    body: rows,
    startY: 80,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [220, 220, 220] },
    theme: 'grid'
  });

  doc.setProperties({ title: `${teacherName} - Restroom Tracker (${monthName})` });
  return doc;
}
