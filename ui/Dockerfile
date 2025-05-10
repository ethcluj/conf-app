# Dockerfile for Next.js UI app
FROM node:22.15.0-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22.15.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3000
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE $PORT
ENV HOSTNAME=0.0.0.0
CMD ["yarn", "start"]
