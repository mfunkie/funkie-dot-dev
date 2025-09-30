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
pnpm install

# Start development server on port 3000
pnpm dev

# Build for production (runs TypeScript check after build)
pnpm build

# Start production server
pnpm start
```

## Architecture

### Routing Structure

The app uses **file-based routing** via TanStack Router. Routes are defined in `src/routes/`:

- `__root.tsx` - Root layout with head content, scripts, and global error handling
- `index.tsx` - Home page with bio
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