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
- **Styling**: Tailwind CSS + custom CSS
- **Type System**: TypeScript (strict mode)
- **Animation**: Framer Motion

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

## Architecture

### Routing Structure

The app uses **file-based routing** via TanStack Router. Routes are defined in `src/routes/`:

- `__root.tsx` - Root layout with head content, scripts, and global error handling
- `index.tsx` - Full-screen landing page: the 3D desk (`src/components/desk/`)
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
  - `Desk.tsx` - HUD, keyboard shortcuts and the desk/computer state machine
  - `Shell.tsx` - FUNKIE-DOS, the text-mode shell shown "inside" the monitor. Its Games
    tab runs `public/games/harker-papers/` (The Harker Papers) full screen in an iframe;
    the game posts `{ type: 'harker:exit' }` to quit back to the shell
  - `scene/` - three.js scene (loaded lazily, client only). `ps1.ts` renders at low
    resolution with vertex snapping and a 15-bit dither; textures are drawn on canvases
  - `scene/cat.ts` - Fry, the cat: a procedural rig (blended poses, stretchy legs, tube
    tail) and a small state machine for sleeping, petting, the laser pointer chase,
    walking on the keyboard and knocking the mug off the desk
  - `sound.ts` - WebAudio synth for the desk sounds (off until the visitor turns it on)

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