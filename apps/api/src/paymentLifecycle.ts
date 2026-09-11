import type { BookingStatus, PaymentStatus, Prisma } from "@replica/db";

export const BOOKING_FINAL_STATUSES: readonly BookingStatus[] = [
  "COMPLETED",
  "CANCELLED",
];

export const NON_BLOCKING_BOOKING_STATUSES: readonly BookingStatus[] = [
  "DRAFT",
  "COMPLETED",
  "CANCELLED",
];

const BOOKING_CONFIRMED_OR_STARTED_STATUSES = new Set<BookingStatus>([
  "ASSIGNED",
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_SERVICE",
]);

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

export interface VerifiedPaymentState {
  status: PaymentStatus;
  providerOrderId?: string | null | undefined;
  providerPaymentId?: string | null | undefined;
  providerStatus?: string | null | undefined;
  verifiedAt?: Date | undefined;
  capturedAt?: Date | undefined;
}

interface RecordPaymentOptions {
  requireBookingConfirmation?: boolean;
}

function createInvoiceNo(bookingPublicId: string): string {
  return `RHS-${Date.now().toString(36).toUpperCase()}-${bookingPublicId
    .slice(-5)
    .toUpperCase()}`;
}

export function isPaymentAcceptedStatus(status: PaymentStatus): boolean {
  return status === "AUTHORIZED" || status === "CAPTURED";
}

async function upsertCapturedInvoice(
  transaction: Prisma.TransactionClient,
  paymentId: string,
  booking: {
    publicId: string;
    totalPaise: number;
    taxPaise: number;
  },
): Promise<void> {
  await transaction.invoice.upsert({
    where: { paymentId },
    update: {
      totalPaise: booking.totalPaise,
      taxPaise: booking.taxPaise,
    },
    create: {
      paymentId,
      invoiceNo: createInvoiceNo(booking.publicId),
      totalPaise: booking.totalPaise,
      taxPaise: booking.taxPaise,
    },
  });
}

async function confirmBookingAfterPayment(
  transaction: Prisma.TransactionClient,
  bookingId: string,
  paymentId: string,
  paymentStatus: PaymentStatus,
): Promise<void> {
  const booking = await transaction.booking.findUnique({
    where: { id: bookingId },
    include: {
      assignments: {
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!booking) {
    throw new BookingConflictError("Booking was not found.");
  }

  if (BOOKING_FINAL_STATUSES.includes(booking.status)) {
    if (paymentStatus === "CAPTURED") {
      await upsertCapturedInvoice(transaction, paymentId, booking);
    }

    return;
  }

  const assignment = booking.assignments.at(0);

  if (!assignment || assignment.status === "REJECTED") {
    throw new BookingConflictError("No professional is held for this booking.");
  }

  const overlappingAssignment = await transaction.staffAssignment.findFirst({
    where: {
      bookingId: { not: booking.id },
      staffProfileId: assignment.staffProfileId,
      status: { not: "REJECTED" },
      booking: {
        status: {
          notIn: [...NON_BLOCKING_BOOKING_STATUSES],
        },
        scheduledStartAt: { lt: booking.scheduledEndAt },
        scheduledEndAt: { gt: booking.scheduledStartAt },
      },
    },
  });

  if (overlappingAssignment) {
    throw new BookingConflictError(
      "The selected professional is no longer available for this slot.",
    );
  }

  const shouldAdvanceBooking = !BOOKING_CONFIRMED_OR_STARTED_STATUSES.has(
    booking.status,
  );

  if (shouldAdvanceBooking) {
    await transaction.booking.update({
      where: { id: booking.id },
      data: {
        status: "ASSIGNED",
      },
    });

    await transaction.staffAssignment.update({
      where: { id: assignment.id },
      data: {
        status: "ASSIGNED",
        assignedAt: new Date(),
      },
    });

    await transaction.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        status: "ASSIGNED",
        reason: "Payment confirmed and professional assigned.",
      },
    });

    await transaction.outboxEvent.create({
      data: {
        eventName: "booking.confirmed",
        payload: {
          bookingId: booking.id,
          bookingPublicId: booking.publicId,
          paymentId,
        },
      },
    });
  }

  if (paymentStatus === "CAPTURED") {
    await upsertCapturedInvoice(transaction, paymentId, booking);
  }
}

export async function recordPaymentStateAndMaybeConfirmBooking(
  transaction: Prisma.TransactionClient,
  bookingId: string,
  paymentId: string,
  state: VerifiedPaymentState,
  options: RecordPaymentOptions = {},
): Promise<void> {
  const paymentUpdate: Prisma.PaymentUpdateInput = {
    status: state.status,
    verifiedAt: state.verifiedAt ?? new Date(),
  };

  if (state.providerOrderId !== undefined) {
    paymentUpdate.providerOrderId = state.providerOrderId;
  }

  if (state.providerPaymentId !== undefined) {
    paymentUpdate.providerPaymentId = state.providerPaymentId;
  }

  if (state.providerStatus !== undefined) {
    paymentUpdate.providerStatus = state.providerStatus;
  }

  if (state.status === "CAPTURED") {
    paymentUpdate.capturedAt = state.capturedAt ?? new Date();
  } else if (state.capturedAt !== undefined) {
    paymentUpdate.capturedAt = state.capturedAt;
  }

  await transaction.payment.update({
    where: { id: paymentId },
    data: paymentUpdate,
  });

  if (isPaymentAcceptedStatus(state.status)) {
    try {
      await confirmBookingAfterPayment(
        transaction,
        bookingId,
        paymentId,
        state.status,
      );
    } catch (error) {
      if (
        options.requireBookingConfirmation === false &&
        error instanceof BookingConflictError
      ) {
        return;
      }

      throw error;
    }
  }
}
