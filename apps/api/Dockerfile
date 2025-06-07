FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm install

COPY . .
RUN npm run build


FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

RUN rm -rf /app/node_modules/.cache /app/.git /app/tmp /app/.npm

EXPOSE 4001

CMD ["node", "dist/index.js"]
