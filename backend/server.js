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

        const userLocations =
            await UserLocation.find();

        if (
            userLocations.length === 0
        ) {

            console.log(
                "No user locations available for alert checking."
            );

            return;

        }

        console.log(
            `Checking weather alerts for ${userLocations.length} user(s)...`
        );

        // ==========================================
        // CHECK EACH USER
        // ==========================================

        for (
            const userLocation
            of userLocations
        ) {

            try {

                const latitude =
                    userLocation.latitude;

                const longitude =
                    userLocation.longitude;

                // ==========================================
                // GET USER
                // ==========================================

                const user =
                    await User.findById(
                        userLocation.userId
                    );

                if (!user) {

                    console.log(
                        "User not found:",
                        userLocation.userId
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
                        `Notifications disabled for user ${userLocation.userId}`
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

                        "Weather alert API request failed for user:",

                        userLocation.userId

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
                            "Heavy rain is expected at your current location."

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
                            "Thunderstorm detected at your current location."

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
                            "Strong wind conditions detected at your current location."

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
                            "Very high temperature detected at your current location."

                    });

                }

                if (
                    temperature <= 10
                ) {

                    alerts.push({

                        type:
                            "Extreme Temperature",

                        message:
                            "Very low temperature detected at your current location."

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
                        userLocation.userId
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
                                userLocation.userId

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

                                    "Push notification sent to user:",

                                    userLocation.userId

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
                                            userLocation.userId

                                    });

                                    console.log(

                                        "Invalid push subscription removed for user:",

                                        userLocation.userId

                                    );

                                }

                            }

                        }

                    } else {

                        console.log(

                            "No push subscription found for user:",

                            userLocation.userId

                        );

                    }

                } else {

                    console.log(

                        `No severe weather alert for user ${userLocation.userId}`

                    );

                }

            } catch (userError) {

                console.error(

                    "Weather alert check error for user:",

                    userLocation.userId,

                    userError

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
// REAL USER WEATHER ALERT API
// ==========================================
// This checks ONLY the logged-in user's
// current location.
// Search history is NOT used for alerts.

app.get(
    "/api/current-alert",
    authenticateToken,
    async (req, res) => {

        try {

            const userLocation =
                await UserLocation.findOne({

                    userId:
                        req.user.userId

                });

            if (!userLocation) {

                return res.json({

                    alert: false,

                    message:
                        "Current location is not available."

                });

            }

            const latitude =
                userLocation.latitude;

            const longitude =
                userLocation.longitude;

            const weatherURL =
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,precipitation,rain&timezone=auto`;

            const response =
                await fetch(
                    weatherURL
                );

            if (!response.ok) {

                return res.status(500).json({

                    alert: false,

                    error:
                        "Unable to fetch current weather."

                });

            }

            const weatherData =
                await response.json();

            if (!weatherData.current) {

                return res.json({

                    alert: false

                });

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
                        "Heavy rain is expected at your current location."

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
                        "Thunderstorm detected at your current location."

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
                        "Strong wind conditions detected at your current location."

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
                        "Very high temperature detected at your current location."

                });

            }

            if (
                temperature <= 10
            ) {

                alerts.push({

                    type:
                        "Extreme Temperature",

                    message:
                        "Very low temperature detected at your current location."

                });

            }

            // ==========================================
            // SEND ALERT RESULT
            // ==========================================

            res.json({

                alert:
                    alerts.length > 0,

                alerts:
                    alerts,

                latitude:
                    latitude,

                longitude:
                    longitude,

                temperature:
                    temperature,

                windSpeed:
                    windSpeed,

                weatherCode:
                    weatherCode

            });

        } catch (error) {

            console.error(
                "Current alert API error:",
                error
            );

            res.status(500).json({

                alert: false,

                error:
                    "Unable to check current weather alert"

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