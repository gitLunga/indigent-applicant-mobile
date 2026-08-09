# Applicant mobile — UI overhaul

**Date:** 2026-08-08
**Status:** Approved, implemented

## Goal

Bring the applicant mobile app up to the standard of `indigent-applicant-portal`:
a modern, professional interface that a resident recognises as the same
municipal system they were shown on the web. Four specific gaps were named:

1. Not every choice should be a radio button — long lists want dropdowns.
2. Uploads must accept PDFs and documents, not only photographs.
3. The UI should copy the portal — its landing page, its sidebar, how it works.
4. New typography, iconography and layout.

## What was already true

The mobile app had already copied the portal's **colour tokens** verbatim
(`src/theme.ts`), so no palette work was needed and none was done. Not one hex
value changed.

The gaps were everything else: no landing page (the index route redirected
straight to the dashboard), no icon library, no custom fonts, a plain stack with
no sidebar, `Choice` (a radio stack) used for *every* select, and image-only
uploads.

**Key finding:** the backend already accepted PDF, JPG, PNG, DOC and DOCX up to
10 MB (`indigent-backend/src/lib/fileType.js`, `src/routes/documents.js`). The
mobile client was the only thing restricting uploads to photographs. No server
change was needed.

## Decisions

| Area | Choice | Why |
|---|---|---|
| Typeface | Plus Jakarta Sans (one family, 400–800) | Modern geometric-humanist with character in headings, neutral at form sizes. Good numerals for ID numbers and rand amounts. |
| Icons | Lucide, deep-imported | The portal's hand-rolled icons are Feather-derived; Lucide is Feather's maintained successor, so both front ends draw the same shapes. |
| Navigation | Drawer only, full sidebar port | The portal's sidebar pins application status on every screen. Tabs would have split navigation across two surfaces and left the status block homeless. |

### Typography — the load-bearing detail

React Native does **not** synthesise weights for custom fonts. On Android,
`fontFamily: 'PlusJakartaSans_400Regular'` + `fontWeight: '600'` renders
*regular*, silently, while looking correct on iOS.

So weight is expressed by **font family**, never by `fontWeight`. The old
`weight` export was **deleted rather than deprecated**, turning every unmigrated
call site into a TypeScript error — the only reliable way to find all of them.
That surfaced 29 `fontWeight: weight.*` usages, plus a further 30 text styles
that had `fontSize` and no family at all and would have fallen back to the
system font.

### Radio vs dropdown

The rule: **radio when the answer visibly changes what is asked next, or there
are ≤3 short options; dropdown otherwise.**

| Field | Control | Reason |
|---|---|---|
| Sex | Radio, two columns | Binary, one word each |
| Yes/No questions | Radio, two columns | Binary |
| Tenure (own/rent/occupy) | **Radio** | Adds a title deed or lease to the checklist two screens later |
| Difficulty scale | **Radio** | A 5-point severity scale reads as a scale only when laid out flat |
| Title | **Dropdown** + free-text fallback | 10 options; "Something else" keeps any typed title |
| Marital status | **Dropdown** | 5 options, nothing depends on the answer |
| Employment status | **Dropdown** | Reveals employer fields directly beneath, so nothing is hidden |
| Applicant category | **Dropdown** | 5 long options |
| Privacy request type | **Dropdown** | 4 long options |

`Select` is a field that looks exactly like a text input with a chevron, opening
a bottom sheet — not a picker wheel (iOS) or dialog (Android), which are two
different interactions with two different hit targets. Search appears above 8
options.

## Architecture

- **`src/theme.ts`** — unchanged palette; adds `font`, `tracking`, display sizes.
- **`src/components/Icon.tsx`** — maps the *portal's* icon names (`dashboard`,
  `applications`, `logout`) onto Lucide components, so both front ends share one
  vocabulary and a Lucide rename is one file to fix. Deep imports keep Metro from
  bundling all ~1500 icons.
- **`src/services/application.tsx`** — one fetch of `/applications/mine` shared
  by the drawer, dashboard, applications list and documents screen. Mirrors the
  portal's `ApplicationContext`. Removes a request rather than adding one.
- **`src/services/upload.ts`** — picking, preparing and sending a document.
- **`src/components/DocumentSlots.tsx`** — the checklist, shared by the wizard
  step and the standalone Documents screen so the two cannot drift.
- **`src/components/AppDrawer.tsx`** — 1:1 port of `AppSidebar.jsx`.

`react-native-drawer-layout` was **already installed** via expo-router and
version-matched to the installed reanimated/gesture-handler, so the drawer cost
no new dependency and, being unstyled, allowed a real port rather than a themed
approximation.

## Upload fixes

Three bugs a PDF would have hit, beyond the picker itself:

1. Compression now runs **only** on images. A PDF through `SaveFormat.JPEG`
   yields an error or a screenshot of page one — silently discarding pages two
   and three of a bank statement.
2. FormData sends the asset's real `name`/`mimeType` instead of a hardcoded
   `.jpg` / `image/jpeg`. The server checks the extension first, so a PDF named
   `id_copy.jpg` was rejected as an invalid file type.
3. A 10 MB client-side guard, so an oversized file fails before the upload
   rather than after it — on a metered connection that is real money.

## Scope added beyond the request

The portal sidebar has 8 links; mobile was missing **Documents** (standalone)
and **Help & FAQ**. Dead links are worse than no port, so both were built. The
FAQ answers on the landing page also actually open — on the web they are `<div>`s
with a chevron and no handler, which on a phone reads as a broken button.

## Dependency notes

- `.npmrc` sets `legacy-peer-deps=true`. expo-router 57 pulls `vaul`, whose
  `@radix-ui/react-dialog` peer range stops at React 18 while this app is on
  React 19; without it, `npm install <anything>` fails with ERESOLVE. The
  conflict is confined to expo-router's web dependencies, which a native build
  never loads.
- `react-native-reanimated` and `react-native-worklets` are now **direct**
  dependencies. They were previously reachable only transitively, and because
  `legacy-peer-deps` does not auto-install peers, a later `npm install` pruned
  reanimated from the tree — breaking the drawer at bundle time with
  `Unable to resolve module react-native-reanimated`. TypeScript could not see
  this; only the bundle could. Anything imported at runtime is declared
  explicitly for the same reason.

## Bundle size

Fonts and icons are the two places this overhaul could quietly cost a megabyte,
and both are imported one file at a time rather than through a package barrel:

- **Icons** — `lucide-react-native/icons/<name>`, not the barrel, which would
  have Metro bundle all ~1500 icons for the forty this app draws.
- **Fonts** — the five `.ttf` files directly. The barrel `require()`s all
  fourteen faces; the first bundle shipped every italic and the 200/300 weights
  despite `useFonts` loading five. Deep imports took assets from **41 to 32**
  and Plus Jakarta faces from **14 to 5** (~855 KB).

Requires `types/assets.d.ts` — `expo/types` declares `.css` and stops, so
without a `*.ttf` declaration the expensive barrel import is the only one that
compiles.

One asset is not ours: `MaterialSymbols_400Regular.ttf` (962 KB) arrives via
`expo-router` → `expo-symbols`, and is larger than everything else combined.

## Verification

- `npx tsc --noEmit` — clean, exit 0.
- `npx expo export --platform android` — 1933 modules, exit 0.
- **No run on a device or emulator.** The visual result, the drawer swipe, the
  camera and the document-picker flows are unverified against real hardware.
  Reanimated in particular is a native module that a bundle cannot exercise.
