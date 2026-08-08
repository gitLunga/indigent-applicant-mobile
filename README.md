# Indigent Register — applicant mobile app

A React Native app (Expo SDK 57) for households applying for municipal indigent
support. It is a second front end onto the **same backend** as the web applicant
portal: same endpoints, same validation, same approval workflow.

## Relationship to the web client

The API layer in `src/services/api.ts` is ported close to verbatim from the web
client's `src/services/api.js` — endpoints, request shapes, interceptor
behaviour and error branches are not UI-framework-specific, and rewriting them
would invite the two front ends to drift apart.

Everything else is reimplemented natively. No web JSX was copied: a `<Pressable>`
with a pressed state is not a `<button>` with `:hover`.

The palette in `src/theme.ts` is a literal copy of the custom properties in the
web client's `src/styles/index.css`. When one changes, change both in the same
commit.

## Running it

```sh
npm install
npx expo start
```

The API address comes from `extra.apiUrl` in `app.json`, or `EXPO_PUBLIC_API_URL`.
It must be reachable **from the phone**, so `localhost` will not do:

| Where you run it        | Value                          |
|-------------------------|--------------------------------|
| Android emulator        | `http://10.0.2.2:5000/api`     |
| iOS simulator           | `http://localhost:5000/api`    |
| A real phone on Wi-Fi   | `http://<your-laptop-ip>:5000/api` |

The backend's `CORS_ORIGINS` is not consulted for native requests, but the
server must be listening on all interfaces for a real device to reach it.

## Screens

| Order | Route | What it does |
|---|---|---|
| — | `(auth)/sign-in` | Email **or** cell number, plus why the last session ended |
| — | `(auth)/register` | Enough to have somewhere to save an application |
| 1 | `apply/particulars` | Title, name, ID, sex, contact, address, postal, employment |
| 2 | `apply/verify` | OTP by SMS, skippable |
| 3 | `apply/property` | Tenure, category, accounts, meters, other property |
| 4 | `apply/income` | Household roll and income |
| 5 | `apply/general` | Consents and the six functioning questions |
| 6 | `apply/documents` | Camera capture, compression, submit |

## Rules that are load-bearing

- **Derived values are never sent.** Date of birth, age, `hasDisability`, the
  composed `postalAddress` and the household totals are the server's.
- **Consents always travel**, including `false` — omitting one would leave a
  stale "yes" on the record.
- **`documentId` fills a slot.** Uploading with only `type` attaches an extra
  optional document and leaves the requirement open.
- **JPEG is forced** on upload. iPhones produce HEIC and the server correctly
  rejects it.
- **No eligibility decision is made on the device.** The means test belongs to
  the assessment officer.

## Checks

```sh
npx tsc --noEmit                      # types
npx expo export --platform android    # does it bundle
```
