import prisma from "../../prisma";
import { startOfDayUTC, enumerateDaysInclusiveUTC } from "./date-utils";

type PrismaTransaction = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

type EventType = "ONE_OFF" | "WHOLE_DAY" | "MULTI_DAY";

/**
 * Creates day records for an event based on its type.
 */
export const createDaysForEvent = async (
  tx: PrismaTransaction,
  eventId: string,
  type: EventType,
  startAt: Date,
  endAt?: Date
): Promise<void> => {
  if (type === "ONE_OFF") {
    return;
  }

  if (type === "WHOLE_DAY") {
    await tx.day.createMany({
      data: [{ eventId, date: startOfDayUTC(startAt) }],
      skipDuplicates: true,
    });
    return;
  }

  if (type === "MULTI_DAY" && endAt) {
    const days = enumerateDaysInclusiveUTC(startAt, endAt).map((date) => ({
      eventId,
      date,
    }));

    if (days.length > 0) {
      await tx.day.createMany({ data: days, skipDuplicates: true });
    }
  }
};
