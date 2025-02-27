import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./Map.css";

const FitBounds = ({ route }) => {
    const map = useMap();
    if (route.length) map.fitBounds(route, { padding: [40, 40] });
    return null;
};

const redMarker = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconSize: [25, 41],
    className: "red-marker",
});

const Map = () => {
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [startCoords, setStartCoords] = useState(null);
    const [endCoords, setEndCoords] = useState(null);
    const [route, setRoute] = useState([]);
    const [distance, setDistance] = useState(null);
    const [duration, setDuration] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchCoords = async (address, setter) => {
        if (!address.trim()) return alert("Enter a valid location!");
        try {
            const { data } = await axios.post("http://localhost:5000/geocode", { address });
            setter({ lat: parseFloat(data.lat), lon: parseFloat(data.lon) });
        } catch (err) {
            alert("Location not found!");
        }
    };

    const fetchRoute = async () => {
        if (!startCoords || !endCoords) return;

        setLoading(true);
        try {
            const { data } = await axios.post("http://localhost:5000/route", {
                start: startCoords,
                end: endCoords,
                mode: "driving"  // Default to driving, always
            });

            setRoute(data.coordinates.map(([lat, lon]) => [lat, lon]));
            setDistance((data.distance / 1000).toFixed(2));
            setDuration(formatDuration(data.duration));
        } catch (err) {
            alert("Could not fetch route!");
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (secs) => {
        const min = Math.round(secs / 60);
        return min < 60 ? `${min} min` : `${Math.floor(min / 60)} hr ${min % 60} min`;
    };

    const switchPlaces = () => {
        setStart(end);
        setEnd(start);
        setStartCoords(endCoords);
        setEndCoords(startCoords);
    };

    const useCurrentLocation = () => {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setStartCoords({ lat: coords.latitude, lon: coords.longitude });
                setStart("My Current Location");
            },
            () => alert("Unable to access location!")
        );
    };

    useEffect(() => {
        if (startCoords && endCoords) {
            fetchRoute();
        }
    }, [startCoords, endCoords]);

    return (
        <div className="map-container">
            <header className="top-bar">🌍 Smart Route Planner</header>

            <div className="floating-card">
                <div className="input-row">
                    <input
                        type="text"
                        placeholder="Start Location"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                    />
                    <button onClick={() => fetchCoords(start, setStartCoords)}>📍</button>
                    <button className="location-btn" onClick={useCurrentLocation}>📡</button>
                </div>

                <div className="input-row">
                    <input
                        type="text"
                        placeholder="End Location"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                    <button onClick={() => fetchCoords(end, setEndCoords)}>📍</button>
                </div>

                <div className="action-buttons">
                    <button onClick={switchPlaces}>🔄 Swap</button>
                    <button onClick={fetchRoute} disabled={loading}>
                        {loading ? "Loading..." : "🚀 Get Route"}
                    </button>

                    {distance && duration && (
                        <div className="inline-info">
                            📏 {distance} km | ⏱ {duration}
                        </div>
                    )}
                </div>
            </div>

            <MapContainer center={[20, 78]} zoom={5} className="leaflet-map">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {startCoords && <Marker position={[startCoords.lat, startCoords.lon]} />}
                {endCoords && <Marker position={[endCoords.lat, endCoords.lon]} icon={redMarker} />}
                {route.length > 0 && (
                    <>
                        <Polyline positions={route} color="#007bff" />
                        <FitBounds route={route} />
                    </>
                )}
            </MapContainer>

            {distance && duration && (
                <div className="info-box show">
                    <span>📏 {distance} km</span>
                    <span>⏱ {duration}</span>
                </div>
            )}
        </div>
    );
};

export default Map;
