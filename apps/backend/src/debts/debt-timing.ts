import type { ScheduleItemTiming } from '@collectify/contracts';

export function getScheduleItemTiming(dueDate: string, businessDate: string): ScheduleItemTiming {
  if (dueDate > businessDate) {
    return 'upcoming';
  }

  if (dueDate < businessDate) {
    return 'overdue';
  }

  return 'dueToday';
}
