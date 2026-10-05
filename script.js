// ==========================================
// LOGIN CHECK
// ==========================================

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

saveCurrentLocation();


// ==========================================
// REGISTER SERVICE WORKER
// ==========================================

/*
if ("serviceWorker" in navigator) {

    navigator.serviceWorker
        .register("service-worker.js")
        .then(() => {
            console.log("Service Worker registered successfully");
        })
        .catch(error => {
            console.error(
                "Service Worker registration failed:",
                error
            );
        });

}
*/

// ==========================================
// WEB PUSH SUBSCRIPTION
// ==========================================

async function subscribeToPush() {

    try {

        const registration =
            await navigator.serviceWorker.ready;

        const response = await fetch(
         "http://localhost:3000/api/vapid-public-key"
        );

        const data =
            await response.json();

        const publicKey =
            data.publicKey;

        const subscription =
            await registration.pushManager.subscribe({

                userVisibleOnly: true,

                applicationServerKey:
                    publicKey

            });

        const token =
            localStorage.getItem("token");

        await fetch(
           "http://localhost:3000/api/push-subscription",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        "Bearer " + token
                },

                body: JSON.stringify({
                    subscription: subscription
                })
            }
        );

        console.log(
            "Push subscription saved successfully"
        );

    } catch (error) {

        console.error(
            "Push subscription error:",
            error
        );

    }

}


// ==========================================
// HTML ELEMENTS
// ==========================================

const cityInput =
    document.getElementById("city");

const searchBtn =
    document.getElementById("searchBtn");

const weatherResult =
    document.getElementById("weatherResult");

const forecast =
    document.getElementById("forecast");

const recommendationMessage =
    document.getElementById("recommendationMessage");

const recommendationTip =
    document.getElementById("recommendationTip");

    // Clear weather results when search box is empty
cityInput.addEventListener("input", function () {
    if (cityInput.value.trim() === "") {
        weatherResult.innerHTML = "";
        forecast.innerHTML = "";

        const smartRecommendation =
            document.getElementById("smartRecommendation");

        if (smartRecommendation) {
            smartRecommendation.style.display = "none";
        }
    }
});
// ==========================================
// SEARCH BUTTON
// ==========================================

searchBtn.addEventListener(
    "click",
    getWeather
);

// ==========================================
// SAVE SEARCHED LOCATION
// ==========================================
let searchedLocation = null;

async function saveSearchedLocation() {

    if (!searchedLocation) {
        alert("Please search for a location first.");
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("Please login again.");
        return;
    }

    const heart =
        document.getElementById("saveHeartBtn");

    try {

        // ==========================================
        // CHECK WHETHER LOCATION IS ALREADY SAVED
        // ==========================================

        const savedResponse =
            await fetch(
                "http://localhost:3000/api/saved-locations",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const savedData =
            await savedResponse.json();

        const savedLocations =
            savedData.locations || [];

        const existingLocation =
            savedLocations.find(location =>
                Math.abs(
                    Number(location.latitude) -
                    Number(searchedLocation.latitude)
                ) < 0.0001 &&
                Math.abs(
                    Number(location.longitude) -
                    Number(searchedLocation.longitude)
                ) < 0.0001
            );


        // ==========================================
        // UNSAVE
        // ==========================================

        if (existingLocation) {

            const deleteResponse =
                await fetch(
                    "http://localhost:3000/api/saved-locations/" +
                    existingLocation._id,
                    {
                        method: "DELETE",

                        headers: {
                            "Authorization":
                                "Bearer " + token
                        }
                    }
                );

            if (deleteResponse.ok) {

                if (heart) {
                    heart.innerHTML = "♡";
                    heart.classList.remove("saved");
                }

                alert(
                    "📍 Location removed from saved locations."
                );

            } else {

                alert(
                    "Unable to remove saved location."
                );

            }

            return;
        }


        // ==========================================
        // SAVE
        // ==========================================

        const response =
            await fetch(
                "http://localhost:3000/api/saved-locations",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body: JSON.stringify({

                        name:
                            searchedLocation.name,

                        state:
                            searchedLocation.state || "",

                        country:
                            searchedLocation.country || "",

                        latitude:
                            searchedLocation.latitude,

                        longitude:
                            searchedLocation.longitude
                    })
                }
            );

        const data =
            await response.json();

        if (response.ok) {

            if (heart) {
                heart.innerHTML = "♥";
                heart.classList.add("saved");
            }

            alert(
                "📍 Location saved successfully."
            );

        } else {

            alert(
                data.error ||
                "Unable to save location."
            );
        }

    } catch (error) {

        console.error(
            "Save/Unsave location error:",
            error
        );

        alert(
            "Unable to update saved location."
        );
    }
}
// ==========================================
// LOAD SAVED LOCATIONS
// ==========================================

async function loadSavedLocations() {

    const savedLocationsList =
        document.getElementById("savedLocationsList");

    if (!savedLocationsList) {
        return;
    }

    const token =
        localStorage.getItem("token");

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                "http://localhost:3000/api/saved-locations",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            savedLocationsList.innerHTML =
                "<p>Unable to load saved locations.</p>";

            return;
        }

        const locations =
            data.locations || [];

        if (locations.length === 0) {

            savedLocationsList.innerHTML =
                "<p>No saved locations yet.</p>";

            return;
        }

        savedLocationsList.innerHTML =
            locations.map(location => `

                <div class="saved-location-item">

                    <span>
                        📍 <strong>${location.name}</strong>
                        ${location.state
                            ? ", " + location.state
                            : ""}
                        ${location.country
                            ? ", " + location.country
                            : ""}
                    </span>

                    <button
                        type="button"
                        onclick="deleteSavedLocation('${location._id}')">

                        🗑️ Delete

                    </button>

                </div>

            `).join("");

    } catch (error) {

        console.error(
            "Load saved locations error:",
            error
        );

        savedLocationsList.innerHTML =
            "<p>Unable to load saved locations.</p>";

    }

}

loadSavedLocations();

// ==========================================
// DELETE SAVED LOCATION
// ==========================================

async function deleteSavedLocation(locationId) {

    const token =
        localStorage.getItem("token");

    if (!token) {
        alert("Please login again.");
        return;
    }

    const confirmDelete =
        confirm("Are you sure you want to delete this saved location?");

    if (!confirmDelete) {
        return;
    }

    try {

       const response =
    await fetch(
        "http://localhost:3000/api/saved-locations/" + locationId,
        {
            method: "DELETE",
            headers: {
                "Authorization":
                    "Bearer " + token
            }
        }
    );

        const data =
            await response.json();

        if (response.ok) {

            alert("📍 Saved location deleted.");

            await loadSavedLocations();

        } else {

            alert(
                data.error ||
                "Unable to delete saved location."
            );

        }

    } catch (error) {

        console.error(
            "Delete saved location error:",
            error
        );

        alert("Unable to delete saved location.");

    }

}

// ==========================================
// ENTER KEY SEARCH
// ==========================================

cityInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {
            getWeather();
        }

    }
);


// ==========================================
// SAVE CURRENT LOCATION
// ==========================================

async function saveCurrentLocation() {

    if (!navigator.geolocation) {

        console.log(
            "Geolocation is not supported by this browser."
        );

        return;
    }

    navigator.geolocation.getCurrentPosition(

        async function (position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            try {

                const token =
                    localStorage.getItem("token");

                if (!token) {
                    return;
                }

                const response =
                    await fetch(
                       "http://localhost:3000/api/saved-locations",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    "Bearer " + token
                            },

                            body: JSON.stringify({

                                latitude:
                                    latitude,

                                longitude:
                                    longitude

                            })
                        }
                    );

                const data =
                    await response.json();

                if (response.ok) {

                    console.log(
                        "Current location saved successfully"
                    );

                } else {

                    console.error(
                        "Location save failed:",
                        data.error
                    );

                }

            } catch (error) {

                console.error(
                    "Location save error:",
                    error
                );

            }

        },

        function (error) {

            console.log(
                "Location permission not granted."
            );

        }

    );

}


// ==========================================
// MAIN WEATHER FUNCTION
// ==========================================

async function getWeather() {

    const searchText =
        cityInput.value.trim();

    if (searchText === "") {

        weatherResult.innerHTML =
            "<p>Please enter a city, town or village.</p>";

        forecast.innerHTML = "";

        return;
    }
      weatherResult.innerHTML =
         `🔍 Searching for <strong>${searchText}</strong>... Please wait a moment.`;

      forecast.innerHTML = "";
    try {

        // ==========================================
        // 1. SEARCH LOCATION
        // ==========================================

        const location =
            await searchLocation(searchText);

        searchedLocation = location;
        if (!location) {

            weatherResult.innerHTML = `
                <p>
                    ❌ Location not found.
                    Please check the spelling and try again.
                </p>
            `;

            forecast.innerHTML = "";

            return;
        }


        // ==========================================
        // 2. WEATHER API
        // ==========================================

        const weatherURL =
           `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=11`;

        const weatherResponse =
            await fetch(weatherURL);

        if (!weatherResponse.ok) {

            throw new Error(
                "Weather API request failed"
            );

        }

        const weatherData =
            await weatherResponse.json();
       
        if (
            !weatherData.current ||
            !weatherData.daily
        ) {

            throw new Error(
                "Weather data unavailable"
            );

        }


        // ==========================================
        // 3. CURRENT WEATHER
        // ==========================================

        const condition =
            getWeatherCondition(
                weatherData.current.weather_code
            );

            // SMART WEATHER RECOMMENDATION

            updateSmartRecommendation(
               weatherData.current.weather_code,
               weatherData.current.apparent_temperature,
               weatherData.current.wind_speed_10m,
               weatherData.current.is_day
            );
            const currentDate =
               weatherData.current.time.split("T")[0];

            const formattedDate =
                formatCurrentDate(currentDate);

            const locationText =
                formatLocation(location);


        // ==========================================
        // DISPLAY CURRENT WEATHER
        // ==========================================

        weatherResult.innerHTML = `

            <div class="current-weather-card">

                <div class="weather-location">

                   <h2>
                     📍 ${locationText}

                     <button
                       type="button"
                       id="saveHeartBtn"
                       class="heart-save-btn"
                       onclick="saveSearchedLocation()"
                       aria-label="Save location">
                       ♡
                     </button>
                    </h2>

                  <p>
                    📅 ${formattedDate}
                 </p>

                </div>

                <div class="weather-main">

                    <div class="weather-icon-large">
 
                        ${getWeatherIcon(
                            weatherData.current.weather_code,
                            weatherData.current.is_day
                        )}

                    </div>

                    <div class="temperature-section">

                        <div class="temperature">

                            ${Math.round(
                                weatherData.current.temperature_2m
                            )}°C

                        </div>

                        <div class="condition">

                            ${condition}

                        </div>

                    </div>

                    <div class="weather-details">

                        <div class="weather-detail">

                            <strong>
                                💧 Humidity
                            </strong>

                            <br>

                            <span>
                                ${weatherData.current.relative_humidity_2m}%
                            </span>

                        </div>

                        <div class="weather-detail">

                            <strong>
                                🌡️ Feels Like
                            </strong>

                            <br>

                            <span>
                                ${Math.round(
                                    weatherData.current.apparent_temperature
                                )}°C
                            </span>

                        </div>

                        <div class="weather-detail">

                            <strong>
                                🌬️ Wind Speed
                            </strong>

                            <br>

                            <span>
                                ${weatherData.current.wind_speed_10m} km/h
                            </span>

                        </div>

                    </div>

                </div>

            </div>

        `;


        // ==========================================
        // 4. SAVE SEARCH HISTORY
        // ==========================================

        try {

            const token =
                localStorage.getItem("token");

            if (token)

                await fetch(
    "http://localhost:3000/api/history",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            location: location.name,
            country: location.country,
            temperature: weatherData.current.temperature_2m,
            condition: condition,
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: weatherData.current.wind_speed_10m
        })
    }
);

        } catch (historyError) {

            console.error(
                "History save error:",
                historyError
            );

        }


        // ==========================================
        // 5. 10 DAYS FORECAST
        // ==========================================

        forecast.innerHTML = `

            <h2>📅 10 Days Forecast</h2>

        `;


        // ==========================================
        // DISPLAY 10 FUTURE DAYS
        // ==========================================

        for (
            let i = 1;
            i <= 10 &&
            i < weatherData.daily.time.length;
            i++
        ) {

            const forecastDate =
                formatForecastDate(
                    weatherData.daily.time[i]
                );

            const weatherCode =
                weatherData.daily.weather_code[i];

            const forecastIcon =
                getWeatherIcon(
                    weatherCode
                );

            const forecastCondition =
                getWeatherCondition(
                    weatherCode
                );


            // ======================================
            // MAX TEMPERATURE
            // ======================================

            const maxTemp =
                Math.round(
                    weatherData.daily
                        .temperature_2m_max[i]
                );


            // ======================================
            // MIN TEMPERATURE
            // ======================================

            const minTemp =
                Math.round(
                    weatherData.daily
                        .temperature_2m_min[i]
                );


            // ======================================
            // HUMIDITY
            // ======================================

            const humidity =
                weatherData.daily
                    .relative_humidity_2m_mean[i] ?? 0;


            // ======================================
            // RAIN CHANCE
            // ======================================

            const rainChance =
                weatherData.daily
                    .precipitation_probability_max[i] ?? 0;

            const expectedRain =
                weatherData.daily
                    .precipitation_sum[i] ?? 0;
            // ======================================
            // WIND SPEED
            // ======================================

            const windSpeed =
                weatherData.daily
                    .wind_speed_10m_max[i] ?? 0;


            // ==========================================
            // FORECAST CARD
            // ==========================================

            forecast.innerHTML += `

                <div class="forecast-card">

                    <div class="forecast-date">

                        ${forecastDate}

                    </div>

                    <div class="forecast-icon">

                        ${forecastIcon}

                    </div>

                    <div class="forecast-condition">

                        ${forecastCondition}

                    </div>

                    <div class="forecast-temperature">

                        <span class="max-temp">

                            ${maxTemp}°C

                        </span>

                        <span class="temp-separator">

                            /

                        </span>

                        <span class="min-temp">

                            ${minTemp}°C

                        </span>

                    </div>

                    <div class="forecast-info">

                        <div>

                            💧 Humidity

                            <strong>

                                ${Math.round(humidity)}%

                            </strong>

                        </div>

                        <div>

                            🌧️ Rain

                            <strong>

                                ${rainChance}%

                            </strong>

                        </div>

                        <div class="expected-rain"> 

                         ☔ Expected Rain

                          <strong>

                             ${Number(expectedRain).toFixed(1)} mm

                          </strong>

                        </div>

                        <div>

                            🌬️ Wind

                            <strong>

                                ${Math.round(windSpeed)} km/h

                            </strong>

                        </div>

                    </div>

                </div>

            `;

        }

    } catch (error) {

        console.error(
            error
        );

        weatherResult.innerHTML =
            "<p>❌ Something went wrong. Please try again.</p>";

        forecast.innerHTML = "";

    }

}


// ==========================================
// FORMAT LOCATION
// ==========================================

function formatLocation(location) {

    const parts = [];

    if (location.name) {

        parts.push(
            location.name
        );

    }

    if (
        location.state &&
        normalizeName(location.state) !==
        normalizeName(location.name)
    ) {

        parts.push(
            location.state
        );

    }

    if (location.country) {

        parts.push(
            cleanCountryName(
                location.country
            )
        );

    }

    return parts.join(", ");

}


// ==========================================
// CLEAN COUNTRY NAME
// ==========================================

function cleanCountryName(country) {

    if (!country) {
        return "";
    }

    const countryName =
        country.trim();

    if (
        countryName ===
        "Republic of Türkiye"
    ) {

        return "Türkiye";

    }

    if (
        countryName ===
        "Türkiye Republic"
    ) {

        return "Türkiye";

    }

    return countryName;

}

 // ==========================================
// FORMAT CURRENT DATE
// ==========================================

function formatCurrentDate(dateString) {

    const [year, month, day] =
        dateString.split("-").map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );
}
// ==========================================
// FORMAT FORECAST DATE
// ==========================================

function formatForecastDate(dateString) {

    const date =
        new Date(
            dateString + "T00:00:00"
        );

    const formattedDate =
        date.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    return formattedDate.replace(
        /,\s*(\d{4})$/,
        ",<br>$1"
    );
}


// ==========================================
// WEATHER ICON
// ==========================================

function getWeatherIcon(code, isDay = 1) {

    // Clear Sky
    if (code === 0) {
        return isDay === 1 ? "☀️" : "🌙";
    }

    // Mainly Clear
    if (code === 1) {
        return isDay === 1 ? "🌤️" : "🌙";
    }

    // Partly Cloudy
    if (code === 2) {
        return isDay === 1 ? "⛅" : "☁️";
    }

    // Overcast
    if (code === 3) {
        return "☁️";
    }

    // Fog
    if (code >= 45 && code <= 48) {
        return "🌫️";
    }

    // Drizzle
    if (code >= 51 && code <= 57) {
        return "🌦️";
    }

    // Rain
    if (code >= 61 && code <= 67) {
        return "🌧️";
    }

    // Snow
    if (code >= 71 && code <= 77) {
        return "❄️";
    }

    // Rain Showers
    if (code >= 80 && code <= 82) {
        return "🌦️";
    }

    // Thunderstorm
    if (code >= 95 && code <= 99) {
        return "⛈️";
    }

    return isDay === 1 ? "🌤️" : "🌙";
}


// ==========================================
// WEATHER CONDITION
// ==========================================

function getWeatherCondition(code) {

    if (code === 0)
        return "Clear Sky";

    if (code === 1 || code === 2)
        return "Partly Cloudy";

    if (code === 3)
        return "Overcast";

    if (code >= 45 && code <= 48)
        return "Fog";

    if (code >= 51 && code <= 57)
        return "Drizzle";

    if (code >= 61 && code <= 67)
        return "Rain";

    if (code >= 71 && code <= 77)
        return "Snow";

    if (code >= 80 && code <= 82)
        return "Rain Showers";

    if (code >= 95 && code <= 99)
        return "Thunderstorm";

    return "Unknown";

}


// ==========================================
// SMART WEATHER RECOMMENDATION
// ==========================================
function updateSmartRecommendation(
    weatherCode,
    feelsLike,
    windSpeed,
    isDay
) {
    const smartRecommendation =
        document.getElementById("smartRecommendation");

    if (smartRecommendation) {
        smartRecommendation.style.display = "block";
    }

    if (!recommendationMessage || !recommendationTip) {
        return;
    }

    // ==========================================
    // 🌙 NIGHT TIME
    // ==========================================
    if (!isDay) {

        // THUNDERSTORM
        if (weatherCode >= 95 && weatherCode <= 99) {
            recommendationMessage.innerHTML =
                "⛈️ Thunderstorm conditions are expected tonight.<br>" +
                "Outdoor activities may be affected.";

            recommendationTip.textContent =
                "🎒 Tip: Stay indoors and follow local weather alerts.";

            return;
        }

        // RAIN
        const isRain =
            (weatherCode >= 51 && weatherCode <= 67) ||
            (weatherCode >= 80 && weatherCode <= 82);

        if (isRain) {
            recommendationMessage.innerHTML =
                "🌧️ Rain is expected tonight.<br>" +
                "Outdoor activities may be affected.";

            recommendationTip.textContent =
                "☔ Tip: Carry an umbrella if you need to go outside.";

            return;
        }

        // STRONG WIND
        if (windSpeed >= 30) {
            recommendationMessage.innerHTML =
                "💨 Strong winds are present tonight.<br>" +
                "Be careful during outdoor activities.";

            recommendationTip.textContent =
                "🎒 Tip: Avoid exposed areas and secure loose items.";

            return;
        }

        // NIGHT HOT
        if (feelsLike >= 34) {
            recommendationMessage.innerHTML =
                "🌡️ It feels quite hot tonight.<br>" +
                "Keep yourself comfortable and hydrated.";

            recommendationTip.textContent =
                "💧 Tip: Drink enough water and stay in a cool place.";

            return;
        }

        // NIGHT WARM
        if (feelsLike >= 28) {
            recommendationMessage.innerHTML =
                "🌙 It feels warm tonight.";

            recommendationTip.textContent =
                "💧 Tip: Stay hydrated and keep yourself comfortable.";

            return;
        }

        // NIGHT COOL
        if (feelsLike < 20) {
            recommendationMessage.innerHTML =
                "🥶 It feels cool tonight.";

            recommendationTip.textContent =
                "🧥 Tip: Keep yourself warm and comfortable.";

            return;
        }

        // NORMAL NIGHT
        recommendationMessage.innerHTML =
            "🌙 The weather feels comfortable tonight.";

        recommendationTip.textContent =
            "✨ Tip: Enjoy the pleasant weather.";

        return;
    }

    // ==========================================
    // ☀️ DAY TIME
    // ==========================================

    // THUNDERSTORM
    if (weatherCode >= 95 && weatherCode <= 99) {
        recommendationMessage.innerHTML =
            "⛈️ Thunderstorm conditions are present right now.<br>" +
            "Outdoor activities may be affected.";

        recommendationTip.textContent =
            "🎒 Tip: Stay indoors and follow local weather alerts.";

        return;
    }

    // STRONG WIND
    if (windSpeed >= 30) {
        recommendationMessage.innerHTML =
            "💨 Strong winds are present right now.<br>" +
            "Be careful during outdoor activities.";

        recommendationTip.textContent =
            "🎒 Tip: Avoid exposed areas and secure loose items.";

        return;
    }

    // RAIN
    const isRain =
        (weatherCode >= 51 && weatherCode <= 67) ||
        (weatherCode >= 80 && weatherCode <= 82);

    if (isRain) {
        recommendationMessage.innerHTML =
            "🌧️ Rain is likely right now.<br>" +
            "Outdoor activities may be affected.";

        recommendationTip.textContent =
            "☔ Tip: Carry an umbrella and stay hydrated.";

        return;
    }

    // DAY HOT
    if (feelsLike >= 34) {
        recommendationMessage.innerHTML =
            "🔥 It feels very hot right now.<br>" +
            "Avoid prolonged direct sunlight.";

        recommendationTip.textContent =
            "💧 Tip: Stay hydrated and take breaks from the heat.";

        return;
    }

    // DAY WARM
    if (feelsLike >= 28) {
        recommendationMessage.innerHTML =
            "🌡️ It feels quite warm right now.";

        recommendationTip.textContent =
            "💧 Tip: Stay hydrated and avoid prolonged sun exposure.";

        return;
    }

    // DAY PLEASANT
    if (feelsLike >= 20) {
        recommendationMessage.innerHTML =
            "😊 The weather feels pleasant right now.";

        recommendationTip.textContent =
            "✨ Tip: It's a good time for normal outdoor activities.";

        return;
    }

    // DAY COLD
    recommendationMessage.innerHTML =
        "🥶 It feels cool right now.";

    recommendationTip.textContent =
        "🧥 Tip: Keep yourself warm and comfortable.";
}

// ==========================================
// LOCATION SEARCH - STRICT EXACT MATCH
// ==========================================

async function searchLocation(searchText) {

    const originalText =
        searchText.trim();

    if (!originalText) {
        return null;
    }

    console.log(
        "STRICT SEARCH TEXT:",
        originalText
    );

    const normalize = (value) => {

        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^\p{L}\p{N}]+/gu, "");

    };

    const mainName =
        originalText
            .split(",")[0]
            .trim();

    const typedName =
        normalize(mainName);


    // ==========================================
    // 1. OPEN-METEO
    // ==========================================

    let location =
        await searchOpenMeteo(originalText);

    if (location) {

        const returnedName =
            normalize(location.name);

        console.log(
            "OPEN-METEO RESULT:",
            location.name
        );

        if (returnedName === typedName) {
            return location;
        }

        console.log(
            "OPEN-METEO REJECTED:",
            location.name
        );
    }


    // ==========================================
    // 2. NOMINATIM
    // ==========================================

    location =
        await searchNominatim(originalText);

    if (location) {

        const returnedName =
            normalize(location.name);

        console.log(
            "NOMINATIM RESULT:",
            location.name
        );

        if (returnedName === typedName) {
            return location;
        }

        console.log(
            "NOMINATIM REJECTED:",
            location.name
        );
    }


    // ==========================================
    // 3. KNOWN VILLAGE
    // ==========================================

    location =
        searchKnownVillage(originalText);

    if (location) {
        return location;
    }


    // ==========================================
    // 4. NOT FOUND
    // ==========================================

    console.log(
        "LOCATION NOT FOUND:",
        originalText
    );

    return null;
}


// ==========================================
// OPEN-METEO EXACT WORLDWIDE SEARCH
// ==========================================

async function searchOpenMeteo(searchText) {

    try {
        const parts = searchText
            .split(",")
            .map(p => p.trim())
            .filter(Boolean);

        const mainName = parts[0];

        if (!mainName) {
            return null;
        }


        const url =
            `https://geocoding-api.open-meteo.com/v1/search` +
            `?name=${encodeURIComponent(mainName)}` +
            `&count=100` +
            `&language=en` +
            `&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return null;
        }

        const normalize = (value) => {
            return String(value || "")
                .toLowerCase()
                .trim()
                .replace(/[^\p{L}\p{N}]+/gu, "");
        };

        const typedName = normalize(mainName);

        // Exact name match
        const exactResults = data.results.filter(item => {
            return normalize(item.name) === typedName;
        });

        // If country/state/city is also typed,
        // make sure the result belongs to that context.
        const contextResults = exactResults.filter(item => {

            if (parts.length <= 1) {
                return true;
            }

            const searchableText = [
                item.name,
                item.admin1,
                item.admin2,
                item.admin3,
                item.country
            ]
                .filter(Boolean)
                .map(normalize);

            return parts.every(part => {
                const normalizedPart = normalize(part);

                return searchableText.some(value =>
                    value.includes(normalizedPart)
                );
            });
        });

        let candidates =
            contextResults.length > 0
                ? contextResults
                : parts.length === 1
                    ? exactResults
                    : [];

        if (candidates.length === 0) {
            return null;

        }

        // Prefer actual populated places over administrative areas
        candidates.sort((a, b) => {

    const getPlacePriority = (item) => {

        const feature = String(
            item.feature_code || ""
        ).toUpperCase();

        if (
            feature.startsWith("PPLC") ||
            feature.startsWith("PPLA") ||
            feature.startsWith("PPL")
        ) {
            return 2;
        }

        if (
            feature.startsWith("ADM1") ||
            feature.startsWith("ADM2")
        ) {
            return 1;
        }

        return 0;
    };

    const placePriorityDifference =
        getPlacePriority(b) -
        getPlacePriority(a);

    if (placePriorityDifference !== 0) {
        return placePriorityDifference;
    }

    // Among actual populated places,
    // prefer the larger population.
    return (
        Number(b.population || 0) -
        Number(a.population || 0)
    );
});
        const result = candidates[0];

        return {
            name: result.name,
            state: result.admin1 || result.admin2 || "",
            country: result.country || "",
            latitude: Number(result.latitude),
            longitude: Number(result.longitude)
        };

    } catch (error) {

        console.error(
            "Open-Meteo location search error:",
            error
        );

        return null;

    }

}


// ==========================================
// LOCATION TYPE PRIORITY
// ==========================================

function getLocationTypePriority(item) {

    const featureCode =
        (
            item.feature_code ||
            ""
        ).toUpperCase();


    // Countries
    if (
        featureCode === "PCLI" ||
        featureCode === "PCL" ||
        featureCode.startsWith("PCL")
    ) {

        return 500;

    }


    // States / First-level administrative areas
    if (
        featureCode === "ADM1"
    ) {

        return 450;

    }


    // Districts / Second-level administrative areas
    if (
        featureCode === "ADM2"
    ) {

        return 400;

    }


    // Cities / populated places
    if (
        featureCode === "PPLA" ||
        featureCode === "PPLA2" ||
        featureCode === "PPLA3" ||
        featureCode === "PPLA4" ||
        featureCode === "PPL"
    ) {

        return 300;

    }


    return 100;

}


// ==========================================
// CREATE LOCATION OBJECT
// ==========================================

function createLocationObject(result) {

    return {

        name:
            result.name || "",

        state:
            result.admin1 ||
            result.admin2 ||
            "",

        country:
            result.country ||
            "",

        latitude:
            parseFloat(
                result.latitude
            ),

        longitude:
            parseFloat(
                result.longitude
            )

    };

}


// ==========================================
// SIMILAR LOCATION SEARCH
// ==========================================

async function searchSimilarOpenMeteo(searchText) {

    try {

        const parts =
            searchText
                .split(",")
                .map(part => part.trim())
                .filter(Boolean);

        if (parts.length === 0) {
            return null;
        }

        const mainName = parts[0];

        const cleanName =
            normalizeName(mainName);

        if (cleanName.length < 3) {
            return null;

        }


        // ==========================================
        // 1. NOMINATIM SEARCH
        // ==========================================

        const nominatimURL =
            `https://nominatim.openstreetmap.org/search` +
            `?format=jsonv2` +
            `&q=${encodeURIComponent(searchText)}` +
            `&limit=50` +
            `&addressdetails=1` +
            `&namedetails=1`;

        const nominatimResponse =
            await fetch(nominatimURL);

        if (nominatimResponse.ok) {

            const nominatimData =
                await nominatimResponse.json();

            const candidates = [];

            for (const item of nominatimData) {

                const address =
                    item.address || {};

                const names = [

                    item.name,

                    ...Object.values(
                        item.namedetails || {}
                    ),

                    address.city,
                    address.town,
                    address.village,
                    address.hamlet,
                    address.municipality,
                    address.suburb

                ].filter(Boolean);


                let bestScore = 0;
                let bestDistance = 999;


                for (const name of names) {

                    const candidateName =
                        normalizeName(name);

                    if (!candidateName) {
                        continue;
                    }


                    const distance =
                        levenshteinDistance(
                            cleanName,
                            candidateName
                        );


                    const maxLength =
                        Math.max(
                            cleanName.length,
                            candidateName.length
                        );


                    const score =
                        maxLength > 0
                            ? 1 - (
                                distance /
                                maxLength
                            )
                            : 0;


                    if (score > bestScore) {

                        bestScore =
                            score;

                        bestDistance =
                            distance;

                    }

                }


                // High-confidence match only
                if (bestScore < 0.80) {
                    continue;
                }


                // ==========================================
                // CONTEXT CHECK
                // ==========================================

                const searchableText =
                    normalizeName(
                        [

                            item.name,
                            item.display_name,

                            address.city,
                            address.town,
                            address.village,
                            address.hamlet,
                            address.municipality,
                            address.suburb,

                            address.state,
                            address.province,
                            address.region,
                            address.state_district,

                            address.country

                        ]
                            .filter(Boolean)
                            .join(" ")
                    );


                const contextMatches =
                    parts.every(part => {

                        const cleanPart =
                            normalizeName(part);

                        return (
                            cleanPart &&
                            searchableText.includes(
                                cleanPart
                            )
                        );

                    });


                if (!contextMatches) {
                    continue;
                }


                candidates.push({

                    item:
                        item,

                    score:
                        bestScore,

                    distance:
                        bestDistance

                });

            }


            // ==========================================
            // SORT BEST RESULT
            // ==========================================

            candidates.sort(
                (a, b) => {

                    if (
                        b.score !==
                        a.score
                    ) {

                        return (
                            b.score -
                            a.score
                        );

                    }


                    if (
                        a.distance !==
                        b.distance
                    ) {

                        return (
                            a.distance -
                            b.distance
                        );

                    }


                    return (
                        getLocationTypePriority(
                            b.item
                        ) -
                        getLocationTypePriority(
                            a.item
                        )
                    );

                }
            );


            if (candidates.length > 0) {

                const best =
                    candidates[0];


                const address =
                    best.item.address || {};


                const latitude =
                    parseFloat(
                        best.item.lat
                    );

                const longitude =
                    parseFloat(
                        best.item.lon
                    );


                if (
                    !Number.isNaN(latitude) &&
                    !Number.isNaN(longitude)
                ) {

                    return {

                      name:
                         address.village ||
                         address.hamlet ||
                         address.suburb ||
                         address.town ||
                         address.city ||
                         address.municipality ||
                         best.item.name,

                        state:
                            address.state ||
                            address.province ||
                            address.region ||
                            address.state_district ||
                            "",

                        country:
                            cleanCountryName(
                                address.country ||
                                ""
                            ),

                        latitude:
                            latitude,

                        longitude:
                            longitude

                    };

                }

            }

        }


        // ==========================================
        // 2. OPEN-METEO SIMILAR SEARCH
        // ==========================================

        const openMeteoURL =
            `https://geocoding-api.open-meteo.com/v1/search` +
            `?name=${encodeURIComponent(mainName)}` +
            `&count=100` +
            `&language=en` +
            `&format=json`;


        const openMeteoResponse =
            await fetch(openMeteoURL);


        if (!openMeteoResponse.ok) {
            return null;
        }


        const openMeteoData =
            await openMeteoResponse.json();


        if (
            !openMeteoData.results ||
            openMeteoData.results.length === 0
        ) {

            return null;

        }


        const candidates = [];


        for (
            const item
            of openMeteoData.results
        ) {

            if (!item.name) {
                continue;
            }


            const candidate =
                normalizeName(
                    item.name
                );


            if (!candidate) {
                continue;
            }


            const distance =
                levenshteinDistance(
                    cleanName,
                    candidate
                );


            const maxLength =
                Math.max(
                    cleanName.length,
                    candidate.length
                );


            const score =
                maxLength > 0
                    ? 1 - (
                        distance /
                        maxLength
                    )
                    : 0;


            if (score < 0.80) {
                continue;
            }


            const searchableText =
                [

                    item.name,
                    item.admin1,
                    item.admin2,
                    item.admin3,
                    item.country

                ]
                    .filter(Boolean)
                    .map(normalizeName);


            const contextMatches =
                parts.every(part => {

                    const cleanPart =
                        normalizeName(part);

                    return searchableText.some(
                        value =>
                            value.includes(
                                cleanPart
                            )
                    );

                });


            if (!contextMatches) {
                continue;
            }


            candidates.push({

                item:
                    item,

                score:
                    score,

                distance:
                    distance

            });

        }


        if (candidates.length === 0) {
            return null;
        }


        candidates.sort(
            (a, b) => {

                if (
                    b.score !==
                    a.score
                ) {

                    return (
                        b.score -
                        a.score
                    );

                }


                if (
                    a.distance !==
                    b.distance
                ) {

                    return (
                        a.distance -
                        b.distance
                    );

                }


                return (
                    getLocationTypePriority(
                        b.item
                    ) -
                    getLocationTypePriority(
                        a.item
                    )
                );

            }
        );


        const best =
            candidates[0];


        return createLocationObject(
            best.item
        );


    } catch (error) {

        console.error(
            "Similar location search error:",
            error
        );

        return null;

    }

}


// ==========================================
// NORMALIZE LOCATION NAME
// ==========================================

function normalizeName(name) {

    return (name || "")
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


// ==========================================
// SIMILARITY SCORE
// ==========================================

function similarityScore(a, b) {

    if (a === b) {
        return 1;
    }

    if (!a || !b) {
        return 0;
    }

    const distance =
        levenshteinDistance(
            a,
            b
        );

    const maxLength =
        Math.max(
            a.length,
            b.length
        );

    return 1 -
        (
            distance /
            maxLength
        );

}


// ==========================================
// LEVENSHTEIN DISTANCE
// ==========================================

function levenshteinDistance(a, b) {

    const matrix = [];


    for (
        let i = 0;
        i <= b.length;
        i++
    ) {

        matrix[i] = [i];

    }


    for (
        let j = 0;
        j <= a.length;
        j++
    ) {

        matrix[0][j] = j;

    }


    for (
        let i = 1;
        i <= b.length;
        i++
    ) {

        for (
            let j = 1;
            j <= a.length;
            j++
        ) {

            if (
                b.charAt(i - 1) ===
                a.charAt(j - 1)
            ) {

                matrix[i][j] =
                    matrix[i - 1][j];

            } else {

                matrix[i][j] =
                    Math.min(

                        matrix[i - 1][j] + 1,

                        matrix[i][j - 1] + 1,

                        matrix[i - 1][j - 1] + 1

                    );

            }

        }

    }


    return matrix[
        b.length
    ][
        a.length
    ];

}


// ==========================================
// KNOWN VILLAGE
// ==========================================

function searchKnownVillage(searchText) {

    const name =
        normalizeName(
            searchText
        );


    if (
        name === "moongilmaduvu" ||
        name === "mungilmadavu" ||
        name === "murgilmaduvu"
    ) {

        return {

            name:
                "Mungilmadavu",

            state:
                "Tamil Nadu",

            country:
                "India",

            latitude:
                12.041675,

            longitude:
                77.826819

        };

    }

    if (name === "eriyur") {
     return {
        name: "Eriyur",
        state: "Tamil Nadu",
        country: "India",
        latitude: 12.012363,
        longitude: 77.800919
     };
}

    if (name === "vazhapadi" || name === "valapadi") {
    return {
        name: "Vazhapadi",
        state: "Tamil Nadu",
        country: "India",
        latitude: 11.6554,
        longitude: 78.4012
    };
}
if (
    name === "sigaralahalli" ||
    name === "sigralahalli" ||
    name === "sigaiahalli" ||
    name === "segalahalli"
) {
    return {
        name: "Sigaralahalli",
        state: "Tamil Nadu",
        country: "India",
        latitude: 12.057826,
        longitude: 77.792166
    };
}
if (
    name === "koorkampatti" ||
    name === "koorkampatti"
) {
    return {
        name: "Koorkampatti",
        state: "Tamil Nadu",
        country: "India",
        latitude: 12.024369,
        longitude: 77.793834
    };
}

    return null;

}


// ==========================================
// NOMINATIM / OPENSTREETMAP
// EXACT WORLDWIDE SEARCH
// ==========================================

async function searchNominatim(searchText) {

    try {

        const parts =
            searchText
                .split(",")
                .map(part => part.trim())
                .filter(Boolean);

        if (parts.length === 0) {
            return null;

        }

        const mainName = parts[0];

        if (!mainName) {
            return null;

        }


        const url =
            `https://nominatim.openstreetmap.org/search` +
            `?format=jsonv2` +
            `&q=${encodeURIComponent(searchText)}` +
            `&limit=50` +
            `&addressdetails=1`;

        const response =
            await fetch(url);


        if (!response.ok) {
            return null;

        }


        const data =
            await response.json();

        if (!data || data.length === 0) {
            return null;
        }

        const normalize = (value) => {

            return String(value || "")
                .toLowerCase()
                .trim()
                .replace(/[^\p{L}\p{N}]+/gu, "");

        };

        const typedName =
            normalize(mainName);



        const exactResults =
            data.filter(item => {

                const address =
                    item.address || {};
 
                    
                const possibleNames = [

                   item.name,

                   address.city,
                   address.town,
                   address.village,
                   address.hamlet,
                   address.municipality

                ]
                .filter(Boolean)
                .map(normalize);

                return possibleNames.includes(
                    typedName
                );

            });


        if (exactResults.length === 0) {
            return null;

        }


        
        const contextResults =
            exactResults.filter(item => {

                if (parts.length <= 1) {
                    return true;
                }

                const address =
                    item.address || {};
                
                const searchableText = [

                     item.name,
                     address.city,
                     address.town,
                     address.village,
                     address.hamlet,
                     address.municipality,
                     address.suburb

                    ]    
                    .filter(Boolean)
                    .map(normalize);

                return parts.every(part => {

                    const normalizedPart =
                        normalize(part);

                    return searchableText.some(
                        value =>
                            value.includes(
                                normalizedPart
                            )
                    );

                });

            });


        const candidates =
            contextResults.length > 0
                ? contextResults
                : parts.length === 1
                    ? exactResults
                    : [];


        if (candidates.length === 0) {
            return null;
        }


        candidates.sort((a, b) => {

            const getPriority = (item) => {

                const type =
                    String(
                        item.type || ""
                    ).toLowerCase();

                const address =
                    item.address || {};

                if (
                    address.city &&
                    normalize(address.city) === typedName
                ) {
                    return 500;
                }

                if (
                    address.town &&
                    normalize(address.town) === typedName
                ) {
                    return 450;
                }

                if (
                    address.village &&
                    normalize(address.village) === typedName
                ) {
                    return 400;
                }

                if (
                    address.hamlet &&
                    normalize(address.hamlet) === typedName
                ) {
                    return 350;
                }

                if (
                    address.state &&
                    normalize(address.state) === typedName
                ) {
                    return 300;
                }

                if (
                    address.country &&
                    normalize(address.country) === typedName
                ) {
                    return 250;
                }

                if (type === "city") {
                    return 200;
                }

                if (type === "town") {
                    return 180;
                }

                if (type === "village") {
                    return 160;
                }

                return 100;

            };

            return (
                getPriority(b) -
                getPriority(a)
            );

        });


        const result =
            candidates[0];


        const address =
            result.address || {};


        let placeName = "";

        if (
            normalize(address.country) ===
            typedName
        ) {

            placeName =
                address.country;

        } else if (
            normalize(address.state) ===
            typedName
        ) {

            placeName =
                address.state;



        } else {

           placeName =
               address.village ||
               address.hamlet ||
               address.suburb ||
               address.town ||
               address.city ||
               address.municipality ||
               result.name ||
               mainName;
        }


        if (!placeName) {
            return null;
        }


        
        const stateName =
            address.state ||
            address.province ||
            address.region ||
            address.state_district ||
            "";




        const countryName =
            address.country ||
            "";


        const latitude =
            parseFloat(result.lat);

        const longitude =
            parseFloat(result.lon);


        if (
            Number.isNaN(latitude) ||
            Number.isNaN(longitude)
        ) {

            return null;

        }


        return {

            name:
                placeName,

            state:
                stateName,

            country:
                cleanCountryName(
                    countryName
                ),

            latitude:
                latitude,

            longitude:
                longitude

        };


    } catch (error) {

        console.error(
            "Nominatim error:",
            error
        );

        return null;

    }

}

// ==========================================
// NOMINATIM RESULT TYPE PRIORITY
// ==========================================

function getNominatimTypePriority(
    item,
    address
) {

    const type =
        (
            item.type ||
            ""
        ).toLowerCase();


    const category =
        (
            item.category ||
            ""
        ).toLowerCase();

    // ==========================================
    // COUNTRY
    // ==========================================

    if (
        type === "administrative" &&
        address.country &&
        (
            !address.city &&
            !address.town &&
            !address.village
        )
    ) {

        return 500;

    }

    // ==========================================
    // STATE / REGION
    // ==========================================

    if (
        address.state &&
        (
            type === "administrative" ||
            category === "boundary"
        )
    ) {

        return 450;

    }

    // ==========================================
    // CITY
    // ==========================================

    if (
        type === "city"
    ) {

        return 400;

    }

    // ==========================================
    // TOWN
    // ==========================================

    if (
        type === "town"
    ) {

        return 350;

    }

    // ==========================================
    // VILLAGE
    // ==========================================

    if (
        type === "village"
    ) {

        return 300;

    }

    // ==========================================
    // MUNICIPALITY
    // ==========================================

    if (
        type === "municipality"
    ) {

        return 280;

    }

    // ==========================================
    // HAMLET
    // ==========================================

    if (
        type === "hamlet"
    ) {

        return 250;

    }

    // ==========================================
    // SUBURB
    // ==========================================

    if (
        type === "suburb"
    ) {

        return 200;

    }

    return 100;

}

// ==========================================
// GET RESULT NAME
// ==========================================

function itemNameFromResult(result) {

    if (
        result.name
    ) {

        return result.name;

    }

    if (
        result.display_name
    ) {

        return result.display_name
            .split(",")[0]
            .trim();

    }

    return "";

}

// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    window.location.href = "login.html";

}

// ==========================================
// LOGOUT BUTTON
// ==========================================

const logoutBtn =
    document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logout
    );

}



// ==========================================
// ENABLE / DISABLE WEATHER NOTIFICATIONS
// ==========================================

const notificationBtn =
    document.getElementById(
        "notificationBtn"
    );


  async function updateNotificationButton() {

    try {

        const token =
            localStorage.getItem("token");

        if (
            !token ||
            !notificationBtn
        ) {

            return;

        }

        const response =
            await fetch(
                "http://localhost:3000/api/me",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (
            data.notificationEnabled === true
        ) {

            notificationBtn.textContent =
                "🔔 Disable Weather Notifications";

        } else {

            notificationBtn.textContent =
                "🔔 Enable Weather Notifications";

        }

    } catch (error) {

        console.error(
            "Notification status error:",
            error
        );

    }

}  
if (notificationBtn) {

    notificationBtn.addEventListener(
        "click",
        async function () {

            try {

                const token =
                    localStorage.getItem(
                        "token"
                    );

                if (!token) {
                    return;
                }

                 const meResponse =
    await fetch(
        "http://localhost:3000/api/me",
        {
            headers: {
                "Authorization":
                    "Bearer " + token
            }
        }
    );

                const userData =
                    await meResponse.json();

                // ======================================
                // DISABLE NOTIFICATIONS
                // ======================================

                if (
                    userData.notificationEnabled === true
                ) {

                    const response =
                        await fetch(
                             "http://localhost:3000/api/notification",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    "Authorization":
                                        "Bearer " + token
                                },

                                body: JSON.stringify({
                                    enabled: false
                                })
                            }
                        );

                    if (response.ok) {

                        notificationBtn.textContent =
                            "🔔 Enable Weather Notifications";


                        alert(
                            "Weather notifications disabled."
                        );

                    }

                    return;

                }

                // ======================================
                // ENABLE NOTIFICATIONS
                // ======================================

                if (
                    "Notification" in window &&
                    Notification.permission === "default"
                ) {

                    const permission =
                        await Notification.requestPermission();

                    if (
                        permission !==
                        "granted"
                    ) {

                        alert(
                            "Please allow browser notifications."
                        );

                        return;

                    }

                }

                if (
                    !("Notification" in window) ||
                    Notification.permission !== "granted"
                ) {

                    alert(
                        "Browser notification permission is not allowed."
                    );

                    return;

                }

                const response =
                    await fetch(
                       "http://localhost:3000/api/notification",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    "Bearer " + token
                            },

                            body: JSON.stringify({
                                enabled: true
                            })
                        }
                    );


                if (response.ok) {

                    await subscribeToPush();


                    notificationBtn.textContent =
                        "🔔 Disable Weather Notifications";


                    alert(
                        "Weather notifications enabled successfully!"
                    );

                }


            } catch (error) {

                console.error(
                    "Notification button error:",
                    error
                );

            }

        }
    );

}

// ==========================================
// LOAD CORRECT BUTTON STATUS
// ==========================================

updateNotificationButton();


// ==========================================
// REAL SAVED LOCATION WEATHER ALERT NOTIFICATION
// ==========================================

async function checkMyWeatherAlert() {

    try {

        const token =
            localStorage.getItem("token");

        if (!token) {
            return;

        }

        // ======================================
        // CHECK BROWSER PERMISSION
        // ======================================

        if (
            !("Notification" in window) ||
            Notification.permission !== "granted"
        ) {

            return;

        }

        // ======================================
        // CHECK SAVED LOCATION WEATHER ALERTS
        // ======================================

        const response =
            await fetch(
               "http://localhost:3000/api/current-alert",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        // ======================================
        // SHOW ALERTS ONLY FOR SAVED LOCATIONS
        // ======================================

        if (
            data.alert === true &&
            Array.isArray(data.alerts)
        ) {

            data.alerts.forEach(
                alert => {

                    new Notification(
                        "⚠️ " + alert.type,
                        {
                            body:
                                alert.message
                        }
                    );

                }
            );

        }


    } catch (error) {

        console.error(
            "Saved location weather alert notification error:",
            error
        );

    }

}

// ==========================================
// TEST WEATHER NOTIFICATION
// ==========================================

async function testWeatherNotification() {

    try {

        const token =
            localStorage.getItem(
                "token"
            );


        const response =
            await fetch(
               "http://localhost:3000/api/saved-locations",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        const data =
            await response.json();


        if (
            data.alert === true &&
            Notification.permission ===
            "granted"
        ) {

            new Notification(
                "⚠️ " + data.type,
                {
                    body:
                        data.message
                }
            );

        }


    } catch (error) {

        console.error(
            "Test notification error:",
            error
        );

    }

}

// ==========================================
// CHECK CURRENT LOCATION WEATHER ALERT
// ==========================================

checkMyWeatherAlert();

// ==========================================
// CHECK AGAIN EVERY 10 MINUTES
// ==========================================

setInterval(
    checkMyWeatherAlert,
    10 * 60 * 1000
); 