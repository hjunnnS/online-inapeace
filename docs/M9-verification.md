# M9 verification · 2026-11-04

Tracking: milestone M9; Epic #38 / implementation #59 (I050); Epic #37 / #60 (I051) and #61 (I052). Direct implementation approval came from the user's current request. No target date was assigned.

## Changes

- Twenty virtual worshippers: twelve seated and eight standing; exactly ten wear the existing lace veil. Seat indices are distributed without duplicates, and player seating continues to exclude occupied positions. Choir members remain separate.
- One hundred tree bulbs now have independent phase-based brightness and soft additive halos. A single Points draw renders all halos; the bulbs retain instanced rendering.
- Twelve existing pillar candle brackets have flame and halo overlays, with distinct flicker phases. No twelve-light real-time lighting expansion was added.
- Window and floor glass colors are 22% less saturated, with up to 5.5% light-color mixing. Dark leadwork is preserved. Original bitmap artwork is unchanged; adjustment happens in the material shader for diffuse/emissive maps.
- Reduced motion freezes tree brightness and flame/halo animation. Night retains these light sources while sunlight effects follow the existing preset.

## Verification

TypeScript/Vite build and six existing tests pass. The existing Three.js bundle-size warning remains. Actual Chromium screenshots and visible QA output confirmed 20 worshippers, 10 veiled worshippers, 12 wall candles, and the tree. The material shader compiled without browser warnings or errors. Tree/nearby wall candles were inspected at the tree viewpoint in day/night and reduced-motion modes; the close-up glass viewpoint showed the softened colors with the original fine lines intact. Music played with advancing time. Seating reached an empty chair and quiet view could be entered/exited.

Candle pickup/placement, confessional pause/resume and input deletion also passed. Three Paris/Bariloche round trips returned to the same 53 geometries / 2 textures in Paris and 570 / 42 in Bariloche, with all M9 counters resetting/restoring correctly. No browser error/warning was logged.

This is a functional and visual regression check on the current machine, not a new Windows/Iris Xe performance benchmark. Other nine cathedrals retain their previous design. No real visitor presence is implied.
