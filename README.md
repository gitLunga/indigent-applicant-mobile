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
| A real phone on Wi-Fi   | `http://<your-laptop-ip>:5000/api` |
| Android emulator        | `http://10.0.2.2:5000/api`     |
| iOS simulator           | `http://localhost:5000/api`    |

**CORS is not involved for the native app.** React Native is not a browser and
sends no `Origin` header, so the backend's allowlist never applies to it. If the
app cannot reach the API, the cause is one of:

1. `extra.apiUrl` still points at `localhost`, which on a phone means the phone.
2. The phone is on a different network, or the router has client isolation on.
3. Windows Firewall is blocking inbound connections to `node.exe`.
4. Android is refusing plain HTTP (API 28+). Dev builds usually permit it; a
   release build needs `usesCleartextTraffic` or HTTPS.

Quickest way to tell them apart: open `http://<laptop-ip>:5000/api/health` in the
**phone's browser**. JSON back means the network is fine and the problem is in
the app's configuration.

CORS *does* apply to `npx expo start --web`, which runs in a real browser. In
development the backend accepts any private-network origin, so that works
without configuration.

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
