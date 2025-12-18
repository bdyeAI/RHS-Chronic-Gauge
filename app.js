
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTuXFJk8gTDEc9Mw2-TsE-M8PDzUFCyp5QhQ5E_FTn6HJ6uNEoRXECtvRz7km5CfYjPEJ9b2tEJ9iwW/pub?gid=1689179857&single=true&output=csv";

function $(id){ return document.getElementById(id); }

function parseCSV(text){
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i=0; i<text.length; i++){
    const ch = text[i];
    if (ch === '"'){
      if (inQ && text[i+1] === '"'){ cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ){
      row.push(cur); cur = "";
    } else if ((ch === '\n' || ch === '\r') && !inQ){
      if (cur.length || row.length){ row.push(cur); rows.push(row); }
      row = []; cur = "";
      if (ch === '\r' && text[i+1] === '\n') i++;
    } else {
      cur += ch;
    }
  }
  if (cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.map(r => r.map(c => (c ?? "").trim()));
}

function toNumber(v){
  const s = String(v ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[%\s]/g,'').replace(/,/g,'');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeKey(k){
  return String(k||"").toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function extractGaugeModel(rows){
  const kv = {};
  for (const r of rows){
    if (r.length < 2) continue;
    const key = normalizeKey(r[0]);
    const val = toNumber(r[1]);
    if (!key) continue;
    if (val !== null) kv[key] = val;
  }

  const pick = (...cands) => {
    for (const c of cands){
      const k = normalizeKey(c);
      if (kv[k] !== undefined) return kv[k];
      const found = Object.keys(kv).find(x => x.includes(k));
      if (found) return kv[found];
    }
    return null;
  };

  let score = pick("score","indicator score","current","value");
  let min = pick("min","minimum","low"); if (min === null) min = 0;
  let max = pick("max","maximum","high"); if (max === null) max = 100;
  let yellowStart = pick("yellow start","yellow begins","caution start","yellow");
  let greenStart  = pick("green start","green begins","good start","green");

  if (yellowStart === null) yellowStart = min + (max-min)*0.70;
  if (greenStart  === null) greenStart  = min + (max-min)*0.85;

  yellowStart = Math.max(min, Math.min(max, yellowStart));
  greenStart  = Math.max(min, Math.min(max, greenStart));
  if (greenStart < yellowStart){ const t=greenStart; greenStart=yellowStart; yellowStart=t; }

  if (score === null){
    for (const r of rows){
      for (const c of r){
        const n = toNumber(c);
        if (n !== null){ score = n; break; }
      }
      if (score !== null) break;
    }
  }
  if (score === null) score = min;
  score = Math.max(min, Math.min(max, score));

  return { score, min, max, yellowStart, greenStart };
}

function polarToXY(cx, cy, r, angDeg){
  const a = (angDeg - 90) * Math.PI/180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, r, startDeg, endDeg){
  const s = polarToXY(cx, cy, r, endDeg);
  const e = polarToXY(cx, cy, r, startDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function valueToAngle(v, min, max){
  const t = (v - min) / (max - min || 1);
  return -90 + t * 180;
}

function renderGauge(model){
  const svg = $("gauge");
  svg.innerHTML = "";

  const cx=500, cy=520, r=360, thick=48;
  const aMin = valueToAngle(model.min, model.min, model.max);
  const aY   = valueToAngle(model.yellowStart, model.min, model.max);
  const aG   = valueToAngle(model.greenStart, model.min, model.max);
  const aMax = valueToAngle(model.max, model.min, model.max);

  const ns = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs={}) => {
    const e = document.createElementNS(ns, tag);
    for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  svg.appendChild(mk("path", {
    d: arcPath(cx, cy, r, -90, 90),
    stroke: "#e9ebf2",
    "stroke-width": thick,
    "stroke-linecap":"round",
    fill:"none"
  }));

  [
    {d: arcPath(cx, cy, r, aMin, aY),   stroke:"var(--red)"},
    {d: arcPath(cx, cy, r, aY, aG),     stroke:"var(--yellow)"},
    {d: arcPath(cx, cy, r, aG, aMax),   stroke:"var(--green)"},
  ].forEach(seg => svg.appendChild(mk("path", {
    d: seg.d, stroke: seg.stroke,
    "stroke-width": thick, "stroke-linecap":"round", fill:"none"
  })));

  const labels = [
    {v:model.min,        text:String(model.min)},
    {v:model.yellowStart,text:String(Math.round(model.yellowStart))},
    {v:model.greenStart, text:String(Math.round(model.greenStart))},
    {v:model.max,        text:String(model.max)},
  ];
  labels.forEach(l => {
    const ang = valueToAngle(l.v, model.min, model.max);
    const p = polarToXY(cx, cy, r-70, ang);
    const t = mk("text", {
      x: p.x, y: p.y,
      "text-anchor":"middle",
      "dominant-baseline":"middle",
      "font-size":"26",
      fill:"#5b6270"
    });
    t.textContent = l.text;
    svg.appendChild(t);
  });

  const needleG = mk("g", {id:"needleG"});
  needleG.appendChild(mk("line", {
    x1: cx, y1: cy, x2: cx, y2: cy-(r-90),
    stroke:"#111827", "stroke-width":"10", "stroke-linecap":"round"
  }));
  needleG.appendChild(mk("circle", {cx, cy, r:"18", fill:"#111827"}));
  svg.appendChild(needleG);

  svg.appendChild(mk("path", {
    d: arcPath(cx, cy, r-78, -90, 90),
    stroke:"#dfe3ee", "stroke-width":"8", "stroke-linecap":"round",
    fill:"none", opacity:"0.9"
  }));

  const target = valueToAngle(model.score, model.min, model.max);
  const startAng = -90;
  const start = performance.now();
  const dur = 700;

  function frame(now){
    const t = Math.min(1, (now-start)/dur);
    const e = 1 - Math.pow(1-t, 3);
    const ang = startAng + (target - startAng) * e;
    needleG.setAttribute("transform", `rotate(${ang} ${cx} ${cy})`);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function setUI(model){
  $("scoreText").textContent = Number.isFinite(model.score) ? model.score.toFixed(1) : "—";
  const now = new Date();
  $("updatedText").textContent = `Last updated: ${now.toLocaleString()}`;

  $("minVal").textContent = model.min;
  $("maxVal").textContent = model.max;
  $("yStartVal").textContent = model.yellowStart.toFixed(1);
  $("gStartVal").textContent = model.greenStart.toFixed(1);

  $("redLabel").textContent    = `Red: ${model.min}–${model.yellowStart.toFixed(1)}`;
  $("yellowLabel").textContent = `Yellow: ${model.yellowStart.toFixed(1)}–${model.greenStart.toFixed(1)}`;
  $("greenLabel").textContent  = `Green: ${model.greenStart.toFixed(1)}–${model.max}`;
}

async function refresh(){
  try{
    $("status").textContent = "Updating from Google Sheets…";
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text);
    const model = extractGaugeModel(rows);
    renderGauge(model);
    setUI(model);
    $("status").textContent = "Up to date.";
  } catch (e){
    console.error(e);
    $("status").textContent = "Could not update (check connection).";
  }
}

if ("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}

refresh();
setInterval(refresh, 10 * 60 * 1000);
