# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all workspace package.json files
COPY apps/ui/package.json ./apps/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/contracts/package.json ./packages/contracts/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY apps/ui ./apps/ui
COPY packages ./packages

# Build UI
WORKDIR /app/apps/ui
RUN pnpm build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/apps/ui/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/ui/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
