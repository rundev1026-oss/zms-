FROM node:22-alpine AS builder

WORKDIR /app

# Copy shared package and build it
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared/tsconfig*.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src/
RUN cd packages/shared && npm install && npm run build

# Copy api package
COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

WORKDIR /app/apps/api
RUN npm install
RUN npx prisma generate

COPY apps/api/src ./src/
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app/apps/api

ENV NODE_ENV=production

COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/main.js"]

