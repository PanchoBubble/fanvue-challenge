FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

EXPOSE 3001

CMD ["sh", "-c", "npm run build && npm run migration:run && npm run seed && npm run dev"]
