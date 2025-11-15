/* Shared app.js for all pages */

// ---------- CONFIG ----------
const OPENWEATHER_API_KEY = '57d0913961b8dd3587935fb4252d809c'; // <-- REPLACE with your key
const COUNTAPI_NAMESPACE = 'personal_homepage_example_ns'; // change to unique string if you like
const COUNTAPI_KEY = 'total_visits';

// ---------- THEME ----------
(function () {
    const saved = localStorage.getItem('theme_pref');
    if (saved === 'dark') document.documentElement.classList.add('dark'), document.documentElement.classList.add('dark-root');
    document.querySelectorAll('#themeToggle, #themeToggle2, #themeToggle3, #themeToggle4, #themeToggle5').forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            document.documentElement.classList.toggle('dark-root');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme_pref', isDark ? 'dark' : 'light');
            btn.textContent = isDark ? 'Light' : 'Dark';
        });
    });
})();

// ---------- WEATHER (OpenWeatherMap) ----------
async function renderWeatherWidget() {
    const tempEl = document.getElementById('weatherTemp');
    const descEl = document.getElementById('weatherDesc');
    const locEl = document.getElementById('weatherLoc');
    const iconEl = document.getElementById('weatherIcon');
    if (!tempEl || !descEl || !locEl) return;

    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === '57d0913961b8dd3587935fb4252d809c') {
        descEl.textContent = 'API key missing — set in app.js';
        tempEl.textContent = '--°C';
        return;
    }

    // try geolocation, fallback to IP
    function fetchByCoords(lat, lon) {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
        return fetch(url).then(r => r.json());
    }

    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async pos => {
                const j = await fetchByCoords(pos.coords.latitude, pos.coords.longitude);
                applyWeather(j);
            }, async () => {
                const fallback = await fetch('https://ipapi.co/json/');
                const j2 = await fallback.json();
                if (j2 && j2.latitude && j2.longitude) {
                    const j3 = await fetchByCoords(j2.latitude, j2.longitude);
                    applyWeather(j3);
                }
            }, { timeout: 6000 });
        } else {
            const fallback = await fetch('https://ipapi.co/json/');
            const j2 = await fallback.json();
            if (j2 && j2.latitude && j2.longitude) {
                const j3 = await fetchByCoords(j2.latitude, j2.longitude);
                applyWeather(j3);
            }
        }
    } catch (e) {
        console.warn('weather fail', e);
        descEl.textContent = 'Unable to load weather';
        tempEl.textContent = '--°C';
    }

    function applyWeather(j) {
        if (!j) return;
        tempEl.textContent = Math.round(j.main.temp) + '°C';
        descEl.textContent = j.weather && j.weather[0] && j.weather[0].main || '';
        locEl.textContent = (j.name || '') + (j.sys && j.sys.country ? ', ' + j.sys.country : '');
        if (iconEl && j.weather && j.weather[0] && j.weather[0].icon) {
            iconEl.innerHTML = `<img src="https://openweathermap.org/img/wn/${j.weather[0].icon}@2x.png" alt="${j.weather[0].description}" width="48" height="48">`;
        }
    }
}
renderWeatherWidget();

// ---------- VISITOR COUNTER (countapi + local country store) ----------
async function updateVisitorCounter() {
    // countapi global increase
    try {
        const res = await fetch(`https://api.countapi.xyz/hit/${COUNTAPI_NAMESPACE}/${COUNTAPI_KEY}`);
        if (res.ok) {
            const json = await res.json();
            const el = document.getElementById('totalVisits');
            if (el) el.textContent = json.value.toLocaleString();
        }
    } catch (err) { console.warn('countapi fail', err); }

    // detect visitor country via ipapi.co
    try {
        const r = await fetch('https://ipapi.co/json/');
        const j = await r.json();
        const country = (j && j.country_name) ? j.country_name : 'Unknown';
        // local storage aggregator for demo/top5 display
        const key = 'visitor_country_counts_v1';
        const raw = localStorage.getItem(key);
        const obj = raw ? JSON.parse(raw) : {};
        obj[country] = (obj[country] || 0) + 1;
        localStorage.setItem(key, JSON.stringify(obj));
        // render top5
        const arr = Object.keys(obj).map(k => ({ country: k, count: obj[k] }));
        arr.sort((a, b) => b.count - a.count);
        const top5 = arr.slice(0, 5).map(x => `${x.country} (${x.count})`).join(', ');
        const topEl = document.getElementById('top5');
        if (topEl) topEl.textContent = top5 || '—';
        // also set small visitor-widget copies on pages
        document.querySelectorAll('.visitor-widget #totalVisits').forEach(el => {
            // no-op (already set by countapi)
        });
    } catch (err) { console.warn('visitor country detect fail', err); }
}
updateVisitorCounter();

// ---------- BS (Bikram Sambat) calendar — simple algorithmic approximation ----------
function renderBSDate() {
    // Approximate conversion:
    // If date >= Apr 14 => BS year = AD year + 57; else AD year + 56.
    // This yields correct BS YEAR but day/month needs a full mapping for perfect accuracy.
    // For complete accuracy replace with a Nepali date API or a full conversion table.
    const now = new Date();
    const adYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1..12
    const day = now.getDate();
    let bsYear = (month > 4 || (month === 4 && day >= 14)) ? adYear + 57 : adYear + 56;

    // Approximate BS month/date using offset of roughly 17 days; *approximate only*
    // NOTE: This is intentionally approximate — replace with accurate API if you need exact daily BS date.
    const approxOffsetDays = 17;
    const approxDate = new Date(now.getTime() + approxOffsetDays * 24 * 60 * 60 * 1000);
    const monthsBS = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
    const bsMonthIndex = ((approxDate.getMonth() + 9) % 12); // rough shift
    const bsDay = approxDate.getDate();
    const bsStr = `${bsYear} ${monthsBS[bsMonthIndex]} ${bsDay}`;
    document.querySelectorAll('#bsDate').forEach(el => el.textContent = bsStr);
}
renderBSDate();

// ---------- Chat button fallback: when pressed open a small panel (provider script preferred) ----------
document.querySelectorAll('#chatBtn, #chatBtn2').forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
        alert('Chat widget not installed. To enable live chat: sign up at Tidio/Crisp, copy the script they give you and paste it into the top of each HTML page (replace the chat placeholder).');
    });
});

// ---------- Footer year fill on all pages ----------
document.querySelectorAll('#footerYear, #footerYear2, #footerYear3, #footerYear4, #footerYear5').forEach(el => {
    if (el) el.textContent = (new Date()).getFullYear();
});

/* -------------------------
   Helpful functions you can call from console:
   - installChatSnippet(snippetString) -> stores snippet in localStorage and dynamically injects it
-------------------------- */
function installChatSnippet(snippet) {
    localStorage.setItem('chat_snippet', snippet);
    const div = document.createElement('div');
    div.innerHTML = snippet;
    document.body.appendChild(div);
    alert('Chat snippet injected for this browser (also saved to localStorage). For global installation paste snippet into each page HTML as instructed.');
}
// If there is a stored snippet in localStorage, inject it
(function () {
    const snip = localStorage.getItem('chat_snippet');
    if (snip) {
        const d = document.createElement('div');
        d.innerHTML = snip;
        document.body.appendChild(d);
    }
})();
