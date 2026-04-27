"use client";

import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian_en from "react-date-object/locales/gregorian_en";
import { cn } from "@/lib/utils";
import "react-multi-date-picker/styles/layouts/mobile.css";

type PersianDatePickerProps = {
  id?: string;
  value: string;
  onChange: (gregorianDate: string) => void;
  placeholder?: string;
  className?: string;
};

export function PersianDatePicker({
  id,
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
}: PersianDatePickerProps) {
  const pickerValue = value
    ? new DateObject({
        date: value,
        format: "YYYY-MM-DD",
        calendar: gregorian,
        locale: gregorian_en,
      }).convert(persian, persian_fa)
    : "";

  return (
    <DatePicker
      id={id}
      value={pickerValue}
      calendar={persian}
      locale={persian_fa}
      calendarPosition="bottom-right"
      format="DD MMMM YYYY"
      onChange={(dateObject) => {
        if (!dateObject) {
          onChange("");
          return;
        }

        const date = Array.isArray(dateObject) ? dateObject[0] : dateObject;
        const normalized = new DateObject(date).convert(gregorian, gregorian_en);
        onChange(normalized.format("YYYY-MM-DD"));
      }}
      inputClass={cn(
        "vodda-persian-datepicker h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      containerClassName="w-full"
      placeholder={placeholder}
    />
  );
}
