// ── Your API Key ──────────────────────────────────────────
const API_KEY = "eab4f27a6c2c7ba71d428d56b15c6ae0"; // 👈 paste your key here

const BASE_URL = "https://api.openweathermap.org/data/2.5"

// ── DOM References ────────────────────────────────────────
// These grab each HTML element so we can read/update them
const cityInput     = document.getElementById("city-input");
const searchBtn     = document.getElementById("search-btn");
const errorMsg      = document.getElementById("error-msg");
const loadingEl     = document.getElementById("loading");
const weatherMain   = document.getElementById("weather-main");
const forecastSec   = document.getElementById("forecast-section");

const cityNameEl    = document.getElementById("city-name");
const weatherIconEl = document.getElementById("weather-icon");
const temperatureEl = document.getElementById("temperature");
const conditionEl   = document.getElementById("condition");
const feelsLikeEl   = document.getElementById("feels-like");
const humidityEl    = document.getElementById("humidity");
const windSpeedEl   = document.getElementById("wind-speed");
const forecastCards = document.getElementById("forecast-cards");

// Listen for button click
searchBtn.addEventListener("click", handleSearch);

// Listen for Enter key press
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

// This runs when user searches
function handleSearch() {
  const city = cityInput.value.trim(); // .trim() removes accidental spaces

  if (!city) return; // If input is empty, do nothing

  fetchWeather(city);
}

async function fetchWeather(city) {
  showLoading();

  try {
    const response = await fetch(
      `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
      if (response.status === 404) {
        showError("City not found. Please check the spelling.");
      } else {
        showError("Something went wrong. Please try again.");
      }
      return;
    }

    const data = await response.json();
    displayCurrentWeather(data);
    fetchForecast(city);

  } catch (err) {
    showError("Network error. Check your connection.");
  }
}

async function fetchForecast(city) {
  try {
    const response = await fetch(
      `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) return;

    const data = await response.json();
    displayForecast(data.list);

  } catch (err) {
    console.error("Forecast fetch failed:", err);
  }
}
// Weather condition → CSS theme class mapping
const WEATHER_THEMES = {
  clear:        "weather-clear",
  rain:         "weather-rain",
  drizzle:      "weather-rain",
  clouds:       "weather-clouds",
  snow:         "weather-snow",
  thunderstorm: "weather-thunderstorm",
};

function applyWeatherTheme(conditionMain) {
  const key = conditionMain.toLowerCase();
  const themeClass = WEATHER_THEMES[key] || "";
  // Remove any existing weather theme classes
  document.body.classList.remove(...Object.values(WEATHER_THEMES));
  if (themeClass) document.body.classList.add(themeClass);
}

function displayCurrentWeather(data) {
  hideLoading();
  clearError();

  cityNameEl.textContent    = `${data.name}, ${data.sys.country}`;
  temperatureEl.textContent = `${Math.round(data.main.temp)}°C`;
  conditionEl.textContent   = data.weather[0].description;
  feelsLikeEl.textContent   = `${Math.round(data.main.feels_like)}°C`;
  humidityEl.textContent    = `${data.main.humidity}%`;
  windSpeedEl.textContent   = `${data.wind.speed} m/s`;

  weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  // Apply dynamic background theme
  applyWeatherTheme(data.weather[0].main);

  // Re-trigger fade-in animation
  weatherMain.classList.remove("hidden");
  weatherMain.style.animation = "none";
  weatherMain.offsetHeight; // reflow
  weatherMain.style.animation = "";
}

function displayForecast(list) {
  forecastCards.innerHTML = "";

  // API gives data every 3 hours — we pick 12:00 to get one entry per day
  const dailyList = list.filter(item => item.dt_txt.includes("12:00:00"));

  dailyList.forEach((item) => {
    const day     = new Date(item.dt_txt).toLocaleDateString("en-US", { weekday: "short" });
    const temp    = `${Math.round(item.main.temp)}°C`;
    const iconURL = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;

    const card = document.createElement("div");
    card.classList.add("forecast-card");
    card.innerHTML = `
      <p class="forecast-day">${day}</p>
      <img class="forecast-icon" src="${iconURL}" alt="icon" />
      <p class="forecast-temp">${temp}</p>
    `;
    forecastCards.appendChild(card);
  });

  forecastSec.classList.remove("hidden");
}

// ── Helper functions ──────────────────────────
function showLoading() {
  loadingEl.classList.remove("hidden");
  weatherMain.classList.add("hidden");
  forecastSec.classList.add("hidden");
  clearError();
}

function hideLoading() {
  loadingEl.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  errorMsg.textContent = message;
  weatherMain.classList.add("hidden");
  forecastSec.classList.add("hidden");
}

function clearError() {
  errorMsg.textContent = "";
}
