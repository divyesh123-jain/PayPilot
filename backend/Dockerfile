FROM node:20.17.0-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json .env.example ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
ENV PAYMENT_MODE=mock
EXPOSE 8080
CMD ["node", "dist/index.js"]
