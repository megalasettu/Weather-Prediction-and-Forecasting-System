const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

require("dotenv").config();

const webpush = require("web-push");

const app = express();
const PORT = process.env.PORT || 3000;

webpush.setVapidDetails(
    "mailto:megalasettu515@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..")));
app.use("/backend", express.static(__dirname));

// ==========================================
// MONGODB CONNECTION
// ==========================================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });

// ==========================================
// WEATHER SEARCH SCHEMA
// ==========================================

const weatherSearchSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    location: String,
    country: String,
    temperature: Number,
    condition: String,
    humidity: Number,
    windSpeed: Number,

    searchedAt: {
        type: Date,
        default: Date.now
    }

});

const WeatherSearch = mongoose.model(
    "WeatherSearch",
    weatherSearchSchema
);

// ==========================================
// USER SCHEMA
// ==========================================

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    notificationEnabled: {
        type: Boolean,
        default: false
    }

});

const User = mongoose.model(
    "User",
    userSchema
);

// ==========================================
// USER CURRENT LOCATION SCHEMA
// ==========================================

const userLocationSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    latitude: {
        type: Number,
        required: true
    },

    longitude: {
        type: Number,
        required: true
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }

});

const UserLocation = mongoose.model(
    "UserLocation",
    userLocationSchema
);

// ==========================================
// SAVED LOCATIONS SCHEMA
// ==========================================

const savedLocationSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    name: {
        type: String,
        required: true
    },

    state: {
        type: String,
        default: ""
    },

    country: {
        type: String,
        default: ""
    },

    latitude: {
        type: Number,
        required: true
    },

    longitude: {
        type: Number,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

const SavedLocation = mongoose.model(
    "SavedLocation",
    savedLocationSchema
);

// ==========================================
// SAVE LOCATION
// ==========================================

app.post(
    "/api/saved-locations",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                name,
                state,
                country,
                latitude,
                longitude
            } = req.body;

            if (
                !name ||
                latitude === undefined ||
                longitude === undefined
            ) {

                return res.status(400).json({
                    error: "Location details are required"
                });

            }

            // Prevent duplicate saved location
            const existingLocation =
                await SavedLocation.findOne({
                    userId: req.user.userId,
                    name: name
                });

            if (existingLocation) {

                return res.status(400).json({
                    error: "Location already saved"
                });

            }

            const savedLocation =
                new SavedLocation({

                    userId: req.user.userId,

                    name,
                    state,
                    country,

                    latitude,
                    longitude

                });

            await savedLocation.save();

            res.json({

                message:
                    "Location saved successfully",

                location:
                    savedLocation

            });

        } catch (error) {

            console.error(
                "Save location error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to save location"

            });

        }

    }
);

// ==========================================
// DELETE SAVED LOCATION
// ==========================================

app.delete(
    "/api/saved-locations/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const deletedLocation =
                await SavedLocation.findOneAndDelete({
                    _id: req.params.id,
                    userId: req.user.userId
                });

            if (!deletedLocation) {

                return res.status(404).json({
                    error: "Saved location not found"
                });

            }

            res.json({

                message:
                    "Saved location deleted successfully"

            });

        } catch (error) {

            console.error(
                "Delete saved location error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to delete saved location"

            });

        }

    }
);

// ==========================================
// GET SAVED LOCATIONS
// ==========================================

app.get(
    "/api/saved-locations",
    authenticateToken,
    async (req, res) => {

        try {

            const locations =
                await SavedLocation.find({

                    userId:
                        req.user.userId

                }).sort({

                    createdAt:
                        -1

                });

            res.json({

                locations:
                    locations

            });

        } catch (error) {

            console.error(
                "Get saved locations error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to load saved locations"

            });

        }

    }
);

// ==========================================
// WEB PUSH SUBSCRIPTION SCHEMA
// ==========================================

const pushSubscriptionSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    subscription: {
        type: Object,
        required: true
    }

});

const PushSubscription = mongoose.model(
    "PushSubscription",
    pushSubscriptionSchema
);

// ==========================================
// GET VAPID PUBLIC KEY
// ==========================================

app.get(
    "/api/vapid-public-key",
    (req, res) => {

        res.json({
            publicKey:
                process.env.VAPID_PUBLIC_KEY
        });

    }
);

// ==========================================
// SAVE WEB PUSH SUBSCRIPTION
// ==========================================

app.post(
    "/api/push-subscription",
    authenticateToken,
    async (req, res) => {

        try {

            const { subscription } =
                req.body;

            if (!subscription) {

                return res.status(400).json({
                    error:
                        "Push subscription is required"
                });

            }

            await PushSubscription.findOneAndUpdate(

                {
                    userId:
                        req.user.userId
                },

                {
                    userId:
                        req.user.userId,

                    subscription:
                        subscription
                },

                {
                    upsert: true,
                    new: true
                }

            );

            res.json({

                message:
                    "Push subscription saved successfully"

            });

        } catch (error) {

            console.error(
                "Push subscription error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to save push subscription"

            });

        }

    }
);

// ==========================================
// SIGNUP ROUTE
// ==========================================

app.post(
    "/api/signup",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password
            } = req.body;

            if (
                !name ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    error:
                        "All fields are required"

                });

            }

            const existingUser =
                await User.findOne({
                    email
                });

            if (existingUser) {

                return res.status(400).json({

                    error:
                        "Email already registered"

                });

            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const newUser =
                new User({

                    name,

                    email,

                    password:
                        hashedPassword,

                    notificationEnabled:
                        false

                });

            await newUser.save();

            const token =
                jwt.sign(

                    {
                        userId:
                            newUser._id,

                        email:
                            newUser.email
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            "1d"
                    }

                );

            res.json({

                message:
                    "Signup successful",

                token,

                user: {

                    id:
                        newUser._id,

                    name:
                        newUser.name,

                    email:
                        newUser.email

                }

            });

        } catch (error) {

            console.error(
                "Signup error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to create account"

            });

        }

    }
);

// ==========================================
// LOGIN ROUTE
// ==========================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    error:
                        "Email and password are required"

                });

            }

            const user =
                await User.findOne({
                    email
                });

            if (!user) {

                return res.status(401).json({

                    error:
                        "Invalid email or password"

                });

            }

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordMatch) {

                return res.status(401).json({

                    error:
                        "Invalid email or password"

                });

            }

            const token =
                jwt.sign(

                    {
                        userId:
                            user._id,

                        email:
                            user.email
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            "1d"
                    }

                );

            res.json({

                message:
                    "Login successful",

                token:

                    token,

                user: {

                    id:
                        user._id,

                    name:
                        user.name,

                    email:
                        user.email

                }

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to login"

            });

        }

    }
);

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

function authenticateToken(
    req,
    res,
    next
) {

    const authHeader =
        req.headers["authorization"];

    const token =
        authHeader &&
        authHeader.split(" ")[1];

    if (!token) {

        return res.status(401).json({

            error:
                "Login required"

        });

    }

    jwt.verify(

        token,

        process.env.JWT_SECRET,

        (error, user) => {

            if (error) {

                return res.status(403).json({

                    error:
                        "Invalid or expired token"

                });

            }

            req.user =
                user;

            next();

        }

    );

}

// ==========================================
// SAVE / UPDATE USER CURRENT LOCATION
// ==========================================

app.post(
    "/api/location",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                latitude,
                longitude
            } = req.body;

            if (
                latitude === undefined ||
                longitude === undefined
            ) {

                return res.status(400).json({

                    error:
                        "Latitude and longitude are required"

                });

            }

            const userLocation =
                await UserLocation.findOneAndUpdate(

                    {
                        userId:
                            req.user.userId
                    },

                    {

                        userId:
                            req.user.userId,

                        latitude,

                        longitude,

                        updatedAt:
                            new Date()

                    },

                    {

                        new: true,

                        upsert: true

                    }

                );

            res.json({

                message:
                    "Current location saved successfully",

                location:
                    userLocation

            });

        } catch (error) {

            console.error(
                "Location save error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to save current location"

            });

        }

    }
);

// ==========================================
// ENABLE / DISABLE USER NOTIFICATIONS
// ==========================================

app.post(
    "/api/notification",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                enabled
            } = req.body;

            const user =
                await User.findByIdAndUpdate(

                    req.user.userId,

                    {

                        notificationEnabled:
                            enabled === true

                    },

                    {
                        returnDocument:
                            "after"
                    }

                );

            if (!user) {

                return res.status(404).json({

                    error:
                        "User not found"

                });

            }

            res.json({

                message:
                    user.notificationEnabled

                        ? "Notifications enabled"

                        : "Notifications disabled",

                notificationEnabled:
                    user.notificationEnabled

            });

        } catch (error) {

            console.error(
                "Notification setting error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to update notification setting"

            });

        }

    }
);

// ==========================================
// GET CURRENT USER DETAILS
// ==========================================

app.get(
    "/api/me",
    authenticateToken,
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.userId
                )
                .select(
                    "name email notificationEnabled"
                );

            if (!user) {

                return res.status(404).json({

                    error:
                        "User not found"

                });

            }

            res.json({

                name:
                    user.name,

                email:
                    user.email,

                notificationEnabled:
                    user.notificationEnabled

            });

        } catch (error) {

            console.error(
                "Get user details error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to get user details"

            });

        }

    }
);


// ==========================================
// WEATHER ALERT CHECK
// ==========================================

async function checkWeatherAlerts() {

    try {

        const savedLocations =
            await SavedLocation.find();

        if (
            savedLocations.length === 0
        ) {

            console.log(
                "No saved locations available for alert checking."
            );

            return;

        }

        console.log(
            `Checking weather alerts for ${savedLocations.length} saved location(s)...`
        );

        // ==========================================
        // CHECK EACH SAVED LOCATION
        // ==========================================

        for (
            const savedLocation
            of savedLocations
        ) {

            try {

                const latitude =
                    savedLocation.latitude;

                const longitude =
                    savedLocation.longitude;

                const locationName =
                    savedLocation.name;

                // ==========================================
                // GET USER
                // ==========================================

                const user =
                    await User.findById(
                        savedLocation.userId
                    );

                if (!user) {

                    console.log(
                        "User not found:",
                        savedLocation.userId
                    );

                    continue;

                }

                // ==========================================
                // NOTIFICATION DISABLED
                // ==========================================

                if (
                    user.notificationEnabled !== true
                ) {

                    console.log(
                        `Notifications disabled for user ${savedLocation.userId}`
                    );

                    continue;

                }

                // ==========================================
                // OPEN-METEO CURRENT WEATHER
                // ==========================================

                const weatherURL =
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,precipitation,rain&timezone=auto`;

                const response =
                    await fetch(
                        weatherURL
                    );

                if (!response.ok) {

                    console.error(
                        "Weather alert API request failed for saved location:",
                        locationName
                    );

                    continue;

                }

                const weatherData =
                    await response.json();

                if (
                    !weatherData.current
                ) {

                    continue;

                }

                const current =
                    weatherData.current;

                const temperature =
                    current.temperature_2m;

                const windSpeed =
                    current.wind_speed_10m;

                const weatherCode =
                    current.weather_code;

                const precipitation =
                    current.precipitation || 0;

                const rain =
                    current.rain || 0;

                // ==========================================
                // ALERTS ARRAY
                // ==========================================

                const alerts = [];

                // ==========================================
                // 1. HEAVY RAIN
                // ==========================================

                if (

                    precipitation >= 10 ||

                    rain >= 10 ||

                    weatherCode === 65 ||

                    weatherCode === 67 ||

                    weatherCode === 82

                ) {

                    alerts.push({

                        type:
                            "Heavy Rain",

                        message:
                            `🌧️ Heavy rain is expected in ${locationName}.`

                    });

                }

                // ==========================================
                // 2. THUNDERSTORM
                // ==========================================

                if (

                    weatherCode >= 95 &&

                    weatherCode <= 99

                ) {

                    alerts.push({

                        type:
                            "Thunderstorm",

                        message:
                            `⛈️ Thunderstorm is expected in ${locationName}.`

                    });

                }

                // ==========================================
                // 3. STRONG WIND
                // ==========================================

                if (
                    windSpeed >= 40
                ) {

                    alerts.push({

                        type:
                            "Strong Wind",

                        message:
                            `💨 Strong winds are expected in ${locationName}.`

                    });

                }

                // ==========================================
                // 4. EXTREME TEMPERATURE
                // ==========================================

                if (
                    temperature >= 40
                ) {

                    alerts.push({

                        type:
                            "Extreme Temperature",

                        message:
                            `☀️ High temperature in ${locationName}.`

                    });

                }

                if (
                    temperature <= 10
                ) {

                    alerts.push({

                        type:
                            "Extreme Temperature",

                        message:
                            `🥶 Very low temperature in ${locationName}.`

                    });

                }

                // ==========================================
                // DISPLAY ALERT RESULT + SEND PUSH
                // ==========================================

                if (
                    alerts.length > 0
                ) {

                    console.log(
                        "=========================================="
                    );

                    console.log(
                        "WEATHER ALERT"
                    );

                    console.log(
                        "User ID:",
                        savedLocation.userId
                    );

                    console.log(
                        "Saved Location:",
                        locationName
                    );

                    console.log(
                        "Latitude:",
                        latitude
                    );

                    console.log(
                        "Longitude:",
                        longitude
                    );

                    console.log(
                        "Temperature:",
                        temperature,
                        "°C"
                    );

                    console.log(
                        "Wind Speed:",
                        windSpeed,
                        "km/h"
                    );

                    console.log(
                        "Weather Code:",
                        weatherCode
                    );

                    console.log(
                        "Alerts:"
                    );

                    alerts.forEach(
                        alert => {

                            console.log(
                                `⚠️ ${alert.type}: ${alert.message}`
                            );

                        }
                    );

                    console.log(
                        "=========================================="
                    );

                    // ==========================================
                    // GET THIS USER'S PUSH SUBSCRIPTION
                    // ==========================================

                    const pushSubscription =
                        await PushSubscription.findOne({

                            userId:
                                savedLocation.userId

                        });

                    if (
                        pushSubscription
                    ) {

                        // ==========================================
                        // SEND PUSH FOR EACH ALERT
                        // ==========================================

                        for (
                            const alert
                            of alerts
                        ) {

                            try {

                                await webpush.sendNotification(

                                    pushSubscription.subscription,

                                    JSON.stringify({

                                        title:
                                            "⚠️ " + alert.type,

                                        body:
                                            alert.message

                                    })

                                );

                                console.log(
                                    "Push notification sent for:",
                                    locationName
                                );

                            } catch (
                                pushError
                            ) {

                                console.error(

                                    "Push notification failed:",

                                    pushError

                                );

                                // ==========================================
                                // DELETE EXPIRED SUBSCRIPTION
                                // ==========================================

                                if (

                                    pushError.statusCode === 404 ||

                                    pushError.statusCode === 410

                                ) {

                                    await PushSubscription.deleteOne({

                                        userId:
                                            savedLocation.userId

                                    });

                                    console.log(

                                        "Invalid push subscription removed for user:",
                                        savedLocation.userId
                                    );

                                }

                            }

                        }

                    } else {

                        console.log(

                            "No push subscription found for user:",
                            savedLocation.userId
                       
                        );

                    }

                } else {

                    console.log(
                        `No severe weather alert for saved location: ${locationName}`
                    );

                }

            } catch (locationError) {

                console.error(
                    "Weather alert check error for saved location:",
                    savedLocation.name,
                    locationError
                );

            }

        }

    } catch (error) {

        console.error(
            "Weather alert system error:",
            error
        );

    }

}

// ==========================================
// AUTOMATIC WEATHER ALERT CHECK
// ==========================================

setInterval(
    () => {

        checkWeatherAlerts();

    },
    10 * 60 * 1000
);

// ==========================================
// TEST ALERT CHECK ROUTE
// ==========================================

app.get(
    "/api/check-alerts",
    async (req, res) => {

        try {

            await checkWeatherAlerts();

            res.json({

                message:
                    "Weather alert check completed"

            });

        } catch (error) {

            console.error(
                "Alert route error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to check weather alerts"

            });

        }

    }
);

// ==========================================
// REAL SAVED LOCATION WEATHER ALERT API
// ==========================================
// This checks ONLY the logged-in user's
// saved locations.
// Search history and current location
// are NOT used for alerts.

app.get(
    "/api/current-alert",
    authenticateToken,
    async (req, res) => {

        try {

            const savedLocations =
                await SavedLocation.find({
                    userId:
                        req.user.userId
                        
                });

            if (
                savedLocations.length === 0
            ) {

                return res.json({

                    alert: false,

                    alerts: [],

                    message:
                        "No saved locations available."

                });

            }

            const allAlerts = [];

            // ==========================================
            // CHECK EACH SAVED LOCATION
            // ==========================================

            for (
                const savedLocation
                of savedLocations
            ) {

                try {

                    const latitude =
                        savedLocation.latitude;

                    const longitude =
                        savedLocation.longitude;

                    const locationName =
                        savedLocation.name;

                    const weatherURL =
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,precipitation,rain&timezone=auto`;

                    const response =
                        await fetch(
                            weatherURL
                        );

                    if (!response.ok) {
                        continue;
                    }

                    const weatherData =
                        await response.json();

                    if (
                        !weatherData.current
                    ) {
                        continue;
                    }

                    const current =
                        weatherData.current;

                    const temperature =
                        current.temperature_2m;

                    const windSpeed =
                        current.wind_speed_10m;

                    const weatherCode =
                        current.weather_code;

                    const precipitation =
                        current.precipitation || 0;

                    const rain =
                        current.rain || 0;

                    // ==========================================
                    // ALERTS FOR THIS SAVED LOCATION
                    // ==========================================

                    // 1. HEAVY RAIN

                    if (
                        precipitation >= 10 ||
                        rain >= 10 ||
                        weatherCode === 65 ||
                        weatherCode === 67 ||
                        weatherCode === 82
                    ) {

                        allAlerts.push({

                            type:
                                "Heavy Rain",

                            location:
                                locationName,

                            message:
                                `🌧️ Heavy rain is expected in ${locationName}.`

                        });

                    }

                    // 2. THUNDERSTORM

                    if (
                        weatherCode >= 95 &&
                        weatherCode <= 99
                    ) {

                        allAlerts.push({

                            type:
                                "Thunderstorm",

                            location:
                                locationName,

                            message:
                                `⛈️ Thunderstorm is expected in ${locationName}.`

                        });

                    }

                    // 3. STRONG WIND

                    if (
                        windSpeed >= 40
                    ) {

                        allAlerts.push({

                            type:
                                "Strong Wind",

                            location:
                                locationName,

                            message:
                                `💨 Strong winds are expected in ${locationName}.`

                        });

                    }

                    // 4. HIGH TEMPERATURE

                    if (
                        temperature >= 40
                    ) {

                        allAlerts.push({

                            type:
                                "Extreme Temperature",

                            location:
                                locationName,

                            message:
                                `☀️ High temperature in ${locationName}.`

                        });

                    }

                    // 5. LOW TEMPERATURE

                    if (
                        temperature <= 10
                    ) {

                        allAlerts.push({

                            type:
                                "Extreme Temperature",

                            location:
                                locationName,

                            message:
                                `🥶 Very low temperature in ${locationName}.`

                        });

                    }

                } catch (
                    locationError
                ) {

                    console.error(
                        "Saved location alert error:",
                        savedLocation.name,
                        locationError
                    );

                }

            }

            // ==========================================
            // SEND RESULT
            // ==========================================

            res.json({

                alert:
                    allAlerts.length > 0,

                alerts:
                    allAlerts

            });

        } catch (error) {

            console.error(
                "Saved location alert API error:",
                error
            );

            res.status(500).json({

                alert: false,

                alerts: [],

                error:
                    "Unable to check saved location weather alerts"

            });

        }

    }
);

// ==========================================
// TEST WEATHER ALERT
// ==========================================

app.get(
    "/api/test-alert",
    (req, res) => {

        res.json({

            alert: true,

            type:
                "Heavy Rain",

            message:
                "⚠️ Test Alert: Heavy rain warning for your current location."

        });

    }
);

// ==========================================
// TEST ROUTE
// ==========================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(

            path.join(

                __dirname,

                "..",

                "index.html"

            )

        );

    }
);

// ==========================================
// WEATHER ROUTE
// ==========================================

app.get(
    "/api/weather",
    async (req, res) => {

        try {

            const {
                latitude,
                longitude
            } = req.query;

            if (
                !latitude ||
                !longitude
            ) {

                return res.status(400).json({

                    error:
                        "Latitude and longitude are required"

                });

            }

            const weatherURL =
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=10`;

            const response =
                await fetch(
                    weatherURL
                );

            if (!response.ok) {

                throw new Error(
                    "Weather API request failed"
                );

            }

            const weatherData =
                await response.json();

            res.json(
                weatherData
            );

        } catch (error) {

            console.error(
                "Weather error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to fetch weather data"

            });

        }

    }
);

// ==========================================
// SAVE WEATHER SEARCH HISTORY
// ==========================================

app.post(
    "/api/history",
    authenticateToken,
    async (req, res) => {

        try {

            const {

                location,
                country,
                temperature,
                condition,
                humidity,
                windSpeed

            } = req.body;

            const newSearch =
                new WeatherSearch({

                    userId:
                        req.user.userId,

                    location,
                    country,
                    temperature,
                    condition,
                    humidity,
                    windSpeed

                });

            await newSearch.save();

            res.json({

                message:
                    "Weather search saved successfully"

            });

        } catch (error) {

            console.error(
                "History save error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to save weather search"

            });

        }

    }
);

// ==========================================
// GET USER'S WEATHER SEARCH HISTORY
// ==========================================

app.get(
    "/api/history",
    authenticateToken,
    async (req, res) => {

        try {

            const history =
                await WeatherSearch

                    .find({

                        userId:
                            req.user.userId

                    })

                    .sort({

                        searchedAt:
                            -1

                    })

                    .limit(50);

            res.json(
                history
            );

        } catch (error) {

            console.error(
                "History fetch error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to fetch search history"

            });

        }

    }
);

// ==========================================
// DELETE ONE WEATHER SEARCH HISTORY
// ==========================================

app.delete(
    "/api/history/:id",
    authenticateToken,
    async (req, res) => {

        try {

            const deletedSearch =
                await WeatherSearch.findOneAndDelete({

                    _id:
                        req.params.id,

                    userId:
                        req.user.userId

                });

            if (!deletedSearch) {

                return res.status(404).json({

                    error:
                        "History not found"

                });

            }

            res.json({

                message:
                    "History deleted successfully"

            });

        } catch (error) {

            console.error(
                "Delete history error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to delete history"

            });

        }

    }
);

// ==========================================
// CLEAR ALL USER WEATHER SEARCH HISTORY
// ==========================================

app.delete(
    "/api/history",
    authenticateToken,
    async (req, res) => {

        try {

            await WeatherSearch.deleteMany({

                userId:
                    req.user.userId

            });

            res.json({

                message:
                    "All history cleared successfully"

            });

        } catch (error) {

            console.error(
                "Clear history error:",
                error
            );

            res.status(500).json({

                error:
                    "Unable to clear history"

            });

        }

    }
);
// ==========================================
// HOME PAGE - LOGIN PAGE
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(
        require("path").join(__dirname, "..", "login.html")
    );
});
// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);