# Dockerfile for @casamadi/agents
# This service is in a monorepo. The Dockerfile is in apps/agents/
# but needs to build from the repo root context.

FROM node:20-slim

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy the entire monorepo (Railway provides full repo as build context)
COPY . .

# Install all dependencies using pnpm from repo root
# Use --no-frozen-lockfile for Railway (service root is apps/agents, so pnpm-lock.yaml not directly available)
RUN pnpm install --no-frozen-lockfile

# Build only the agent package
RUN pnpm --filter @casamadi/agents build

# Set production environment
ENV NODE_ENV=production

# Expose port (Railway will override via PORT env var)
EXPOSE 5001

# Start the agent from the compiled output
CMD ["node", "apps/agents/dist/index.js"]
