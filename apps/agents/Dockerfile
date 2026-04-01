# Use Node 20 slim image
FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy entire repo (Railway should copy from git root)
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the agent package
RUN pnpm --filter @casamadi/agents build

# Set NODE_ENV
ENV NODE_ENV=production

# Expose port
EXPOSE 5001

# Start the agent
CMD ["pnpm", "--filter", "@casamadi/agents", "start"]
