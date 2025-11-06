# TrapperTracker API Documentation

**Version:** 1.0.0
**Base URL:** `https://trappertracker.com` (or `http://localhost:8787` for local development)
**Protocol:** HTTPS (HTTP in development)

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [POST /api/register](#post-apiregister)
  - [POST /api/login](#post-apilogin)
  - [POST /api/report](#post-apireport)
  - [GET /api/mapdata](#get-apimapdata)

---

## Authentication

TrapperTracker uses **JWT (JSON Web Tokens)** for authentication. Tokens are stored in secure, HttpOnly cookies.

### Authentication Flow

1. **Register** or **Login** to receive a JWT token
2. Token is automatically stored in an HttpOnly cookie named `session`
3. Include cookies in subsequent requests (browsers do this automatically)
4. Token expires after **2 hours** of inactivity

### Cookie Details

```
Name: session
HttpOnly: true
Secure: true (production only)
SameSite: Lax
Max-Age: 7200 seconds (2 hours)
```

---

## Rate Limiting

Rate limiting is applied to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/register` | 5 requests | 1 minute per IP |
| `/api/login` | 5 requests | 1 minute per IP |
| `/api/report` | Unlimited (authenticated only) | - |
| `/api/mapdata` | Unlimited | - |

**Headers:**
- Rate limit information is not currently exposed in headers
- Exceeding the limit returns `429 Too Many Requests`

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful request |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid input data |
| `401` | Unauthorized | Authentication required or failed |
| `405` | Method Not Allowed | Wrong HTTP method used |
| `409` | Conflict | Resource already exists (e.g., email taken) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error |

### Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

**Example:**
```json
{
  "error": "Invalid latitude or longitude."
}
```

---

## Endpoints

### POST /api/register

Create a new user account.

#### Request

**Method:** `POST`
**Content-Type:** `application/json`
**Authentication:** Not required

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Response

**Success (201 Created):**
```
User registered successfully
```

**Error (400 Bad Request):**
```json
{
  "error": "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
}
```

**Error (409 Conflict):**
```json
{
  "error": "Email already registered"
}
```

**Error (429 Too Many Requests):**
```
Too many requests. Please try again later.
```

#### Example

```bash
curl -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

---

### POST /api/login

Authenticate and receive a session token.

#### Request

**Method:** `POST`
**Content-Type:** `application/json`
**Authentication:** Not required

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Response

**Success (200 OK):**
```
Login successful
```

**Headers:**
```
Set-Cookie: session=<jwt_token>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200
```

**Error (401 Unauthorized):**
```json
{
  "error": "Incorrect email or password"
}
```

**Error (429 Too Many Requests):**
```
Too many requests. Please try again later.
```

#### Example

```bash
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

---

### POST /api/report

Submit a new report (danger zone, lost pet, found pet, or dangerous animal).

#### Request

**Method:** `POST`
**Content-Type:** `application/json`
**Authentication:** **Required** (JWT token in cookie)

**Common Fields:**
```json
{
  "report_type": "dangerZone|lostPet|foundPet|dangerousAnimal",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "description": "Optional description text"
}
```

#### Report Type-Specific Fields

**1. Danger Zone (Pet Trapper)**
```json
{
  "report_type": "dangerZone",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "description": "Trapper spotted with cages near park entrance"
}
```

**2. Lost Pet**
```json
{
  "report_type": "lostPet",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "pet_name": "Max",
  "species_breed": "Golden Retriever",
  "owner_contact_email": "owner@example.com",
  "photo_url": "https://i.imgur.com/abc123.jpg",
  "description": "Wearing a blue collar, last seen 2 hours ago"
}
```

**3. Found Pet**
```json
{
  "report_type": "foundPet",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "species_breed": "Tabby Cat",
  "contact_info": "555-123-4567 or finder@example.com",
  "photo_url": "https://i.imgur.com/xyz789.jpg",
  "description": "Friendly, orange and white, no collar"
}
```

**4. Dangerous Animal**
```json
{
  "report_type": "dangerousAnimal",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "animal_type": "wild",
  "description": "Aggressive coyote spotted near hiking trail"
}
```

**Animal Type Options:**
- `wild` - Wild animal
- `domestic` - Domestic animal acting dangerously

#### Validation Rules

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `latitude` | number | Yes | -90 to 90 |
| `longitude` | number | Yes | -180 to 180 |
| `description` | string | No | Max 1000 characters |
| `pet_name` | string | Conditional | Required for lostPet |
| `species_breed` | string | No | - |
| `owner_contact_email` | string | Conditional | Required for lostPet |
| `contact_info` | string | Conditional | Required for foundPet |
| `photo_url` | string | No | Valid URL |
| `animal_type` | string | Conditional | Required for dangerousAnimal |

#### Response

**Success (200 OK):**
```
Report submitted successfully
```

**Error (400 Bad Request):**
```json
{
  "error": "Invalid latitude or longitude."
}
```
```json
{
  "error": "Description is too long."
}
```
```json
{
  "error": "Invalid report_type"
}
```

**Error (401 Unauthorized):**
```
Unauthorized
```

#### Example

```bash
# Submit danger zone report
curl -X POST http://localhost:8787/api/report \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "report_type": "dangerZone",
    "latitude": 30.2672,
    "longitude": -97.7431,
    "description": "Trapper activity reported by multiple residents"
  }'

# Submit lost pet report
curl -X POST http://localhost:8787/api/report \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "report_type": "lostPet",
    "latitude": 30.2672,
    "longitude": -97.7431,
    "pet_name": "Buddy",
    "species_breed": "Labrador",
    "owner_contact_email": "owner@example.com",
    "photo_url": "https://example.com/buddy.jpg",
    "description": "Black lab, 5 years old, friendly"
  }'
```

---

### GET /api/mapdata

Retrieve reports for display on the map.

#### Request

**Method:** `GET`
**Content-Type:** N/A
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat_min` | float | Yes | Minimum latitude (south boundary) |
| `lat_max` | float | Yes | Maximum latitude (north boundary) |
| `lon_min` | float | Yes | Minimum longitude (west boundary) |
| `lon_max` | float | Yes | Maximum longitude (east boundary) |
| `show_trappers` | boolean | No | Include trapper reports (default: false) |
| `show_lost_pets` | boolean | No | Include lost pet reports (default: false) |
| `show_found_pets` | boolean | No | Include found pet reports (default: false) |
| `show_dangerous_animals` | boolean | No | Include dangerous animal reports (default: false) |
| `time_start` | ISO 8601 | No | Filter reports after this date |
| `time_end` | ISO 8601 | No | Filter reports before this date |

**Example Query String:**
```
?lat_min=30.0&lat_max=31.0&lon_min=-98.0&lon_max=-97.0&show_trappers=true&show_lost_pets=true
```

#### Response

**Success (200 OK):**
```json
{
  "trappers": [
    {
      "blip_id": 1,
      "reported_by_user_id": "uuid-here",
      "latitude": 30.2672,
      "longitude": -97.7431,
      "report_timestamp": "2025-11-06T10:30:00.000Z",
      "is_active": 1,
      "description": "Trapper spotted near park",
      "created_at": "2025-11-06 10:30:00"
    }
  ],
  "lost_pets": [
    {
      "pet_id": 1,
      "reported_by_user_id": "uuid-here",
      "pet_name": "Max",
      "species_breed": "Golden Retriever",
      "latitude": 30.2672,
      "longitude": -97.7431,
      "time_lost": "2025-11-06T08:00:00.000Z",
      "photo_url": "https://example.com/max.jpg",
      "description": "Friendly, wearing blue collar",
      "owner_contact_email": "owner@example.com",
      "is_found": 0,
      "created_at": "2025-11-06 10:30:00"
    }
  ],
  "found_pets": [
    {
      "found_pet_id": 1,
      "reported_by_user_id": "uuid-here",
      "species_breed": "Orange Tabby Cat",
      "latitude": 30.2672,
      "longitude": -97.7431,
      "time_found": "2025-11-06T09:00:00.000Z",
      "photo_url": "https://example.com/cat.jpg",
      "description": "Friendly, no collar",
      "contact_info": "555-123-4567",
      "is_reunited": 0,
      "created_at": "2025-11-06 10:30:00"
    }
  ],
  "dangerous_animals": [
    {
      "danger_id": 1,
      "reported_by_user_id": "uuid-here",
      "latitude": 30.2672,
      "longitude": -97.7431,
      "animal_type": "wild",
      "description": "Aggressive coyote",
      "report_timestamp": "2025-11-06T07:00:00.000Z",
      "created_at": "2025-11-06 10:30:00"
    }
  ]
}
```

**Error (500 Internal Server Error):**
```json
{
  "error": "Database error message"
}
```

#### Example

```bash
# Get all reports in Austin, TX area
curl "http://localhost:8787/api/mapdata?lat_min=30.0&lat_max=30.5&lon_min=-98.0&lon_max=-97.5&show_trappers=true&show_lost_pets=true&show_found_pets=true&show_dangerous_animals=true"

# Get only trapper reports from last 7 days
curl "http://localhost:8787/api/mapdata?lat_min=30.0&lat_max=30.5&lon_min=-98.0&lon_max=-97.5&show_trappers=true&time_start=2025-10-30T00:00:00Z"
```

---

## Data Structures

### User
```typescript
interface User {
  user_id: string;          // UUID
  email: string;
  password_hash: string;
  verification_token: string | null;
  is_verified: number;      // 0 or 1 (boolean)
  role: string;             // 'user' | 'admin' | 'moderator'
  created_at: string;       // ISO 8601 timestamp
}
```

### Trapper Blip (Danger Zone)
```typescript
interface TrapperBlip {
  blip_id: number;
  reported_by_user_id: string;
  latitude: number;
  longitude: number;
  report_timestamp: string;  // ISO 8601
  is_active: number;         // 0 or 1 (boolean)
  description: string | null;
  created_at: string;
}
```

### Lost Pet
```typescript
interface LostPet {
  pet_id: number;
  reported_by_user_id: string;
  pet_name: string;
  species_breed: string | null;
  latitude: number;
  longitude: number;
  time_lost: string;         // ISO 8601
  photo_url: string | null;
  description: string | null;
  owner_contact_email: string;
  is_found: number;          // 0 or 1 (boolean)
  created_at: string;
}
```

### Found Pet
```typescript
interface FoundPet {
  found_pet_id: number;
  reported_by_user_id: string;
  species_breed: string | null;
  latitude: number;
  longitude: number;
  time_found: string;        // ISO 8601
  photo_url: string | null;
  description: string | null;
  contact_info: string;
  is_reunited: number;       // 0 or 1 (boolean)
  created_at: string;
}
```

### Dangerous Animal
```typescript
interface DangerousAnimal {
  danger_id: number;
  reported_by_user_id: string;
  latitude: number;
  longitude: number;
  animal_type: 'wild' | 'domestic';
  description: string | null;
  report_timestamp: string;   // ISO 8601
  created_at: string;
}
```

---

## Security

### Input Sanitization

All user inputs are sanitized to prevent XSS attacks:
- HTML special characters are escaped
- Description length is limited to 1000 characters
- Coordinates are validated for valid ranges

### SQL Injection Prevention

All database queries use parameterized statements:
```javascript
// ✅ Safe
await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

// ❌ Never done
await env.DB.prepare(`SELECT * FROM users WHERE email = '${email}'`).first();
```

### Password Security

- Passwords are hashed using bcrypt with salt rounds (cost factor: 10)
- Plain-text passwords are never stored
- Password complexity requirements enforced

---

## Changelog

### Version 1.0.0 (2025-11-06)
- Initial API release
- Authentication endpoints (register, login)
- Report submission (4 report types)
- Map data retrieval with filtering

---

## Support

For API support, please:
- 📖 Check this documentation
- 🐛 [Report issues on GitHub](https://github.com/clogt/trappertracker/issues)
- 💬 [Join discussions](https://github.com/clogt/trappertracker/discussions)

---

**Last Updated:** 2025-11-06
**Maintained by:** TrapperTracker Team
