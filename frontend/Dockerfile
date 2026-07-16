FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public

EXPOSE 4173

CMD ["npm", "run", "dev"]
