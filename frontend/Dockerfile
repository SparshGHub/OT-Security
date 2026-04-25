# Stage 1: Build the monorepo frontend
FROM node:18-alpine AS builder

# Set working directory to the root of the monorepo
WORKDIR /app

# Copy root + workspace manifests so npm can resolve workspaces properly
COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all deps for the whole monorepo (resolves workspaces)
RUN npm install

# Copy the rest of the repo
COPY . .

# Ensure a public dir exists even if the repo doesn't have one
RUN mkdir -p frontend/public

# Build-time public env for the frontend
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the frontend workspace
RUN npm run build --workspace=frontend


# Stage 2: Runtime image for the frontend
FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Use the frontend's package.json and install ONLY its prod deps (ensures `next` exists)
COPY --from=builder /app/frontend/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

# Copy built artifacts and (now-always-present) public dir
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public

EXPOSE 3000
CMD ["npm", "start"]

