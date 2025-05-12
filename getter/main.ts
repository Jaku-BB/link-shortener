import { Application, Router } from "@oak/oak";
import { query } from "./database.ts";

const application = new Application();
const router = new Router();

router.get("/health-check", ({ response }) => {
  response.status = 200;
  response.body = { message: "Have a nice day!" };
});

router.get("/:short_code", async ({ response, params }) => {
  try {
    const shortCode = params.short_code;

    let result;
    try {
      result = await query<{original: string}>(
        'SELECT original FROM storage WHERE short_code = ?', 
        [shortCode]
      );
    } catch (error) {
      console.error("Error in /:short_code:", error);
      response.status = 500;
      response.body = { error: "Database error" };
      return;
    }

    if (!result.rows || result.rows.length === 0) {
      response.status = 404;
      return;
    }
    
    const original = result.rows[0].original;
    
    response.status = 302;
    response.headers.set("Location", original);
    response.redirect(original);
  } catch (error) {
    console.error("Error in /:short_code:", error);
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

application.listen({ port: 1939 });
