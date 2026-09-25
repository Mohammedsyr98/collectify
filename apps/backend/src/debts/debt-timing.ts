export type ScheduleItemTiming = 'upcoming' | 'dueToday' | 'overdue';

export function getScheduleItemTiming(
  dueDate: string,
  businessDate: string,
): ScheduleItemTiming {
  if (dueDate > businessDate) {
    return 'upcoming';
  }

  if (dueDate < businessDate) {
    return 'overdue';
  }

  return 'dueToday';
}
