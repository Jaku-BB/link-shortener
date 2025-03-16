import { Application, Router } from "@oak/oak";
import { query } from "./database.ts";
import base62 from "npm:base62@2.0.2";
const { encode } = base62;

const application = new Application();
const router = new Router();

router.get("/health-check", ({ response }) => {
  response.status = 200;
  response.body = { message: "Have a nice day!" };
});

router.post("/shorten", async ({ request, response }) => {
  const searchParams = request.url.searchParams;

  const link = searchParams.get("link");
  const expirationTime = searchParams.get("expirationTime");

  if (!link || !URL.canParse(link)) {
    response.status = 400;
    return;
  }

  const result = await query<{ next_id: string }>(
    "SELECT nextval('id_sequence') AS next_id",
  );
  const nextId = +result.rows[0].next_id;
  const shortCode = encode(nextId);

  await query<{ id: string }>(
    "INSERT INTO storage (id, short_code, original) VALUES ($1, $2, $3) RETURNING id",
    [nextId, shortCode, link],
  );

  response.status = 201;
  response.body = { shortLink: "http://localhost:1939/" + shortCode };

  console.log(link, expirationTime);
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
