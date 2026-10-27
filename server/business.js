export function stats(readings) {
  const values = readings.map((r) => r.value).filter((v) => Number.isFinite(v));
  if (!values.length) return { count: 0, average: null, minimum: null, maximum: null };
  return { count: values.length, average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10, minimum: Math.min(...values), maximum: Math.max(...values) };
}

export function inRangeAlert(reading, settings) {
  if (settings?.lowTarget == null || settings?.highTarget == null) return null;
  if (reading.value < settings.lowTarget || reading.value > settings.highTarget) return { readingId: reading.id, value: reading.value, direction: reading.value < settings.lowTarget ? 'below' : 'above', message: `This reading is ${reading.value < settings.lowTarget ? 'below' : 'above'} your saved target range. Follow your clinician’s action plan if needed.` };
  return null;
}

export function csvEscape(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
export function glucoseCsv(readings) {
  const header = ['Measured at', 'Value', 'Unit', 'Context', 'Note'];
  return [header, ...readings.map((r) => [r.measuredAt, r.value, r.unit, r.context, r.note || ''])].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function upcomingEvents(medications, events, now = new Date()) {
  const list = [];
  for (const med of medications.filter((m) => m.active)) {
    const start = new Date(`${med.startDate}T00:00:00`); const end = med.endDate ? new Date(`${med.endDate}T23:59:59`) : new Date(now.getTime() + 14 * 86400000);
    for (let day = new Date(Math.max(start, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))); day <= end && day <= new Date(now.getTime() + 7 * 86400000); day.setDate(day.getDate() + 1)) {
      for (const time of med.times) {
        const [hours, minutes] = time.split(':').map(Number); const scheduledAt = new Date(day); scheduledAt.setHours(hours, minutes, 0, 0);
        if (scheduledAt < new Date(now.getTime() - 86400000)) continue;
        const key = `${med.id}:${scheduledAt.toISOString()}`; const saved = events.find((e) => e.eventKey === key);
        list.push({ id: key, eventKey: key, medicationId: med.id, medicationName: med.name, scheduledAt: scheduledAt.toISOString(), status: saved?.status || 'pending', completedAt: saved?.completedAt || null });
      }
    }
  }
  return list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}
