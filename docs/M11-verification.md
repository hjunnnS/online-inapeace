# M11 roaming visitors · 2026-11-04

Milestone11 / Epic #38 / implementation #63 (I054). The user requested three additional people moving between seating, the choir front and the confessional.

## Behavior

The existing20 worshippers remain. Three additional local visitors bring the nave total to23, excluding the choir. They have distinct clothing, staggered waits, walking limbs and seated poses. Each repeats seat → choir front → seat → confessional entrance → seat. The confessional stop is outside the private room, with separate valid floor positions in front of the booth. Three home seats are reserved and excluded from player seating.

Navigation reuses the existing grid route planner from each visitor's own position. Static standing people are included as obstacles. Visitors pause near the player or one another, and retry a route around nearby people after a delay. They do not push the player or enter/read the reflection room. Menus, other activity views and reduced-motion mode pause background movement.

## Validation

TypeScript/Vite production build and six existing rhythm/resource/shuffle tests pass. The existing large Three.js bundle warning remains. Actual browser controls and visible QA status are used to observe positions, destinations and completed arrivals. The default UI distinguishes20 worshippers from3 roaming visitors; the QA output additionally shows23 total.

All three visitors completed both visits and returned to their own seats. A later snapshot showed completed-arrival counts6/5/4, so each had finished at least one full four-stop cycle. Reduced-motion snapshots showed identical positions. Player seating remained available outside reserved homes. Confessional entry paused background music and left the visitors outside; a non-sensitive test sentence was cleared on cancel. Two Paris/Bariloche round trips reset/restored visitor totals0/23 and moving counts0/3; geometry/texture counts matched across iterations (52/1 and591/42 in those views). No browser warnings/errors were recorded.

No multiplayer, actual user presence or human-like decision making is claimed. These are deterministic local activity loops, with simple waiting and rerouting rather than a crowd simulation.
