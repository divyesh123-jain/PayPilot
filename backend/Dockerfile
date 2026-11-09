# Build with repo root as context:
#   docker build -f backend/Dockerfile -t paypilot-api .
# On Render: Dockerfile Path = backend/Dockerfile, Docker Context = .

FROM node:20.17.0-bookworm-slim AS build

WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20.17.0-bookworm-slim AS api

WORKDIR /app
ENV NODE_ENV=production
ENV PAYMENT_MODE=mock

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/dist ./dist
RUN npm ci --omit=dev --ignore-scripts

EXPOSE 8080
CMD ["npm", "start"]
