# SPEED R3 overlay
Apply over INFINITE_R1 or SPEED_R2 in the existing smd-public folder. No new route/page or image replacement.

Cruise 193.2 CSS px/s: 60% reduction from 483. Pointer entry decelerates from current velocity to zero over 600ms using the baked quintic velocity curve. At full cruise this travels 57.96px before stopping. It preserves current flow; no photo-center/index snapping. Pointer movement while inside does not restart the film. Exit resumes from the stopped phase over 1400ms. Pause/play button and manual pause state removed. Hidden/reduced-motion suspension retained.

Original aspect ratio, Y-grid height, zero horizontal gap and image order remain.

Stop dev server, overwrite matching files, run npm run dev -- --host 127.0.0.1 --port 3000.
Typecheck/build PASS; 24 model/static tests PASS. Browser behavior/visual seam/fatigue NOT verified. Run scripts/verify-hero-film-browser.mjs in a browser-equipped environment for pointer stop/resume and no-button verification.
