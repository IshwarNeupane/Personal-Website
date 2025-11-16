/* app.js - shared for all pages */

/* ---------- CONFIG ---------- */
const OPENWEATHER_API_KEY = '57d0913961b8dd3587935fb4252d809c';
const COUNTAPI_NAMESPACE = 'ishwar_neupane_homepage_ns';
const COUNTAPI_KEY = 'total_visits';
const VISITOR_SERVER_BASE = null; // set to your backend URL if deployed

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
  if(!widget) return;

  widget.innerHTML = `
    <div class="weather-icon" id="weatherIcon">--</div>
    <div class="weather-body">
      <div id="weatherTemp">--°C</div>
      <div id="weatherDesc" class="muted">Loading...</div>
      <div id="weatherLoc" class="muted small"></div>
    </div>`;

  if(!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.indexOf(' ')>=0){
    document.getElementById('weatherDesc').textContent = 'API key missing — set in app.js';
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
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`);
        const j = await res.json();
        apply(j);
      }, async ()=>{
        const r = await fetch('https://ipapi.co/json/');
        const info = await r.json();
        if(info && info.latitude && info.longitude){
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${info.latitude}&lon=${info.longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`);
          const j = await res.json();
          apply(j);
        }
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

/* ---------- VISITOR COUNTER (countapi) ---------- */
async function registerVisit(){
  try {
    const r = await fetch(`https://api.countapi.xyz/hit/${COUNTAPI_NAMESPACE}/${COUNTAPI_KEY}`);
    if(r.ok){
      const j = await r.json();
      const el = document.getElementById('totalVisits') || document.getElementById('totalVisitors');
      if(el) el.textContent = j.value.toLocaleString();
    }
  } catch(e){ console.warn('countapi fail', e); }

  try {
    const r = await fetch('https://ipapi.co/json/');
    const j = await r.json();
    const country = (j && j.country_name) ? j.country_name : 'Unknown';
    const key = 'visitor_country_counts_v1';
    const raw = localStorage.getItem(key);
    const obj = raw ? JSON.parse(raw) : {};
    obj[country] = (obj[country] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(obj));
    renderTop5();
    if(VISITOR_SERVER_BASE){
      fetch(VISITOR_SERVER_BASE + '/visit', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({country}) }).catch(()=>{});
    }
  } catch(e){ console.warn('visitor detect fail', e); renderTop5(); }
}
function renderTop5(){
  const key = 'visitor_country_counts_v1';
  const raw = localStorage.getItem(key);
  const obj = raw ? JSON.parse(raw) : {};
  const arr = Object.keys(obj).map(k=>({country:k,count:obj[k]}));
  arr.sort((a,b)=>b.count-a.count);
  const top5 = arr.slice(0,5);
  const el = document.getElementById('top5') || document.getElementById('topCountries');
  if(el) el.textContent = top5.map(x=>`${x.country} (${x.count})`).join(', ') || '—';
}
registerVisit();

/* ---------- Bikram Sambat (B.S.) calendar using AD2BS (library) ---------- */
function renderBS(){
  try {
    const now = new Date();

    // Ensure AD2BS exists
    if (typeof AD2BS !== 'function') throw new Error('AD2BS not available');

    // Call the library
    const bs = AD2BS(now);

    // Library may return properties with different names depending on version.
    const year = bs.year || bs.bsYear || bs.bs_year || bs.ad_bs_year;
    const month = bs.month || bs.bsMonth || bs.bs_month || bs.bs_month_no;
    const day = bs.day || bs.date || bs.bs_date || bs.bsDay;

    // Defensive check
    if (!year || !month || !day) throw new Error('BS library returned unexpected shape: ' + JSON.stringify(bs));

    const months = ['Baishakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
    const bsMonthName = months[(Number(month) - 1 + 12) % 12] || ('Month ' + month);
    const bsStr = `${year} ${bsMonthName} ${day}`;

    // Weekday (English). getDay(): 0 = Sunday ... 6 = Saturday
    const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const weekday = weekdayNames[now.getDay()];

    // Write to DOM
    document.querySelectorAll('#bsDate').forEach(e => e.textContent = bsStr);
    document.querySelectorAll('#bsWeekday').forEach(e => e.textContent = weekday);

  } catch (e) {
    console.error('BS conversion failed (library):', e);

    // fallback (approximate) — keep the previous fallback but keep it explicit
    const now = new Date();
    const adYear = now.getFullYear(), m = now.getMonth()+1, d = now.getDate();
    const bsYear = (m > 4 || (m === 4 && d >= 14)) ? adYear + 57 : adYear + 56;
    const monthsApprox = ['Baishakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
    const approx = new Date(now.getTime() + 17*24*60*60*1000);
    const idx = (approx.getMonth() + 9) % 12;
    const bsStr = `${bsYear} ${monthsApprox[idx]} ${approx.getDate()} (approx)`;

    const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const weekday = weekdayNames[now.getDay()];

    document.querySelectorAll('#bsDate').forEach(e=>e.textContent = bsStr);
    document.querySelectorAll('#bsWeekday').forEach(e=>e.textContent = weekday);
  }
}
renderBS();


/* ---------- Chat snippet helper ---------- */
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

