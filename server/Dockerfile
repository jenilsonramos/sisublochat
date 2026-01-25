FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install build dependencies for native modules (better-sqlite3 checks) on Alpine
RUN apk add --no-cache python3 make g++

RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
