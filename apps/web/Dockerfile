FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.4.1

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_STRIPE_PUBLIC_KEY=$NEXT_PUBLIC_STRIPE_PUBLIC_KEY

COPY package*.json ./
RUN pnpm install 

COPY . .
RUN npm run build || (echo "Build failed" && exit 1)


FROM node:20-alpine AS runtime
RUN apk add curl

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN rm -rf .next/cache

EXPOSE 3000

CMD ["node", "server.js"]