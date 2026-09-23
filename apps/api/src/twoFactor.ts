import type { AppEnv } from "@replica/config";

const TWO_FACTOR_SEND_OTP_URL = "https://2factor.in/API/V1/OTP/SEND";
const PROVIDER_TIMEOUT_MS = 8_000;

interface TwoFactorResponse {
  Status?: unknown;
  Details?: unknown;
}

export class OtpDeliveryError extends Error {
  constructor(message = "OTP delivery failed.") {
    super(message);
    this.name = "OtpDeliveryError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function acceptedResponse(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const response = value as TwoFactorResponse;
  const status = response.Status ?? value.status;

  return (
    typeof status === "string" &&
    ["success", "sent"].includes(status.toLowerCase())
  );
}

export async function sendOtpWithTwoFactor(
  env: AppEnv,
  input: { phone: string; otp: string },
  fetchImplementation: typeof fetch = fetch,
): Promise<void> {
  if (!env.SMS_PROVIDER_API_KEY) {
    throw new OtpDeliveryError("OTP provider is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(
      TWO_FACTOR_SEND_OTP_URL,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": env.SMS_PROVIDER_API_KEY,
        },
        body: JSON.stringify({
          to: input.phone,
          channel: "SMS",
          template_name: env.SMS_PROVIDER_TEMPLATE_NAME,
          var1: input.otp,
        }),
        signal: controller.signal,
      },
    );
    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !acceptedResponse(payload)) {
      throw new OtpDeliveryError();
    }
  } catch (error) {
    if (error instanceof OtpDeliveryError) {
      throw error;
    }

    throw new OtpDeliveryError();
  } finally {
    clearTimeout(timeout);
  }
}
