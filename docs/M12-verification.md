# M12 character and seating revision · 2026-11-04

Milestone12: implementation #64 (five character patterns), #65 (walking/seating), #66 (rear entrance), #67 (integration); Epics #38 and #37. The user explicitly approved implementation.

## Model and movement

Five body/clothing patterns are randomized through shuffled five-item bags: jacket, vest, long coat, dress, knitwear. Sculpted torso profiles, shirt/collar/lapel/belt/button details, facial features, hair, hands and shoes replace the earlier uniform cylindrical body. Rigid parts sharing a material are merged to limit draw calls. Player, worshippers, moving visitors and choir use the new models.

The body now has separate shoulder/elbow/hip/knee/foot joints. A shared pose controller blends walking, standing and sitting; it does not compress the standing body to fake seating. The seated pelvis bottom is approximately0.580m above the floor, matching the0.575m bench surface. Thighs point forward, knees bend, feet stay near the floor, and the rig moves0.70m behind the walkable approach marker onto the seat. The user walking speed is calmer (2.2m/s keyboard, 2.4m/s routed movement). Long-garment models use a separate lap drape when seated, and a held candle cancels the hand rotation to remain upright. Walking has speed-based gait, arm counter-swing, knee flexion and small torso movement. Turns blend smoothly. A corner-stalling regression was corrected by reaching each route waypoint more precisely before turning. Leaving a chair includes a short rise before translation. Reduced motion keeps the existing simplified behavior.

## Entrance

A roughly5m wide / 6.65m high oak double entrance with a triple stone arch, fanlight, bronze trim, iron straps, rivets and ring handles is placed on the rear wall beside the tree. A dedicated viewpoint is available. This is an architectural prop, not a new external scene or login/exit flow.

## Validation

TypeScript/Vite production build and eight tests pass. Two added regressions construct all five real models with a CPU-only canvas stub and verify pelvic contact, forward knees, near-floor soles, standing soles and gradual unscaled seating. The six existing rhythm/resource/shuffle tests remain green. The existing Three.js bundle-size warning remains.

Actual browser screenshots and visible QA output were used for model distribution, seating and entrance inspection. One random sample showed all five patterns among the23 nave people. Player seating converged to hip height0.685m, seat offset0.70m and bent knee joints; close/side views showed seated bodies above the bench rather than standing on it. The entrance viewpoint showed the complete arched double door. Candle pickup and upright holding, sitting with the candle, veil compatibility, quiet viewing, front-photo capture and choir conducting startup/cancellation were exercised. Confessional input was cleared on cancellation and music paused/resumed around the private room. These remain stylized procedural characters, not motion-captured photorealistic people. No new Windows/Iris Xe benchmark is claimed.

After the corner correction, all three moving visitors finished a full choir/seat/confessional/seat cycle; a later snapshot showed arrival counts6/5/4. Reduced-motion snapshots had identical visitor positions. Two Paris/Bariloche round trips reset/restored the23 people and all five patterns. Paris returned to66 geometries/1 texture on both iterations; Bariloche returned to1113/42 in the tested views despite a different randomized clothing distribution. No browser warnings/errors were logged. Counts are view and outfit dependent.
