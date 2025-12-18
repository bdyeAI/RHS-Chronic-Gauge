const CSV_URL="https://docs.google.com/spreadsheets/d/e/2PACX-1vTuXFJk8gTDEc9Mw2-TsE-M8PDzUFCyp5QhQ5E_FTn6HJ6uNEoRXECtvRz7km5CfYjPEJ9b2tEJ9iwW/pub?gid=1689179857&single=true&output=csv";
let lastAngle=null;

const COLORS = {
  base: "#e5e7eb",
  red: "#d64545",
  yellow: "#f4b400",
  green: "#0f9d58",
  needle: "#111111"
};

const $=id=>document.getElementById(id);

function parseCSV(t){
 const r=[]; let row=[],cur="",q=false;
 for(let i=0;i<t.length;i++){
  const c=t[i];
  if(c=='"') q=!q;
  else if(c==','&&!q){row.push(cur);cur="";}
  else if((c=='\n'||c=='\r')&&!q){if(cur||row.length){row.push(cur);r.push(row)}row=[];cur="";}
  else cur+=c;
 }
 if(cur||row.length){row.push(cur);r.push(row)}
 return r.map(x=>x.map(y=>y.trim()));
}

function extract(rows){
 const m={};
 rows.forEach(r=>{ if(r.length>=2) m[r[0].toLowerCase()] = parseFloat(r[1]); });
 if(["current score","min value","max value","red start","yellow start","green start"].some(k=>!(k in m)))
   throw new Error("Missing required rows in sheet");
 return {
  score:m["current score"],
  min:m["min value"],
  max:m["max value"],
  red:m["red start"],
  yellow:m["yellow start"],
  green:m["green start"]
 };
}

function angle(v,min,max){ return -90 + ((v-min)/(max-min))*180; }
function polar(cx,cy,r,a){ const rad=(a-90)*Math.PI/180; return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}; }
function arc(cx,cy,r,a1,a2){ const s=polar(cx,cy,r,a2), e=polar(cx,cy,r,a1); return `M ${s.x} ${s.y} A ${r} ${r} 0 0 0 ${e.x} ${e.y}`; }

function draw(g){
 const svg=$("gauge"); svg.innerHTML="";
 const cx=500,cy=520,r=360,w=44;
 const aR=angle(g.red,g.min,g.max),
       aY=angle(g.yellow,g.min,g.max),
       aG=angle(g.green,g.min,g.max),
       aM=angle(g.max,g.min,g.max);

 const mk=(d,clr)=>{ const p=document.createElementNS("http://www.w3.org/2000/svg","path"); p.setAttribute("d",d); p.setAttribute("stroke",clr); p.setAttribute("stroke-width",w); p.setAttribute("fill","none"); p.setAttribute("stroke-linecap","round"); svg.appendChild(p); };

 mk(arc(cx,cy,r,-90,90), COLORS.base);
 mk(arc(cx,cy,r,aR,aY), COLORS.red);
 mk(arc(cx,cy,r,aY,aG), COLORS.yellow);
 mk(arc(cx,cy,r,aG,aM), COLORS.green);

 const needle=document.createElementNS("http://www.w3.org/2000/svg","line");
 needle.setAttribute("x1",cx); needle.setAttribute("y1",cy);
 needle.setAttribute("x2",cx); needle.setAttribute("y2",cy-(r-90));
 needle.setAttribute("stroke",COLORS.needle); needle.setAttribute("stroke-width","8");
 svg.appendChild(needle);

 const target=angle(g.score,g.min,g.max);
 const start=lastAngle??-90; lastAngle=target;
 let t0=null;
 function anim(ts){
  if(!t0) t0=ts;
  const p=Math.min((ts-t0)/500,1);
  const a=start+(target-start)*p;
  needle.setAttribute("transform",`rotate(${a} ${cx} ${cy})`);
  if(p<1) requestAnimationFrame(anim);
 }
 requestAnimationFrame(anim);
}

async function refresh(){
 try{
  $("status").textContent="Updating…";
  const res=await fetch(CSV_URL+"&_="+Date.now(),{cache:"no-store"});
  const rows=parseCSV(await res.text());
  const g=extract(rows);
  draw(g);
  $("scoreText").textContent=g.score.toFixed(2);
  $("zoneText").textContent=g.score<g.yellow?"RED":g.score<g.green?"YELLOW":"GREEN";
  $("updatedText").textContent=new Date().toLocaleString();
  $("status").textContent="Up to date";
 } catch(e){
  console.error(e);
  $("status").textContent="Data error – check sheet";
 }
}

refresh();
setInterval(refresh,120000);
