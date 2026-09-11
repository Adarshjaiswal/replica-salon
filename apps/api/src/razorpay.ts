import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AppEnv } from "@replica/config";
import type { PaymentStatus } from "@replica/db";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

type RazorpayPaymentStatus =
  "created" | "authorized" | "captured" | "refunded" | "failed";

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  currency: string;
  status: RazorpayPaymentStatus;
  orderId: string | null;
  method: string | null;
  captured: boolean | null;
  amountRefunded: number | null;
  refundStatus: string | null;
  errorCode: string | null;
  errorDescription: string | null;
  createdAt: number | null;
}

export interface ParsedRazorpayWebhook {
  eventId: string;
  eventName: string;
  payment: RazorpayPaymentEntity | null;
}

interface CreateRazorpayOrderInput {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isRazorpayPaymentStatus(
  status: string,
): status is RazorpayPaymentStatus {
  return (
    status === "created" ||
    status === "authorized" ||
    status === "captured" ||
    status === "refunded" ||
    status === "failed"
  );
}

function safeEqualHex(leftHex: string, rightHex: string): boolean {
  if (!/^[a-f0-9]+$/i.test(leftHex) || !/^[a-f0-9]+$/i.test(rightHex)) {
    return false;
  }

  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}

function razorpayAuthorizationHeader(env: AppEnv): string {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay is not configured.");
  }

  return `Basic ${Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
  ).toString("base64")}`;
}

function parseRazorpayOrderResponse(
  value: unknown,
): RazorpayOrderResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = requiredString(value.id);
  const amount = optionalNumber(value.amount);
  const currency = requiredString(value.currency);
  const status = requiredString(value.status);

  if (!id || amount === null || !currency || !status) {
    return null;
  }

  return { id, amount, currency, status };
}

function parseRazorpayPaymentEntity(
  value: unknown,
): RazorpayPaymentEntity | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = requiredString(value.id);
  const amount = optionalNumber(value.amount);
  const currency = requiredString(value.currency);
  const rawStatus = requiredString(value.status);

  if (!id || amount === null || !currency || !rawStatus) {
    return null;
  }

  if (!isRazorpayPaymentStatus(rawStatus)) {
    return null;
  }

  return {
    id,
    amount,
    currency,
    status: rawStatus,
    orderId: optionalString(value.order_id),
    method: optionalString(value.method),
    captured: optionalBoolean(value.captured),
    amountRefunded: optionalNumber(value.amount_refunded),
    refundStatus: optionalString(value.refund_status),
    errorCode: optionalString(value.error_code),
    errorDescription: optionalString(value.error_description),
    createdAt: optionalNumber(value.created_at),
  };
}

function extractWebhookPayment(
  value: Record<string, unknown>,
): RazorpayPaymentEntity | null {
  if (!isRecord(value.payload)) {
    return null;
  }

  if (!isRecord(value.payload.payment)) {
    return null;
  }

  return parseRazorpayPaymentEntity(value.payload.payment.entity);
}

function extractWebhookOrderId(value: Record<string, unknown>): string | null {
  if (!isRecord(value.payload)) {
    return null;
  }

  if (!isRecord(value.payload.order) || !isRecord(value.payload.order.entity)) {
    return null;
  }

  return optionalString(value.payload.order.entity.id);
}

async function razorpayFetchJson(
  env: AppEnv,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", razorpayAuthorizationHeader(env));

  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...init,
    headers,
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error("Razorpay API request failed.");
  }

  return payload;
}

export function isRazorpayConfigured(env: AppEnv): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export function isRazorpayWebhookConfigured(env: AppEnv): boolean {
  return Boolean(env.RAZORPAY_WEBHOOK_SECRET);
}

export function verifyRazorpayCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", input.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return safeEqualHex(expected, input.signature);
}

export function verifyRazorpayWebhookSignature(input: {
  rawBody: Buffer;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex");

  return safeEqualHex(expected, input.signature);
}

export function hashRazorpayWebhookPayload(rawBody: Buffer): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function parseRazorpayWebhookPayload(
  rawBody: Buffer,
): ParsedRazorpayWebhook | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody.toString("utf8")) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const eventName = requiredString(parsed.event);

  if (!eventName) {
    return null;
  }

  const payment = extractWebhookPayment(parsed);
  const orderId = payment?.orderId ?? extractWebhookOrderId(parsed);
  const explicitEventId = optionalString(parsed.id);
  const createdAt = optionalNumber(parsed.created_at)?.toString() ?? "unknown";
  const derivedTargetId =
    payment?.id ?? orderId ?? hashRazorpayWebhookPayload(rawBody).slice(0, 32);

  return {
    eventId: explicitEventId ?? `${eventName}:${derivedTargetId}:${createdAt}`,
    eventName,
    payment,
  };
}

export async function createRazorpayOrder(
  env: AppEnv,
  input: CreateRazorpayOrderInput,
): Promise<RazorpayOrderResponse> {
  const payload = await razorpayFetchJson(env, "/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  const order = parseRazorpayOrderResponse(payload);

  if (!order) {
    throw new Error("Razorpay order creation returned an invalid response.");
  }

  return order;
}

export async function fetchRazorpayPayment(
  env: AppEnv,
  paymentId: string,
): Promise<RazorpayPaymentEntity> {
  const payload = await razorpayFetchJson(
    env,
    `/payments/${encodeURIComponent(paymentId)}`,
  );
  const payment = parseRazorpayPaymentEntity(payload);

  if (!payment) {
    throw new Error("Razorpay payment lookup returned an invalid response.");
  }

  return payment;
}

export async function fetchRazorpayOrderPayments(
  env: AppEnv,
  orderId: string,
): Promise<RazorpayPaymentEntity[]> {
  const payload = await razorpayFetchJson(
    env,
    `/orders/${encodeURIComponent(orderId)}/payments`,
  );

  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error(
      "Razorpay order payment lookup returned an invalid response.",
    );
  }

  return payload.items
    .map(parseRazorpayPaymentEntity)
    .filter((payment): payment is RazorpayPaymentEntity => payment !== null);
}

export function mapRazorpayPaymentStatus(
  payment: RazorpayPaymentEntity,
): PaymentStatus {
  if (payment.status === "refunded" || payment.refundStatus === "full") {
    return "REFUNDED";
  }

  if (payment.refundStatus === "partial") {
    return "PARTIALLY_REFUNDED";
  }

  if (payment.status === "captured") {
    return "CAPTURED";
  }

  if (payment.status === "authorized") {
    return "AUTHORIZED";
  }

  if (payment.status === "failed") {
    return "FAILED";
  }

  return "PENDING";
}

export function selectMostRelevantRazorpayPayment(
  payments: RazorpayPaymentEntity[],
): RazorpayPaymentEntity | null {
  const rankByStatus: Record<RazorpayPaymentStatus, number> = {
    captured: 5,
    authorized: 4,
    refunded: 3,
    failed: 2,
    created: 1,
  };
  const sorted = [...payments].sort((left, right) => {
    const statusDifference =
      rankByStatus[right.status] - rankByStatus[left.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return (right.createdAt ?? 0) - (left.createdAt ?? 0);
  });

  return sorted.at(0) ?? null;
}
