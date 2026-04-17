# Block Tattoo Studio — Backend API

A production-ready REST API backend for a tattoo studio, built with NestJS and TypeScript. Handles the full client journey from online booking intake through consultation, scheduling, and in-studio session management.

## Features

- **Two-step booking flow** — Clients submit an intake form; the studio reviews it, schedules a consultation, then assigns a tattoo session. Each stage has its own status lifecycle (`PENDING_CONSULT` → `CONSULT_APPROVED` → `TATTOO_SCHEDULED` → `COMPLETED`).
- **Secure booking links** — Scoped, time-limited token links allow clients to upload reference images or continue their intake without requiring an account.
- **Artist management** — Artist profiles with portfolios (works), availability, and assignment roles (primary, secondary, assistant, guest).
- **Guest artist system** — External artists can book studio stations by the day or week, with automatic pricing and discount calculation.
- **AI chat widget** — AI-powered chat assistant via the Anthropic SDK (Claude) for visitor enquiries.
- **Studio stations** — Station/room management with assignment tracking per booking.
- **Scheduling** — Consult slots with max capacity, tattoo session scheduling with duration tracking.
- **In-studio forms** — Medical declaration and consent forms collected at the studio, linked to the booking with admin audit trail.
- **Media uploads** — Reference images and artwork stored via Cloudinary.
- **Email notifications** — Transactional emails via Resend.
- **Google Reviews integration** — Fetch and cache Google review data.
- **Articles / blog** — Draft and published articles authored by admin users.
- **Admin user system** — Separate admin auth with JWT, full audit trail on booking reviews and form submissions.
- **Redis caching** — Response caching with `@nestjs/cache-manager` + Keyv Redis adapter.
- **Swagger API docs** — Auto-generated OpenAPI documentation at `/api`.
- **Rate limiting** — Request throttling via `@nestjs/throttler`.
- **Health check** — `/health` endpoint for uptime monitoring.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 (Node.js) |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Auth | JWT + Passport (`passport-jwt`) |
| Password hashing | Argon2 / bcrypt |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| File storage | Cloudinary |
| Email | Resend |
| Caching | Redis (`@keyv/redis` + `cache-manager-redis-yet`) |
| Validation | `class-validator` + `class-transformer` |
| Config validation | Joi |
| Date handling | Luxon |
| API docs | Swagger (`@nestjs/swagger`) |
| Rate limiting | `@nestjs/throttler` |
| Containerisation | Docker |

## Project Structure

```
src/
├── admin-users/           # Admin authentication and user management
├── artists/               # Artist profiles and portfolio works
├── articles/              # Blog/news articles (draft/published)
├── auth/                  # JWT auth, guards, strategies
├── booking-assignments/   # Assign artists + stations to bookings
├── booking-links/         # Scoped token links for client uploads/intake
├── bookings/              # Core booking lifecycle and intake form
├── chat/                  # AI chat widget (Anthropic SDK)
├── common/                # Shared pipes, filters, interceptors
├── config/                # Environment config with Joi validation
├── email/                 # Transactional email service (Resend)
├── google-reviews/        # Google Reviews API integration
├── guest-artist-bookings/ # Station rental for visiting artists
├── health/                # Health check endpoint
├── media/                 # Cloudinary file upload service
├── prisma/                # PrismaService (injectable DB client)
├── scheduling/            # Consult slots + tattoo session scheduling
├── station-config/        # Pricing config for guest artist stations
├── studio-stations/       # Studio room/station management
└── works/                 # Artist portfolio work entries
prisma/
├── schema.prisma          # Full database schema
└── migrations/            # Prisma migration history
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- Cloudinary account
- Resend account (for email)
- Anthropic API key (for AI chat)

### Installation

```bash
git clone https://github.com/kiarash-f/block-tattoo-studio.git
cd block-tattoo-studio
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/block_tattoo

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

REDIS_URL=redis://localhost:6379

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

ANTHROPIC_API_KEY=your_anthropic_api_key

NODE_ENV=development
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to browse data
npx prisma studio
```

### Running the Server

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

- API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/api`

### Running Tests

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## License

UNLICENSED — private project.
