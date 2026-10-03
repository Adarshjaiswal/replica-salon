import { describe, expect, it, vi } from "vitest";
import type { AppEnv } from "@replica/config";
import { OtpDeliveryError, sendOtpWithTwoFactor } from "./twoFactor.js";

const env = {
  SMS_PROVIDER_API_KEY: "server-secret-key",
  SMS_PROVIDER_TEMPLATE_NAME: "Template1",
} as AppEnv;

describe("2Factor OTP adapter", () => {
  it("gets the provider SMS route and accepts a successful response", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ Status: "Success", Details: "session" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await sendOtpWithTwoFactor(
      env,
      { phone: "+919999999999", otp: "123456" },
      providerFetch,
    );

    expect(providerFetch).toHaveBeenCalledOnce();
    expect(providerFetch.mock.calls[0]?.[0]).toBe(
      "https://2factor.in/API/V1/server-secret-key/SMS/%2B919999999999/123456/Template1",
    );
    expect(providerFetch.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
    });
  });

  it("accepts the current lowercase sent response", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: "sent", session_id: "session" }), {
        status: 200,
      }),
    );

    await expect(
      sendOtpWithTwoFactor(
        env,
        { phone: "+919999999999", otp: "123456" },
        providerFetch,
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects provider errors without exposing provider details", async () => {
    const providerFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ Status: "Error", Details: "invalid api key" }),
          { status: 401 },
        ),
      );

    await expect(
      sendOtpWithTwoFactor(
        env,
        { phone: "+919999999999", otp: "123456" },
        providerFetch,
      ),
    ).rejects.toEqual(new OtpDeliveryError());
  });
});
