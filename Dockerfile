# One container: the Node.js API also serves the built React app.

# ---- build the React app ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY web web
RUN npm run build -w web

# ---- runtime ----
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev -w server && npm cache clean --force
COPY server server
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 8080
CMD ["node", "server/src/index.js"]
