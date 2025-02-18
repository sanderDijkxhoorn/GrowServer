import { Hono } from "hono";
import { logger as logg } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { createServer } from "https";
import { readFileSync } from "fs";
import { join, relative } from "path";
import consola from "consola";
import jwt from "jsonwebtoken";
import type { Base } from "./Base";
import bcrypt from "bcryptjs";
import { existsSync, writeFileSync, mkdirSync } from "fs";

__dirname = process.cwd();
const conf = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));

export async function Web(base: Base) {
  const app = new Hono();

  app.use(logg((str, ...rest) => consola.log(str, ...rest)));

  app.get("/", (ctx) =>
    ctx.json({
      message: "Hello world"
    })
  );

  app.get("/player/growid/login/validate", (ctx) => {
    try {
      const query = ctx.req.query();
      const token = query.token;
      if (!token) throw new Error("No token provided");

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token,
          url: "",
          accountType: "growtopia"
        })
      );
    } catch (e) {
      return ctx.body(`Unauthorized: ${e}`, 401);
    }
  });

  app.post("/player/login/validate", async (ctx) => {
    try {
      const body = await ctx.req.json();
      const growId = body.data?.growId;
      const password = body.data?.password;

      if (!growId || !password) throw new Error("Unauthorized");

      const user = await base.database.players.get(growId.toLowerCase());
      if (!user) throw new Error("User not found");

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new Error("Password invalid");

      const token = jwt.sign({ growId, password }, process.env.JWT_SECRET as string);

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token,
          url: "",
          accountType: "growtopia"
        })
      );
    } catch (e) {
      return ctx.body(`Unauthorized: ${e}`, 401);
    }
  });

  app.all("/growtopia/server_data.php", (ctx) => {
    let str = "";

    str += `server|${conf.web.address}\n`;

    const randPort = conf.web.ports[Math.floor(Math.random() * conf.web.ports.length)];
    str += `port|${randPort}\nloginurl|${conf.web.loginUrl}\ntype|1\n${conf.web.maintenance.enable ? "maint" : "#maint"}|${conf.web.maintenance.message}\nmeta|ignoremeta\nRTENDMARKERBS1001`;

    return ctx.body(str);
  });

  app.post("/player/growid/checktoken", async (ctx) => {
    try {
      const formData = await ctx.req.formData();
      const refreshToken = formData.get("refreshToken") as string;

      if (!refreshToken) throw new Error("Unauthorized");

      jwt.verify(refreshToken, process.env.JWT_SECRET as string);

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token: refreshToken,
          url: "",
          accountType: "growtopia"
        })
      );
    } catch (e) {
      return ctx.body("Unauthorized", 401);
    }
  });

  app.post("/player/signup", async (ctx) => {
    try {
      const body = await ctx.req.json();
      const growId = body.data?.growId;
      const password = body.data?.password;
      const confirmPassword = body.data?.confirmPassword;

      if (!growId || !password || !confirmPassword) throw new Error("Unauthorized");

      // Check if user already exists
      const user = await base.database.players.get(growId.toLowerCase());
      if (user) throw new Error("User already exists");

      // Check if password and confirm password match
      if (password !== confirmPassword) throw new Error("Password and Confirm Password does not match");

      // Save player to database
      await base.database.players.set(growId, password);

      // Login user:
      const token = jwt.sign({ growId, password }, process.env.JWT_SECRET as string);

      if (!token) throw new Error("Unauthorized");

      jwt.verify(token, process.env.JWT_SECRET as string);

      return ctx.html(
        JSON.stringify({
          status: "success",
          message: "Account Validated.",
          token,
          url: "",
          accountType: "growtopia"
        })
      );
    } catch (e) {
      return ctx.body("Unauthorized", 401);
    }
  });

  app.post("/player/login/dashboard", (ctx) => {
    const html = readFileSync(join(__dirname, ".cache", "website", "index.html"), "utf-8");
    return ctx.html(html);
  });

  app.get("/growtopia/cache/*", async (ctx) => {
    const route = ctx.req.url.split("/growtopia/cache/")[1];
    const url = `https://ubistatic-a.akamaihd.net/${base.cdn.uri}/cache/${route}`;
    const root = relative(__dirname, join(__dirname, "assets", "cache"));
    const filePath = join(root, route);

    // Create directory if it doesn't exist
    mkdirSync(filePath.split("/").slice(0, -1).join("/"), { recursive: true });

    // Check if filePath file exists, if so serve it
    if (!existsSync(filePath)) {
      consola.debug(`Caching ${url} to ${filePath}`);
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      writeFileSync(filePath, Buffer.from(buffer));
    }

    const file = readFileSync(filePath);
    return ctx.html(file.toString());
  });

  app.use(
    "/*",
    serveStatic({
      root: relative(__dirname, join(__dirname, ".cache", "website"))
    })
  );

  serve(
    {
      fetch: app.fetch,
      // port: 80
      port: 3000
    },
    (info) => {
      consola.log(`⛅ Running HTTP server on http://localhost`);
    }
  );

  serve(
    {
      fetch: app.fetch,
      // port: 443,
      port: 3001,
      createServer,
      serverOptions: {
        key: readFileSync(join(__dirname, "assets", "ssl", "server.key")),
        cert: readFileSync(join(__dirname, "assets", "ssl", "server.crt"))
      }
    },
    (info) => {
      consola.log(`⛅ Running HTTPS server on https://localhost`);
    }
  );

  serve(
    {
      fetch: app.fetch,
      port: 8080,
      createServer,
      serverOptions: {
        key: readFileSync(join(__dirname, ".cache", "ssl", "_wildcard.zyki.net-key.pem")),
        cert: readFileSync(join(__dirname, ".cache", "ssl", "_wildcard.zyki.net.pem"))
      }
    },
    (info) => {
      consola.log(`⛅ Running Login server on https://${conf.web.loginUrl}`);
    }
  );
}
