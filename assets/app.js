/* ==========================================================================
   CycloneAI — prototype front-end
   SIH26070 · TechNova · detection → classification → short-term prediction
   ========================================================================== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const el = (t, a={}, ...kids) => {
  const n = document.createElement(t);
  for (const [k,v] of Object.entries(a)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  kids.flat().forEach(c => n.append(c?.nodeType ? c : document.createTextNode(c)));
  return n;
};
const clsOf = id => CLASSES.find(c => c.id === id) || { name:'—', color:'#64748b' };
const clsForWind = w => CLASSES.find(c => w >= c.min && w <= c.max) || CLASSES[0];

/* ======================= schematic basin map ============================= */
const MAP = { lon0:63, lon1:98, lat0:2, lat1:26 };
function proj(lon, lat, w, h){
  return [ (lon-MAP.lon0)/(MAP.lon1-MAP.lon0)*w, (MAP.lat1-lat)/(MAP.lat1-MAP.lat0)*h ];
}
function path(pts, w, h){
  return pts.map((p,i) => (i?'L':'M') + proj(p[0],p[1],w,h).map(n=>n.toFixed(1)).join(' ')).join(' ');
}

let __mapN = 0;
function renderMap(host, opt={}){
  const w = 980, h = 660, U = 'm'+(++__mapN);
  const svg = `
  <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block">
    <defs>
      <linearGradient id="${U}-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#08192e"/><stop offset="1" stop-color="#040d1c"/>
      </linearGradient>
      <linearGradient id="${U}-land" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#16243a"/><stop offset="1" stop-color="#101a2c"/>
      </linearGradient>
      <radialGradient id="${U}-cone"><stop offset="0" stop-color="#38bdf855"/><stop offset="1" stop-color="#38bdf80a"/></radialGradient>
      <filter id="${U}-glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge>
        <feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${U}-sea)"/>
    ${grid(w,h)}
    <path d="${path(GEO.india,w,h)} Z" fill="url(#${U}-land)" stroke="#2c4a70" stroke-width="1"/>
    <path d="${path(GEO.lanka,w,h)} Z" fill="url(#${U}-land)" stroke="#2c4a70" stroke-width="1"/>
    ${GEO.basins.map(b => {
      const [x,y] = proj(b.lon,b.lat,w,h);
      return `<text x="${x}" y="${y}" fill="#31507d" font-size="13" letter-spacing="3"
               text-anchor="middle" font-family="ui-monospace,monospace">${b.name}</text>`;
    }).join('')}
    ${opt.plain ? '' : overlay(w,h,opt,U)}
  </svg>`;
  host.innerHTML = svg;
}

function grid(w,h){
  let s = '';
  for (let lon = 65; lon <= 95; lon += 5){
    const [x] = proj(lon, 0, w, h);
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#12233d" stroke-width="1"/>
          <text x="${x+4}" y="${h-8}" fill="#24405f" font-size="10" font-family="ui-monospace,monospace">${lon}°E</text>`;
  }
  for (let lat = 5; lat <= 25; lat += 5){
    const [,y] = proj(0, lat, w, h);
    s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#12233d" stroke-width="1"/>
          <text x="6" y="${y-5}" fill="#24405f" font-size="10" font-family="ui-monospace,monospace">${lat}°N</text>`;
  }
  return s;
}

/* storm track, forecast cone, marker */
function overlay(w,h,opt,U){
  const A = ACTIVE, obs = A.track, fc = A.forecast;
  const P = (p) => proj(p.lon, p.lat, w, h);
  const kmToPx = km => km / 111 * (w / (MAP.lon1 - MAP.lon0));

  /* uncertainty cone */
  const conePts = [];
  const back = [];
  const chain = [{...obs.at(-1), err:12}, ...fc];
  chain.forEach(p => {
    const [x,y] = P(p), r = kmToPx(p.err);
    conePts.push([x, y - r]); back.unshift([x, y + r]);
  });
  const cone = [...conePts, ...back].map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')+'Z';

  const obsLine = obs.map((p,i)=>(i?'L':'M')+P(p).map(n=>n.toFixed(1)).join(' ')).join(' ');
  const fcLine  = [obs.at(-1), ...fc].map((p,i)=>(i?'L':'M')+P(p).map(n=>n.toFixed(1)).join(' ')).join(' ');
  const [cx,cy] = P(obs.at(-1));
  const [lx,ly] = proj(A.landfall.lon, A.landfall.lat, w, h);

  const dots = obs.map(p=>{
    const [x,y]=P(p), c=clsForWind(p.wind).color;
    return `<circle cx="${x}" cy="${y}" r="4.5" fill="${c}" stroke="#04101f" stroke-width="1.5"/>`;
  }).join('') + fc.map((p,i)=>{
    const [x,y]=P(p), c=clsForWind(p.wind).color, left = i%2===1;
    return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${c}" stroke-width="2"/>
            ${[12,24,36].includes(p.t) ? `<text x="${left?x-11:x+11}" y="${y+4}"
              text-anchor="${left?'end':'start'}" fill="#9fb3d1" font-size="10.5"
              font-family="ui-monospace,monospace"
              style="paint-order:stroke;stroke:#061020;stroke-width:3px">+${p.t}h · ${p.wind}kt</text>` : ''}`;
  }).join('');

  return `
  <path d="${cone}" fill="url(#${U}-cone)" stroke="#38bdf855" stroke-width="1" stroke-dasharray="4 4"/>
  <path d="${obsLine}" fill="none" stroke="#f43f5e" stroke-width="2.6" stroke-linecap="round"/>
  <path d="${fcLine}" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-dasharray="7 6" stroke-linecap="round"/>
  ${dots}
  <g filter="url(#${U}-glow)">
    <circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="#f43f5e" stroke-width="2">
      <animate attributeName="r" values="14;30;14" dur="2.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".95;0;.95" dur="2.6s" repeatCount="indefinite"/>
    </circle>
    <g transform="translate(${cx} ${cy})">
      <g>
        <path d="M0-3 C7-3 13-9 13-16 C4-16 0-10 0-3 Z" fill="#f43f5e"/>
        <path d="M0 3 C-7 3 -13 9 -13 16 C-4 16 0 10 0 3 Z" fill="#f43f5e"/>
        <circle r="3" fill="#fff"/>
        <animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="5s" repeatCount="indefinite"/>
      </g>
    </g>
  </g>
  <text x="${cx+22}" y="${cy-10}" fill="#fecdd3" font-size="13" font-weight="700">TC ${A.name}</text>
  <text x="${cx+22}" y="${cy+6}" fill="#fda4af" font-size="11" font-family="ui-monospace,monospace">
    ${obs.at(-1).wind} kt · ${obs.at(-1).pres} hPa</text>
  <g>
    <circle cx="${lx}" cy="${ly}" r="7" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <line x1="${lx-11}" y1="${ly}" x2="${lx+11}" y2="${ly}" stroke="#fbbf24" stroke-width="1.4"/>
    <line x1="${lx}" y1="${ly-11}" x2="${lx}" y2="${ly+11}" stroke="#fbbf24" stroke-width="1.4"/>
    <text x="${lx-16}" y="${ly-14}" text-anchor="end" fill="#fcd34d" font-size="11" font-weight="650"
      style="paint-order:stroke;stroke:#061020;stroke-width:3px">EST. LANDFALL ${A.landfall.eta}</text>
  </g>`;
}

/* ======================= procedural IR satellite scene =================== */
function drawSatellite(cv, spin=0){
  const n = cv.width, ctx = cv.getContext('2d'), img = ctx.createImageData(n,n);
  const d = img.data, cx = n*0.5, cy = n*0.5, eye = n*0.055;
  const hash = (x,y) => {
    const s = Math.sin(x*127.1 + y*311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise = (x,y) => {
    const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
    return (hash(xi,yi)*(1-u)+hash(xi+1,yi)*u)*(1-v) + (hash(xi,yi+1)*(1-u)+hash(xi+1,yi+1)*u)*v;
  };
  const fbm = (x,y) => noise(x,y)*.55 + noise(x*2.1,y*2.1)*.27 + noise(x*4.3,y*4.3)*.13 + noise(x*8.7,y*8.7)*.05;

  for (let y=0; y<n; y++) for (let x=0; x<n; x++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy), a=Math.atan2(dy,dx);
    /* logarithmic spiral bands */
    const spiral = Math.sin(a*2 + Math.log(Math.max(r,4))*3.4 - spin) * 0.5 + 0.5;
    const arms   = Math.sin(a*3 + Math.log(Math.max(r,4))*2.2 - spin*0.7) * 0.5 + 0.5;
    const ring   = Math.exp(-Math.pow((r - n*0.115)/(n*0.055), 2));  /* tight eyewall */
    const inner  = Math.exp(-Math.pow((r - n*0.24)/(n*0.14), 2));    /* inner rainbands */
    const outer  = Math.exp(-Math.pow(r/(n*0.42), 2.4));
    const sh = Math.pow(spiral, 2.2), ah = Math.pow(arms, 2.6);
    let v = ring*1.55 + inner*0.78*(0.18+0.82*sh) + outer*0.95*(0.05+0.95*ah)
          + outer*0.16;                                   /* faint cirrus shield */
    v *= 0.60 + 0.66*fbm(x/20 + spin, y/20);
    v = Math.pow(v * 0.52, 1.08);                        /* keep the IR table in range */
    if (r < eye) v *= 0.04 + 0.16*(r/eye);                          /* clear eye */
    else if (r < eye*1.35) v *= 0.25 + 0.75*((r-eye)/(eye*0.35));
    if (r > n*0.47) v *= Math.max(0, 1-(r-n*0.47)/(n*0.06));
    v = Math.min(1, Math.max(0, v));

    /* enhanced-IR colour table: grey → yellow → orange → red → magenta */
    let R,G,B;
    if (v < 0.46){ const t=v/0.46; R=G=B=8 + t*195; }
    else if (v < 0.64){ const t=(v-0.46)/0.18; R=203+t*49; G=203+t*9;  B=203-t*163; }
    else if (v < 0.78){ const t=(v-0.64)/0.14; R=252;      G=212-t*102;B=40; }
    else if (v < 0.90){ const t=(v-0.78)/0.12; R=252-t*44; G=110-t*86; B=40+t*18; }
    else { const t=(v-0.90)/0.10; R=208+t*30;  G=24+t*24;  B=58+t*130; }
    const i=(y*n+x)*4;
    d[i]=R; d[i+1]=G; d[i+2]=B; d[i+3]=255;
  }
  ctx.putImageData(img,0,0);

  /* detection box + centre fix from the "CNN" */
  const box = n*0.62;
  ctx.strokeStyle='#4ade80'; ctx.lineWidth=2; ctx.setLineDash([9,6]);
  ctx.strokeRect(cx-box/2, cy-box/2, box, box); ctx.setLineDash([]);
  ctx.fillStyle='#4ade80'; ctx.font=`600 ${Math.round(n*0.031)}px ui-monospace,monospace`;
  ctx.fillText('CYCLONE  p=0.97', cx-box/2, cy-box/2-8);
  ctx.strokeStyle='#22d3ee'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.moveTo(cx-16,cy); ctx.lineTo(cx+16,cy);
  ctx.moveTo(cx,cy-16); ctx.lineTo(cx,cy+16); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,eye*1.9,0,7); ctx.stroke();
  ctx.fillStyle='#67e8f9'; ctx.font=`${Math.round(n*0.026)}px ui-monospace,monospace`;
  ctx.fillText('centre fix  16.1°N 85.9°E', cx-box/2, cy+box/2+18);
}

/* ======================= tiny SVG chart kit ============================== */
function lineChart(host, series, o={}){
  const w=o.w||620, h=o.h||220, pl=44, pr=16, pt=14, pb=28;
  const all = series.flatMap(s=>s.pts);
  const xs = all.map(p=>p[0]), ys = all.map(p=>p[1]);
  const x0=o.x0??Math.min(...xs), x1=o.x1??Math.max(...xs);
  const y0=o.y0??Math.min(...ys)*0.94, y1=o.y1??Math.max(...ys)*1.06;
  const X=v=>pl+(v-x0)/(x1-x0||1)*(w-pl-pr), Y=v=>pt+(1-(v-y0)/(y1-y0||1))*(h-pt-pb);
  let g='';
  for(let i=0;i<=4;i++){
    const v=y0+(y1-y0)*i/4, y=Y(v);
    g+=`<line x1="${pl}" y1="${y}" x2="${w-pr}" y2="${y}" stroke="#16213a"/>
        <text x="${pl-8}" y="${y+4}" text-anchor="end" fill="#4a5f85" font-size="10"
          font-family="ui-monospace,monospace">${v.toFixed(0)}</text>`;
  }
  (o.xticks||[]).forEach(t=>{
    g+=`<text x="${X(t)}" y="${h-8}" text-anchor="middle" fill="#4a5f85" font-size="10"
         font-family="ui-monospace,monospace">${t>0?'+'+t:t}h</text>
        <line x1="${X(t)}" y1="${pt}" x2="${X(t)}" y2="${h-pb}" stroke="#131f34"/>`;
  });
  if (o.now !== undefined)
    g+=`<line x1="${X(o.now)}" y1="${pt}" x2="${X(o.now)}" y2="${h-pb}" stroke="#f43f5e77" stroke-dasharray="4 4"/>
        <text x="${X(o.now)+5}" y="${pt+11}" fill="#fb7185" font-size="10">now</text>`;
  series.forEach(s=>{
    const dpath = s.pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join(' ');
    if (s.fill) g+=`<path d="${dpath} L ${X(s.pts.at(-1)[0])} ${h-pb} L ${X(s.pts[0][0])} ${h-pb} Z" fill="${s.fill}"/>`;
    g+=`<path d="${dpath}" fill="none" stroke="${s.color}" stroke-width="2.4"
         stroke-linecap="round" ${s.dash?`stroke-dasharray="${s.dash}"`:''}/>`;
    g+=s.pts.map(p=>`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="3.2" fill="${s.color}"/>`).join('');
  });
  const leg = series.map((s,i)=>`<g transform="translate(${pl+i*186} ${pt-2})">
      <rect width="14" height="3" rx="1.5" fill="${s.color}" y="4"/>
      <text x="20" y="8" fill="#8ea3c4" font-size="11">${s.name}</text></g>`).join('');
  host.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">${g}${leg}</svg>`;
}

function gauge(host, value, max, label, color){
  const w=250,h=152,cx=125,cy=130,r=95;
  const pol=f=>{ const th=Math.PI*(1-f); return [cx+r*Math.cos(th), cy-r*Math.sin(th)]; };
  const frac=Math.min(1,Math.max(0,value/max));
  const [sx,sy]=pol(0), [ex,ey]=pol(frac), [tx,ty]=pol(1);
  host.innerHTML=`<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto">
    <path d="M${sx} ${sy} A${r} ${r} 0 0 1 ${tx} ${ty}" fill="none" stroke="#16213a" stroke-width="14" stroke-linecap="round"/>
    <path d="M${sx} ${sy} A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none"
      stroke="${color}" stroke-width="14" stroke-linecap="round"/>
    <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="7" fill="${color}" stroke="#0b1220" stroke-width="3"/>
    <text x="${cx}" y="${cy-30}" text-anchor="middle" fill="#e6edf8" font-size="36" font-weight="700"
      font-family="ui-monospace,monospace">${value}</text>
    <text x="${cx}" y="${cy-10}" text-anchor="middle" fill="#8ea3c4" font-size="12">${label}</text>
    <text x="${sx-4}" y="${cy+16}" text-anchor="middle" fill="#3f5druids" font-size="10"
      font-family="ui-monospace,monospace">0</text>
    <text x="${tx+2}" y="${cy+16}" text-anchor="middle" fill="#3f5druids" font-size="10"
      font-family="ui-monospace,monospace">${max}</text>
  </svg>`.replace(/#3f5druids/g,'#3f5b85');
}

function confusion(host){
  const ids = CLASSES.map(c=>c.id), n=ids.length, cell=44, pad=46, size=pad+n*cell+10;
  const max = Math.max(...CONFUSION.flat());
  let g='';
  CONFUSION.forEach((row,i)=>row.forEach((v,j)=>{
    const a = v/max, diag = i===j;
    g+=`<rect x="${pad+j*cell}" y="${pad+i*cell}" width="${cell-3}" height="${cell-3}" rx="5"
         fill="${diag?`rgba(52,211,153,${0.14+a*0.75})`:`rgba(244,63,94,${0.06+a*0.55})`}"/>
        <text x="${pad+j*cell+(cell-3)/2}" y="${pad+i*cell+(cell-3)/2+4}" text-anchor="middle"
         fill="${v?'#e6edf8':'#33405c'}" font-size="12" font-family="ui-monospace,monospace">${v}</text>`;
  }));
  ids.forEach((id,i)=>{
    g+=`<text x="${pad-8}" y="${pad+i*cell+24}" text-anchor="end" fill="#8ea3c4" font-size="11"
         font-family="ui-monospace,monospace">${id}</text>
        <text x="${pad+i*cell+20}" y="${pad-12}" text-anchor="middle" fill="#8ea3c4" font-size="11"
         font-family="ui-monospace,monospace">${id}</text>`;
  });
  g+=`<text x="6" y="16" fill="#4a5f85" font-size="11">actual ↓ / predicted →</text>`;
  host.innerHTML=`<svg viewBox="0 0 ${size} ${size-6}" style="width:100%;height:auto">${g}</svg>`;
}

/* ======================= view builders =================================== */
function viewMonitor(){
  const A = ACTIVE, cur = A.track.at(-1), cls = clsForWind(cur.wind);
  $('#mon-banner').innerHTML = `
    <div class="ic">⚠</div>
    <div>
      <b class="blink">RED ALERT · ${clsOf('VSCS').name} “${A.name}”</b>
      <div class="sub">Model places landfall near ${A.landfall.place} at ${A.landfall.eta}
        (confidence ${(A.landfall.conf*100).toFixed(0)}%). 7 districts under advisory.</div>
    </div>
    <span class="pill bad" style="margin-left:auto">PROTOTYPE · SIMULATED</span>`;

  $('#mon-stats').innerHTML = '';
  [
    ['Current intensity', `${cur.wind} kt`, cls.name],
    ['Central pressure',  `${cur.pres} hPa`, 'estimated from IR + scatterometer'],
    ['Position',          `${cur.lat.toFixed(1)}°N ${cur.lon.toFixed(1)}°E`, 'CNN centre fix ±41 km'],
    ['24 h intensity Δ',  `+23 kt`, 'rapid intensification flagged']
  ].forEach(([k,v,s]) => $('#mon-stats').append(
    el('div',{class:'card'}, el('div',{class:'stat'},
      el('div',{class:'k'},k), el('div',{class:'v'},v), el('div',{class:'s'},s)))));

  renderMap($('#mon-map'));
  $('#mon-mapinfo').innerHTML = `
    <div class="dim" style="font-size:11px;letter-spacing:.08em">ANALYSIS ${A.updated.slice(11,16)} UTC</div>
    <div class="big" style="color:${cls.color}">${cls.id}</div>
    <div class="mut" style="font-size:11.5px">${cls.name}</div>
    <div style="margin-top:7px;font-family:var(--mono);font-size:12px">
      ${cur.wind} kt · ${cur.pres} hPa<br>moving N at 11 kt</div>`;

  /* watchlist */
  $('#mon-watch').innerHTML = WATCHLIST.map(s => `
    <div class="src">
      <span class="id">${s.name}<div class="res">${s.id}</div></span>
      <span class="kind">${s.active?'active system · under forecast':'monitored, below storm threshold'}</span>
      <span class="pill ${s.active?'bad':'info'}">${s.cls}</span>
      <span class="files">${s.wind} kt</span>
    </div>`).join('');

  /* intensity + pressure forecast chart */
  const wObs = A.track.map(p=>[p.t,p.wind]), wFc = [A.track.at(-1),...A.forecast].map(p=>[p.t,p.wind]);
  lineChart($('#mon-chart'), [
    { name:'Observed wind (kt)', pts:wObs, color:'#f43f5e', fill:'#f43f5e18' },
    { name:'Predicted wind (kt)',pts:wFc, color:'#38bdf8', dash:'7 6' }
  ], { xticks:[-72,-48,-24,0,12,24,36], now:0, h:230 });

  $('#mon-alerts').innerHTML = ALERTS.slice(0,5).map(a=>`
    <tr><td><b>${a.district}</b><div class="dim" style="font-size:11.5px">${a.state}</div></td>
      <td><span class="lvl ${a.level}">${a.level}</span></td>
      <td class="mono">${a.wind}</td><td class="mono">${a.eta}</td></tr>`).join('');
}

function viewDetect(){
  const cv = $('#sat'); cv.width = cv.height = 560;
  let spin = 0;
  drawSatellite(cv, 0);
  clearInterval(window.__sat);
  window.__sat = setInterval(()=>{ spin += 0.06; drawSatellite(cv, spin); }, 90);

  $('#det-feat').innerHTML = FEATURES.map(f=>`
    <div class="kv"><span class="k">${f.k}<div class="dim" style="font-size:11.5px">${f.note}</div></span>
      <span class="v">${f.v}</span></div>`).join('');

  $('#det-sources').innerHTML = SOURCES.map(s=>`
    <div class="src">
      <span class="id">${s.id}<div class="res">${s.res}</div></span>
      <span class="kind">${s.kind}<div class="res">latency ${s.latency}</div></span>
      <span class="pill ${s.status==='ok'?'ok':'warn'}">${s.status}</span>
      <span class="files">${s.files} files</span>
    </div>`).join('');
}

function viewClassify(){
  const cur = ACTIVE.track.at(-1), cls = clsForWind(cur.wind);
  gauge($('#cls-gauge'), cur.wind, 160, 'kt · max sustained wind', cls.color);
  $('#cls-head').innerHTML = `
    <div style="font-size:13px" class="mut">Predicted class</div>
    <div style="font-size:26px;font-weight:700;color:${cls.color}">${cls.name}</div>
    <div class="mono dim" style="font-size:12.5px">IMD scale · ${cls.min}–${cls.max} kt · Dvorak T5.0</div>`;
  $('#cls-probs').innerHTML = CLASS_PROBS.map(p=>{
    const c = clsOf(p.id);
    return `<div class="pb"><span><b style="color:${c.color}">${c.id}</b> <span class="mut">${c.name}</span></span>
      <span class="t"><i style="width:${(p.p*100).toFixed(0)}%;background:${c.color}"></i></span>
      <span class="n">${(p.p*100).toFixed(0)}%</span></div>`;
  }).join('');
  lineChart($('#cls-spark'), [
    { name:'Max wind, last 72 h (kt)', pts:ACTIVE.track.map(p=>[p.t,p.wind]), color:cls.color, fill:cls.color+'22' }
  ], { xticks:[-72,-48,-24,0], h:170 });
  $('#cls-scale').innerHTML = CLASSES.map(c=>`
    <tr><td><b style="color:${c.color}">${c.id}</b></td><td>${c.name}</td>
    <td class="mono">${c.min}–${c.max} kt</td>
    <td>${c.id===cls.id?'<span class="pill bad">current</span>':''}</td></tr>`).join('');
}

function viewPredict(){
  const A = ACTIVE;
  renderMap($('#pred-map'));
  lineChart($('#pred-pres'), [
    { name:'Observed pressure (hPa)', pts:A.track.map(p=>[p.t,p.pres]), color:'#a78bfa', fill:'#a78bfa18' },
    { name:'Predicted pressure (hPa)',pts:[A.track.at(-1),...A.forecast].map(p=>[p.t,p.pres]), color:'#22d3ee', dash:'7 6' }
  ], { xticks:[-72,-48,-24,0,12,24,36], now:0, h:220 });
  lineChart($('#pred-err'), [
    { name:'Track uncertainty radius (km)', pts:A.forecast.map(p=>[p.t,p.err]), color:'#fbbf24', fill:'#fbbf2418' }
  ], { xticks:[6,12,18,24,36], y0:0, h:220 });

  $('#pred-table').innerHTML = A.forecast.map(p=>{
    const c = clsForWind(p.wind);
    return `<tr><td class="mono">+${p.t} h</td>
      <td class="mono">${p.lat.toFixed(1)}°N ${p.lon.toFixed(1)}°E</td>
      <td class="mono">${p.wind} kt</td><td class="mono">${p.pres} hPa</td>
      <td><span class="pill" style="background:${c.color}22;color:${c.color}">${c.id}</span></td>
      <td class="mono dim">±${p.err} km</td></tr>`;
  }).join('');

  $('#pred-landfall').innerHTML = `
    <div class="kv"><span class="k">Most likely landfall</span><span class="v">${A.landfall.place}</span></div>
    <div class="kv"><span class="k">Estimated time</span><span class="v">${A.landfall.eta}</span></div>
    <div class="kv"><span class="k">Landfall intensity</span><span class="v">~95 kt (VSCS)</span></div>
    <div class="kv"><span class="k">Model confidence</span><span class="v">${(A.landfall.conf*100).toFixed(0)}%</span></div>
    <div class="kv"><span class="k">Cross-track spread</span><span class="v">±124 km @ +24 h</span></div>`;
}

function viewPipeline(){
  $('#pipe-list').innerHTML = STAGES.map((s,i)=>`
    <div class="step" data-i="${i}">
      <span class="n">${String(i+1).padStart(2,'0')}</span>
      <span><span class="lab">${s.label}</span><div class="det">${s.detail}</div></span>
      <span class="st">queued</span>
    </div>`).join('');
  $('#pipe-log').textContent = '$ awaiting run…\n';
}

let running = false;
async function runPipeline(){
  if (running) return; running = true;
  const btn = $('#run'); btn.disabled = true; btn.textContent = 'Running…';
  const steps = $$('#pipe-list .step'), log = $('#pipe-log'), bar = $('#pipe-bar > i');
  steps.forEach(s=>{ s.className='step'; s.querySelector('.st').textContent='queued'; });
  log.textContent='';
  const say = t => { log.textContent += t + '\n'; log.scrollTop = log.scrollHeight; };
  say('$ cycloneai run --sources insat3d,himawari,modis,era5 --mode prototype');

  const lines = [
    ['48 granules · 1.9 GB staged from local historical cache'],
    ['despeckle + radiometric calibration applied · 0 bad scans'],
    ['regridded to 0.05° lat/lon · 30-min cadence · 0 gaps'],
    ['6-channel tensor built: IR1, WV, VIS, wind, SST, RH'],
    ['features: eye Ø 32 km · symmetry 0.81 · shear 6 kt'],
    ['detection: 1 system found · p=0.97 · centre 16.1°N 85.9°E'],
    ['classification: VSCS (p=0.68) · T-number 5.0'],
    ['prediction: +6…+36 h track and intensity written'],
    ['map, charts and 7 district alerts generated']
  ];
  for (let i=0;i<steps.length;i++){
    steps[i].className='step run';
    steps[i].querySelector('.st').textContent='running';
    await new Promise(r=>setTimeout(r, 340 + Math.random()*260));
    steps[i].className='step done';
    steps[i].querySelector('.st').textContent = (0.2+Math.random()*1.4).toFixed(2)+'s';
    say('  ✓ ' + STAGES[i].label.padEnd(24,' ') + ' — ' + lines[i]);
    bar.style.width = ((i+1)/steps.length*100)+'%';
  }
  say('\n== RESULT ==');
  say('  system      : TC BISHAKHA (BOB-07)');
  say('  class       : VERY SEVERE CYCLONIC STORM · 86 kt · 962 hPa');
  say('  +24 h       : 19.3°N 86.0°E · 84 kt · ±124 km');
  say('  landfall    : Puri–Gopalpur belt, Odisha · +21 h · conf 0.71');
  say('  alerts      : 2 RED · 2 ORANGE · 3 YELLOW');
  btn.disabled=false; btn.textContent='Re-run pipeline'; running=false;
}

function viewValidate(){
  $('#val-metrics').innerHTML = METRICS.map(m=>`
    <div class="card"><div class="stat">
      <div class="k">${m.k}</div><div class="v">${m.v}</div><div class="s">${m.sub}</div></div></div>`).join('');
  $('#val-table').innerHTML = HISTORICAL.map(h=>`
    <tr><td><b>${h.name}</b> <span class="dim mono">${h.year}</span></td>
      <td class="mono">${h.basin}</td>
      <td><span class="pill" style="background:${clsOf(h.truth).color}22;color:${clsOf(h.truth).color}">${h.truth}</span></td>
      <td><span class="pill" style="background:${clsOf(h.pred).color}22;color:${clsOf(h.pred).color}">${h.pred}</span></td>
      <td>${h.ok?'<span class="pill ok">match</span>':'<span class="pill warn">±1 class</span>'}</td>
      <td class="mono">${h.trackErr} km</td><td class="mono">${h.intErr} kt</td></tr>`).join('');
  confusion($('#val-conf'));
  lineChart($('#val-err'), [
    { name:'Track error (km)', pts:[[6,26],[12,43],[18,61],[24,79],[36,118]], color:'#38bdf8', fill:'#38bdf818' },
    { name:'Baseline persistence (km)', pts:[[6,44],[12,88],[18,140],[24,203],[36,321]], color:'#64748b', dash:'6 5' }
  ], { xticks:[6,12,18,24,36], y0:0, h:230 });
}

/* ======================= tabs ============================================ */
const VIEWS = {
  monitor:  viewMonitor,
  detect:   viewDetect,
  classify: viewClassify,
  predict:  viewPredict,
  pipeline: viewPipeline,
  validate: viewValidate,
  about:    ()=>{}
};
function go(name){
  $$('.tab').forEach(t=>t.classList.toggle('on', t.dataset.v===name));
  $$('.view').forEach(v=>v.classList.toggle('on', v.id==='v-'+name));
  if (name !== 'detect') clearInterval(window.__sat);
  VIEWS[name]?.();
  history.replaceState(null,'','#'+name);
  window.scrollTo({top:0,behavior:'smooth'});
}

document.addEventListener('DOMContentLoaded', ()=>{
  $$('.tab').forEach(t=>t.onclick = ()=>go(t.dataset.v));
  $('#run').onclick = runPipeline;
  $('#clock').textContent = new Date().toUTCString().slice(17,25) + ' UTC';
  setInterval(()=>{ $('#clock').textContent = new Date().toUTCString().slice(17,25)+' UTC'; }, 1000);
  go((location.hash||'#monitor').slice(1) in VIEWS ? (location.hash||'#monitor').slice(1) : 'monitor');
});
