# MeowNet Weather Integration

> Last updated: 2026-06-25

MeowNet provides a **Feline Weather Safety Watch** — a geolocation-aware weather monitoring system that informs volunteers about conditions that affect outdoor cat welfare.

---

## Why Server-Side Proxy?

All weather API calls in MeowNet go through `/api/weather` — never directly from the browser.

**Root cause:** Browser extensions (ad blockers, privacy tools) intercept `fetch()` calls to third-party domains and reject them, producing `TypeError: Failed to fetch` for Open-Meteo calls.

**Solution:** The Next.js API route calls Open-Meteo from the server, where browser extensions cannot interfere.

```
Browser → /api/weather → Open-Meteo API → response → Browser
                         (server-side only — never blocked)
```

**Bonus benefits:**
- API keys never exposed to the client
- Server-side caching possible
- Unified error handling
- Batch mode (multiple locations in one round-trip)

---

## API Endpoint

### `GET /api/weather`

#### Single Location

```
GET /api/weather?lat=40.75&lng=-73.99&city=New+York
```

**Response schema:**
```ts
{
  city: string;           // Location name (from query param or "Unknown")
  temp: number;           // Current temperature °C
  apparentTemp: number;   // Feels-like temperature °C
  humidity: number;       // Relative humidity %
  precipProb: number;     // Precipitation probability %
  windSpeed: number;      // Wind speed km/h
  windDirection: number;  // Wind direction degrees
  condition: string;      // WMO code description
  icon: string;           // Material Symbols icon name
  isDay: boolean;         // Day/night indicator
  dailyHigh: number;      // Day's high temperature °C
  dailyLow: number;       // Day's low temperature °C
}
```

#### Batch Mode

Fetches multiple locations in parallel (uses `Promise.all` server-side):

```
GET /api/weather?lats=40.80,40.75,40.73&lngs=-73.95,-73.99,-74.01
```

**Response:**
```json
{
  "results": [
    { "city": "District 1", "temp": 22.1, ... },
    { "city": "District 2", "temp": 21.8, ... }
  ]
}
```

Used in the weather page district grid for fetching 5+ locations simultaneously.

---

## Open-Meteo Fields

MeowNet requests the following fields from Open-Meteo's `/v1/forecast` endpoint:

```
current=temperature_2m,relative_humidity_2m,apparent_temperature,
        precipitation_probability,wind_speed_10m,wind_direction_10m,
        weather_code,is_day
daily=temperature_2m_max,temperature_2m_min
```

---

## WMO Weather Code Mapping

| Code | Description | Icon |
|------|-------------|------|
| 0 | Clear sky | `wb_sunny` |
| 1-3 | Partly cloudy | `partly_cloudy_day` |
| 45, 48 | Foggy | `foggy` |
| 51-55 | Drizzle | `rainy` |
| 61-65 | Rain | `rainy` |
| 71-75 | Snowfall | `ac_unit` |
| 80-82 | Rain showers | `thunderstorm` |
| 95 | Thunderstorm | `thunderstorm` |
| default | Unknown | `cloud` |

---

## Comfort Classification

The weather page classifies conditions into volunteer safety tiers:

| Classification | Criteria |
|---------------|----------|
| 🟢 **Comfortable** | apparentTemp 15–25°C, precipProb < 20% |
| 🟡 **Acceptable** | apparentTemp 10–30°C, precipProb < 40% |
| 🔴 **Harsh** | apparentTemp < 5°C or > 35°C, or precipProb > 60% |

---

## Landing Page Weather Alert

The landing page shows a live weather alert based on the user's actual location:

```
1. navigator.geolocation.getCurrentPosition() [4s timeout]
2. If granted:
   a. Nominatim reverse geocode → city name (display only, not stored)
   b. fetch /api/weather?lat=X&lng=Y&city=Name
3. If denied or timeout:
   a. Pick random fallback from 15 global cat shelter locations
   b. fetch /api/weather?lat=X&lng=Y&city=Name
4. Display alert banner with comfort classification + location name
```

### 15 Global Fallback Locations

Istanbul, Aoshima (Cat Island Japan), Rome, Athens, Bangkok, Barcelona, Buenos Aires, Cairo, Cape Town, Mexico City, Mumbai, Seoul, Sydney, Tokyo, Vancouver.

---

## Error Handling

| Scenario | Behavior |
|----------|---------|
| Open-Meteo unavailable | Returns `503` with error message |
| Invalid coordinates | Returns `400` |
| Missing `lat`/`lng` params | Returns `400` |
| Network timeout (5s) | Returns `504` |

The weather page and landing page both handle errors gracefully — falling back to a static comfort message rather than showing an error state.
