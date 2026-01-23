# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/contracts/package.json ./packages/contracts/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma client and build
WORKDIR /app
RUN pnpm --filter @aurora/db db:generate
RUN pnpm --filter @aurora/api build

# Production stage
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install pnpm and tsx (for TypeScript runtime)
RUN npm install -g pnpm@8.15.0 tsx

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/contracts/package.json ./packages/contracts/

# Install all dependencies (needed for monorepo)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema
COPY packages/db/prisma ./packages/db/prisma

# Generate Prisma client
RUN pnpm --filter @aurora/db db:generate

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy packages source (NestJS doesn't bundle workspace packages)
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/contracts ./packages/contracts

# Set environment
ENV NODE_ENV=production
ENV PORT=3005

WORKDIR /app/apps/api

EXPOSE 3005

# Use tsx to handle TypeScript imports from packages
CMD ["tsx", "dist/main.js"]
