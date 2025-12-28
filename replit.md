# AI Learning Lab

## Overview

This is an educational web application platform called "AI Learning Lab" designed for middle school classroom activities. The platform hosts multiple educational games teaching AI concepts:

### Games Available:
1. **Precision & Recall Game** - Internal game at /precision-recall teaching ML evaluation metrics through interactive animal classification (5 rounds, client-side Zustand store)
2. **Prompt 101: AI Safety Lab** - Students act as "Trust & Safety Engineers" writing moderation prompts tested against 10 dog-related content scenarios
3. **PRD Generator** - Tool that transforms student app ideas into Replit-optimized PRDs using Claude AI

### Routes:
- `/` - Homepage with game selection
- `/precision-recall` - Precision & Recall game (client-side)
- `/safety-lab` - Prompt 101: AI Safety Lab game
- `/prd-generator` - PRD Generator tool
- `/teacher` - Teacher Dashboard (password protected)

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
  - `POST /api/generate-prd` - Generates PRD from student app idea using Claude AI (rate limited: 5/day per IP)
  - `GET/PUT /api/teacher/prompt-template` - Manage AI prompt template
  - `GET/POST/PUT/DELETE /api/teacher/scenarios` - Manage test scenarios
  - `POST /api/verify-teacher` - Authenticate teacher access

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
- **Anthropic API**: Used for PRD generation via `@anthropic-ai/sdk` npm package
- **API Keys**: Requires `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` environment secrets

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