import { Application, Router } from "@oak/oak";
import { query, incrementCounter } from "./database.ts";
import base62 from "npm:base62@2.0.2";
const { encode } = base62;

const application = new Application();
const router = new Router();

router.get("/health-check", ({ response }) => {
  response.status = 200;
  response.body = { message: "Have a nice day!" };
});

router.post("/shorten", async ({ request, response }) => {
  try {
    const searchParams = request.url.searchParams;

    const link = searchParams.get("link");

    if (!link || !URL.canParse(link)) {
      response.status = 400;
      return;
    }

    let nextId;
    try {
      nextId = await incrementCounter('id_sequence', 1);
    } catch (error) {
      console.error("Error in /shorten:", error);
      nextId = Date.now();
    }
    
    const shortCode = encode(Number(nextId));

    try {
      await query(
        "INSERT INTO storage (id, short_code, original_url, created_at) VALUES (?, ?, ?, ?)",
        [crypto.randomUUID(), shortCode, link, new Date()],
      );
    } catch (error) {
      console.error("Error in /shorten:", error);
      response.status = 500;
      response.body = { error: "Failed to create short URL" };
      return;
    }

    response.status = 201;
    response.body = { shortLink: "http://localhost:1939/" + shortCode };
  } catch (error) {
    console.error("Error in /shorten:", error);
    response.status = 500;
    response.body = { error: "Internal server error" };
  }
});

application.use(async ({ request, response }, next) => {
  await next();

  const method = request.method;
  const route = request.url.toString().replace(request.url.origin, "");
  const responseStatus = response.status;

  console.log(responseStatus + " " + method + " " + route);
});

application.use(router.routes());
application.use(router.allowedMethods());

application.listen({ port: 2137 });
