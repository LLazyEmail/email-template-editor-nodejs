### Running in Docker

Production build and run:

```
docker build -t email-template-editor-nodejs-v-0-0-2 .
docker run -dp 9000:9000 email-template-editor-nodejs-v-0-0-2
```

Development (without buiding image container): 

```
docker run -dp 9000:9000 \
    -w /app --mount type=bind,src="$(pwd)",target=/app \
    node:18-alpine \
    sh -c "npm install && npm run start:dev"
```

Running using docker compose for development:

```
docker compose up -d
docker compose logs -f
```
