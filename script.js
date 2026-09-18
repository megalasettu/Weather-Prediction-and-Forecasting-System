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
            "https://weather-prediction-and-forecasting-system.onrender.com/api/push-subscription",
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


// ==========================================
// SEARCH BUTTON
// ==========================================

searchBtn.addEventListener(
    "click",
    getWeather
);


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
                        "https://weather-prediction-and-forecasting-system.onrender.com/api/location",
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
            new Date(
                weatherData.current.time
            );

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
                    "https://weather-prediction-and-forecasting-system.onrender.com/api/history",
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

    // ==========================================
    // 1. COMMON SPELLING CORRECTION
    // ==========================================

    const correctedText =
        correctCommonSpelling(
            searchText
        );


    // ==========================================
    // 2. EXACT NOMINATIM SEARCH
    // ==========================================

    let location =
        await searchNominatim(
            searchText
        );

    if (location) {
        return location;
    }


    // ==========================================
    // 3. EXACT OPEN-METEO SEARCH
    // ==========================================

    location =
        await searchOpenMeteo(
            correctedText
        );

    if (location) {
        return location;
    }


    // ==========================================
    // 4. ORIGINAL TEXT EXACT SEARCH
    // ==========================================

    if (
        correctedText.toLowerCase().trim() !==
        searchText.toLowerCase().trim()
    ) {

        location =
            await searchOpenMeteo(
                searchText
            );

        if (location) {
            return location;
        }

    }


    // ==========================================
    // 5. SIMILAR SEARCH
    // ==========================================

    location =
        await searchSimilarOpenMeteo(
            searchText
        );

    if (location) {
        return location;
    }


    // ==========================================
    // 6. KNOWN VILLAGE FALLBACK
    // ==========================================

    location =
        searchKnownVillage(
            searchText
        );

    if (location) {
        return location;
    }


    // ==========================================
    // 7. NO LOCATION
    // ==========================================

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
// OPEN-METEO EXACT WORLDWIDE SEARCH
// ==========================================

async function searchOpenMeteo(searchText) {

    try {

        const parts =
            searchText
                .split(",")
                .map(part => part.trim())
                .filter(Boolean);

        if (parts.length === 0) {
    return null;
}

const mainName =
    parts[0];

const typedName =
    normalizeName(
        mainName
    );

if (!typedName) {
    return null;
}
        if (!typedName) {
            return null;
        }


        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(mainName)}&count=20&language=en&format=json`;


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


        // ==========================================
        // ONLY EXACT NAME MATCHES
        // ==========================================

        const exactResults =
            data.results.filter(item => {

                if (!item.name) {
                    return false;
                }

                return (
                    normalizeName(item.name) ===
                    typedName
                );

            });


        if (
            exactResults.length === 0
        ) {

            return null;

        }


        // ==========================================
        // CONTEXT MATCH
        // ==========================================

        const contextResults =
            exactResults.filter(item => {

                const searchableText =
                    normalizeName(
                        [
                            item.name,
                            item.admin1,
                            item.admin2,
                            item.admin3,
                            item.country
                        ]
                            .filter(Boolean)
                            .join(" ")
                    );


                return parts.every(part => {

                    const cleanPart =
                        normalizeName(part);

                    return (
                        cleanPart &&
                        searchableText.includes(
                            cleanPart
                        )
                    );

                });

            });


        // ==========================================
        // SELECT BEST EXACT RESULT
        // ==========================================

        const candidates =
            contextResults.length > 0
                ? contextResults
                : (
                    parts.length === 1
                        ? exactResults
                        : []
                );


        if (
            candidates.length === 0
        ) {

            return null;

        }


        candidates.sort(
            (a, b) => {

                const typeDifference =
                    getLocationTypePriority(b) -
                    getLocationTypePriority(a);

                if (
                    typeDifference !== 0
                ) {

                    return typeDifference;

                }

                return (
                    (b.population || 0) -
                    (a.population || 0)
                );

            }
        );


        const result =
            candidates[0];


        return createLocationObject(
            result
        );


    } catch (error) {

        console.error(
            "Open-Meteo exact search error:",
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

        const mainName =
            parts[0];

        const cleanName =
            normalizeName(
                mainName
            );


        if (
            cleanName.length < 3
        ) {

            return null;

        }


        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(mainName)}&count=20&language=en&format=json`;


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


        const candidates = [];


        for (
            const item of data.results
        ) {

            if (!item.name) {
                continue;
            }


            const candidate =
                normalizeName(
                    item.name
                );


            if (
                candidate.length === 0
            ) {

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
                1 -
                (
                    distance /
                    maxLength
                );


            // ==========================================
            // STRICT SIMILARITY LIMIT
            // ==========================================

            const maxAllowedDistance =
                cleanName.length <= 5
                    ? 1
                    : cleanName.length <= 10
                        ? 2
                        : 3;


            if (
                distance >
                maxAllowedDistance
            ) {

                continue;

            }


            // ==========================================
            // CONTEXT MATCH
            // ==========================================

            const searchableText =
                normalizeName(
                    [
                        item.name,
                        item.admin1,
                        item.admin2,
                        item.admin3,
                        item.country
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
                    score,

                distance:
                    distance

            });

        }


        if (
            candidates.length === 0
        ) {

            return null;

        }


        // ==========================================
        // SORT BEST SIMILAR RESULT
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


        const best =
            candidates[0];


        // ==========================================
        // HIGH CONFIDENCE REQUIRED
        // ==========================================

        if (
            best.score < 0.80
        ) {

            return null;

        }


        // ==========================================
        // AMBIGUOUS SIMILAR RESULTS
        // ==========================================

        if (
            candidates.length > 1
        ) {

            const second =
                candidates[1];


            if (
                second.score >= 0.80 &&
                Math.abs(
                    best.score -
                    second.score
                ) < 0.05 &&
                best.distance ===
                second.distance
            ) {

                return null;

            }

        }


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


        if (
            parts.length === 0
        ) {

            return null;

        }


        const mainName =
            parts[0];


        const cleanMainName =
            mainName
                .toLowerCase()
                .trim();


        if (
            cleanMainName.length === 0
        ) {

            return null;

        }


        const url =
            `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchText)}&limit=50&addressdetails=1&namedetails=1`;


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


        // ==========================================
        // FIND ONLY EXACT MAIN-NAME MATCHES
        // ==========================================

        const exactResults =
            data.filter(item => {

                const address =
                    item.address || {};


                const possibleNames = [

                    item.name,
                    ...Object.values(item.namedetails || {}),
                    address.city,

                    address.town,

                    address.village,

                    address.hamlet,

                    address.municipality,

                    address.suburb,

                    address.state,

                    address.province,

                    address.region,

                    address.country

                ]
                    .filter(Boolean)
                    .map(name =>
                        name
                            .toLowerCase()
                            .trim()
                    );


                return possibleNames.some(
                    name =>
                        name ===
                        cleanMainName
                );

            });


        if (
            exactResults.length === 0
        ) {

            return null;

        }


        // ==========================================
        // CHECK STATE / COUNTRY CONTEXT
        // ==========================================

        const contextResults =
            exactResults.filter(item => {

                const address =
                    item.address || {};


                const searchableText =
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
                        .toLowerCase();


                return parts.every(
                    part => {

                        const cleanPart =
                            part
                                .toLowerCase()
                                .trim();

                        return (
                            cleanPart &&
                            searchableText.includes(
                                cleanPart
                            )
                        );

                    }
                );

            });


        const candidates =
            contextResults.length > 0
                ? contextResults
                : (
                    parts.length === 1
                        ? exactResults
                        : []
                );


        if (
            candidates.length === 0
        ) {

            return null;

        }


        // ==========================================
        // RANK EXACT RESULTS
        // ==========================================

        candidates.sort(
            (a, b) => {

                const aAddress =
                    a.address || {};

                const bAddress =
                    b.address || {};


                const aScore =
                    getNominatimTypePriority(
                        a,
                        aAddress
                    );


                const bScore =
                    getNominatimTypePriority(
                        b,
                        bAddress
                    );


                return (
                    bScore -
                    aScore
                );

            }
        );


        const result =
            candidates[0];


        const address =
            result.address || {};


        // ==========================================
        // PLACE NAME
        // ==========================================

        let placeName =
            "";


        if (
            cleanMainName ===
            (
                address.country ||
                ""
            ).toLowerCase().trim()
        ) {

            placeName =
                address.country;

        } else if (
            cleanMainName ===
            (
                address.state ||
                ""
            ).toLowerCase().trim()
        ) {

            placeName =
                address.state;

        } else if (
            cleanMainName ===
            (
                address.province ||
                ""
            ).toLowerCase().trim()
        ) {

            placeName =
                address.province;

        } else {

            placeName =
                address.city ||
                address.town ||
                address.village ||
                address.municipality ||
                address.hamlet ||
                address.suburb ||
                itemNameFromResult(result);

        }


        if (!placeName) {
            return null;
        }


        // ==========================================
        // STATE
        // ==========================================

        const stateName =
            address.state ||
            address.province ||
            address.region ||
            address.state_district ||
            "";


        // ==========================================
        // COUNTRY
        // ==========================================

        const countryName =
            address.country ||
            "";


        const latitude =
            parseFloat(
                result.lat
            );

        const longitude =
            parseFloat(
                result.lon
            );


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
                        "https://weather-prediction-and-forecasting-system.onrender.com/api/me",
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
                            "https://weather-prediction-and-forecasting-system.onrender.com/api/notification",
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
                        "https://weather-prediction-and-forecasting-system.onrender.com/api/notification",
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
// REAL WEATHER ALERT NOTIFICATION
// ==========================================

async function checkMyWeatherAlert() {

    try {

        const token =
            localStorage.getItem(
                "token"
            );


        if (!token) {
            return;
        }

        // ======================================
        // CHECK USER NOTIFICATION SETTING
        // ======================================

        const userResponse =
            await fetch(
                "https://weather-prediction-and-forecasting-system.onrender.com/api/me",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );


        if (!userResponse.ok) {
            return;
        }

        const userData =
            await userResponse.json();


        if (
            userData.notificationEnabled !==
            true
        ) {

            return;

        }

        // ======================================
        // CHECK BROWSER PERMISSION
        // ======================================

        if (
            !("Notification" in window) ||
            Notification.permission !==
            "granted"
        ) {

            return;

        }

        // ======================================
        // CHECK CURRENT LOCATION WEATHER
        // ======================================

        const response =
            await fetch(
                "https://weather-prediction-and-forecasting-system.onrender.com/api/current-alert",
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
            "Weather alert notification error:",
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
                "https://weather-prediction-and-forecasting-system.onrender.com/api/test-alert",
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