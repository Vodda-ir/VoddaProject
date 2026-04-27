"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type InputOTPProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  containerClassName?: string;
};

const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(
  (
    { className, containerClassName, value, onChange, maxLength = 6, ...props },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const digits = value.padEnd(maxLength, " ").split("");
    const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value.replace(/\D/g, "").slice(0, maxLength);
      onChange(v);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, maxLength);
      onChange(pasted);
    };

    const handleSlotClick = () => {
      inputRef.current?.focus();
    };

    return (
      <div
        role="group"
        className={cn(
          "flex items-center gap-1 has-[:disabled]:opacity-50",
          containerClassName
        )}
        onClick={handleSlotClick}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(value.length)}
          onBlur={() => setFocusedIndex(null)}
          className="sr-only"
          aria-label="کد تأیید"
          {...props}
        />
        {digits.map((char, i) => (
          <div
            key={i}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-md border border-input text-lg font-medium shadow-sm transition-all",
              focusedIndex !== null &&
              i === Math.min(value.length, maxLength - 1)
                ? "z-10 ring-1 ring-ring"
                : "",
              className
            )}
          >
            {char === " " ? (
              <span className="invisible">0</span>
            ) : (
              char
            )}
          </div>
        ))}
      </div>
    );
  }
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { index: number }
>(({ index, className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} role="separator" {...props} />);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
