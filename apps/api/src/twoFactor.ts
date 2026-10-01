import type { AppEnv } from "@replica/config";

const TWO_FACTOR_API_BASE = "https://2factor.in/API/V1";
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
  const path = [
    env.SMS_PROVIDER_API_KEY,
    "SMS",
    input.phone,
    input.otp,
    env.SMS_PROVIDER_TEMPLATE_NAME,
  ]
    .map(encodeURIComponent)
    .join("/");

  try {
    const response = await fetchImplementation(
      `${TWO_FACTOR_API_BASE}/${path}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
        },
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
