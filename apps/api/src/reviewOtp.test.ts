import { describe, expect, it } from "vitest";
import type { AppEnv } from "@replica/config";
import { getRazorpayReviewOtp } from "./reviewOtp.js";

const reviewEnv = {
  RAZORPAY_REVIEW_OTP_ENABLED: true,
  RAZORPAY_REVIEW_PHONE: "+916386851855",
  RAZORPAY_REVIEW_OTP: "123456",
} as AppEnv;

describe("Razorpay review OTP", () => {
  it("returns the fixed OTP for the configured review number", () => {
    expect(getRazorpayReviewOtp(reviewEnv, "+916386851855")).toBe("123456");
  });

  it("does not bypass OTP generation for another number", () => {
    expect(getRazorpayReviewOtp(reviewEnv, "+916386851856")).toBeNull();
  });

  it("does not bypass OTP generation when review mode is disabled", () => {
    expect(
      getRazorpayReviewOtp(
        { ...reviewEnv, RAZORPAY_REVIEW_OTP_ENABLED: false },
        "+916386851855",
      ),
    ).toBeNull();
  });
});
