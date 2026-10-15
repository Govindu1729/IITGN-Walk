# IITGN Walk — OpenAPI Specification

## Base URL
- Development: `http://localhost:3000`
- Production: `https://iitgn-walk.space-z.ai` (example)

## Endpoints

### 🗺️ Campus & Routing

#### GET /api/campus
Returns full campus GeoJSON dataset (buildings, paths, POIs).

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Library",
        "category": "academic"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [74.8123, 23.0567]
      }
    }
  ]
}
```

#### POST /api/route-compute
Computes routes with multiple objectives.

**Request:**
```json
{
  "from": "hostel-3",
  "to": "ab1",
  "mode": "NORMAL",
  "accessibleOnly": false
}
```

**Response:**
```json
{
  "routes": [
    {
      "objective": "FASTEST",
      "distanceM": 606,
      "durationS": 498,
      "difficulty": 7,
      "path": [...],
      "steps": [...]
    }
  ]
}
```

#### GET /api/locations
Returns flat POI list with categories.

#### POST /api/journeys
Creates a new journey.

#### PATCH /api/journeys/:id
Completes a journey with GPS trace.

#### GET /api/analytics
Returns aggregated statistics.

#### GET /api/profiles
Returns current walking-speed model.

### 🎯 Additional Endpoints

#### GET /api/campus-activity
Returns live activity data (simulated walkers, heatmap).

#### GET /api/announcements
Returns active announcements.

#### GET /api/events
Returns campus events.

#### GET /api/weather
Returns current weather.

#### POST /api/tts
Text-to-speech endpoint.

#### GET /api/smart-suggest
Smart class/activity suggestions.

## Error Responses

### 400 Bad Request
```json
{
  "error": "invalid_request",
  "message": "Invalid mode value. Must be RELAXED, NORMAL, or HURRY."
}
```

### 500 Internal Server Error
```json
{
  "error": "server_error",
  "message": "Failed to compute routes."
}
```

## Rate Limiting
- Default: 100 requests/minute per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## Authentication
Currently public (no auth required).

---

*Generated: 2026-10-16*
