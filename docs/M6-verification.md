# M6 verification

Date: 2026-11-04. Scope: Bariloche, implementation issues #39–#46.

- TypeScript and Vite production build passed.
- In-app Chromium, 1280 × 720, local Vite preview on macOS.
- Veil animation completed and veil persisted when holding a taper.
- Taper pickup followed existing walk route. Placing it cleared the hand and left one taper on the stand. Repeated controls are disabled during ceremonies.
- New stone/wood textures, linen altar cloth, six altar candles, candle corner and projected stained-glass patches were inspected in the rendered scene. Textures and meshes were created for this project.
- A draft entered in the confessional was empty immediately after release. Abstract particles were shown without the draft, with an upward camera movement and a return to walking. The original privacy behavior is retained.
- Fixed a camera crossing the confessional wall during the release sequence. Rechecked the visible sequence in the nave.
- Reduced-motion preference, night preset, sitting, quiet view and Escape restoration worked.
- All ten cathedral selections loaded through the catalog and returned the expected scene ID.
- Observed rolling frame interval around 8.3–10.5 ms on this preview. This is device-specific, rather than a guarantee for other devices.

Further combined M6/M7 checks, additional browser coverage and listening review belong to #53. User atmosphere acceptance is separate from functional verification.
