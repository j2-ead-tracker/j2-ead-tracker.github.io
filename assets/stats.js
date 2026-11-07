// Date helpers and the analysis. Dates are "YYYY-MM-DD" strings.

const DAY_MS = 86400000;

function parseISO(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function daysBetween(a, b) {
  const x = parseISO(a), y = parseISO(b);
  if (x === null || y === null) return null;
  return Math.round((y - x) / DAY_MS);
}
function addDays(iso, n) {
  return new Date(parseISO(iso) + n * DAY_MS).toISOString().slice(0, 10);
}
function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function stageOf(e) {
  const s = STATUS_BY_V[e.status];
  return s ? s.stage : 0;
}
function isApproved(e) {
  const st = stageOf(e);
  return st >= 10 && st < 20 && !!e.approval_date;
}
function isDenied(e) { return e.status === "denied"; }
function isWaiting(e) { return stageOf(e) < 10; }

// Days from receipt to approval, or to the last time a waiting person checked in.
function waitDays(e, today) {
  if (isApproved(e)) return daysBetween(e.receipt_date, e.approval_date);
  return daysBetween(e.receipt_date, e.last_checked || today);
}

// Kaplan-Meier estimate of time to approval.
// Approved cases are events. Waiting cases are right-censored at their last check-in.
// Denied cases are left out.
function kaplanMeier(entries, today) {
  const obs = [];
  for (const e of entries) {
    if (!e.receipt_date || isDenied(e)) continue;
    const approved = isApproved(e);
    if (!approved && !isWaiting(e)) continue;
    const t = approved ? daysBetween(e.receipt_date, e.approval_date)
                       : daysBetween(e.receipt_date, e.last_checked || today);
    if (t === null || t < 0) continue;
    obs.push({ t, ev: approved ? 1 : 0 });
  }
  obs.sort((a, b) => a.t - b.t || b.ev - a.ev);

  const steps = [{ t: 0, S: 1 }];
  let atRisk = obs.length, S = 1, i = 0;
  while (i < obs.length) {
    const t = obs[i].t;
    let d = 0, c = 0;
    while (i < obs.length && obs[i].t === t) { obs[i].ev ? d++ : c++; i++; }
    if (d > 0 && atRisk > 0) { S *= 1 - d / atRisk; steps.push({ t, S }); }
    atRisk -= d + c;
  }

  const maxT = obs.length ? obs[obs.length - 1].t : 0;
  const events = obs.filter(o => o.ev).length;

  // Survival (still waiting) at day t. Returns null past the data we have.
  function surv(t) {
    if (t > maxT) return null;
    let s = 1;
    for (const st of steps) { if (st.t <= t) s = st.S; else break; }
    return s;
  }
  function approvedBy(t) {
    const s = surv(t);
    return s === null ? null : 1 - s;
  }
  // First day by which a share p of applicants were approved.
  function dayFor(p) {
    const hit = steps.find(st => 1 - st.S >= p);
    return hit ? hit.t : null;
  }
  // Chance of approval in the next h days, given no approval after w days.
  function nextWindow(w, h) {
    const a = surv(w), b = surv(w + h);
    if (a === null || b === null || a <= 0) return null;
    return 1 - b / a;
  }

  return { n: obs.length, events, maxT, steps, surv, approvedBy, dayFor, nextWindow, median: dayFor(0.5) };
}

function median(nums) {
  const a = nums.filter(x => x !== null && x !== undefined).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
}

// One row per receipt block.
function blockSummary(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.block)) map.set(e.block, []);
    map.get(e.block).push(e);
  }
  return [...map.entries()].map(([block, list]) => {
    const approved = list.filter(isApproved);
    return {
      block,
      total: list.length,
      approved: approved.length,
      waiting: list.filter(isWaiting).length,
      denied: list.filter(isDenied).length,
      medianDays: median(approved.map(e => daysBetween(e.receipt_date, e.approval_date))),
      latestApproval: approved.map(e => e.approval_date).sort().pop() || null
    };
  }).sort((a, b) => Number(b.block) - Number(a.block));
}

// Highest block with a non-expedited approval, and the most recent approval overall.
function frontOfLine(entries) {
  const approved = entries.filter(isApproved);
  const regular = approved.filter(e => e.expedite !== "yes");
  let highest = null;
  for (const e of regular) {
    if (!highest || Number(e.block) > Number(highest.block) ||
        (e.block === highest.block && e.approval_date > highest.approval_date)) highest = e;
  }
  let latest = null;
  for (const e of approved) {
    if (!latest || e.approval_date > latest.approval_date) latest = e;
  }
  return { highest, latest };
}

if (typeof module !== "undefined") {
  module.exports = { parseISO, daysBetween, addDays, kaplanMeier, blockSummary, frontOfLine, median, isApproved, isWaiting, isDenied, waitDays };
}
