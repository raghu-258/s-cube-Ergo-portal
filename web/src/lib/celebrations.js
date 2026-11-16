import { DAY } from './format.js';

export const CELEBRATE_DAYS = 30;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const startOfToday = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtDay = (ts) => new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const whenLabel = (days) => (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`);

// Next date a day/month recurs; 29 Feb falls on 28 Feb in non-leap years (same rule as the server).
function nextOccurrence(month, day) {
  const t = startOfToday();
  const on = (y) => new Date(y, month - 1, month === 2 && day === 29 && new Date(y, 1, 29).getMonth() !== 1 ? 28 : day);
  const d = on(t.getFullYear());
  return d < t ? on(t.getFullYear() + 1) : d;
}

// Always shown on the dashboard: everything in the next CELEBRATE_DAYS days, topped up to at least
// CELEBRATE_MIN items with the next ones later in the year.
export const CELEBRATE_MIN = 5;

export function upcomingCelebrations(rows) {
  const all = celebrationItems(rows);
  const soon = all.filter((x) => x.days <= CELEBRATE_DAYS);
  return soon.length >= CELEBRATE_MIN ? soon : all.slice(0, CELEBRATE_MIN);
}

// Feed rows from the server -> every upcoming item (within a year), soonest first.
export function celebrationItems(rows) {
  const t = startOfToday();
  return rows.map((r) => {
    const date = nextOccurrence(r.month, r.day);
    return {
      type: r.type, name: r.name, email: r.email, dept: r.dept, date: date.getTime(), days: Math.round((date - t) / DAY),
      years: r.type === 'anniversary' ? date.getFullYear() - r.since : null,
    };
  })
    .filter((x) => x.type === 'birthday' || x.years > 0)
    .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name));
}
