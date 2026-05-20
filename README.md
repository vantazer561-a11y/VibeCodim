# F1 Racing 3D 🏎️

A browser-based 3D Formula 1 racing game built with Three.js.

## Features

- Realistic F1-style race track with elevation changes
- Player-controlled F1 car with keyboard input
- AI opponent cars
- HUD with speedometer, lap counter, timer, position indicator
- Minimap
- Multiple camera views
- Start countdown and race finish screen
- Responsive design

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake |
| A / ← | Steer Left |
| D / → | Steer Right |
| Space | Handbrake |
| C | Change Camera |

## Running

```bash
npx serve .
```

Then open http://localhost:3000 in your browser.

## Tech Stack

- **Three.js** - 3D rendering
- **Vanilla JavaScript** - ES modules
- **HTML/CSS** - UI and HUD

## Architecture

- `src/main.js` - Game initialization, render loop, integration
- `src/track.js` - Track geometry, barriers, environment
- `src/car.js` - Car model, physics, controls, AI
- `src/hud.js` - HUD updates, minimap, race logic
- `src/utils.js` - Shared utilities, configs, math helpers
