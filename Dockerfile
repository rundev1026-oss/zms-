FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY AGENTS.md ./

RUN npm install

COPY public ./public
COPY src ./src

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"]

