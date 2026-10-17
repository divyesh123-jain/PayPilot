FROM node:20.17.0-bookworm-slim AS api-build

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20.17.0-bookworm-slim AS api
WORKDIR /app/backend
ENV NODE_ENV=production PAYMENT_MODE=mock
COPY --from=api-build /app/backend/package.json /app/backend/package-lock.json ./
COPY --from=api-build /app/backend/dist ./dist
EXPOSE 8080
CMD ["npm", "start"]

FROM node:20.17.0-bookworm-slim AS web-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

FROM web-deps AS web-build
ARG NEXT_PUBLIC_PAYPILOT_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_PAYPILOT_API_URL=$NEXT_PUBLIC_PAYPILOT_API_URL
COPY frontend ./
RUN npm run build

FROM node:20.17.0-bookworm-slim AS web
WORKDIR /app/frontend
ENV NODE_ENV=production
COPY --from=web-build /app/frontend/package.json /app/frontend/package-lock.json ./
COPY --from=web-build /app/frontend/.next ./.next
EXPOSE 3000
CMD ["npm", "start"]
