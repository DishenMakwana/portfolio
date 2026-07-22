# Multi-stage build for production
FROM node:22-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.lock
COPY package*.json package-lock.lock* ./

# Install dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ENV NODE_ENV=production

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

# Set the working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
# COPY --from=builder /app/public ./public

# copy next config.ts if it exists
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expose the port the app runs on
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
