# syntax=docker/dockerfile:1
   
FROM node:16-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start:prod"]
EXPOSE 9000