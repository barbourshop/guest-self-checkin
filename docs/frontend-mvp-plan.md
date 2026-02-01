<!-- mobile-first frontend blueprint -->
# Frontend MVP Plan (Svelte Web App)

## Tech Stack
- **Framework**: Svelte + Vite (or SvelteKit if routing/server endpoints are desired). Svelte compiles to minimal JS for fast mobile loads.
- **Language/Styling**: TypeScript + Tailwind CSS (already in repo) or lightweight utility classes; consider using Skeleton UI or DaisyUI if needed.
- **State**: Svelte stores for session state (`selectedGuest`, `waiverAcknowledged`, `deviceId`). Derived stores handle computed values (e.g., membership badge text).
- **Data Fetching**: Native `fetch` wrapped in small helpers; if using SvelteKit, leverage `load` functions for server-side rendering where appropriate.
- **Auth**: Cognito Hosted UI (PKCE). Handle callback route in SvelteKit or dedicated Svelte page that parses tokens and stores them securely.

## App Structure (SvelteKit-style)
```
src/
  routes/
    +layout.svelte        # top-level shell
    +layout.ts            # load auth/session data
    +page.svelte          # home/search
    checkin/+page.svelte  # guest detail, guest count
    passes/+page.svelte   # member portal, QR display
    admin/+page.svelte    # role-gated dashboard
  lib/
    api/client.ts         # fetch helpers hitting API Gateway
    stores/session.ts     # auth tokens, device ID
    stores/waiver.ts      # local waiver acknowledgements
    components/           # buttons, cards, modals
    utils/scanner.ts      # barcode/QR helpers
```
(If not using SvelteKit, mimic structure under `src/lib` and use `@sveltejs/adapter-static`.)

## Key Experiences
1. **Entry / Auth**
   - Landing screen renders instantly (pre-rendered HTML). “Continue” button triggers Cognito Hosted UI redirect.
   - Callback handled in `/auth/callback` page that exchanges code, stores tokens via Svelte store + `localStorage`, then routes to main page.
2. **Member Lookup & Day-Pass Purchase**
   - Svelte form binds to search input; `on:input` with debounce triggers `/customers/search`.
   - Results list uses reactive statements to show membership + waiver badges.
   - CTA for “Buy day pass” opens embedded Square checkout or hosted checkout link; once completed, UI confirms and surfaces generated code.
3. **Waiver Reminder**
   - Svelte store `waiverStore` manages map `{ customerHash: { signedAt } }`, persisted via `localStorage`.
   - Components reactively show warnings if entry missing or stale.
4. **Check-In Flow**
   - `/checkin` route receives selection via query params or store; uses Svelte transitions to display guest details, guest count buttons, and confirmation dialog.
   - Submission calls `/checkins`, then shows success screen with large icon (similar to v1) but optimized for mobile.
5. **Member & Guest Codes**
   - `/passes` route displays QR + short code for members/day-pass purchasers using the DynamoDB-backed API.
   - Provide “Print”/“Add to Wallet” button hooking into backend pre-signed assets.
6. **Admin Mode**
   - Layout checks Cognito token groups; if `admin`, navigation reveals `/admin` route with stats cards and code revocation controls.

## Local Storage Strategy
- `deviceIdStore`: initializes once (UUID v4) and persists to `localStorage`.
- `waiverStore`: Svelte writable store with `subscribe/persist` helper:
  ```ts
  type WaiverEntry = { customerHash: string; signedAt: string };
  ```
- Use `beforeunload` or explicit `persist()` call after updates to ensure storage sync.

## API Integration Touchpoints
- `POST /customers/search` – debounced calls; show shimmer state via reactive `isLoading`.
- `POST /waiver/hint` – triggered when user acknowledges waiver locally.
- `POST /checkins` – invoked from check-in CTA; handle optimistic UI updates.
- `GET /passes/mine` / `POST /passes/redeem` – for QR/per-code workflows.
- `GET /metrics/daily` – admin overview cards (optional caching via `load`).

## UX & Accessibility
- Svelte transitions (e.g., `fade`, `slide`) for smooth navigation without heavy JS.
- Use CSS clamp + Svelte’s built-in reactivity for responsive layouts (flex/grid).
- Provide accessible form labels, focus outlines, and high-contrast color palette. Support prefers-reduced-motion by disabling transitions when requested.
- Dark mode via `class:dark` toggles using Svelte stores that watch `prefers-color-scheme`.

## Testing Strategy
- Component tests: `@testing-library/svelte` + Vitest.
- End-to-end: Playwright mobile viewport covering search → code display → check-in.
- Lighthouse CI to ensure PWA metrics (TTI < 2s on 4G, <150KB JS).

## Outstanding Decisions
- Determine whether SvelteKit server routes should proxy API calls (for SSR) or client hits API Gateway directly.
- Define exact day-pass checkout UX (embedded vs hosted Square checkout).
- Confirm localization needs and offline caching requirements (SvelteKit + Workbox if needed).


