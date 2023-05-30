# syntax=docker/dockerfile:1
   
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start:prod"]
EXPOSE 9000