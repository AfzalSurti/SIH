/* ==========================================================================
   CycloneAI — Prototype dataset
   SIH26070 · Team TechNova
   All values here are SIMULATED / derived from public historical summaries.
   This is a prototype: no live satellite feed is connected.
   ========================================================================== */

const GEO = {
  /* Simplified coastline outlines (lon, lat) for the schematic basin map */
  india: [
    [68.5,23.8],[70.0,22.6],[72.6,21.5],[72.8,19.9],[73.3,17.5],[74.1,15.0],
    [74.8,13.0],[75.9,11.3],[76.6,9.4],[77.5,8.1],[79.1,9.3],[79.8,10.8],
    [80.3,13.1],[80.2,15.9],[82.3,16.9],[84.0,18.3],[85.8,19.9],[87.0,21.5],
    [88.3,21.7],[89.5,22.0],[90.6,22.3],[91.8,22.5],[92.3,20.8],[93.5,19.0],
    [94.4,16.2],[96.0,16.5],[97.2,16.8],[97.6,19.5],[96.2,21.5],[94.5,24.0],
    [92.0,25.2],[88.0,26.0],[84.0,25.6],[78.0,25.8],[72.0,25.2],[68.5,23.8]
  ],
  lanka: [[79.8,9.8],[81.2,8.5],[81.9,7.2],[81.5,6.2],[80.5,5.9],[79.9,7.0],[79.8,9.8]],
  basins: [
    { name: 'ARABIAN SEA', lon: 66.5, lat: 15.5 },
    { name: 'BAY OF BENGAL', lon: 88.5, lat: 14.0 },
    { name: 'INDIAN OCEAN', lon: 78.0, lat: 4.5 }
  ]
};

/* IMD intensity scale used for the classification head */
const CLASSES = [
  { id:'D',   name:'Depression',                  min:17, max:27, color:'#5eead4' },
  { id:'DD',  name:'Deep Depression',             min:28, max:33, color:'#38bdf8' },
  { id:'CS',  name:'Cyclonic Storm',              min:34, max:47, color:'#a78bfa' },
  { id:'SCS', name:'Severe Cyclonic Storm',       min:48, max:63, color:'#fbbf24' },
  { id:'VSCS',name:'Very Severe Cyclonic Storm',  min:64, max:89, color:'#fb923c' },
  { id:'ESCS',name:'Extremely Severe C. Storm',   min:90, max:119,color:'#f43f5e' },
  { id:'SuCS',name:'Super Cyclonic Storm',        min:120,max:200,color:'#e879f9' }
];

/* ---- Active (simulated) system being monitored ------------------------- */
const ACTIVE = {
  id: 'BOB-07',
  name: 'BISHAKHA',
  basin: 'Bay of Bengal',
  origin: 'SIMULATED SYSTEM — prototype demo',
  updated: '2026-09-19T06:00:00Z',
  /* observed track: t is hours relative to analysis time (0 = now) */
  track: [
    { t:-72, lon:88.9, lat:10.2, wind:25, pres:1000 },
    { t:-60, lon:88.3, lat:11.0, wind:32, pres: 997 },
    { t:-48, lon:87.7, lat:11.9, wind:41, pres: 992 },
    { t:-36, lon:87.1, lat:12.9, wind:52, pres: 985 },
    { t:-24, lon:86.6, lat:13.9, wind:63, pres: 978 },
    { t:-12, lon:86.2, lat:15.0, wind:74, pres: 970 },
    { t:  0, lon:85.9, lat:16.1, wind:86, pres: 962 }
  ],
  /* model forecast with along/cross-track uncertainty (km) */
  forecast: [
    { t:  6, lon:85.8, lat:16.9, wind: 92, pres:957, err: 42 },
    { t: 12, lon:85.7, lat:17.7, wind: 97, pres:952, err: 68 },
    { t: 18, lon:85.8, lat:18.5, wind: 94, pres:955, err: 95 },
    { t: 24, lon:86.0, lat:19.3, wind: 84, pres:963, err:124 },
    { t: 36, lon:86.6, lat:20.6, wind: 58, pres:980, err:186 }
  ],
  landfall: { place:'Puri–Gopalpur belt, Odisha', eta:'+21 h', lon:85.9, lat:19.1, conf:0.71 }
};

/* ---- Multi-source ingest status (slide 4: Data Collection) -------------- */
const SOURCES = [
  { id:'INSAT-3D',  kind:'Geostationary IR / WV', res:'4 km · 30 min', files:48, status:'ok',   latency:'8 min'  },
  { id:'Himawari-9',kind:'Geostationary multiband',res:'2 km · 10 min', files:144,status:'ok',   latency:'12 min' },
  { id:'MODIS',     kind:'Polar-orbit visible/IR', res:'1 km · 2 pass', files:4,  status:'ok',   latency:'96 min' },
  { id:'SCATSAT-1', kind:'Scatterometer winds',    res:'25 km · swath', files:2,  status:'partial',latency:'3 h'  },
  { id:'ERA5',      kind:'Reanalysis env. fields', res:'0.25° · 1 h',  files:24, status:'ok',   latency:'5 d'    },
  { id:'IBTrACS',   kind:'Historical best-track',  res:'6-hourly',     files:1,  status:'ok',   latency:'archive'}
];

/* ---- Pipeline stages (slide 4 workflow) -------------------------------- */
const STAGES = [
  { key:'collect', label:'Data Collection',        detail:'Pull INSAT-3D · Himawari · MODIS · ERA5 granules' },
  { key:'clean',   label:'Preprocessing',          detail:'Radiometric clean, reproject, normalise brightness temps' },
  { key:'align',   label:'Time & Location Align',  detail:'Resample to common 0.05° grid @ 30-min steps' },
  { key:'fuse',    label:'Data Fusion',            detail:'Stack IR + WV + wind + env. fields into 6-channel tensor' },
  { key:'feature', label:'Feature Extraction',     detail:'Eye/eyewall metrics, spiral-band energy, shear, SST' },
  { key:'detect',  label:'Detection (CNN)',        detail:'ResNet-18 backbone + centre-fixing head' },
  { key:'classify',label:'Classification',         detail:'7-class IMD intensity head + Dvorak T-number' },
  { key:'predict', label:'Short-Term Prediction',  detail:'GRU track/intensity model, +6 h → +36 h' },
  { key:'render',  label:'Result Generation',      detail:'Map, charts and district alerts' }
];

/* ---- Classification head output (softmax) ------------------------------ */
const CLASS_PROBS = [
  { id:'D',   p:0.00 }, { id:'DD', p:0.01 }, { id:'CS', p:0.04 },
  { id:'SCS', p:0.09 }, { id:'VSCS',p:0.68 }, { id:'ESCS',p:0.17 }, { id:'SuCS',p:0.01 }
];

/* ---- Extracted features shown on the detection panel -------------------- */
const FEATURES = [
  { k:'Cloud-top min temp', v:'−82 °C',   note:'deep convection in eyewall' },
  { k:'Eye diameter',       v:'32 km',    note:'ragged but closed' },
  { k:'Eyewall symmetry',   v:'0.81',     note:'1.0 = perfectly circular' },
  { k:'Spiral-band energy', v:'0.64',     note:'normalised band index' },
  { k:'Dvorak T-number',    v:'T5.0',     note:'derived from IR pattern' },
  { k:'Vertical wind shear',v:'6 kt',     note:'ERA5 200–850 hPa' },
  { k:'Sea surface temp',   v:'29.4 °C',  note:'favourable, >26.5 °C' },
  { k:'Mid-level humidity', v:'68 %',     note:'700 hPa RH' }
];

/* ---- Historical hold-out validation (slide 6: unseen events) ------------ */
const HISTORICAL = [
  { name:'FANI',     year:2019, basin:'BoB', truth:'ESCS', pred:'ESCS', ok:true,  trackErr:78,  intErr: 7 },
  { name:'AMPHAN',   year:2020, basin:'BoB', truth:'SuCS', pred:'ESCS', ok:false, trackErr:94,  intErr:14 },
  { name:'NISARGA',  year:2020, basin:'AS',  truth:'SCS',  pred:'SCS',  ok:true,  trackErr:66,  intErr: 5 },
  { name:'TAUKTAE',  year:2021, basin:'AS',  truth:'ESCS', pred:'ESCS', ok:true,  trackErr:83,  intErr: 9 },
  { name:'YAAS',     year:2021, basin:'BoB', truth:'VSCS', pred:'VSCS', ok:true,  trackErr:71,  intErr: 6 },
  { name:'ASANI',    year:2022, basin:'BoB', truth:'SCS',  pred:'CS',   ok:false, trackErr:102, intErr:11 },
  { name:'BIPARJOY', year:2023, basin:'AS',  truth:'ESCS', pred:'VSCS', ok:false, trackErr:88,  intErr:12 },
  { name:'MOCHA',    year:2023, basin:'BoB', truth:'ESCS', pred:'ESCS', ok:true,  trackErr:75,  intErr: 8 },
  { name:'MIDHILI',  year:2023, basin:'BoB', truth:'CS',   pred:'CS',   ok:true,  trackErr:59,  intErr: 4 },
  { name:'REMAL',    year:2024, basin:'BoB', truth:'SCS',  pred:'SCS',  ok:true,  trackErr:69,  intErr: 6 }
];

const METRICS = [
  { k:'Detection recall',        v:'0.93', sub:'systems found / systems present' },
  { k:'Centre-fix error',        v:'41 km',sub:'mean distance to best-track centre' },
  { k:'Classification accuracy', v:'0.70', sub:'7-class, unseen storms' },
  { k:'±1 category accuracy',    v:'1.00', sub:'no error larger than one class' },
  { k:'Track error @ +24 h',     v:'79 km',sub:'mean great-circle distance' },
  { k:'Intensity MAE @ +24 h',   v:'8 kt', sub:'max sustained wind' }
];

/* 7x7 confusion matrix over the hold-out set (counts, scaled demo) */
const CONFUSION = [
  [12,1,0,0,0,0,0],
  [ 1,9,2,0,0,0,0],
  [ 0,2,14,2,0,0,0],
  [ 0,0,3,11,2,0,0],
  [ 0,0,0,2,16,2,0],
  [ 0,0,0,0,3,13,1],
  [ 0,0,0,0,0,2, 5]
];

/* ---- District-level alerting ------------------------------------------- */
const ALERTS = [
  { district:'Puri',            state:'Odisha',      level:'RED',    wind:'110–120 km/h', surge:'1.8 m', eta:'+21 h', pop:'1.7 M' },
  { district:'Khordha',         state:'Odisha',      level:'RED',    wind:'95–105 km/h',  surge:'0.9 m', eta:'+23 h', pop:'2.3 M' },
  { district:'Ganjam',          state:'Odisha',      level:'ORANGE', wind:'80–90 km/h',   surge:'1.2 m', eta:'+19 h', pop:'3.5 M' },
  { district:'Jagatsinghpur',   state:'Odisha',      level:'ORANGE', wind:'75–85 km/h',   surge:'1.4 m', eta:'+24 h', pop:'1.1 M' },
  { district:'Balasore',        state:'Odisha',      level:'YELLOW', wind:'55–65 km/h',   surge:'0.6 m', eta:'+30 h', pop:'2.3 M' },
  { district:'Srikakulam',      state:'Andhra Pr.',  level:'YELLOW', wind:'50–60 km/h',   surge:'0.5 m', eta:'+18 h', pop:'2.7 M' },
  { district:'Purba Medinipur', state:'West Bengal', level:'YELLOW', wind:'45–55 km/h',   surge:'0.7 m', eta:'+33 h', pop:'5.1 M' }
];

/* ---- Other systems in the basin ---------------------------------------- */
const WATCHLIST = [
  { id:'BOB-07', name:'BISHAKHA', cls:'VSCS', wind:86, trend:'+12 kt / 24 h', conf:0.68, active:true },
  { id:'ARB-03', name:'INVEST 91A',cls:'D',   wind:22, trend:'+4 kt / 24 h',  conf:0.44, active:false },
  { id:'BOB-06', name:'REMNANT LOW',cls:'—',  wind:14, trend:'−9 kt / 24 h',  conf:0.81, active:false }
];
