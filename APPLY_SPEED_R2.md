# SPEED R2 overlay

Parent: SMD_ACA_PU_INFINITE_R1.zip. Extract overlay contents directly into the existing smd-public folder containing package.json, overwriting matching paths. No new page or route. Images are unchanged and not included.

Close dev server with Ctrl+C, apply files, then run:
```powershell
$env:NUXT_PUBLIC_CONTENT_MODE = "standalone"
npm run typecheck
npm run build
npm run dev -- --host 127.0.0.1 --port 3000
```

483 CSS px/s cruise; 1100ms startup, 950ms deceleration to 347.76 on pointer entry, pointer-speed bands 347.76 / 410.55 / 483, 1400ms recovery on exit. No per-photo easing/stop. Quintic smoothstep velocity integrated to 97 position samples at build time. Finite segment keyframes reuse the same Animation object, then continuous linear cruise. No runtime ODE or perpetual JS frame loop.

Manual picture switching/click locking removed. Mobile touch temporarily yields to native scroll and resumes after scroll quiet. Explicit pause, hidden page and reduced-motion policy retained. Focus is CSS-only in the active component: the former identity GPU overlay and chunk requests are disconnected, not deleted. Source pixel ratio/Y sizing, zero gap and image ordering unchanged.

24 tests pass, including actual component script executed against a mock WAAPI instance. This proves only model behavior; real browser continuity, touch inertia, visual seams and fatigue are NOT verified on this host. Existing browser verification script can run on a machine with Playwright/Chromium. This is a tuning candidate, not a scientifically validated comfortable speed.
