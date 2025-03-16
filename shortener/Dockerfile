FROM denoland/deno:latest

EXPOSE 2137

WORKDIR /app

COPY . .

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]