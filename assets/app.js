(function () {
  "use strict";

  const CONFIG = window.TRACKER_CONFIG || {};
  const API = (CONFIG.API_URL || "").trim();
  const DEMO = !API;
  const PAGE_SIZE = 50;
  const APP_VERSION = "1.0.4";

  let entries = [];
  let shown = PAGE_SIZE;
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
    fillSelect($("#fStatus"), STATUSES.map(s => [s.v, s.label]));
    const key = $("#statusKey");
    if (key) key.innerHTML = STATUSES.map(s => `<dt>${esc(s.label)}</dt><dd>${esc(s.help)}</dd>`).join("");
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

  function normalize(e) {
    const out = { ...e };
    out.block = String(e.block ?? "").padStart(3, "0").slice(-3);
    for (const k of ["receipt_date", "filed_date", "bio_date", "approval_date", "last_checked", "updated_at"]) {
      out[k] = e[k] ? String(e[k]).slice(0, 10) : "";
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
    renderKM();
    renderBlocks();
    renderCases();
  }

  function renderHero(failed) {
    const { highest, latest } = frontOfLine(entries);
    const approved = entries.filter(isApproved).length;
    const waiting = entries.filter(isWaiting).length;
    const denied = entries.filter(isDenied).length;
    if (!failed) {
      if (highest) {
        $("#ticketBlock").textContent = highest.block;
        $("#ticketNote").textContent = latest.id === highest.id
          ? `Approved ${fmtDate(highest.approval_date)}, the most recent approval reported. Expedited cases aren't counted here.`
          : `Approved ${fmtDate(highest.approval_date)}. The most recent approval reported was ${fmtDate(latest.approval_date)}, block ${latest.block}. Expedited cases aren't counted here.`;
      } else {
        $("#ticketBlock").textContent = "···";
        $("#ticketNote").textContent = entries.length
          ? "No approvals reported yet. Add your case so others can see the line move."
          : "No cases yet. Add yours to get the tracker started.";
      }
    }
    $("#summaryLine").textContent = entries.length
      ? `Based on ${entries.length} reported cases: ${approved} approved, ${waiting} still waiting${denied ? `, ${denied} denied` : ""}.`
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
      let cls = "none", text = "no reports";
      if (s) {
        if (s.approved > 0 && s.waiting === 0) cls = "done";
        else if (s.approved > 0) cls = "some";
        else if (s.waiting > 0) cls = "wait";
        text = `${s.total} case${s.total > 1 ? "s" : ""}, ${s.approved} approved, ${s.waiting} waiting`;
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
        shown = PAGE_SIZE;
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
    const rows = blockSummary(entries);
    $("#blockTable tbody").innerHTML = rows.length ? rows.map(r => `
      <tr${myBlock === r.block ? ' class="row-hl"' : ""}>
        <td class="b">${esc(r.block)}</td>
        <td>${r.total}</td>
        <td>${r.approved}</td>
        <td>${r.waiting}</td>
        <td>${r.medianDays ?? "—"}</td>
        <td>${fmtDate(r.latestApproval)}</td>
      </tr>`).join("") : `<tr><td colspan="6">No blocks yet.</td></tr>`;
  }

  function statusPill(e) {
    const s = STATUS_BY_V[e.status];
    const label = s ? s.label : e.status;
    const cls = isApproved(e) ? "ok" : isDenied(e) ? "no" : "wait";
    return `<span class="pill ${cls}">${esc(label)}</span>`;
  }

  function filteredCases() {
    const f = $("#filters");
    const q = {
      block: f.block.value.trim(), service_center: f.service_center.value, state: f.state.value,
      app_type: f.app_type.value, group: f.group.value, expedite: f.expedite.value
    };
    return entries.filter(e =>
      (!q.block || e.block.startsWith(q.block)) &&
      (!q.service_center || e.service_center === q.service_center) &&
      (!q.state || e.state === q.state) &&
      (!q.app_type || e.app_type === q.app_type) &&
      (!q.expedite || e.expedite === q.expedite) &&
      (!q.group || (q.group === "approved" ? isApproved(e) : q.group === "denied" ? isDenied(e) : isWaiting(e)))
    ).sort((a, b) => Number(b.block) - Number(a.block) || (b.receipt_date > a.receipt_date ? 1 : -1));
  }

  function renderCases() {
    const today = todayISO();
    const list = filteredCases();
    $("#caseCount").textContent = `${list.length} of ${entries.length} cases`;
    const rows = list.slice(0, shown).map(e => {
      const days = waitDays(e, today);
      const daysText = isApproved(e) ? days : isWaiting(e) ? `${days} so far` : "—";
      return `<tr${myBlock === e.block ? ' class="row-hl"' : ""}>
        <td class="b">${esc(e.block)}${e.source === "reddit" ? '<span class="src" title="Imported from a public Reddit thread">Reddit</span>' : ""}</td>
        <td>${fmtDate(e.receipt_date)}</td>
        <td>${esc(e.state)}</td>
        <td>${esc(CENTER_SHORT[e.service_center] || e.service_center)}</td>
        <td>${e.bio_date ? fmtShort(e.bio_date) : "—"}${e.asc && e.asc !== "OTHER" ? `<br><span class="src">${esc(e.asc)}</span>` : ""}</td>
        <td>${esc(typeName(e.app_type))}</td>
        <td>${statusPill(e)}</td>
        <td>${fmtDate(e.approval_date)}</td>
        <td>${daysText}</td>
        <td>${e.expedite === "yes" ? "Yes" : "No"}</td>
        <td>${isWaiting(e) ? fmtShort(e.last_checked) : "—"}</td>
      </tr>`;
    });
    $("#caseTable tbody").innerHTML = rows.length ? rows.join("") : `<tr><td colspan="11">No cases match these filters.</td></tr>`;
    $("#showMore").hidden = list.length <= shown;
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
    const { highest } = frontOfLine(entries);

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
              <td>${fmtDate(e.approval_date)}</td><td>${isApproved(e) ? d : isWaiting(e) ? `${d} so far` : "—"}</td></tr>`;
          }).join("")}</tbody>
        </table></div>
      </div>` : `<p>No cases within 3 blocks of yours yet.</p>`;

    $("#estimateResult").innerHTML = `<div class="est"><div class="est-lines">${lines.join("")}</div>${caution}${nearTable}</div>`;
    renderStrip();
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
        <span class="match-meta">Received ${fmtDate(e.receipt_date)}, ${esc(e.state)}, ${esc(typeName(e.app_type))}${e.bio_date ? `, biometrics ${fmtShort(e.bio_date)}` : ""}</span><br>
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
    $("#statusHelp").textContent = st ? st.help : "Pick the latest status shown in your USCIS account.";
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
    for (const k of ["block", "receipt_date", "state", "app_type", "service_center", "asc", "bio_date", "bio_code", "status", "approval_date", "expedite"]) {
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
    filters.addEventListener("input", () => { shown = PAGE_SIZE; renderCases(); });
    filters.addEventListener("change", () => { shown = PAGE_SIZE; renderCases(); });
    filters.addEventListener("reset", () => setTimeout(() => { shown = PAGE_SIZE; renderCases(); }));
    filters.block.addEventListener("input", ev => { ev.target.value = ev.target.value.replace(/\D/g, "").slice(0, 3); });
    $("#showMore").addEventListener("click", () => { shown += PAGE_SIZE; renderCases(); });
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
