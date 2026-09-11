import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  hashRazorpayWebhookPayload,
  mapRazorpayPaymentStatus,
  parseRazorpayWebhookPayload,
  selectMostRelevantRazorpayPayment,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
  type RazorpayPaymentEntity,
} from "./razorpay.js";

function sign(payload: string | Buffer, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function paymentEntity(
  overrides: Partial<RazorpayPaymentEntity>,
): RazorpayPaymentEntity {
  return {
    id: "pay_test123",
    amount: 129900,
    currency: "INR",
    status: "created",
    orderId: "order_test123",
    method: null,
    captured: false,
    amountRefunded: 0,
    refundStatus: null,
    errorCode: null,
    errorDescription: null,
    createdAt: 1_788_604_800,
    ...overrides,
  };
}

describe("Razorpay helpers", () => {
  it("verifies checkout signatures against order id and payment id", () => {
    const secret = "test_secret";
    const signature = sign("order_123|pay_123", secret);

    expect(
      verifyRazorpayCheckoutSignature({
        orderId: "order_123",
        paymentId: "pay_123",
        signature,
        secret,
      }),
    ).toBe(true);
    expect(
      verifyRazorpayCheckoutSignature({
        orderId: "order_123",
        paymentId: "pay_wrong",
        signature,
        secret,
      }),
    ).toBe(false);
    expect(
      verifyRazorpayCheckoutSignature({
        orderId: "order_123",
        paymentId: "pay_123",
        signature: "not-hex",
        secret,
      }),
    ).toBe(false);
  });

  it("verifies and parses webhook payloads from the raw body", () => {
    const secret = "webhook_secret";
    const rawBody = Buffer.from(
      JSON.stringify({
        id: "evt_test123",
        event: "payment.captured",
        created_at: 1_788_604_800,
        payload: {
          payment: {
            entity: {
              id: "pay_test123",
              amount: 129900,
              currency: "INR",
              status: "captured",
              order_id: "order_test123",
              method: "card",
              captured: true,
              amount_refunded: 0,
              refund_status: null,
              error_code: null,
              error_description: null,
              created_at: 1_788_604_800,
            },
          },
        },
      }),
    );
    const signature = sign(rawBody, secret);

    expect(verifyRazorpayWebhookSignature({ rawBody, signature, secret })).toBe(
      true,
    );
    expect(
      verifyRazorpayWebhookSignature({
        rawBody,
        signature,
        secret: "wrong_secret",
      }),
    ).toBe(false);

    const parsed = parseRazorpayWebhookPayload(rawBody);
    expect(parsed).toEqual({
      eventId: "evt_test123",
      eventName: "payment.captured",
      payment: {
        id: "pay_test123",
        amount: 129900,
        currency: "INR",
        status: "captured",
        orderId: "order_test123",
        method: "card",
        captured: true,
        amountRefunded: 0,
        refundStatus: null,
        errorCode: null,
        errorDescription: null,
        createdAt: 1_788_604_800,
      },
    });
    expect(hashRazorpayWebhookPayload(rawBody)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("maps Razorpay provider statuses into local payment statuses", () => {
    expect(
      mapRazorpayPaymentStatus(paymentEntity({ status: "captured" })),
    ).toBe("CAPTURED");
    expect(
      mapRazorpayPaymentStatus(paymentEntity({ status: "authorized" })),
    ).toBe("AUTHORIZED");
    expect(mapRazorpayPaymentStatus(paymentEntity({ status: "failed" }))).toBe(
      "FAILED",
    );
    expect(
      mapRazorpayPaymentStatus(
        paymentEntity({ status: "captured", refundStatus: "partial" }),
      ),
    ).toBe("PARTIALLY_REFUNDED");
    expect(
      mapRazorpayPaymentStatus(
        paymentEntity({ status: "captured", refundStatus: "full" }),
      ),
    ).toBe("REFUNDED");
  });

  it("selects the strongest Razorpay attempt for manual reconciliation", () => {
    const selected = selectMostRelevantRazorpayPayment([
      paymentEntity({ id: "pay_failed", status: "failed", createdAt: 10 }),
      paymentEntity({
        id: "pay_authorized",
        status: "authorized",
        createdAt: 12,
      }),
      paymentEntity({
        id: "pay_captured_old",
        status: "captured",
        createdAt: 8,
      }),
      paymentEntity({
        id: "pay_captured_new",
        status: "captured",
        createdAt: 20,
      }),
    ]);

    expect(selected?.id).toBe("pay_captured_new");
    expect(selectMostRelevantRazorpayPayment([])).toBeNull();
  });
});
