/* J-2 EAD Tracker. One file on purpose: lists, analysis and page code. */

// Fixed lists used by the form, the filters and the analysis.
// Keep these in sync with apps-script/Code.gs.

const STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],
  ["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],
  ["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],
  ["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],
  ["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],
  ["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],
  ["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],
  ["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],
  ["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],
  ["WY","Wyoming"],["PR","Puerto Rico"],["GU","Guam"],["VI","U.S. Virgin Islands"],
  ["MP","Northern Mariana Islands"],["AS","American Samoa"]
];

// Notices may show either the old code (YSC, SRC, LIN, WAC, EAC, MSC) or the newer one.
const SERVICE_CENTERS = [
  ["PSC","Potomac (YSC or PSC)"],["TSC","Texas (SRC or TSC)"],["NSC","Nebraska (LIN or NSC)"],
  ["CSC","California (WAC or CSC)"],["VSC","Vermont (EAC or VSC)"],
  ["NBC","National Benefits Center (NBC or MSC)"],["HART","HART Service Center"],
  ["UNK","Unknown"]
];
const CENTER_SHORT = { PSC:"Potomac", TSC:"Texas", NSC:"Nebraska", CSC:"California", VSC:"Vermont", NBC:"NBC", HART:"HART", UNK:"Unknown" };

// stage: 0-9 waiting, 10-19 approved, 20 denied. Plain, simple English on purpose.
const STATUSES = [
  { v: "received", group: "Still waiting", stage: 0,
    label: "Application received", short: "Received",
    help: "USCIS has your application. You do not have a biometrics (fingerprint) appointment yet." },
  { v: "bio_scheduled", group: "Still waiting", stage: 1,
    label: "Biometrics appointment scheduled", short: "Biometrics scheduled",
    help: "You have a date for your fingerprint appointment. You have not gone yet." },
  { v: "fingerprints", group: "Still waiting", stage: 2,
    label: "Biometrics done (fingerprints taken)", short: "Biometrics done",
    help: "You went to your appointment. They took your fingerprints and photo. Now you wait for a decision." },
  { v: "reviewing", group: "Still waiting", stage: 3,
    label: "Case is being reviewed", short: "Being reviewed",
    help: "Your USCIS account says \"Case Is Being Actively Reviewed.\" This can take weeks. It does not mean a decision is close." },
  { v: "rfe_sent", group: "Still waiting", stage: 3,
    label: "USCIS asked for more documents (RFE)", short: "Documents asked",
    help: "USCIS sent you a letter asking for more documents. You have not sent them yet." },
  { v: "rfe_response", group: "Still waiting", stage: 3,
    label: "I sent the documents USCIS asked for", short: "Documents sent",
    help: "You answered the RFE letter. USCIS received your documents. Now you wait for a decision." },
  { v: "transferred", group: "Still waiting", stage: 3,
    label: "Case moved to another office", short: "Moved to another office",
    help: "USCIS moved your case to a different office." },
  { v: "approved", group: "EAD approved", stage: 10,
    label: "EAD approved, card not made yet", short: "Approved, no card yet",
    help: "Your EAD is approved. USCIS has not started making your card yet." },
  { v: "card_produced", group: "EAD approved", stage: 11,
    label: "EAD approved, card is being made", short: "Approved, card being made",
    help: "Your EAD is approved. USCIS is printing your card now." },
  { v: "card_mailed", group: "EAD approved", stage: 12,
    label: "EAD approved, card is in the mail", short: "Approved, card in the mail",
    help: "Your card was mailed to you. You do not have it yet." },
  { v: "card_delivered", group: "EAD approved", stage: 13,
    label: "I have my EAD card", short: "Has the card",
    help: "Your card arrived. You have it in your hand." },
  { v: "denied", group: "Denied", stage: 20,
    label: "Denied", short: "Denied",
    help: "USCIS said no to your application." }
];
const STATUS_BY_V = Object.fromEntries(STATUSES.map(s => [s.v, s]));

const APP_TYPES = [["initial","Initial"],["renewal","Renewal"]];
const EXPEDITE = [["no","No"],["yes","Yes"]];
const BIO_CODES = [["1","Code 1"],["2","Code 2"],["3","Code 3"],["5","Code 5"],["unsure","Not sure"]];

// Application Support Centers (biometrics locations), grouped by state.
const ASCS = {
  AK:["Anchorage"], AL:["Birmingham"], AR:["Fort Smith"], AZ:["Phoenix","Tucson","Yuma"],
  CA:["Bakersfield","Bellflower","Buena Park","El Monte","Fresno","Gardena","Imperial","La Brea","Modesto","Oakland","Oxnard","Pomona","Riverside","Sacramento","Salinas","San Diego","San Fernando","San Francisco","San Jose","San Marcos","Santa Rosa","Tustin","Wilshire"],
  CO:["Denver"], CT:["Hartford"], DE:["Dover"],
  FL:["Central Miami","Fort Myers","Ft. Lauderdale","Jacksonville","Kendall","North Miami","Orlando","Tampa","West Palm Beach"],
  GA:["Atlanta"], GU:["Agana"], HI:["Honolulu"], IA:["Des Moines"], ID:["Boise"],
  IL:["Chicago South","Naperville","Norridge","Waukegan"], IN:["Indianapolis","Michigan City"],
  KS:["Wichita"], KY:["Louisville"], LA:["New Orleans"], MA:["Boston","Lawrence"],
  MD:["Baltimore","Glenmont"], ME:["Portland"], MI:["Detroit","Grand Rapids"],
  MN:["Duluth","St Paul"], MO:["Kansas City","St Louis"], MP:["Saipan"], MS:["Jackson"],
  MT:["Helena"], NC:["Charlotte","Raleigh"], ND:["Fargo"], NE:["Omaha"], NH:["Manchester"],
  NJ:["Elizabeth","Hackensack"], NM:["Albuquerque"], NV:["Las Vegas","Reno"],
  NY:["Albany","Bronx","Brooklyn","Buffalo","Hauppauge","Long Island City","Manhattan","Port Chester","Queens/Jamaica","Syracuse"],
  OH:["Cincinnati","Cleveland","Columbus"], OK:["Oklahoma City"], OR:["Portland"],
  PA:["Philadelphia","Pittsburgh","York"], PR:["San Juan"], RI:["Providence"],
  SC:["Charleston","Greer"], SD:["Rapid City","Sioux Falls"], TN:["Memphis","Nashville"],
  TX:["Austin","Dallas North","Dallas South","El Paso","Fort Worth","Harlingen","Houston NW","Houston SE","Houston SW","Laredo","Lubbock","McAllen","San Antonio"],
  UT:["Salt Lake City"], VA:["Alexandria","Norfolk"], VI:["St Croix","St Thomas"],
  VT:["Burlington"], WA:["Seattle","Spokane","Yakima"], WI:["Milwaukee"], WV:["Charleston"], WY:["Casper"]
};

// Country of birth (required for new cases).
const COUNTRIES = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burma (Myanmar)", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Democratic Republic)", "Congo (Republic)", "Costa Rica", "Cote d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Macau", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];

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
// An approved status counts as approved even if the approval date is missing
// (for example a row typed into the Sheet by hand). Timing math needs the date, so it checks hasApprovalDate.
function isApproved(e) {
  const st = stageOf(e);
  return st >= 10 && st < 20;
}
function hasApprovalDate(e) { return isApproved(e) && parseISO(e.approval_date) !== null; }
function isDenied(e) { return e.status === "denied"; }
function isWaiting(e) { return stageOf(e) < 10; }

// Days from receipt to approval, or to the last time a waiting person checked in.
function waitDays(e, today) {
  if (isApproved(e)) return hasApprovalDate(e) ? daysBetween(e.receipt_date, e.approval_date) : null;
  return daysBetween(e.receipt_date, e.last_checked || today);
}

// Kaplan-Meier estimate of time to approval.
// Approved cases are events. Waiting cases are right-censored at their last check-in.
// Denied cases are left out.
function kaplanMeier(entries, today) {
  const obs = [];
  for (const e of entries) {
    if (!e.receipt_date || isDenied(e)) continue;
    if (isApproved(e) && !hasApprovalDate(e)) continue;  // approved, but we don't know when
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
      card: list.filter(e => e.status === "card_delivered").length,
      waiting: list.filter(isWaiting).length,
      denied: list.filter(isDenied).length,
      medianDays: median(approved.filter(hasApprovalDate).map(e => daysBetween(e.receipt_date, e.approval_date))),
      latestApproval: approved.filter(hasApprovalDate).map(e => e.approval_date).sort().pop() || null
    };
  }).sort((a, b) => Number(b.block) - Number(a.block));
}

// highest: highest block with any approval (expedited included).
// highestRegular: highest block with a non-expedited approval (a fairer "where is the line").
// latest: the most recent approval date reported.
function frontOfLine(entries) {
  const approved = entries.filter(isApproved);
  const top = list => {
    let best = null;
    for (const e of list) {
      if (!best || Number(e.block) > Number(best.block) ||
          (e.block === best.block && (e.approval_date || "") > (best.approval_date || ""))) best = e;
    }
    return best;
  };
  const highest = top(approved);
  const highestRegular = top(approved.filter(e => e.expedite !== "yes"));
  let latest = null;
  for (const e of approved.filter(hasApprovalDate)) {
    if (!latest || e.approval_date > latest.approval_date) latest = e;
  }
  return { highest, highestRegular, latest };
}

if (typeof module !== "undefined") {
  module.exports = { parseISO, daysBetween, addDays, kaplanMeier, blockSummary, frontOfLine, median, isApproved, hasApprovalDate, isWaiting, isDenied, waitDays };
}

(function () {
  "use strict";

  const CONFIG = window.TRACKER_CONFIG || {};
  const API = (CONFIG.API_URL || "").trim();
  const DEMO = !API;
  // How many rows the tables show. Kept small on purpose.
  const ROWS_DEFAULT = 5;     // no filter picked
  const ROWS_FILTERED = 10;   // at least one filter picked under "All cases"
  const BLOCK_ROWS = 5;
  const APP_VERSION = "1.3.0";

  let entries = [];
  let myBlock = null;
  let myWait = null;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = p => (p === null || p === undefined) ? "—" : `${Math.round(p * 100)}%`;
  const fmtDate = s => {
    const t = parseISO(s);
    if (t === null) return "—";
    return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  };
  const fmtShort = s => {
    const t = parseISO(s);
    if (t === null) return "—";
    return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };
  const centerName = v => (SERVICE_CENTERS.find(c => c[0] === v) || [v, v])[1];
  const typeName = v => (APP_TYPES.find(c => c[0] === v) || [v, v])[1];

  /* ---------- Setup ---------- */

  function fillSelect(sel, pairs, keepFirst = true) {
    const first = keepFirst ? sel.querySelector("option") : null;
    sel.innerHTML = "";
    if (first) sel.appendChild(first);
    for (const [v, label] of pairs) {
      const o = document.createElement("option");
      o.value = v; o.textContent = label;
      sel.appendChild(o);
    }
  }

  function setupSelects() {
    const statePairs = STATES.map(([c, n]) => [c, `${n} (${c})`]);
    fillSelect($("#fState"), statePairs);
    fillSelect($("#findState"), statePairs);
    fillSelect($("#fType"), APP_TYPES);
    fillSelect($("#findType"), APP_TYPES);
    fillSelect($("#fCenter"), SERVICE_CENTERS);
    fillSelect($("#fCode"), BIO_CODES);
    const statusSel = $("#fStatus");
    statusSel.innerHTML = `<option value="">Select</option>`;
    for (const grp of [...new Set(STATUSES.map(x => x.group))]) {
      const g = document.createElement("optgroup");
      g.label = grp;
      for (const st of STATUSES.filter(x => x.group === grp)) {
        const o = document.createElement("option");
        o.value = st.v; o.textContent = st.label;
        g.appendChild(o);
      }
      statusSel.appendChild(g);
    }
    const key = $("#statusKey");
    if (key) key.innerHTML = STATUSES.map(s => `<dt>${esc(s.label)}</dt><dd>${esc(s.help)}</dd>`).join("");
    fillSelect($("#fCountry"), COUNTRIES.map(c => [c, c]));
    fillSelect($("#fExpedite"), EXPEDITE, false);

    const f = $("#filters");
    fillSelect(f.service_center, SERVICE_CENTERS);
    fillSelect(f.state, STATES.map(([c]) => [c, c]));
    fillSelect(f.app_type, APP_TYPES);
    fillSelect(f.expedite, EXPEDITE);


    const today = todayISO();
    for (const id of ["#fReceipt", "#fApproval", "#findReceipt", "#estReceipt"]) $(id).max = today;
    $("#fBio").max = addDays(today, 180);
    for (const id of ["#fReceipt", "#fBio", "#fApproval", "#findReceipt", "#estReceipt"]) $(id).min = "2020-01-01";

    buildAscOptions("");
  }

  function buildAscOptions(state, selected = "") {
    const sel = $("#fAsc");
    sel.innerHTML = `<option value="">Not yet / not sure</option>`;
    const order = Object.keys(ASCS).sort();
    if (state && ASCS[state]) { order.splice(order.indexOf(state), 1); order.unshift(state); }
    for (const st of order) {
      const g = document.createElement("optgroup");
      g.label = (STATES.find(s => s[0] === st) || [st, st])[1];
      for (const city of ASCS[st]) {
        const o = document.createElement("option");
        o.value = `${city}, ${st}`; o.textContent = `${city}, ${st}`;
        g.appendChild(o);
      }
      sel.appendChild(g);
    }
    const other = document.createElement("option");
    other.value = "OTHER"; other.textContent = "Other (not in this list)";
    sel.appendChild(other);
    sel.value = selected;
  }

  function setupFooter() {
    const parts = [];
    if (CONFIG.CONTACT_EMAIL) parts.push(`<a href="mailto:${esc(CONFIG.CONTACT_EMAIL)}">Contact</a>`);
    if (CONFIG.DONATION_URL) parts.push(`<a href="${esc(CONFIG.DONATION_URL)}">Buy the maintainer a coffee</a>`);
    $("#footerLinks").innerHTML = parts.join(" &nbsp; ");
    $("#siteVersion").textContent = `Version ${APP_VERSION}`;
    if (CONFIG.CONTACT_EMAIL) {
      $$("[data-contact-email]").forEach(a => {
        a.href = `mailto:${CONFIG.CONTACT_EMAIL}?subject=${encodeURIComponent("J-2 EAD Tracker: remove or correct my entry")}`;
        a.textContent = CONFIG.CONTACT_EMAIL;
      });
    }
  }

  /* ---------- Data ---------- */

  // Accepts "2026-11-10", "2026-11-10T05:00:00Z" or "11/10/2026" (typed by hand in the Sheet).
  function toISO(v) {
    const s = String(v ?? "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    return s.slice(0, 10);
  }

  function normalize(e) {
    const out = { ...e };
    // Rows edited by hand can have spaces, "IOE09375", or capitalized values. Clean them up.
    out.block = String(e.block ?? "").replace(/\D/g, "").padStart(3, "0").slice(-3);
    out.status = String(e.status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    out.expedite = String(e.expedite ?? "").trim().toLowerCase();
    for (const k of ["receipt_date", "filed_date", "bio_date", "approval_date", "last_checked", "updated_at"]) {
      out[k] = toISO(e[k]);
    }
    return out;
  }

  async function load() {
    if (DEMO) {
      $("#demoBanner").hidden = false;
      entries = makeDemoData();
    } else {
      try {
        const res = await fetch(`${API}?action=list&t=${Date.now()}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        entries = (json.entries || []).map(normalize);
      } catch (err) {
        entries = [];
        $("#ticketNote").textContent = "Couldn't load cases. Refresh the page to try again.";
        renderAll(true);
        return;
      }
    }
    renderAll();
  }

  function makeDemoData() {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const today = todayISO();
    const states = ["PA","PA","NY","NY","CA","CA","MA","MA","TX","NC","MD","IL","MI","OH","WA","CT","NJ","GA","FL","MN"];
    const out = [];
    for (let i = 0; i < 160; i++) {
      const block = 330 + Math.floor(rnd() * 66);
      const receipt = addDays("2026-08-28", Math.round((block - 381) * 1.4 + (rnd() * 4 - 2)));
      if (receipt > today) continue;
      const state = pick(states);
      const expedite = rnd() < 0.06 ? "yes" : "no";
      const wait = Math.round((expedite === "yes" ? 35 : 82) + rnd() * 45 + (rnd() < 0.15 ? rnd() * 70 : 0));
      const appr = addDays(receipt, wait);
      const bio = addDays(receipt, Math.round(16 + rnd() * 16));
      let status, approval_date = "";
      if (appr <= today) {
        status = pick(["approved", "card_produced", "card_mailed", "card_delivered", "card_delivered"]);
        approval_date = appr;
      } else {
        const age = daysBetween(receipt, today);
        status = age < 18 ? "received" : bio > today ? "bio_scheduled" : pick(["fingerprints", "fingerprints", "reviewing", "rfe_sent"]);
      }
      if (i === 40 || i === 90) { status = "denied"; approval_date = ""; }
      const checked = approval_date || addDays(today, -Math.floor(rnd() * 12));
      out.push({
        id: `demo${i}`,
        block: String(block),
        receipt_date: receipt,
        filed_date: addDays(receipt, -Math.round(2 + rnd() * 6)),
        state,
        country: rnd() < 0.25 ? "" : pick(["India", "China", "Turkey", "Brazil", "South Korea", "Germany", "Iran", "Mexico", "Japan", "Italy"]),
        app_type: rnd() < 0.75 ? "initial" : "renewal",
        service_center: rnd() < 0.6 ? "PSC" : rnd() < 0.5 ? "UNK" : pick(["TSC", "NSC", "CSC", "VSC"]),
        asc: ASCS[state] ? `${pick(ASCS[state])}, ${state}` : "",
        bio_date: bio <= addDays(today, 30) && status !== "received" ? bio : "",
        bio_code: pick(["2", "3", "3", ""]),
        status,
        approval_date,
        expedite,
        last_checked: checked < receipt ? receipt : checked,
        source: rnd() < 0.2 ? "reddit" : ""
      });
    }
    return out;
  }

  /* ---------- Rendering ---------- */

  function renderAll(failed = false) {
    renderHero(failed);
    renderShareCount();
    renderStrip();
    renderBlockBars();
    renderKM();
    renderBlocks();
    fillCountryFilter();
    renderCases();
  }

  function renderHero(failed) {
    const { highest, highestRegular, latest } = frontOfLine(entries);
    const approved = entries.filter(isApproved).length;
    const waiting = entries.filter(isWaiting).length;
    const denied = entries.filter(isDenied).length;
    if (!failed) {
      // The big number is the highest approval WITHOUT an expedite, since expedited cases skip the line.
      // If a higher block was approved through an expedite, the note says so.
      const shownCase = highestRegular || highest;
      if (shownCase) {
        $("#ticketBlock").textContent = shownCase.block;
        const parts = [];
        parts.push(shownCase.approval_date ? `Approved ${fmtDate(shownCase.approval_date)}.` : "Approved (date not reported).");
        if (shownCase.expedite === "yes") {
          parts.push("This case was expedited. No regular approvals have been reported yet.");
        } else if (Number(highest.block) > Number(shownCase.block)) {
          parts.push(`Block ${highest.block} was also approved, but it was expedited, so it isn't counted here.`);
        }
        if (latest && latest.id !== shownCase.id) {
          parts.push(`The most recent approval reported was ${fmtDate(latest.approval_date)}, block ${latest.block}.`);
        } else if (latest) {
          parts.push("This is the most recent approval reported.");
        }
        $("#ticketNote").textContent = parts.join(" ");
      } else {
        $("#ticketBlock").textContent = "···";
        $("#ticketNote").textContent = entries.length
          ? "No approvals reported yet. Add your case so others can see the line move."
          : "No cases yet. Add yours to get the tracker started.";
      }
    }
    const withCard = entries.filter(e => e.status === "card_delivered").length;
    $("#summaryLine").textContent = entries.length
      ? `Based on ${entries.length} reported cases: ${approved} approved (${withCard} have their card), ${waiting} still waiting${denied ? `, ${denied} denied` : ""}.`
      : "";
  }

  function renderStrip() {
    const strip = $("#blockStrip");
    strip.innerHTML = "";
    if (!entries.length) return;
    const summary = new Map(blockSummary(entries).map(b => [Number(b.block), b]));
    const nums = [...summary.keys()];
    const max = Math.max(...nums);
    const min = Math.max(Math.min(...nums), max - 79);
    let col = 1;
    for (let b = min; b <= max; b++, col++) {
      const s = summary.get(b);
      let cls = "none", text = "no cases yet";
      if (s) {
        if (s.card > 0) cls = "card";
        else if (s.approved > 0) cls = "appr";
        else if (s.waiting > 0) cls = "wait";
        const parts = [`${s.total} case${s.total > 1 ? "s" : ""}`];
        if (s.card) parts.push(`${s.card} got the card`);
        if (s.approved - s.card) parts.push(`${s.approved - s.card} approved, no card yet`);
        if (s.waiting) parts.push(`${s.waiting} still waiting`);
        if (s.denied) parts.push(`${s.denied} denied`);
        text = parts.join(", ");
      }
      const id = String(b).padStart(3, "0");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `cell ${cls}${myBlock === id ? " mine" : ""}`;
      btn.style.gridColumn = col;
      btn.setAttribute("role", "listitem");
      btn.setAttribute("aria-label", `Block ${id}: ${text}`);
      btn.title = `Block ${id}: ${text}`;
      btn.addEventListener("click", () => {
        const f = $("#filters");
        f.reset();
        f.block.value = id;
        renderCases();
        $("#cases").scrollIntoView();
      });
      strip.appendChild(btn);
      if (b % 10 === 0 || b === min) {
        const t = document.createElement("span");
        t.className = "tick";
        t.style.gridColumn = `${col} / span 3`;
        t.textContent = id;
        strip.appendChild(t);
      }
    }
    const sc = $(".strip-scroll");
    const { highest } = frontOfLine(entries);
    const focus = myBlock ? Math.min(Number(myBlock), highest ? Number(highest.block) : Number(myBlock)) : highest ? Number(highest.block) : max;
    sc.scrollLeft = Math.max(0, (focus - min - 6) * 29);
  }

  // Stacked bars: number of reports per block, split by status.
  // Same block range as the strip above, so the two line up.
  const BAR_SEGS = [
    { k: "card",   cls: "seg-card",   sw: "sw-card",   label: "Card arrived" },
    { k: "appr",   cls: "seg-appr",   sw: "sw-appr",   label: "Approved, no card yet" },
    { k: "wait",   cls: "seg-wait",   sw: "sw-wait",   label: "Still waiting" },
    { k: "denied", cls: "seg-denied", sw: "sw-denied", label: "Denied" }
  ];

  // Rectangle with rounded top corners only (the end of the bar).
  function topRounded(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }

  function renderBlockBars() {
    const box = $("#blockBars");
    if (!box) return;
    box.innerHTML = "";
    if (!entries.length) return;
    const summary = new Map(blockSummary(entries).map(b => [Number(b.block), b]));
    const nums = [...summary.keys()];
    const max = Math.max(...nums);
    const min = Math.max(Math.min(...nums), max - 79);
    const n = max - min + 1;

    const slot = Math.max(12, Math.min(40, Math.floor(1000 / n)));
    const bw = Math.max(6, Math.round(slot * 0.7));
    const m = { l: 30, r: 8, t: 14, b: 24 };
    const plotH = 170;
    const W = m.l + n * slot + m.r, H = m.t + plotH + m.b;

    let top = 1;
    for (let b = min; b <= max; b++) { const s = summary.get(b); if (s) top = Math.max(top, s.total); }
    const step = top <= 5 ? 1 : top <= 10 ? 2 : top <= 25 ? 5 : Math.ceil(top / 4 / 5) * 5;
    const yMax = Math.ceil(top / step) * step;
    const y = v => m.t + plotH - (v / yMax) * plotH;

    let g = "";
    for (let v = 0; v <= yMax; v += step) {
      g += `<line class="${v ? "grid" : "axis"}" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      g += `<text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }

    const counts = s => ({ card: s.card, appr: s.approved - s.card, wait: s.waiting, denied: s.denied });

    for (let b = min, i = 0; b <= max; b++, i++) {
      const id = String(b).padStart(3, "0");
      const x0 = m.l + i * slot;
      const bx = x0 + (slot - bw) / 2;
      const s = summary.get(b);
      let segs = "";
      if (s) {
        const c = counts(s);
        const shown = BAR_SEGS.filter(sg => c[sg.k] > 0);
        let acc = 0;
        shown.forEach((sg, j) => {
          const yTop = y(acc + c[sg.k]);
          const yBot = y(acc);
          const gap = j > 0 ? 2 : 0;  // 2px gap between stacked segments
          const h = Math.max(1, yBot - yTop - gap);
          const inset = sg.k === "wait" ? 0.75 : 0;  // keep the outline inside the bar
          const xx = bx + inset, ww = bw - inset * 2, yy = yTop + inset, hh = Math.max(1, h - inset * 2);
          segs += j === shown.length - 1
            ? `<path class="${sg.cls}" d="${topRounded(xx, yy, ww, hh, 3)}"/>`
            : `<rect class="${sg.cls}" x="${xx}" y="${yy}" width="${ww}" height="${hh}"/>`;
          acc += c[sg.k];
        });
      }
      const mine = myBlock === id;
      g += `<g class="col${mine ? " mine" : ""}" data-block="${id}"><rect class="hit" x="${x0}" y="${m.t}" width="${slot}" height="${plotH}" rx="3"/>${segs}</g>`;
      if (b % 10 === 0 || b === min) {
        g += `<text x="${x0 + slot / 2}" y="${H - 6}" text-anchor="middle">${id}</text>`;
      }
      if (mine) g += `<text class="mine-label" x="${x0 + slot / 2}" y="${m.t - 3}" text-anchor="middle">You</text>`;
    }

    let totalShown = 0;
    for (const [b, s] of summary) if (b >= min) totalShown += s.total;
    const desc = `Stacked bar chart of reports per receipt block, blocks ${String(min).padStart(3, "0")} to ${String(max).padStart(3, "0")}, ${totalShown} reports. Each bar is split into card arrived, approved without card, still waiting and denied.`;
    box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="min-width:${Math.round(W * 0.75)}px; max-width:${Math.max(W, 600)}px" role="img" aria-label="${esc(desc)}">${g}</svg><div class="bars-tip" hidden></div>`;

    const svg = $("svg", box);
    const tip = $(".bars-tip", box);
    const showTip = col => {
      $$(".col.on", svg).forEach(c => c.classList.remove("on"));
      col.classList.add("on");
      const id = col.dataset.block;
      const s = summary.get(Number(id));
      let html = `<strong>Block ${id}</strong>`;
      if (!s) html += "No cases yet";
      else {
        const c = counts(s);
        html += `${s.total} report${s.total > 1 ? "s" : ""}`;
        for (const sg of BAR_SEGS.slice().reverse()) {
          if (c[sg.k]) html += `<span class="tip-row"><span class="sw ${sg.sw}"></span>${sg.label}: ${c[sg.k]}</span>`;
        }
      }
      tip.innerHTML = html;
      tip.hidden = false;
      const r = col.getBoundingClientRect(), br = box.getBoundingClientRect();
      const tw = tip.offsetWidth;
      let left = r.left - br.left + box.scrollLeft + r.width / 2 - tw / 2;
      left = Math.max(box.scrollLeft, Math.min(left, box.scrollLeft + box.clientWidth - tw));
      tip.style.left = `${left}px`;
      tip.style.top = "0px";
    };
    const hideTip = () => { tip.hidden = true; $$(".col.on", svg).forEach(c => c.classList.remove("on")); };
    $$(".col", svg).forEach(col => {
      col.addEventListener("mouseenter", () => showTip(col));
      col.addEventListener("mouseleave", hideTip);
      col.addEventListener("click", () => {
        const f = $("#filters");
        f.reset();
        f.block.value = col.dataset.block;
        renderCases();
        $("#cases").scrollIntoView();
      });
    });

    // Scroll to the same spot as the strip: around your block or the highest approval.
    const { highest } = frontOfLine(entries);
    const focus = myBlock ? Math.min(Number(myBlock), highest ? Number(highest.block) : Number(myBlock)) : highest ? Number(highest.block) : max;
    const scale = svg.clientWidth / W || 1;
    box.scrollLeft = Math.max(0, (m.l + (focus - min - 6) * slot) * scale);
  }

  function renderKM() {
    const today = todayISO();
    const km = kaplanMeier(entries, today);
    const box = $("#kmChart");
    if (!km.n) {
      box.innerHTML = `<p class="hint">The chart appears once cases are added.</p>`;
      $("#milestones").innerHTML = "";
      return;
    }
    box.innerHTML = kmSvg(km, myWait);
    $("#milestones").innerHTML = [60, 90, 120, 150, 180].map(d =>
      `<div><dt>Approved by day ${d}</dt><dd>${pct(km.approvedBy(d))}</dd></div>`
    ).join("");
  }

  function kmSvg(km, youDays) {
    const W = 760, H = 300, m = { l: 48, r: 20, t: 20, b: 44 };
    const span = Math.max(km.maxT, youDays || 0, 120);
    const xmax = Math.min(Math.ceil(span / 30) * 30, 390);
    const x = t => m.l + (Math.min(t, xmax) / xmax) * (W - m.l - m.r);
    const y = p => m.t + (1 - p) * (H - m.t - m.b);
    let g = "";
    for (const p of [0, .25, .5, .75, 1]) {
      g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(p)}" y2="${y(p)}"/>`;
      g += `<text x="${m.l - 8}" y="${y(p) + 4}" text-anchor="end">${p * 100}%</text>`;
    }
    for (let t = 0; t <= xmax; t += 30) {
      g += `<text x="${x(t)}" y="${H - m.b + 18}" text-anchor="middle">${t}</text>`;
    }
    g += `<text x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle">Days since receipt date</text>`;
    g += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}"/>`;

    let d = `M${x(0)},${y(0)}`;
    let prev = 0;
    for (const st of km.steps.slice(1)) {
      d += ` H${x(st.t)} V${y(1 - st.S)}`;
      prev = 1 - st.S;
    }
    d += ` H${x(km.maxT)}`;
    const area = `${d} V${y(0)} Z`;
    g += `<path class="area" d="${area}"/><path class="curve" d="${d}"/>`;

    if (km.median !== null) {
      const mx = x(km.median);
      g += `<line class="mark-line" x1="${mx}" x2="${mx}" y1="${y(0)}" y2="${y(.5)}"/>`;
      g += `<line class="mark-line" x1="${m.l}" x2="${mx}" y1="${y(.5)}" y2="${y(.5)}"/>`;
      const anchor = mx > W * 0.7 ? "end" : "start";
      g += `<text class="mark-label" x="${mx + (anchor === "start" ? 8 : -8)}" y="${y(.5) - 8}" text-anchor="${anchor}">Half approved by day ${km.median}</text>`;
    }
    if (youDays !== null && youDays !== undefined && youDays >= 0) {
      const yx = x(youDays);
      g += `<line class="you-line" x1="${yx}" x2="${yx}" y1="${y(0)}" y2="${y(1)}"/>`;
      const anchor = yx > W * 0.75 ? "end" : "start";
      g += `<text class="you-label" x="${yx + (anchor === "start" ? 6 : -6)}" y="${y(1) + 14}" text-anchor="${anchor}">You: day ${youDays}</text>`;
    }
    const desc = `Share of applicants approved by days since receipt. Half approved by day ${km.median ?? "not reached yet"}. Based on ${km.n} cases, ${km.events} approved.`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(desc)}">${g}</svg>
      <p class="hint">Based on ${km.n} cases, ${km.events} approved. Denied cases aren't included.</p>`;
  }

  function renderBlocks() {
    const all = blockSummary(entries);
    const rows = all.slice(0, BLOCK_ROWS);
    $("#blockCount").textContent = all.length > rows.length
      ? `Showing the ${rows.length} highest blocks of ${all.length}. Tap a square or bar above, or filter "All cases" by block, to see any block.`
      : "";
    $("#blockTable tbody").innerHTML = rows.length ? rows.map(r => `
      <tr${myBlock === r.block ? ' class="row-hl"' : ""}>
        <td class="b">${esc(r.block)}</td>
        <td>${r.total}</td>
        <td>${r.waiting}</td>
        <td>${r.approved}</td>
        <td>${r.card}</td>
        <td>${r.medianDays ?? "—"}</td>
        <td>${fmtDate(r.latestApproval)}</td>
      </tr>`).join("") : `<tr><td colspan="7">No blocks yet.</td></tr>`;
  }

  function statusPill(e) {
    const s = STATUS_BY_V[e.status];
    const label = s ? s.short : e.status;
    const cls = e.status === "card_delivered" ? "card" : isApproved(e) ? "ok" : isDenied(e) ? "no" : "wait";
    return `<span class="pill ${cls}">${esc(label)}</span>`;
  }

  function filterQuery() {
    const f = $("#filters");
    return {
      block: f.block.value.trim(), service_center: f.service_center.value, state: f.state.value,
      app_type: f.app_type.value, group: f.group.value, expedite: f.expedite.value, country: f.country.value
    };
  }

  function filteredCases() {
    const q = filterQuery();
    const inGroup = e => {
      switch (q.group) {
        case "waiting": return isWaiting(e);
        case "approved": return isApproved(e);
        case "nocard": return isApproved(e) && e.status !== "card_delivered";
        case "card": return e.status === "card_delivered";
        case "denied": return isDenied(e);
        default: return true;
      }
    };
    return entries.filter(e =>
      (!q.block || e.block.startsWith(q.block)) &&
      (!q.service_center || e.service_center === q.service_center) &&
      (!q.state || e.state === q.state) &&
      (!q.app_type || e.app_type === q.app_type) &&
      (!q.expedite || e.expedite === q.expedite) &&
      (!q.country || e.country === q.country) &&
      inGroup(e)
    ).sort((a, b) => Number(b.block) - Number(a.block) || (b.receipt_date > a.receipt_date ? 1 : -1));
  }

  function fillCountryFilter() {
    const sel = $("#filters").country;
    const current = sel.value;
    const used = [...new Set(entries.map(e => e.country).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">Any</option>` + used.map(c => `<option>${esc(c)}</option>`).join("");
    sel.value = used.includes(current) ? current : "";
  }

  function renderCases() {
    const today = todayISO();
    const list = filteredCases();
    const filtered = Object.values(filterQuery()).some(Boolean);
    const limit = filtered ? ROWS_FILTERED : ROWS_DEFAULT;
    const n = Math.min(list.length, limit);
    $("#caseCount").textContent = filtered
      ? `${list.length} of ${entries.length} cases match. Showing ${n}${list.length > n ? ", newest blocks first. Add more filters to narrow it down" : ""}.`
      : `${entries.length} cases. Showing the ${n} newest. Pick a filter to look for specific cases.`;
    const rows = list.slice(0, limit).map(e => {
      const days = waitDays(e, today);
      const daysText = isApproved(e) ? days : isWaiting(e) ? `${days} so far` : "—";
      return `<tr${myBlock === e.block ? ' class="row-hl"' : ""}>
        <td class="b">${esc(e.block)}${e.source === "reddit" ? '<span class="src" title="Imported from a public Reddit thread">Reddit</span>' : ""}</td>
        <td>${fmtDate(e.receipt_date)}</td>
        <td>${esc(e.state)}</td>
        <td>${e.country ? esc(e.country) : "—"}</td>
        <td>${esc(CENTER_SHORT[e.service_center] || e.service_center)}</td>
        <td>${e.bio_date ? fmtShort(e.bio_date) : "—"}${e.asc && e.asc !== "OTHER" ? `<br><span class="src">${esc(e.asc)}</span>` : ""}</td>
        <td>${esc(typeName(e.app_type))}</td>
        <td>${statusPill(e)}</td>
        <td>${fmtDate(e.approval_date)}</td>
        <td>${daysText ?? "—"}</td>
        <td>${e.expedite === "yes" ? "Yes" : "No"}</td>
        <td>${isWaiting(e) ? fmtShort(e.last_checked) : "—"}</td>
      </tr>`;
    });
    $("#caseTable tbody").innerHTML = rows.length ? rows.join("") : `<tr><td colspan="12">No cases match these filters.</td></tr>`;
  }

  /* ---------- Estimate ---------- */

  function renderEstimate(block, receipt) {
    const today = todayISO();
    const w = daysBetween(receipt, today);
    myBlock = block;
    myWait = w;

    let cohort = entries.filter(e => Math.abs(daysBetween(e.receipt_date, receipt)) <= 45);
    let cohortNote = "cases received within 45 days of yours";
    if (kaplanMeier(cohort, today).n < 8) { cohort = entries; cohortNote = "all reported cases"; }
    const km = kaplanMeier(cohort, today);
    // Expedited approvals skip the line, so compare against the highest regular approval here.
    const fl = frontOfLine(entries);
    const highest = fl.highestRegular || fl.highest;

    const lines = [];
    lines.push(`<p class="est-big">You've waited ${w} days since your receipt date.</p>`);
    if (highest) {
      const gap = Number(block) - Number(highest.block);
      lines.push(gap <= 0
        ? `<p>Approvals have reached block ${esc(highest.block)}, which is at or past yours.</p>`
        : `<p>Approvals have reached block ${esc(highest.block)}. That's ${gap} block${gap > 1 ? "s" : ""} before yours.</p>`);
    }
    if (km.n) {
      const by = km.approvedBy(w);
      lines.push(by === null
        ? `<p>Among ${km.n} ${cohortNote}, nobody has been tracked for ${w} days yet.</p>`
        : `<p>Among ${km.n} ${cohortNote}, ${pct(by)} were approved by day ${w}.</p>`);
      const next = km.nextWindow(w, 30);
      lines.push(next !== null
        ? `<p>Chance of approval in the next 30 days: <strong>${pct(next)}</strong>.</p>`
        : `<p>Not enough people have waited ${w + 30} days yet to estimate your next 30 days.</p>`);
      if (km.median !== null) {
        lines.push(km.median > w
          ? `<p>Half of these cases were approved by day ${km.median}. For you, that's around ${fmtDate(addDays(receipt, km.median))}.</p>`
          : `<p>You've passed the typical wait for these cases (half were approved by day ${km.median}). That's common and doesn't mean something is wrong with your case.</p>`);
      }
    }
    const caution = km.n < 10
      ? `<p class="caution">Only ${km.n} similar cases so far, so treat this as a rough guide. Adding your case makes it better for everyone.</p>`
      : "";

    const near = entries
      .filter(e => Math.abs(Number(e.block) - Number(block)) <= 3)
      .sort((a, b) => Math.abs(Number(a.block) - Number(block)) - Math.abs(Number(b.block) - Number(block)) || (a.receipt_date < b.receipt_date ? -1 : 1))
      .slice(0, 30);
    const nearTable = near.length ? `
      <div>
        <h3>Cases near your block</h3>
        <div class="table-scroll"><table class="data">
          <thead><tr><th>Block</th><th>Receipt date</th><th>State</th><th>Service center</th><th>Status</th><th>Approved</th><th>Days</th></tr></thead>
          <tbody>${near.map(e => {
            const d = waitDays(e, today);
            return `<tr${e.block === block ? ' class="row-hl"' : ""}>
              <td class="b">${esc(e.block)}</td><td>${fmtDate(e.receipt_date)}</td><td>${esc(e.state)}</td>
              <td>${esc(CENTER_SHORT[e.service_center] || e.service_center)}</td><td>${statusPill(e)}</td>
              <td>${fmtDate(e.approval_date)}</td><td>${isApproved(e) ? (d ?? "—") : isWaiting(e) ? `${d} so far` : "—"}</td></tr>`;
          }).join("")}</tbody>
        </table></div>
      </div>` : `<p>No cases within 3 blocks of yours yet.</p>`;

    $("#estimateResult").innerHTML = `<div class="est"><div class="est-lines">${lines.join("")}</div>${caution}${nearTable}</div>`;
    renderStrip();
    renderBlockBars();
    renderKM();
    renderBlocks();
    renderCases();
  }

  function setupEstimate() {
    $("#estimateForm").addEventListener("submit", ev => {
      ev.preventDefault();
      const block = $("#estBlock").value.trim();
      const receipt = $("#estReceipt").value;
      const err = $("#estError");
      $("#estBlock").classList.toggle("invalid", !/^\d{3}$/.test(block));
      $("#estReceipt").classList.toggle("invalid", !receipt);
      if (!/^\d{3}$/.test(block)) { err.textContent = "Enter the 3 digits after IOE09."; return; }
      if (!receipt || receipt > todayISO()) { err.textContent = "Choose your receipt date."; return; }
      err.textContent = "";
      renderEstimate(block, receipt);
    });
  }

  /* ---------- Add or update ---------- */

  const dlg = () => $("#caseDialog");
  let mode = "create";
  let editing = null;
  let openedAt = 0;
  let dupConfirmed = false;
  let turnstileId = null;

  function showStep(id) {
    for (const s of ["#stepAsk", "#stepFind", "#stepForm", "#stepDone"]) $(s).hidden = s !== id;
  }

  function openCaseDialog() {
    $("#findForm").reset();
    $("#matchList").innerHTML = "";
    $("#findError").textContent = "";
    showStep("#stepAsk");
    dlg().showModal();
  }

  function scoreMatch(e, q) {
    let s = 0;
    if (e.block === q.block) s += 4;
    if (e.receipt_date === q.receipt_date) s += 4;
    else if (Math.abs(daysBetween(e.receipt_date, q.receipt_date)) <= 3) s += 1;
    if (q.state && e.state === q.state) s += 2;
    if (q.app_type && e.app_type === q.app_type) s += 1;
    return s;
  }

  function matchCard(e) {
    const waiting = isWaiting(e);
    return `<div class="match">
      <div class="match-info">
        <span class="b">Block ${esc(e.block)}</span>
        <span class="match-meta">Received ${fmtDate(e.receipt_date)}, ${esc(e.state)}, ${esc(typeName(e.app_type))}${e.country ? `, born in ${esc(e.country)}` : ""}${e.bio_date ? `, biometrics ${fmtShort(e.bio_date)}` : ""}</span><br>
        ${statusPill(e)} ${waiting && e.last_checked ? `<span class="match-meta">last checked ${fmtShort(e.last_checked)}</span>` : ""}
      </div>
      <div class="match-actions">
        ${waiting ? `<button class="btn btn-sm" type="button" data-checkin="${esc(e.id)}">Still waiting, checked today</button>` : ""}
        <button class="btn btn-sm btn-primary" type="button" data-edit="${esc(e.id)}">This is me</button>
      </div>
    </div>`;
  }

  function findMatches(q) {
    return entries
      .map(e => ({ e, s: scoreMatch(e, q) }))
      .filter(x => x.s >= 6)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(x => x.e);
  }

  function onFind(ev) {
    ev.preventDefault();
    const q = {
      block: $("#findBlock").value.trim(), receipt_date: $("#findReceipt").value,
      state: $("#findState").value, app_type: $("#findType").value
    };
    if (!/^\d{3}$/.test(q.block)) { $("#findError").textContent = "Enter the 3 digits after IOE09."; return; }
    if (!q.receipt_date) { $("#findError").textContent = "Choose your receipt date."; return; }
    $("#findError").textContent = "";
    const matches = findMatches(q);
    $("#matchList").innerHTML =
      (matches.length ? `<p>Is one of these yours?</p>${matches.map(matchCard).join("")}`
                      : `<p class="none-found">No matching entry found. Check the block and receipt date, or add your case.</p>`) +
      `<p class="none-found"><button class="btn btn-sm" type="button" id="noneMine">None of these are mine, add my case</button></p>`;
    $("#noneMine").addEventListener("click", () => openForm("create", q));
  }

  function openForm(m, data) {
    mode = m;
    dupConfirmed = false;
    editing = m === "update" ? data : null;
    const form = $("#caseForm");
    form.reset();
    $$(".invalid", form).forEach(el => el.classList.remove("invalid"));
    $("#formError").textContent = "";
    $("#fExpedite").value = "no";
    for (const [k, v] of Object.entries(data || {})) {
      if (form.elements[k] && v !== undefined && v !== null && k !== "asc") form.elements[k].value = v;
    }
    buildAscOptions(form.state.value, data && data.asc ? data.asc : "");
    const locked = m === "update";
    $("#fBlock").readOnly = locked;
    $("#fReceipt").readOnly = locked;
    $("#formIntro").textContent = locked
      ? `Update what changed. Block and receipt date are locked. If they're wrong, email ${CONFIG.CONTACT_EMAIL || "us"} and we'll fix them.`
      : "Fill in what you know. Fields marked optional can be added later.";
    $("#caseSubmit").textContent = locked ? "Save changes" : "Add my case";
    toggleApproval();
    updateStatusHelp();
    showStep("#stepForm");
    openedAt = Date.now();
    renderTurnstile();
    $("#fBlock").focus();
  }

  function updateStatusHelp() {
    const st = STATUS_BY_V[$("#fStatus").value];
    if (!$("#statusHelp")) return;
    $("#statusHelp").textContent = st ? st.help : "Choose the one that matches your case today.";
  }

  function toggleApproval() {
    const s = STATUS_BY_V[$("#fStatus").value];
    const show = !!s && s.stage >= 10 && s.stage < 20;
    $("#approvalField").hidden = !show;
    if (!show) $("#fApproval").value = "";
  }

  function collect() {
    const f = $("#caseForm");
    const d = {};
    for (const k of ["block", "receipt_date", "state", "country", "app_type", "service_center", "asc", "bio_date", "bio_code", "status", "approval_date", "expedite"]) {
      d[k] = (f.elements[k].value || "").trim();
    }
    return d;
  }

  function validate(d) {
    const today = todayISO();
    const bad = [];
    const need = (ok, field, msg) => { if (!ok) bad.push([field, msg]); };
    need(/^\d{3}$/.test(d.block), "block", "Enter the 3 digits after IOE09.");
    need(!!d.receipt_date && d.receipt_date <= today, "receipt_date", "Choose a receipt date that isn't in the future.");
    need(!!d.state, "state", "Choose your state.");
    need(!!d.app_type, "app_type", "Choose initial or renewal.");
    // Required for new cases. Older entries saved without a country can still be updated without one.
    const countryOptional = mode === "update" && editing && !editing.country;
    need(!!d.country || countryOptional, "country", "Choose your country of birth.");
    need(!!d.service_center, "service_center", "Choose a service center, or Unknown.");
    need(!d.bio_date || !d.receipt_date || d.bio_date >= d.receipt_date, "bio_date", "Biometrics can't be before the receipt date.");
    need(!!d.status, "status", "Choose your current status.");
    const st = STATUS_BY_V[d.status];
    if (st && st.stage >= 10 && st.stage < 20) {
      need(!!d.approval_date, "approval_date", "Add your approval date.");
      need(!d.approval_date || (d.approval_date >= d.receipt_date && d.approval_date <= today), "approval_date", "The approval date must be between your receipt date and today.");
    }
    return bad;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const f = $("#caseForm");
    const d = collect();
    $$(".invalid", f).forEach(el => el.classList.remove("invalid"));
    const bad = validate(d);
    if (bad.length) {
      bad.forEach(([k]) => f.elements[k].classList.add("invalid"));
      $("#formError").textContent = bad[0][1];
      f.elements[bad[0][0]].focus();
      return;
    }

    if (mode === "create" && !dupConfirmed) {
      const dup = entries.find(e => e.block === d.block && e.receipt_date === d.receipt_date && e.state === d.state && e.app_type === d.app_type);
      if (dup) {
        $("#formError").innerHTML = `There's already an entry with the same block, receipt date, state and type. Is it yours?
          <button class="btn btn-sm" type="button" id="dupMine">Yes, update it</button>
          <button class="btn btn-sm btn-ghost" type="button" id="dupNot">No, add mine</button>`;
        $("#dupMine").onclick = () => openForm("update", dup);
        $("#dupNot").onclick = () => { dupConfirmed = true; $("#formError").textContent = ""; f.requestSubmit(); };
        return;
      }
    }

    const btn = $("#caseSubmit");
    btn.disabled = true;
    $("#formError").textContent = "";
    try {
      const payload = { data: d, website: f.elements.website.value, elapsed_ms: Date.now() - openedAt, turnstile: turnstileToken() };
      if (mode === "update") payload.id = editing.id;
      await apiPost(mode, payload);
      $("#doneText").textContent = mode === "create"
        ? "Your case was added. When your status changes, choose \"Add or update my case\" and enter the same block and receipt date to find it."
        : "Changes saved.";
      showStep("#stepDone");
      await refresh();
    } catch (err) {
      $("#formError").textContent = err.message || "Couldn't save. Try again.";
      resetTurnstile();
    } finally {
      btn.disabled = false;
    }
  }

  async function onCheckin(id, btn) {
    btn.disabled = true;
    try {
      await apiPost("checkin", { id });
      $("#doneText").textContent = "Thanks. Your entry now shows you checked today, which keeps the estimates accurate.";
      showStep("#stepDone");
      await refresh();
    } catch (err) {
      btn.disabled = false;
      $("#findError").textContent = err.message || "Couldn't save. Try again.";
    }
  }

  /* ---------- API ---------- */

  async function apiPost(action, payload) {
    if (DEMO) return demoApply(action, payload);
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
    let json;
    try { json = await res.json(); } catch { throw new Error("Couldn't reach the server. Try again."); }
    if (!json.ok) throw new Error(json.error || "Something went wrong. Try again.");
    return json;
  }

  function demoApply(action, p) {
    const today = todayISO();
    if (action === "create") {
      entries.push({ ...p.data, id: `demo-new-${Date.now()}`, last_checked: today, source: "" });
    } else if (action === "update") {
      const e = entries.find(x => x.id === p.id);
      if (e) Object.assign(e, { ...p.data, block: e.block, receipt_date: e.receipt_date, last_checked: today });
    } else if (action === "checkin") {
      const e = entries.find(x => x.id === p.id);
      if (e) e.last_checked = today;
    }
    return Promise.resolve({ ok: true });
  }

  async function refresh() {
    if (!DEMO) {
      try {
        const res = await fetch(`${API}?action=list&t=${Date.now()}`);
        const json = await res.json();
        if (json.ok) entries = (json.entries || []).map(normalize);
      } catch { /* keep current data */ }
    }
    renderAll();
    if (myBlock && $("#estReceipt").value) renderEstimate(myBlock, $("#estReceipt").value);
  }

  /* ---------- Turnstile (optional) ---------- */

  function loadTurnstile() {
    if (!CONFIG.TURNSTILE_SITE_KEY) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    document.head.appendChild(s);
  }
  function renderTurnstile() {
    if (!CONFIG.TURNSTILE_SITE_KEY || !window.turnstile) return;
    if (turnstileId !== null) { window.turnstile.reset(turnstileId); return; }
    turnstileId = window.turnstile.render("#turnstileBox", { sitekey: CONFIG.TURNSTILE_SITE_KEY });
  }
  function turnstileToken() {
    if (!CONFIG.TURNSTILE_SITE_KEY || !window.turnstile || turnstileId === null) return "";
    return window.turnstile.getResponse(turnstileId) || "";
  }
  function resetTurnstile() {
    if (window.turnstile && turnstileId !== null) window.turnstile.reset(turnstileId);
  }

  /* ---------- Theme ---------- */

  function setupTheme() {
    const btn = $("#themeBtn");
    const apply = t => {
      document.documentElement.setAttribute("data-theme", t);
      btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
      btn.title = btn.getAttribute("aria-label");
    };
    apply(document.documentElement.getAttribute("data-theme") || "light");
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem("theme", next); } catch { /* not saved, fine */ }
    });
    if (window.matchMedia) {
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ev => {
        let saved = null;
        try { saved = localStorage.getItem("theme"); } catch { /* ignore */ }
        if (!saved) apply(ev.matches ? "dark" : "light");
      });
    }
  }

  /* ---------- Sharing ---------- */

  const SHARE_URL = (CONFIG.SITE_URL || `${location.origin}${location.pathname}`).replace(/index\.html$/, "");
  const SHARE_TEXT = "Waiting for your J-2 EAD? Add your case to this community tracker and see which receipt blocks are being approved. More cases mean better estimates for everyone.";

  function setupShare() {
    const u = encodeURIComponent(SHARE_URL);
    const t = encodeURIComponent(SHARE_TEXT);
    const links = {
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      reddit: `https://www.reddit.com/submit?url=${u}&title=${encodeURIComponent("J-2 EAD Tracker: community I-765 (C05) timelines")}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`
    };
    $$("[data-share]").forEach(box => {
      const note = box.parentElement.querySelector("[data-share-note]");
      const say = msg => { if (note) { note.textContent = msg; setTimeout(() => { note.textContent = ""; }, 3000); } };
      $$("[data-share-net]", box).forEach(a => { a.href = links[a.dataset.shareNet]; });
      const nativeBtn = $("[data-share-native]", box);
      if (navigator.share) {
        nativeBtn.hidden = false;
        nativeBtn.addEventListener("click", () => {
          navigator.share({ title: "J-2 EAD Tracker", text: SHARE_TEXT, url: SHARE_URL }).catch(() => {});
        });
      }
      $("[data-share-copy]", box).addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(SHARE_URL);
          say("Link copied. Paste it in your group chat or a post.");
        } catch {
          window.prompt("Copy this link:", SHARE_URL);
        }
      });
    });
  }

  function renderShareCount() {
    if (!entries.length || DEMO) return;
    $("#shareCount").textContent = `${entries.length} cases so far. Every case added makes the estimates better for everyone, including you. Share the tracker with friends and groups who are waiting for their J-2 EAD.`;
  }

  /* ---------- Wiring ---------- */

  function wire() {
    $$("[data-open-case]").forEach(b => b.addEventListener("click", openCaseDialog));
    $("#askYes").addEventListener("click", () => { showStep("#stepFind"); $("#findBlock").focus(); });
    $("#askNo").addEventListener("click", () => openForm("create", {}));
    $("#findForm").addEventListener("submit", onFind);
    $("#matchList").addEventListener("click", ev => {
      const edit = ev.target.closest("[data-edit]");
      const chk = ev.target.closest("[data-checkin]");
      if (edit) openForm("update", entries.find(e => e.id === edit.dataset.edit));
      if (chk) onCheckin(chk.dataset.checkin, chk);
    });
    $("#caseForm").addEventListener("submit", onSubmit);
    $("#fStatus").addEventListener("change", () => { toggleApproval(); updateStatusHelp(); });
    $("#fState").addEventListener("change", ev => buildAscOptions(ev.target.value, $("#fAsc").value));
    for (const id of ["#fBlock", "#findBlock", "#estBlock"]) {
      $(id).addEventListener("input", ev => { ev.target.value = ev.target.value.replace(/\D/g, "").slice(0, 3); });
    }
    $$("dialog [data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
    $$("[data-close-link]").forEach(a => a.addEventListener("click", () => dlg().close()));

    const filters = $("#filters");
    filters.addEventListener("input", () => renderCases());
    filters.addEventListener("change", () => renderCases());
    filters.addEventListener("reset", () => setTimeout(renderCases));
    filters.block.addEventListener("input", ev => { ev.target.value = ev.target.value.replace(/\D/g, "").slice(0, 3); });
  }

  // Each step runs on its own, so one problem can't break the rest of the page.
  function safe(fn) { try { fn(); } catch (err) { console.error(err); } }
  safe(setupFooter);
  safe(setupTheme);
  safe(setupShare);
  safe(setupSelects);
  safe(setupEstimate);
  safe(wire);
  safe(loadTurnstile);
  load();
})();
