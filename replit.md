# Project Paw-Patrol: AI Safety Lab

## Overview

This is an educational web application called "Project Paw-Patrol" designed for middle school classroom activities. Students act as "Trust & Safety Engineers" and write moderation rules (prompts) that are tested against 10 predefined content scenarios. The application uses OpenAI's API to classify content based on student-written instructions and displays results showing how well their rules performed.

The app evaluates content using three labels: ✅ Allowed, 🚫 Prohibited, and ⚠️ Disturbing, comparing AI responses against expected classifications for scenarios involving dog-related content.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Styling**: Tailwind CSS with a comprehensive shadcn/ui component library
- **State Management**: Zustand for client-side state (game states, audio controls)
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: Full shadcn/ui component suite (buttons, cards, dialogs, forms, etc.)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Structure**: RESTful endpoints under `/api` prefix
- **Key Endpoints**:
  - `GET /api/scenarios` - Returns the 10 test scenarios
  - `POST /api/run-test` - Accepts moderation instructions and returns classification results

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for backend
- **Production**: Custom build script using esbuild for server bundling, Vite for client
- **Output**: Compiled to `dist/` directory with server as CommonJS bundle

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Stored in `migrations/` directory
- **Current Schema**: Basic users table (id, username, password)
- **Note**: Database is configured but minimally used for this educational app

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── lib/           # Utilities and stores
│   │   └── App.tsx        # Main application component
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   └── storage.ts    # Data storage abstraction
├── shared/           # Shared code between client/server
│   └── schema.ts     # Database schema definitions
```

## External Dependencies

### AI Integration
- **OpenAI API**: Used for content classification via `openai` npm package
- **API Key**: Requires `OPENAI_API_KEY` environment variable/secret

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **connect-pg-simple**: Session storage for PostgreSQL

### Key Frontend Libraries
- **@radix-ui/***: Headless UI primitives for accessible components
- **@react-three/fiber, drei, postprocessing**: 3D graphics capabilities (likely unused for this app)
- **lucide-react**: Icon library
- **class-variance-authority, clsx, tailwind-merge**: Styling utilities

### Key Backend Libraries
- **drizzle-orm, drizzle-kit**: Database ORM and migrations
- **express-session**: Session management
- **zod**: Schema validation