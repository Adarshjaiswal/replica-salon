import type { AppEnv } from "@replica/config";

export function getRazorpayReviewOtp(
  env: AppEnv,
  normalizedPhone: string,
): string | null {
  if (!env.RAZORPAY_REVIEW_OTP_ENABLED) {
    return null;
  }

  return normalizedPhone === env.RAZORPAY_REVIEW_PHONE
    ? env.RAZORPAY_REVIEW_OTP
    : null;
}
