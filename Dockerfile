# Burger 2324 — imagen para Railway / Render / Fly.io / cualquier VPS con Docker
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# La base de datos y las fotos subidas viven en DATA_DIR: montar ahí un volumen persistente.
ENV DATA_DIR=/data
ENV PORT=3000
RUN mkdir -p /data/uploads

EXPOSE 3000
CMD ["npm", "start"]
