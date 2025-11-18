/* ==========================================================
   CONFIG
========================================================== */
const OPENWEATHER_API_KEY = "57d0913961b8dd3587935fb4252d809c";
const COUNTAPI_NAMESPACE = "ishwar_neupane_homepage_ns";
const COUNTAPI_KEY = "total_visits";

/* ==========================================================
   THEME TOGGLE (Dark/Light)
========================================================== */
(function () {
  const saved = localStorage.getItem("theme_pref");
  if (saved === "dark") document.documentElement.classList.add("dark");

  document.querySelectorAll("#themeToggle").forEach((btn) => {
    const updateIcon = () =>
      (btn.textContent = document.documentElement.classList.contains("dark")
        ? "☀️"
        : "🌙");

    updateIcon();

    btn.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
      localStorage.setItem(
        "theme_pref",
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
      updateIcon();
    });
  });
})();

// preload dark profile image to avoid flicker when toggling
(function preloadProfileDark(){
  const img = new Image();
  img.src = 'profile-dark.jpg';
})();

/* ==========================================================
   WEATHER WIDGET
========================================================== */
async function initWeather() {
  const el = document.getElementById("weatherWidget");
  if (!el) return;

  el.innerHTML = `
    <div class="weather-icon" id="weatherIcon">--</div>
    <div>
      <div id="weatherTemp">--°C</div>
      <div id="weatherDesc" class="muted small">Loading...</div>
      <div id="weatherLoc" class="muted small"></div>
    </div>
  `;

  const applyWeather = (j) => {
    document.getElementById("weatherTemp").textContent =
      Math.round(j.main.temp) + "°C";
    document.getElementById("weatherDesc").textContent = j.weather[0].main;
    document.getElementById("weatherLoc").textContent =
      j.name + ", " + j.sys.country;
    document.getElementById(
      "weatherIcon"
    ).innerHTML = `<img src="https://openweathermap.org/img/wn/${j.weather[0].icon}@2x.png" width="48" height="48">`;
  };

  // One clean location fetch: geolocation → IP fallback
  let lat = null,
    lon = null;

  try {
    await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          resolve();
        },
        resolve,
        { timeout: 5000 }
      )
    );
  } catch (e) {}

  if (!lat || !lon) {
    try {
      const r = await fetch("https://ipapi.co/json/");
      const j = await r.json();
      lat = j.latitude;
      lon = j.longitude;
    } catch (e) {}
  }

  if (!lat || !lon) {
    document.getElementById("weatherDesc").textContent = "Unavailable";
    return;
  }

  try {
    const r = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );
    applyWeather(await r.json());
  } catch (e) {
    document.getElementById("weatherDesc").textContent = "Error";
  }
}

initWeather();

/* ==========================================================
   VISITOR COUNTER (CountAPI + top country local tally)
========================================================== */
async function updateVisitors() {
  const totalEl =
    document.getElementById("totalVisits") ||
    document.getElementById("totalVisitors");
  const topEl =
    document.getElementById("top5") ||
    document.getElementById("topCountries");

  // 1) Total visits (global)
  let total = "--";
  try {
    const r = await fetch(
      `https://api.countapi.xyz/hit/${COUNTAPI_NAMESPACE}/${COUNTAPI_KEY}`
    );
    const j = await r.json();
    total = j.value?.toLocaleString() || "--";
  } catch (e) {}

  if (totalEl) totalEl.textContent = total;

  // 2) Country-based local ranking
  let country = "Unknown";
  try {
    const r = await fetch("https://ipapi.co/json/");
    const j = await r.json();
    country = j.country_name || "Unknown";
  } catch (e) {}

  const storeKey = "visitor_country_counts_v1";
  const data = JSON.parse(localStorage.getItem(storeKey) || "{}");
  data[country] = (data[country] || 0) + 1;
  localStorage.setItem(storeKey, JSON.stringify(data));

  const sorted = Object.entries(data)
    .map(([c, n]) => ({ country: c, count: n }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (topEl)
    topEl.textContent = sorted
      .map((x) => `${x.country} (${x.count})`)
      .join(", ");
}

updateVisitors();

/* ==========================================================
   CHAT SNIPPET LOADER (optional)
========================================================== */
(function () {
  const saved = localStorage.getItem("chat_snippet");
  if (saved) {
    const d = document.createElement("div");
    d.innerHTML = saved;
    document.body.appendChild(d);
  }

  window.installChatSnippet = function (snippet) {
    localStorage.setItem("chat_snippet", snippet);
    const d = document.createElement("div");
    d.innerHTML = snippet;
    document.body.appendChild(d);
    alert("Chat snippet installed.");
  };
})();

/* ==========================================================
   FOOTER YEAR AUTO-UPDATE
========================================================== */
document
  .querySelectorAll("#footerYear")
  .forEach((e) => (e.textContent = new Date().getFullYear()));

