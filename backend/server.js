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

// 🚗 Route to get route directions including distance & duration
app.post("/route", async (req, res) => {
    const { start, end } = req.body;

    if (!start || !end) {
        return res.status(400).json({ error: "❌ Start and End locations are required" });
    }

    try {
        const response = await axios.get(`https://us1.locationiq.com/v1/directions/driving/${start.lon},${start.lat};${end.lon},${end.lat}`, {
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

        res.json({
            coordinates: decodedCoordinates,
            distance: route.distance,  // meters
            duration: route.duration   // seconds
        });
    } catch (error) {
        console.error("❌ Route API error:", error.response?.data || error.message);
        res.status(500).json({ error: "Error fetching route" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
