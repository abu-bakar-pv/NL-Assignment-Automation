# Booking API

Source: https://restful-booker.herokuapp.com/apidoc, summarised by the QA team.
Observed behaviour (including defects) is recorded separately in
`docs/api-behaviour-findings.md`, so this file stays a statement of the documented contract.

## Authentication
`POST /auth` with JSON `{ "username": string, "password": string }`
returns `{ "token": string }`. The token is sent as `Cookie: token=<value>`.
Basic auth (`Authorization: Basic ...`) is accepted as an alternative.

## Endpoints

| Method | Path | Auth | Success |
| --- | --- | --- | --- |
| GET | /booking | none | 200, `[{ "bookingid": number }]`; optional query `firstname`, `lastname`, `checkin`, `checkout` |
| GET | /booking/{id} | none | 200, Booking |
| POST | /booking | none | 200, `{ "bookingid": number, "booking": Booking }` |
| PUT | /booking/{id} | required | 200, Booking (full replacement) |
| PATCH | /booking/{id} | required | 200, Booking (partial update) |
| DELETE | /booking/{id} | required | 201 |

## Booking

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| firstname | string | yes | |
| lastname | string | yes | |
| totalprice | number | yes | price for the stay |
| depositpaid | boolean | yes | |
| bookingdates.checkin | string (YYYY-MM-DD) | yes | |
| bookingdates.checkout | string (YYYY-MM-DD) | yes | |
| additionalneeds | string | no | |

## Example

```http
POST /booking
Content-Type: application/json

{
  "firstname": "Jim", "lastname": "Brown", "totalprice": 111, "depositpaid": true,
  "bookingdates": { "checkin": "2018-01-01", "checkout": "2019-01-01" },
  "additionalneeds": "Breakfast"
}
```
