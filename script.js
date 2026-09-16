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
// ==========================================
// WEB PUSH SUBSCRIPTION
// ==========================================

async function subscribeToPush() {

    try {

        const registration =
            await navigator.serviceWorker.ready;

        const response = await fetch(
    "https://weather-prediction-and-forecasting-system.onrender.com/api/vapid-public-key",
);

        const data = await response.json();

        const publicKey = data.publicKey;

        const subscription =
            await registration.pushManager.subscribe({

                userVisibleOnly: true,

                applicationServerKey:
                    publicKey

            });

        const token =
            localStorage.getItem("token");

        await fetch(
            "https://weather-prediction-and-forecasting-system.onrender.com/api/history",
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

const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("searchBtn");
const weatherResult = document.getElementById("weatherResult");
const forecast = document.getElementById("forecast");


// ==========================================
// SEARCH BUTTON
// ==========================================

searchBtn.addEventListener("click", getWeather);


// ==========================================
// ENTER KEY SEARCH
// ==========================================

cityInput.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        getWeather();
    }

});

async function saveCurrentLocation() {

    if (!navigator.geolocation) {
        console.log("Geolocation is not supported by this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        async function (position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            try {

                const token = localStorage.getItem("token");

                if (!token) {
                    return;
                }

                const response = await fetch(
                    "https://weather-prediction-and-forecasting-system.onrender.com/api/location",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + token
                        },

                        body: JSON.stringify({
                            latitude: latitude,
                            longitude: longitude
                        })
                    }
                );

                const data = await response.json();

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

    const searchText = cityInput.value.trim();

    if (searchText === "") {

        weatherResult.innerHTML =
            "<p>Please enter a city, town or village.</p>";

        forecast.innerHTML = "";

        return;
    }


    weatherResult.innerHTML =
        "<p>🔍 Searching location...</p>";

    forecast.innerHTML = "";


    try {

        // ==========================================
        // 1. SEARCH LOCATION
        // ==========================================

        const location =
            await searchLocation(searchText);


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
            `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=11`;


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


        const weatherDate =
            new Date(weatherData.current.time);


        const formattedDate =
            weatherDate.toLocaleDateString(
                "en-IN",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );


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
                    </h2>

                    <p>
                        📅 ${formattedDate}
                    </p>

                </div>


                <div class="weather-main">

                    <div class="weather-icon-large">

                        ${getWeatherIcon(
                            weatherData.current.weather_code
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
                    "https://weather-prediction-and-forecasting-system.onrender.com/api/push-subscription",
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " + token

                        },

                        body: JSON.stringify({

                            location:
                                location.name,

                            state:
                                location.state,

                            country:
                                location.country,

                            temperature:
                                weatherData.current.temperature_2m,

                            condition:
                                condition,

                            humidity:
                                weatherData.current.relative_humidity_2m,

                            windSpeed:
                                weatherData.current.wind_speed_10m

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

                    <!-- DATE -->

                    <div class="forecast-date">

                        ${forecastDate}

                    </div>


                    <!-- WEATHER ICON -->

                    <div class="forecast-icon">

                        ${forecastIcon}

                    </div>


                    <!-- CONDITION -->

                    <div class="forecast-condition">

                        ${forecastCondition}

                    </div>


                    <!-- TEMPERATURE -->

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


                    <!-- FORECAST INFORMATION -->

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
// FORMAT FORECAST DATE
// ==========================================

function formatForecastDate(dateString) {

    const date =
        new Date(
            dateString + "T00:00:00"
        );


    return date.toLocaleDateString(
        "en-IN",
        {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ==========================================
// WEATHER ICON
// ==========================================

function getWeatherIcon(code) {

    if (code === 0)
        return "☀️";


    if (code === 1)
        return "🌤️";


    if (code === 2)
        return "⛅";


    if (code === 3)
        return "☁️";


    if (code >= 45 && code <= 48)
        return "🌫️";


    if (code >= 51 && code <= 57)
        return "🌦️";


    if (code >= 61 && code <= 67)
        return "🌧️";


    if (code >= 71 && code <= 77)
        return "❄️";


    if (code >= 80 && code <= 82)
        return "🌦️";


    if (code >= 95 && code <= 99)
        return "⛈️";


    return "🌤️";

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
// LOCATION SEARCH
// ==========================================

async function searchLocation(searchText) {

    const correctedText =
        correctCommonSpelling(searchText);


    let location =
        await searchOpenMeteo(
            correctedText
        );


    if (location) {
        return location;
    }


    if (correctedText !== searchText) {

        location =
            await searchOpenMeteo(
                searchText
            );


        if (location) {
            return location;
        }

    }


    location =
        await searchSimilarOpenMeteo(
            searchText
        );


    if (location) {
        return location;
    }


    location =
        searchKnownVillage(
            searchText
        );


    if (location) {
        return location;
    }


    location =
        await searchNominatim(
            searchText
        );


    if (location) {
        return location;
    }


    return null;

}


// ==========================================
// COMMON SPELLING CORRECTION
// ==========================================

function correctCommonSpelling(searchText) {

    const name =
        searchText
            .toLowerCase()
            .trim();


    const corrections = {

        "channai": "Chennai",
        "chenai": "Chennai",
        "chenni": "Chennai",
        "chennnai": "Chennai",
        "chenna": "Chennai",

        "medurai": "Madurai",
        "maduri": "Madurai",
        "madurrai": "Madurai",

        "banglore": "Bangalore",
        "bangalor": "Bangalore",

        "londn": "London",
        "londonn": "London",

        "pariss": "Paris",
        "parsi": "Paris",

        "tokoyo": "Tokyo",
        "tokio": "Tokyo",

        "sydny": "Sydney",
        "sydnei": "Sydney",

        "tornto": "Toronto"

    };


    return corrections[name] ||
        searchText;

}


// ==========================================
// OPEN-METEO SEARCH
// ==========================================

async function searchOpenMeteo(searchText) {

    try {

        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchText)}&count=20&language=en&format=json`;


        const response =
            await fetch(url);


        if (!response.ok) {
            return null;
        }


        const data =
            await response.json();


        if (
            !data.results ||
            data.results.length === 0
        ) {

            return null;

        }


        const typedName =
            normalizeName(searchText);


        const exactMatch =
            data.results.find(item => {

                return item.name &&
                    normalizeName(
                        item.name
                    ) === typedName;

            });


        const result =
            exactMatch ||
            data.results[0];


        return {

            name:
                result.name,

            state:
                result.admin1 ||
                result.admin2 ||
                "",

            country:
                result.country ||
                "",

            latitude:
                result.latitude,

            longitude:
                result.longitude

        };


    } catch (error) {

        console.error(
            "Open-Meteo error:",
            error
        );

        return null;

    }

}


// ==========================================
// SIMILAR LOCATION SEARCH
// ==========================================

async function searchSimilarOpenMeteo(searchText) {

    try {

        const cleanName =
            normalizeName(
                searchText
            );


        if (cleanName.length < 3) {
            return null;
        }


        const prefix =
            cleanName.substring(
                0,
                Math.min(
                    4,
                    cleanName.length
                )
            );


        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(prefix)}&count=100&language=en&format=json`;


        const response =
            await fetch(url);


        if (!response.ok) {
            return null;
        }


        const data =
            await response.json();


        if (
            !data.results ||
            data.results.length === 0
        ) {

            return null;

        }


        let bestResult = null;
        let bestScore = 0;


        for (const item of data.results) {

            if (!item.name) {
                continue;
            }


            const candidate =
                normalizeName(
                    item.name
                );


            const score =
                similarityScore(
                    cleanName,
                    candidate
                );


            if (score > bestScore) {

                bestScore = score;
                bestResult = item;

            }

        }


        if (
            !bestResult ||
            bestScore < 0.55
        ) {

            return null;

        }


        return {

            name:
                bestResult.name,

            state:
                bestResult.admin1 ||
                bestResult.admin2 ||
                "",

            country:
                bestResult.country ||
                "",

            latitude:
                bestResult.latitude,

            longitude:
                bestResult.longitude

        };


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


    return null;

}


// ==========================================
// NOMINATIM / OPENSTREETMAP
// ==========================================

async function searchNominatim(searchText) {

    try {

        const url =
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchText)}&limit=20&addressdetails=1`;


        const response =
            await fetch(url);


        if (!response.ok) {
            return null;
        }


        const data =
            await response.json();


        if (
            !data ||
            data.length === 0
        ) {

            return null;

        }


        const preferredResult =
            data.find(item => {

                return (

                    item.type === "village" ||
                    item.type === "town" ||
                    item.type === "city" ||
                    item.type === "municipality" ||
                    item.type === "hamlet" ||
                    item.type === "suburb"

                );

            });


        const result =
            preferredResult ||
            data[0];


        const address =
            result.address || {};


        const placeName =
            address.village ||
            address.town ||
            address.city ||
            address.municipality ||
            address.hamlet ||
            address.suburb ||
            result.display_name.split(",")[0];


        const stateName =
            address.state ||
            address.province ||
            address.region ||
            address.state_district ||
            "";


        const countryName =
            address.country ||
            "";


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
                parseFloat(
                    result.lat
                ),

            longitude:
                parseFloat(
                    result.lon
                )

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
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "token"
    );


    localStorage.removeItem(
        "user"
    );


    window.location.href =
        "login.html";

}
// ==========================================
// ENABLE / DISABLE WEATHER NOTIFICATIONS
// ==========================================

const notificationBtn =
    document.getElementById("notificationBtn");

async function updateNotificationButton() {

    try {

        const token =
            localStorage.getItem("token");

        if (!token || !notificationBtn) {
            return;
        }

        const response = await fetch(
            "https://weather-prediction-and-forecasting-system.onrender.com/api/me",
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

        if (data.notificationEnabled === true) {

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
                    localStorage.getItem("token");

                if (!token) {
                    return;
                }

                const meResponse =
                    await fetch(
                        "https://weather-prediction-and-forecasting-system.onrender.com/api/me"
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
                           "https://weather-prediction-and-forecasting-system.onrender.com/api/notification"
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

                    if (permission !== "granted") {

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
                      "https://weather-prediction-and-forecasting-system.onrender.com/api/notification"
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

// Load correct button status
updateNotificationButton();
// ==========================================
// REAL WEATHER ALERT NOTIFICATION
// ==========================================

async function checkMyWeatherAlert() {

    try {

        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        // Check this logged-in user's
        // notification setting
        const userResponse = await fetch(
            "https://weather-prediction-and-forecasting-system.onrender.com/api/me",
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        if (!userResponse.ok) {
            return;
        }

        const userData =
            await userResponse.json();

        // Notification disabled for this user
        if (userData.notificationEnabled !== true) {
            return;
        }

        // Check browser notification permission
        if (
            !("Notification" in window) ||
            Notification.permission !== "granted"
        ) {
            return;
        }

        // Check weather ONLY at this user's
        // current location
        const response = await fetch(
           "https://weather-prediction-and-forecasting-system.onrender.com/api/current-alert"
            {
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (
            data.alert === true &&
            Array.isArray(data.alerts)
        ) {

            data.alerts.forEach(alert => {

                new Notification(
                    "⚠️ " + alert.type,
                    {
                        body: alert.message
                    }
                );

            });

        }

    } catch (error) {

        console.error(
            "Weather alert notification error:",
            error
        );

    }

}

async function testWeatherNotification() {

    try {

        const token = localStorage.getItem("token");

        const response = await fetch(
            "https://weather-prediction-and-forecasting-system.onrender.com/api/test-alert"
            { 
                headers: { 
                    "Authorization": "Bearer " + token 
                } 
            } 
        ); 
 
        const data = await response.json(); 
 
        if ( 
            data.alert === true && 
            Notification.permission === "granted" 
        ) { 
 
            new Notification( 
                "⚠️ " + data.type, 
                { 
                    body: data.message 
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
// Check current location weather alert 
checkMyWeatherAlert(); 
 
// Check again every 10 minutes 
setInterval( 
    checkMyWeatherAlert, 
    10 * 60 * 1000 
); 