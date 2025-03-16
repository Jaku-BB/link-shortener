FROM denoland/deno:latest

EXPOSE 1939

WORKDIR /app

COPY . .

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]