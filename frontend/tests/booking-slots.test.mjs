import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBookingSlots, nextCalendarDates, voddaWeekday } from '../src/lib/booking-slots.js';

function localDate(year, month, day, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

test('splits a work-time range using the selected service duration', () => {
  const date = localDate(2026, 7, 27);
  const workTimes = [{ weekday: voddaWeekday(date), from: '09:00', to: '12:00', active: true }];
  const slots = generateBookingSlots(workTimes, 30, date, localDate(2026, 7, 26), 5);
  assert.deepEqual(slots.map((slot) => slot.label), ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
});

test('does not create a slot that ends after the work-time range', () => {
  const date = localDate(2026, 7, 27);
  const workTimes = [{ weekday: voddaWeekday(date), from: '09:00', to: '10:30', active: true }];
  const slots = generateBookingSlots(workTimes, 60, date, localDate(2026, 7, 26));
  assert.deepEqual(slots.map((slot) => slot.label), ['09:00']);
});

test('filters past or too-soon slots for today', () => {
  const now = localDate(2026, 7, 27, 9, 20);
  const workTimes = [{ weekday: voddaWeekday(now), from: '09:00', to: '11:00', active: true }];
  const slots = generateBookingSlots(workTimes, 30, now, now, 5);
  assert.deepEqual(slots.map((slot) => slot.label), ['09:30', '10:00', '10:30']);
});

test('ignores inactive and malformed ranges', () => {
  const date = localDate(2026, 7, 27);
  const weekday = voddaWeekday(date);
  const slots = generateBookingSlots([
    { weekday, from: '09:00', to: '12:00', active: false },
    { weekday, from: 'bad', to: '12:00', active: true },
    { weekday: (weekday + 1) % 7, from: '09:00', to: '12:00', active: true },
  ], 30, date, localDate(2026, 7, 26));
  assert.equal(slots.length, 0);
});

test('calendar date list starts today and is bounded', () => {
  const now = localDate(2026, 7, 27, 18, 40);
  const dates = nextCalendarDates(3, now);
  assert.equal(dates.length, 3);
  assert.equal(dates[0].getDate(), 27);
  assert.equal(dates[2].getDate(), 29);
  assert.equal(dates[0].getHours(), 0);
});
