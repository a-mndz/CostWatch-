FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app

ARG JWT_SECRET
RUN if [ -z "$JWT_SECRET" ]; then echo "ERROR: JWT_SECRET is required"; exit 1; fi
RUN if [ ${#JWT_SECRET} -lt 32 ]; then echo "ERROR: JWT_SECRET must be >= 32 characters"; exit 1; fi

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV JWT_SECRET=${JWT_SECRET}
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/sample-data.csv ./

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
