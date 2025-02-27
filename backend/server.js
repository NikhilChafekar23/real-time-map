require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const polyline = require("@mapbox/polyline");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;

if (!LOCATIONIQ_API_KEY) {
    console.error("❌ Error: LOCATIONIQ_API_KEY is missing in .env file");
    process.exit(1);
}

// 🌍 Geocode Route (Get coordinates from address)
app.post("/geocode", async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "❌ Address is required" });
    }

    try {
        const response = await axios.get(`https://us1.locationiq.com/v1/search.php`, {
            params: {
                key: LOCATIONIQ_API_KEY,
                q: address,
                format: "json",
            },
        });
        res.json(response.data[0]);
    } catch (error) {
        console.error("❌ Geocode API error:", error.response?.data || error.message);
        res.status(500).json({ error: "Error fetching coordinates" });
    }
});

// 🚗 Get Route & Custom Time Logic (Car, Bike, Walk)
app.post("/route", async (req, res) => {
    const { start, end, mode } = req.body;

    if (!start || !end) {
        return res.status(400).json({ error: "❌ Start and End locations are required" });
    }

    const validModes = ["driving", "cycling", "foot"];
    const transportMode = validModes.includes(mode) ? mode : "driving";

    try {
        const response = await axios.get(`https://us1.locationiq.com/v1/directions/${transportMode}/${start.lon},${start.lat};${end.lon},${end.lat}`, {
            params: {
                key: LOCATIONIQ_API_KEY,
                overview: "full",
                steps: true,
            },
        });

        const route = response.data.routes?.[0];

        if (!route) {
            return res.status(404).json({ error: "❌ No route found" });
        }

        const decodedCoordinates = polyline.decode(route.geometry);
        const distanceKm = route.distance / 1000; // meters to km

        // 🧮 Custom Time Logic (based on 15km examples you provided)
        let customDurationMinutes = 0;

        if (transportMode === "driving") {
            customDurationMinutes = (distanceKm / 15) * 20;
        } else if (transportMode === "cycling") {
            customDurationMinutes = (distanceKm / 15) * 25;
        } else if (transportMode === "foot") {
            customDurationMinutes = (distanceKm / 15) * (3 * 60 + 28); // 3 hr 28 min
        }

        const customDurationSeconds = customDurationMinutes * 60;

        res.json({
            coordinates: decodedCoordinates,
            distance: route.distance,  // meters
            duration: customDurationSeconds, // seconds (for calculations if needed)
            durationText: formatDuration(customDurationSeconds) // Human-readable string
        });
    } catch (error) {
        console.error(`❌ ${mode.toUpperCase()} Route API error:`, error.response?.data || error.message);
        res.status(500).json({ error: `Error fetching ${mode} route` });
    }
});

// ⏱️ Helper to format duration into "X hr Y min"
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours} hr ${remainingMinutes} min`;
    }
    return `${minutes} min`;
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
