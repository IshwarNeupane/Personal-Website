/* app.js - unified & robust version (replace entire file) */

/* ---------- CONFIG ---------- */
const OPENWEATHER_API_KEY = '57d0913961b8dd3587935fb4252d809c';
const COUNTAPI_NAMESPACE = 'ishwar_neupane_homepage_ns';
const COUNTAPI_KEY = 'total_visits';
const VISITOR_SERVER_BASE = null; // set to server URL if you deploy a backend

/* ---------- THEME (dark toggle) ---------- */
(function(){
  const saved = localStorage.getItem('theme_pref');
  if(saved === 'dark') document.documentElement.classList.add('dark');
  document.querySelectorAll('#themeToggle').forEach(btn=>{
    if(!btn) return;
    btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
    btn.addEventListener('click', ()=>{
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('theme_pref', isDark ? 'dark' : 'light');
      btn.textContent = isDark ? '☀️' : '🌙';
    });
  });
})();

/* ---------- WEATHER (OpenWeatherMap) ---------- */
async function initWeather(){
  const widget = document.getElementById('weatherWidget');
  if(!widget) { console.warn('weatherWidget element not found'); return; }

  widget.innerHTML = `
    <div class="weather-icon" id="weatherIcon">--</div>
    <div class="weather-body">
      <div id="weatherTemp">--°C</div>
      <div id="weatherDesc" class="muted">Loading...</div>
      <div id="weatherLoc" class="muted small"></div>
    </div>`;

  if(!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.indexOf(' ')>=0){
    const desc = document.getElementById('weatherDesc');
    if(desc) desc.textContent = 'API key missing — set in app.js';
    return;
  }

  function apply(j){
    if(!j || !j.main) return;
    document.getElementById('weatherTemp').textContent = Math.round(j.main.temp) + '°C';
    document.getElementById('weatherDesc').textContent = j.weather && j.weather[0] && j.weather[0].main || '';
    document.getElementById('weatherLoc').textContent = (j.name || '') + (j.sys && j.sys.country ? ', ' + j.sys.country : '');
    const icon = (j.weather && j.weather[0] && j.weather[0].icon) ? j.weather[0].icon : null;
    const iconEl = document.getElementById('weatherIcon');
    if(icon) iconEl.innerHTML = `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="" width="48" height="48">`;
  }

  try {
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async pos=>{
        try{
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`);
          const j = await res.json();
          apply(j);
        }catch(e){ console.warn('weather geolocation fetch fail', e); }
      }, async ()=>{
        try{
          const r = await fetch('https://ipapi.co/json/');
          const info = await r.json();
          if(info && info.latitude && info.longitude){
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${info.latitude}&lon=${info.longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`);
            const j = await res.json();
            apply(j);
          }
        }catch(e){ console.warn('weather ip fallback fail', e); }
      }, {timeout:6000});
    } else {
      const r = await fetch('https://ipapi.co/json/');
      const info = await r.json();
      if(info && info.latitude && info.longitude){
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${info.latitude}&lon=${info.longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`);
        const j = await res.json();
        apply(j);
      }
    }
  } catch(e){
    console.warn('weather error', e);
    const desc = document.getElementById('weatherDesc');
    if(desc) desc.textContent = 'Unable to load';
  }
}
initWeather();

/* ---------- VISITOR COUNTER (countapi) & top countries ---------- */
async function registerVisitAndRender() {
  // Try to increment global total via countapi
  let totalFromAPI = null;
  try {
    const r = await fetch(`https://api.countapi.xyz/hit/${COUNTAPI_NAMESPACE}/${COUNTAPI_KEY}`);
    if(r.ok){
      const j = await r.json();
      totalFromAPI = Number(j.value) || null;
      // write to DOM if element exists
      const totalEl = document.getElementById('totalVisits') || document.getElementById('totalVisitors');
      if(totalEl && totalFromAPI !== null) totalEl.textContent = totalFromAPI.toLocaleString();
    } else {
      console.warn('countapi returned non-ok', r.status);
    }
  } catch(e){
    console.warn('countapi request failed', e);
  }

  // get country via ipapi (fallback local aggregation)
  let country = 'Unknown';
  try {
    const r = await fetch('https://ipapi.co/json/');
    const j = await r.json();
    country = (j && j.country_name) ? j.country_name : 'Unknown';
  } catch(e){
    console.warn('ipapi fetch failed', e);
  }

  // update local per-country tally for demo (persisted)
  try {
    const key = 'visitor_country_counts_v1';
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    obj[country] = (obj[country] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(obj));
  } catch(e){ console.warn('local visitor storage failed', e); }

  // Render top5 from either server (if available) or local storage
  await renderTopCountries(totalFromAPI);
}

async function renderTopCountries(totalFromAPI = null) {
  // Try server first (optional)
  if (typeof VISITOR_SERVER_BASE === 'string' && VISITOR_SERVER_BASE) {
    try {
      const r = await fetch(VISITOR_SERVER_BASE + '/stats/top');
      if (r.ok) {
        const j = await r.json();
        if (j && j.top) {
          writeTopAndTotal(j.top, totalFromAPI);
          return;
        }
      }
    } catch(e){ console.warn('visitor server top fetch failed', e); }
  }

  // fallback to localStorage
  try {
    const key = 'visitor_country_counts_v1';
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    const arr = Object.keys(obj).map(k => ({country:k, count: obj[k]}));
    arr.sort((a,b)=>b.count - a.count);
    const top = arr.slice(0,5);
    writeTopAndTotal(top, totalFromAPI);
  } catch(e){
    console.warn('renderTopCountries fallback failed', e);
    // clear displays to safe defaults
    const topEl = document.getElementById('top5') || document.getElementById('topCountries');
    if(topEl) topEl.textContent = '—';
    const totalEl = document.getElementById('totalVisits') || document.getElementById('totalVisitors');
    if(totalEl && totalFromAPI === null) totalEl.textContent = '—';
  }
}

function writeTopAndTotal(topArray, totalFromAPI=null){
  // topArray is [{country, count}, ...]
  const topEl = document.getElementById('top5') || document.getElementById('topCountries');
  const totalEl = document.getElementById('totalVisits') || document.getElementById('totalVisitors');

  const sumTop = topArray.reduce((s,i)=>s + Number(i.count || 0), 0);

  // If countapi provided a total, use it; otherwise use the sum of top+others from localStorage
  let finalTotal = totalFromAPI;
  if(finalTotal === null){
    // Try derive total from localStorage (sum of all countries)
    try {
      const key = 'visitor_country_counts_v1';
      const obj = JSON.parse(localStorage.getItem(key) || '{}');
      finalTotal = Object.values(obj).reduce((s,v)=>s + Number(v || 0), 0);
    } catch(e){ finalTotal = sumTop; }
  }

  // Ensure finalTotal >= sumTop
  if(finalTotal === null) finalTotal = sumTop;
  if(finalTotal < sumTop) finalTotal = sumTop;

  // render
  if(topEl) {
    if(topArray.length === 0) topEl.textContent = '—';
    else topEl.textContent = topArray.map(x=>`${x.country} (${x.count})`).join(', ');
  }
  if(totalEl) totalEl.textContent = finalTotal !== null ? finalTotal.toLocaleString() : '--';
}

/* run visitor logic */
registerVisitAndRender();

/* ---------- B.S. calendar: wait for library then render ---------- */
function waitForNepaliLibAndRender(retries=20, delay=200){
  if (typeof NepaliDateConverter !== 'undefined' && typeof NepaliDateConverter.adToBs === 'function') {
    try {
      const today = new Date();
      const bs = NepaliDateConverter.adToBs(today.getFullYear(), today.getMonth()+1, today.getDate());
      const monthNames = ["Baishakh","Jestha","Ashadh","Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra"];
      const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const dateEl = document.getElementById('bsDate');
      const weekEl = document.getElementById('bsWeekday');
      if(dateEl) dateEl.textContent = `${bs.year} ${monthNames[bs.month - 1]} ${bs.day}`;
      if(weekEl) weekEl.textContent = weekdays[today.getDay()];
      console.info('B.S. calendar rendered from NepaliDateConverter:', bs);
    } catch(e){
      console.error('Error while rendering BS from library:', e);
      // fallback later
      if(retries>0) setTimeout(()=>waitForNepaliLibAndRender(retries-1, delay), delay);
      else fallbackApproxBS();
    }
  } else {
    if(retries>0) setTimeout(()=>waitForNepaliLibAndRender(retries-1, delay), delay);
    else {
      console.warn('NepaliDateConverter not found after retries, using fallback approx');
      fallbackApproxBS();
    }
  }
}

function fallbackApproxBS(){
  // approximate fallback only used when library is missing
  const now = new Date();
  const adYear = now.getFullYear(), m = now.getMonth()+1, d = now.getDate();
  const bsYear = (m > 4 || (m === 4 && d >= 14)) ? adYear + 57 : adYear + 56;
  const monthsApprox = ['Baishakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
  const approx = new Date(now.getTime() + 17*24*60*60*1000);
  const idx = (approx.getMonth() + 9) % 12;
  const bsStr = `${bsYear} ${monthsApprox[idx]} ${approx.getDate()} (approx)`;
  const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekday = weekdays[now.getDay()];
  const dateEl = document.getElementById('bsDate');
  const weekEl = document.getElementById('bsWeekday');
  if(dateEl) dateEl.textContent = bsStr;
  if(weekEl) weekEl.textContent = weekday;
}

/* start waiting for the library and render */
waitForNepaliLibAndRender();

/* ---------- Chat snippet helper (unchanged) ---------- */
function installChatSnippet(snippet){
  try {
    localStorage.setItem('chat_snippet', snippet);
    const div = document.createElement('div'); div.innerHTML = snippet; document.body.appendChild(div);
    alert('Chat snippet injected & saved for this browser.');
  } catch(e){ alert('Failed to save chat snippet: '+e.message) }
}
(function(){
  const snip = localStorage.getItem('chat_snippet');
  if(snip){
    const d = document.createElement('div'); d.innerHTML = snip; document.body.appendChild(d);
  }
})();

/* ---------- Footer year ---------- */
document.querySelectorAll('#footerYear').forEach(e=>e.textContent = (new Date()).getFullYear());
