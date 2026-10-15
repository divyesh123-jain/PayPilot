FROM node:20.17.0-bookworm-slim AS build

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20.17.0-bookworm-slim AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
COPY --from=build /app/backend/package.json /app/backend/package-lock.json ./
COPY --from=build /app/backend/dist ./dist
CMD ["npm", "start"]
