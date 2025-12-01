/**
 * Returns the start of day in UTC for a given date
 */
export const startOfDayUTC = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

/**
 * Returns an array of dates from `from` to `to` (inclusive), normalized to start of day UTC
 */
export const enumerateDaysInclusiveUTC = (from: Date, to: Date): Date[] => {
  const days: Date[] = [];

  const startDay = startOfDayUTC(from);
  const endDay = startOfDayUTC(to);

  let currentDay = startDay;

  while (currentDay.getTime() <= endDay.getTime()) {
    days.push(new Date(currentDay));
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
  }

  return days;
};
