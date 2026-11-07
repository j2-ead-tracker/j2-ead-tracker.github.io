/**
 * J-2 EAD Tracker backend (Google Apps Script).
 *
 * Setup:
 *  1. Create a Google Sheet with the project Gmail account.
 *  2. Extensions > Apps Script. Replace Code.gs with this file. Save.
 *  3. Choose the "setup" function and click Run once. Approve the permissions.
 *  4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *  5. Copy the web app URL (ends with /exec) into config.js as API_URL.
 *
 * Tabs:
 *  entries  - one row per case. Set "hidden" to TRUE to hide a row from the site.
 *  log      - every change with the values before and after, for reverting.
 *  reports  - reports sent from the site.
 */

const TZ = "America/New_York";
const MAX_WRITES_PER_MINUTE = 30;

const COLS = ["id", "created_at", "updated_at", "last_checked", "block", "receipt_date", "filed_date",
  "state", "app_type", "service_center", "asc", "bio_date", "bio_code", "status", "approval_date",
  "expedite", "hidden", "flagged", "source"];
const PUBLIC_COLS = ["id", "updated_at", "last_checked", "block", "receipt_date", "filed_date", "state",
  "app_type", "service_center", "asc", "bio_date", "bio_code", "status", "approval_date", "expedite", "source"];
const EDITABLE = ["filed_date", "state", "app_type", "service_center", "asc", "bio_date", "bio_code",
  "status", "approval_date", "expedite"];

const STATUS_STAGE = {
  received: 0, bio_scheduled: 1, fingerprints: 2, reviewing: 3, rfe_sent: 3, rfe_response: 3,
  transferred: 3, approved: 10, card_produced: 11, card_mailed: 12, card_delivered: 13, denied: 20
};
const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR GU VI MP AS".split(" ");
const CENTERS = ["PSC", "TSC", "NSC", "CSC", "VSC", "NBC", "HART", "UNK"];
const BIO_CODES = ["", "1", "2", "3", "5", "unsure"];
const REPORT_REASONS = ["duplicate", "wrong_info", "remove", "spam"];
const ASCS = {
  AK: "Anchorage", AL: "Birmingham", AR: "Fort Smith", AZ: "Phoenix|Tucson|Yuma",
  CA: "Bakersfield|Bellflower|Buena Park|El Monte|Fresno|Gardena|Imperial|La Brea|Modesto|Oakland|Oxnard|Pomona|Riverside|Sacramento|Salinas|San Diego|San Fernando|San Francisco|San Jose|San Marcos|Santa Rosa|Tustin|Wilshire",
  CO: "Denver", CT: "Hartford", DE: "Dover",
  FL: "Central Miami|Fort Myers|Ft. Lauderdale|Jacksonville|Kendall|North Miami|Orlando|Tampa|West Palm Beach",
  GA: "Atlanta", GU: "Agana", HI: "Honolulu", IA: "Des Moines", ID: "Boise",
  IL: "Chicago South|Naperville|Norridge|Waukegan", IN: "Indianapolis|Michigan City", KS: "Wichita",
  KY: "Louisville", LA: "New Orleans", MA: "Boston|Lawrence", MD: "Baltimore|Glenmont", ME: "Portland",
  MI: "Detroit|Grand Rapids", MN: "Duluth|St Paul", MO: "Kansas City|St Louis", MP: "Saipan", MS: "Jackson",
  MT: "Helena", NC: "Charlotte|Raleigh", ND: "Fargo", NE: "Omaha", NH: "Manchester", NJ: "Elizabeth|Hackensack",
  NM: "Albuquerque", NV: "Las Vegas|Reno",
  NY: "Albany|Bronx|Brooklyn|Buffalo|Hauppauge|Long Island City|Manhattan|Port Chester|Queens/Jamaica|Syracuse",
  OH: "Cincinnati|Cleveland|Columbus", OK: "Oklahoma City", OR: "Portland", PA: "Philadelphia|Pittsburgh|York",
  PR: "San Juan", RI: "Providence", SC: "Charleston|Greer", SD: "Rapid City|Sioux Falls", TN: "Memphis|Nashville",
  TX: "Austin|Dallas North|Dallas South|El Paso|Fort Worth|Harlingen|Houston NW|Houston SE|Houston SW|Laredo|Lubbock|McAllen|San Antonio",
  UT: "Salt Lake City", VA: "Alexandria|Norfolk", VI: "St Croix|St Thomas", VT: "Burlington",
  WA: "Seattle|Spokane|Yakima", WI: "Milwaukee", WV: "Charleston", WY: "Casper"
};
const ASC_SET = (function () {
  const s = { "": true, OTHER: true };
  Object.keys(ASCS).forEach(st => ASCS[st].split("|").forEach(c => { s[c + ", " + st] = true; }));
  return s;
})();

/* ---------- One-time setup ---------- */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, "entries", COLS);
  ensureSheet_(ss, "log", ["ts", "action", "id", "before", "after", "flag"]);
  ensureSheet_(ss, "reports", ["ts", "id", "reason", "handled"]);
}

function ensureSheet_(ss, name, headers) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.getRange(1, 1, sh.getMaxRows(), Math.max(headers.length, sh.getMaxColumns())).setNumberFormat("@");
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  sh.setFrozenRows(1);
  return sh;
}

/* ---------- HTTP ---------- */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";
  if (action !== "list") return json_({ ok: false, error: "Unknown action." });
  const cache = CacheService.getScriptCache();
  const hit = cache.get("list");
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  const entries = readAll_().rows
    .filter(r => !isTrue_(r.hidden))
    .map(r => { const o = {}; PUBLIC_COLS.forEach(k => { o[k] = r[k]; }); return o; });
  const text = JSON.stringify({ ok: true, generated_at: new Date().toISOString(), entries: entries });
  try { cache.put("list", text, 60); } catch (err) { /* too big for cache, fine */ }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "Bad request." }); }

  if (body.website) return json_({ ok: true });  // honeypot: pretend it worked
  if (!rateOk_()) return json_({ ok: false, error: "Too many submissions right now. Try again in a few minutes." });

  const writes = body.action === "create" || body.action === "update";
  if (writes && Number(body.elapsed_ms || 0) < 3000) {
    return json_({ ok: false, error: "That was fast. Take a moment to check your entry, then try again." });
  }
  if (writes && !turnstileOk_(body.turnstile)) {
    return json_({ ok: false, error: "The spam check didn't pass. Reload the page and try again." });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return json_({ ok: false, error: "The server is busy. Try again in a minute." });
  try {
    let res;
    switch (body.action) {
      case "create": res = create_(body.data || {}); break;
      case "update": res = update_(String(body.id || ""), body.data || {}); break;
      case "checkin": res = checkin_(String(body.id || "")); break;
      case "report": res = report_(String(body.id || ""), String(body.reason || "")); break;
      default: res = { ok: false, error: "Unknown action." };
    }
    if (res.ok) CacheService.getScriptCache().remove("list");
    return json_(res);
  } catch (err) {
    return json_({ ok: false, error: "Something went wrong on the server. Try again." });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Actions ---------- */

function create_(d) {
  const v = validate_(d);
  if (!v.ok) return v;
  const sig = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(v.rec)));
  const cache = CacheService.getScriptCache();
  if (cache.get("sig:" + sig)) return { ok: false, error: "This exact entry was just added. Refresh the page to see it." };

  const now = new Date().toISOString();
  const rec = Object.assign({}, v.rec, {
    id: Utilities.getUuid().replace(/-/g, "").slice(0, 10),
    created_at: now, updated_at: now, last_checked: today_(), hidden: "", flagged: "", source: ""
  });
  sheet_("entries").appendRow(COLS.map(k => rec[k] === undefined ? "" : String(rec[k])));
  log_("create", rec.id, "", rec, "");
  cache.put("sig:" + sig, "1", 600);
  return { ok: true, id: rec.id };
}

function update_(id, d) {
  const all = readAll_();
  const idx = all.rows.findIndex(r => r.id === id);
  if (idx < 0) return { ok: false, error: "That entry wasn't found. Refresh the page and try again." };
  const before = all.rows[idx];
  if (isTrue_(before.hidden)) return { ok: false, error: "That entry was removed." };

  // Block and receipt date are locked after the first entry.
  const merged = Object.assign({}, d, { block: before.block, receipt_date: before.receipt_date });
  const v = validate_(merged);
  if (!v.ok) return v;

  const flags = [];
  const oldStage = stage_(before.status), newStage = stage_(v.rec.status);
  if (oldStage >= 10 && oldStage < 20 && newStage < 10) flags.push("approved_to_waiting");
  if ((oldStage === 20 && newStage >= 10 && newStage < 20) || (oldStage >= 10 && oldStage < 20 && newStage === 20)) flags.push("approved_denied_switch");
  if (before.approval_date && v.rec.approval_date && before.approval_date !== v.rec.approval_date) flags.push("approval_date_changed");
  if (before.state !== v.rec.state || before.app_type !== v.rec.app_type) flags.push("identity_changed");

  const after = Object.assign({}, before);
  EDITABLE.forEach(k => { after[k] = v.rec[k]; });
  after.updated_at = new Date().toISOString();
  after.last_checked = today_();
  if (flags.length) after.flagged = (before.flagged ? before.flagged + "; " : "") + flags.join(", ");

  writeRow_(all.sheet, idx, after);
  log_("update", id, before, after, flags.join(", "));
  return { ok: true, id: id };
}

function checkin_(id) {
  const all = readAll_();
  const idx = all.rows.findIndex(r => r.id === id);
  if (idx < 0) return { ok: false, error: "That entry wasn't found. Refresh the page and try again." };
  const before = all.rows[idx];
  if (isTrue_(before.hidden)) return { ok: false, error: "That entry was removed." };
  if (stage_(before.status) >= 10) return { ok: true, id: id };
  const after = Object.assign({}, before, { last_checked: today_(), updated_at: new Date().toISOString() });
  writeRow_(all.sheet, idx, after);
  log_("checkin", id, { last_checked: before.last_checked }, { last_checked: after.last_checked }, "");
  return { ok: true, id: id };
}

function report_(id, reason) {
  if (REPORT_REASONS.indexOf(reason) < 0) return { ok: false, error: "Choose a reason." };
  const exists = readAll_().rows.some(r => r.id === id);
  if (!exists) return { ok: false, error: "That entry wasn't found." };
  sheet_("reports").appendRow([new Date().toISOString(), id, reason, ""]);
  return { ok: true };
}

/* ---------- Validation ---------- */

function validate_(d) {
  const s = k => (d[k] === undefined || d[k] === null ? "" : String(d[k]).trim());
  const rec = {};
  ["block", "receipt_date", "filed_date", "state", "app_type", "service_center", "asc", "bio_date",
    "bio_code", "status", "approval_date", "expedite"].forEach(k => { rec[k] = s(k); });
  const today = today_();
  const fail = msg => ({ ok: false, error: msg });

  if (!/^\d{3}$/.test(rec.block)) return fail("Enter the 3 digits after IOE09.");
  if (!isDate_(rec.receipt_date) || rec.receipt_date < "2020-01-01" || rec.receipt_date > addDays_(today, 1)) return fail("Check your receipt date.");
  if (rec.filed_date && (!isDate_(rec.filed_date) || rec.filed_date > rec.receipt_date || rec.filed_date < addDays_(rec.receipt_date, -90))) return fail("Check your filed date. It should be on or before the receipt date.");
  if (STATES.indexOf(rec.state) < 0) return fail("Choose your state.");
  if (["initial", "renewal"].indexOf(rec.app_type) < 0) return fail("Choose initial or renewal.");
  if (CENTERS.indexOf(rec.service_center) < 0) return fail("Choose a service center, or Unknown.");
  if (!ASC_SET[rec.asc]) return fail("Choose a biometrics location from the list.");
  if (rec.bio_date && (!isDate_(rec.bio_date) || rec.bio_date < rec.receipt_date || rec.bio_date > addDays_(today, 180))) return fail("Check your biometrics date.");
  if (BIO_CODES.indexOf(rec.bio_code) < 0) return fail("Choose a biometrics code.");
  if (!(rec.status in STATUS_STAGE)) return fail("Choose your current status.");
  const st = STATUS_STAGE[rec.status];
  if (st >= 10 && st < 20) {
    if (!isDate_(rec.approval_date) || rec.approval_date < rec.receipt_date || rec.approval_date > addDays_(today, 1)) return fail("Add an approval date between your receipt date and today.");
  } else {
    rec.approval_date = "";
  }
  if (["no", "yes"].indexOf(rec.expedite) < 0) return fail("Choose whether you requested an expedite.");
  return { ok: true, rec: rec };
}

/* ---------- Admin helpers (run from the editor) ---------- */

// Restores an entry to how it was before its most recent change.
// Paste the entry id below, then Run.
function revertLastChange() {
  const ID = "paste-entry-id-here";
  const logRows = sheet_("log").getDataRange().getValues();
  for (let i = logRows.length - 1; i >= 1; i--) {
    if (logRows[i][2] === ID && logRows[i][1] === "update" && logRows[i][3]) {
      const before = JSON.parse(logRows[i][3]);
      const all = readAll_();
      const idx = all.rows.findIndex(r => r.id === ID);
      if (idx < 0) throw new Error("Entry not found.");
      before.updated_at = new Date().toISOString();
      writeRow_(all.sheet, idx, before);
      log_("revert", ID, all.rows[idx], before, "");
      CacheService.getScriptCache().remove("list");
      return;
    }
  }
  throw new Error("No update found in the log for that id.");
}

// Clears the cached list so manual edits in the sheet show up right away.
function clearCache() {
  CacheService.getScriptCache().remove("list");
}

/* ---------- Helpers ---------- */

function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function readAll_() {
  const sh = sheet_("entries");
  const values = sh.getDataRange().getValues();
  const head = values[0].map(String);
  const rows = values.slice(1).map(row => {
    const o = {};
    head.forEach((h, i) => { o[h] = cell_(row[i]); });
    if (o.block) o.block = ("000" + o.block).slice(-3);
    return o;
  });
  return { sheet: sh, head: head, rows: rows };
}

function cell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, "yyyy-MM-dd");
  return v === null || v === undefined ? "" : String(v).trim();
}

function writeRow_(sh, idx, obj) {
  sh.getRange(idx + 2, 1, 1, COLS.length).setValues([COLS.map(k => obj[k] === undefined ? "" : String(obj[k]))]);
}

function log_(action, id, before, after, flag) {
  sheet_("log").appendRow([new Date().toISOString(), action, id,
    before ? JSON.stringify(before) : "", after ? JSON.stringify(after) : "", flag || ""]);
}

function stage_(status) { return status in STATUS_STAGE ? STATUS_STAGE[status] : 0; }
function isTrue_(v) { return v === true || String(v).toUpperCase() === "TRUE"; }
function isDate_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const p = s.split("-").map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}
function today_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }
function addDays_(iso, n) {
  const p = iso.split("-").map(Number);
  return new Date(Date.UTC(p[0], p[1] - 1, p[2]) + n * 86400000).toISOString().slice(0, 10);
}

function rateOk_() {
  const cache = CacheService.getScriptCache();
  const key = "rate:" + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= MAX_WRITES_PER_MINUTE;
}

function turnstileOk_(token) {
  const secret = PropertiesService.getScriptProperties().getProperty("TURNSTILE_SECRET");
  if (!secret) return true;
  if (!token) return false;
  const res = UrlFetchApp.fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "post", payload: { secret: secret, response: token }, muteHttpExceptions: true
  });
  try { return JSON.parse(res.getContentText()).success === true; } catch (err) { return false; }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
