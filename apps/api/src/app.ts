import crypto from "node:crypto";
import type { AppEnv } from "@replica/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import { errorEnvelope, successEnvelope } from "@replica/contracts";
import { prisma } from "@replica/db";
import { createAdminRouter } from "./admin.js";
import { createCustomerRouter } from "./customer.js";

const logger = pino({
  name: "replica-api",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "*.password",
    "*.token",
    "*.otp",
    "*.secret",
  ],
});

const RAZORPAY_WEBHOOK_PATH = "/api/v1/customer/payments/razorpay/webhook";

function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.header("x-request-id");
  const requestId =
    existing && existing.length <= 128 ? existing : crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  res.locals.requestId = requestId;
  next();
}

function getRequestId(res: Response): string {
  const value = res.locals.requestId;
  return typeof value === "string" ? value : "unknown-request";
}

function allowedRequestOrigins(env: AppEnv): Set<string> {
  const origins = new Set([env.WEB_ORIGIN, env.API_ORIGIN]);

  if (env.APP_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
    origins.add("http://localhost:3002");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://127.0.0.1:3001");
    origins.add("http://127.0.0.1:3002");
  }

  return origins;
}

function corsMiddleware(env: AppEnv) {
  const allowedOrigins = allowedRequestOrigins(env);

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.header("origin");

    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Request-ID",
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS",
      );
      res.append("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}

function sameOriginMutationGuard(env: AppEnv) {
  const allowedOrigins = allowedRequestOrigins(env);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      next();
      return;
    }

    const origin = req.header("origin");

    if (origin && !allowedOrigins.has(origin)) {
      res
        .status(403)
        .json(
          errorEnvelope(
            "FORBIDDEN",
            "Request origin is not allowed.",
            getRequestId(res),
          ),
        );
      return;
    }

    next();
  };
}

export function createApp(env: AppEnv): express.Express {
  const app = express();

  if (env.APP_ENV === "production") {
    // Caddy is the single private-network proxy in the production stack.
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(corsMiddleware(env));
  app.use(helmet());
  app.use(
    RAZORPAY_WEBHOOK_PATH,
    express.raw({ limit: "1mb", type: "application/json" }),
  );
  app.use(express.json({ limit: "8mb" }));
  app.use(sameOriginMutationGuard(env));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.get("/api/v1", (_req, res) => {
    res.json(
      successEnvelope(
        {
          service: "Replica API",
          status: "ok",
          version: "v1",
          endpoints: {
            health: "/api/v1/health",
            readiness: "/api/v1/readiness",
            customer: "/api/v1/customer",
            admin: "/api/v1/admin",
          },
        },
        getRequestId(res),
      ),
    );
  });

  app.get("/api/v1/health", (_req, res) => {
    res.json(successEnvelope({ status: "ok" }, getRequestId(res)));
  });

  app.get("/api/v1/readiness", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json(
        successEnvelope(
          { status: "ready", database: "ready" },
          getRequestId(res),
        ),
      );
    } catch (error) {
      logger.warn({ error }, "API readiness check failed");
      res
        .status(503)
        .json(
          successEnvelope(
            { status: "not_ready", database: "unavailable" },
            getRequestId(res),
          ),
        );
    }
  });

  app.use("/api/v1/admin", createAdminRouter(env));
  app.use("/api/v1/customer", createCustomerRouter(env));

  app.use((_req, res) => {
    res
      .status(404)
      .json(errorEnvelope("NOT_FOUND", "Route not found.", getRequestId(res)));
  });

  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      logger.error({ error }, "Unhandled API error");
      res
        .status(500)
        .json(
          errorEnvelope(
            "INTERNAL_ERROR",
            "An unexpected error occurred.",
            getRequestId(res),
          ),
        );
    },
  );

  return app;
}
