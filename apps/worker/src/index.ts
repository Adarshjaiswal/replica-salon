import { parseAppEnv } from "@replica/config";
import pino from "pino";

const env = parseAppEnv(process.env);
const logger = pino({
  name: "replica-worker",
  redact: ["*.password", "*.token", "*.otp", "*.secret"],
});

logger.info(
  {
    appEnv: env.APP_ENV,
    timezone: env.BUSINESS_TIMEZONE,
  },
  "Worker bootstrapped; outbox processing will be implemented with the notification phase.",
);
