import { Application, Router } from "@oak/oak";
import { query } from "./database.ts";

const application = new Application();
const router = new Router();

router.get("/health-check", ({ response }) => {
  response.status = 200;
  response.body = { message: "Have a nice day!" };
});

router.get("/:short_code", async ({ response, params }) => {
  const shortCode = params.short_code;

  const result = await query<{original: string}>('SELECT original FROM storage WHERE short_code = $1', [shortCode]);

  if (result.rowCount !== null && result.rowCount === 0) {
    response.status = 404;
    return;
  }
  
  const original = result.rows[0].original;
  
  response.status = 302;
  response.headers.set("Location", original);
  response.redirect(original);
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

application.listen({ port: 1939 });
