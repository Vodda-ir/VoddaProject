import type { WorkTime } from './api';

export type BookingSlot = {
  key: string;
  label: string;
  endLabel: string;
  start: Date;
};

export function voddaWeekday(date: Date): number;
export function generateBookingSlots(workTimes: WorkTime[], duration: number, date: Date, now?: Date, leadMinutes?: number): BookingSlot[];
export function nextCalendarDates(count?: number, now?: Date): Date[];
