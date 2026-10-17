# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal website built with **TanStack Start** (full-stack React framework) and **TanStack Router**. It serves as a UI playground for experimenting with different web technologies. The site includes:

- Personal bio and contact information
- Color tools page
- Movies search feature using the OMDB API
- Bookmarklet utilities
- Various other experimental tools

## Technology Stack

- **Framework**: TanStack Start (React-based full-stack framework)
- **Router**: TanStack Router with file-based routing
- **Build Tool**: Vite
- **UI Library**: React 19
- **Styling**: CSS Modules + global CSS (`src/styles/app.css`)
- **Type System**: TypeScript (strict mode)
- **3D**: three.js (the desk scene)

## Development Commands

```sh
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production (runs TypeScript check after build)
npm run build

# Start production server
npm start
```

## Git Workflow

Never commit or push directly to `main`. Netlify deploys `main` to the live site, so
anything pushed there ships immediately.

- Do the work on a feature branch (e.g. `fix/franken-stage-7`), push it, and open a
  pull request against `main`.
- Netlify builds a deploy preview for every pull request. Point to it in the PR so
  changes can be played and checked on the preview before merging.
- Leave the merge to the repo owner unless they say otherwise.

## Architecture

### Routing Structure

The app uses **file-based routing** via TanStack Router. Routes are defined in `src/routes/`:

- `__root.tsx` - Root layout with head content, scripts, and global error handling
- `_desk.tsx` - Pathless layout holding the full-screen 3D desk (`src/components/desk/`).
  Because the desk stays mounted, moving between its child URLs animates instead of
  reloading (Back/Forward zoom in and out of the monitor)
- `_desk/index.tsx` - `/`, the desk
- `_desk/computer.$.tsx` - `/computer/*`, the computer. The splat is parsed by
  `src/components/desk/route.ts` (`parseDeskPath`/`deskPath`), which is the URL scheme:
  `/computer` (About), `/computer/work[/<jobId>]`, `/computer/tools`, `/computer/games`,
  `/computer/links`, `/computer/games/<harker|frankenstein|gatsby>[/<game path>]`. The game path
  is the game's own hash route (see Games). Tabs and job picks replace history; running
  a game and entering/leaving the computer push
- `_content.tsx` - Pathless layout that wraps regular pages in the centered `.layout` column
- `_content/resume.tsx` - Resume page, rendered from `src/data/profile.ts`
- `_content/tools.tsx` - Tools page
- `_content/games.tsx` - Games page (links to the static games in `public/games/`)
- `movies.tsx` - Movie search layout (with loader for OMDB API)
- `movies/$id.tsx` - Individual movie details page
- `colors.tsx` - Color tools page
- `tools.tsx` - General tools page
- `bookmarklet.tsx` - Bookmarklet page

### Key Files

- `src/router.tsx` - Router configuration with default error/not-found components
- `src/server.ts` - Custom server entry point using TanStack Start server handler
- `src/start.tsx` - Client entry point
- `vite.config.ts` - Vite configuration with TanStack Start plugin

### Component Structure

Reusable components in `src/components/`:
- `DefaultCatchBoundary.tsx` - Error boundary component
- `NotFound.tsx` - 404 page component
- `Title.tsx` - Title component with navigation
- `Nav.tsx` - Navigation component
- `MovieHeader.tsx` - Header for movie search page
- `IntersectionObserver.tsx` - Intersection observer utility component
- `desk/` - The landing page
  - `Desk.tsx` - HUD, keyboard shortcuts and the desk/computer state machine, driven by
    the URL (it zooms in or out to match the route)
  - `route.ts` - The desk URL model and `PROGRAMS` (the games the shell can run)
  - `Shell.tsx` - FUNKIE-DOS, the text-mode shell shown "inside" the monitor. Controlled
    by the route: it renders `route` and asks to change it via `onNavigate`. Its Games
    tab runs the static games in `public/games/` full screen in an iframe; each game
    posts `{ type: '<name>:exit' }` (`harker:exit`, `franken:exit`, `gatsby:exit`) to quit back to the
    shell and `{ type: '<name>:route', path }` when its hash route changes, which the
    shell mirrors into `/computer/games/<program>/<path>`
  - `scene/` - three.js scene (loaded lazily, client only). `ps1.ts` renders at low
    resolution with vertex snapping and a 15-bit dither; textures are drawn on canvases
  - `scene/cat.ts` - Fry, the cat: a procedural rig (blended poses, stretchy legs, tube
    tail) and a small state machine for sleeping, petting, the laser pointer chase,
    walking on the keyboard and knocking the mug off the desk
  - `sound.ts` - WebAudio synth for the desk sounds (off until the visitor turns it on)

### Games

Static, build-free vanilla JS in `public/games/`, linked from `/games`:

- `harker-papers/` - The Harker Papers, a point-and-click adventure (Dracula).
- `frankenstein/` - FRANKEN.EXE, an NES-style platformer. 256x224 canvas, NES palette
  only. `core.js` (physics, tile kinds, level compiler), `maps.js` and `stages.js` are
  DOM-free so stages can be checked in node. Art is palette-indexed character grids
  (`art-*.js`), compiled to canvases at boot by `gfx.js`; `game.js` is the state machine
  and renderer, `ents.js`/`bosses.js` the entities, `cine.js` the story, `audio.js` the
  WebAudio chiptune synth. `?debug&stage=4` jumps to a stage; `?embed` hides the site
  link and makes Esc/Quit post `franken:exit`.

- `gatsby/` - GATSBY.EXE, The Great Gatsby as an NES-style platformer, built the same way
  as FRANKEN.EXE but its own code (namespace `GG`, not shared with FK): 256x224, NES
  palette, palette-indexed art grids. `core.js` (physics incl. wall-kicks for the Gatz
  heroes and a sideways `push` for currents and fans, tile kinds, level compiler),
  `maps.js` and `stages.js` are DOM-free so stages can be checked in node; `maps.js` is
  generated (with `GG.MAPINFO`: arena columns, room backdrops, the green light's stops).
  `ents.js` has the shared entities, `foes.js` the per-stage ones (ponies, ash-grey men,
  the train, Gatsby's car, falling shirts, boats, the green light), `bosses.js` Eckleburg,
  Wolfsheim and Tom. Art: `art-heroes.js` (Nick, Jimmy, Gatsby, the Major, one body set
  recolored), `art-foes.js`, `art-props.js`, `art-tiles.js`, `art-bg.js` (parallax
  backgrounds and `GG.ROOMS` interiors), `art-bosses.js` (the billboard, train, fans),
  `art-cine.js`/`art-logo.js`; `cine.js` is the story, title and ending; `audio.js` the
  same 2A03-style synth as FRANKEN.EXE with its own tracks. `?debug&stage=4-1` jumps to a
  stage; `?embed` hides the site link and makes Esc/Quit post `gatsby:exit`.

All three games keep a hash route so they can be linked to directly, standalone or on
the computer: Frankenstein and Gatsby `#/stage/<key>` (e.g. `#/stage/5`, `#/stage/8-1`,
`#/stage/4-1`), `#/select` and `#/story/<scene id>`; Harker `#/chapter/<n>`. They update
it with `replaceState`, follow `hashchange`, and when embedded post `<name>:route` so the
site URL follows.

### Data

`src/data/profile.ts` holds the resume (jobs, links, education) as typed data. The
resume page, the shell and the floppy disks on the desk all read from it, so update
jobs there.

### Fonts

`public/fonts/funkie-dos.woff2` is generated from the Modern DOS 8x16 bitmaps (CC0) by
`scripts/build-dos-font.py`. Use it at multiples of 16px so it stays pixel-crisp.

### Path Aliases

Use `~/` as an alias for `./src/` (configured in `tsconfig.json` and `vite.config.ts`)

```typescript
import { Component } from '~/components/Component'
```

### Environment Variables

- `VITE_OMDB_API_KEY` - API key for OMDB movie database (used in movies feature)

### SSR Configuration

The app supports Server-Side Rendering (SSR) with:
- Default preloading strategy: `'intent'` (preload on hover)
- Scroll restoration enabled
- CSP nonce support via `getGlobalStartContext()`

## Build Output

Production builds output to `.output/server/index.mjs` which is run via Node.js.