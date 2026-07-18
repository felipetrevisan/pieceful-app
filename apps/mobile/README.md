# Pieceful Mobile

Native Pieceful client built with Expo Router, React Native, NativeWind, Gesture Handler and Reanimated.

## Run locally

From the monorepo root:

```bash
bun install
bun run --cwd apps/mobile ios
```

Use `android` or `web` in place of `ios` for the other targets.

## Structure

- `src/app`: English application routes and tab navigation.
- `src/components/native-puzzle-board.tsx`: native puzzle gestures, snapping, rotation and zoom.
- `src/state/app-provider.tsx`: local offline persistence and preferences.
- `@puzzled/puzzle-engine`: shared puzzle topology and session types.
