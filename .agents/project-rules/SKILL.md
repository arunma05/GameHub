---
name: Project Rules
description: Enforces performance, maintainability, security, and premium aesthetics for the GameHub Arcade project.
---

# GameHub Arcade Project Rules

These rules are mandatory for all development tasks in this repository.

## UI/UX & Aesthetics
- **Premium Design**: Every page must feel high-end. Use modern color palettes (Slate, Indigo, Emerald), gradients, and glassmorphism.
- **Glassmorphism**: Use `backdrop-filter: blur(12px)` and semi-transparent backgrounds (`rgba`).
- **Theming**: Support both Light and Dark themes. Use CSS variables defined in `index.css`.
- **Responsiveness**: Mobile-first is a must. The app must work perfectly on any screen size.
- **Micro-animations**: Add hover effects and smooth transitions to interactive elements.

## Tech Stack (Latest)
- **Frontend**: React 19, Vite 8, Tailwind 3.5+, Lucide Icons.
- **Backend**: Express 5, Prisma 7, PostgreSQL (Neon), Socket.io 4.
- **Typing**: Strict TypeScript. No `any`.

## Performance & Security
- **Lazy Loading**: Use code-splitting for heavy routes.
- **Prisma**: Optimize queries; use `include` and `select` sparingly to minimize data transfer.
- **Security**: Validate all websocket events. Sanitize user inputs. Use `.env` for all secrets.

## Maintainability
- **Code Cleanup**: Proactively identify and delete unused files, dead code, and old configuration mocks.
- **Atomic Components**: Keep components small and focused.
- **DRY**: Shared logic goes into custom hooks or utility functions.
- **Documentation**: Use JSDoc for complex logic.
