# Stage 1: Build the backend
FROM node:20-alpine AS builder

# Set working directory inside container
WORKDIR /backend

# Copy dependency manifests
COPY package.json tsconfig.json ./

# Install dependencies (use npm install because no package-lock.json)
RUN npm install

# Copy backend source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS runner

WORKDIR /backend

# Copy compiled dist and package manifest
COPY --from=builder /backend/dist ./dist
COPY --from=builder /backend/package.json ./

# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts

# Expose the backend port
EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

# Start the backend
CMD ["npm", "start"]

