"use client"

import * as React from "react"
import CalendarFromLib from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { cn } from "@/lib/utils"

// Create a compatible type for existing usage
export type CalendarProps = {
  className?: string;
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  mode?: "single" | "range" | "default"; // Add mode to match legacy props
  initialFocus?: boolean; // Legacy prop
  showOutsideDays?: boolean; // Legacy prop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classNames?: any; // Legacy prop
}

function Calendar({
  className,
  selected,
  onSelect,
  disabled,
  // ...props removed to fix unused variable error
}: CalendarProps) {
    // Adapter to handle react-calendar's onChange which returns Value (Date | Date[] | null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDateChange = (value: any) => {
        if (onSelect) {
            onSelect(value as Date);
        }
    };
    
  return (
    <div className={cn("p-3 bg-background rounded-md border text-card-foreground shadow-sm w-fit pointer-events-auto", className)}>
        <CalendarFromLib 
            onChange={handleDateChange}
            value={selected}
            tileDisabled={({ date }) => disabled ? disabled(date) : false}
            className="react-calendar-custom"
        />
        <style jsx global>{`
            .react-calendar-custom {
                background: transparent !important;
                border: none !important;
                font-family: inherit !important;
                width: 100% !important;
            }
            .react-calendar__navigation button {
                color: inherit !important;
                min-width: 44px;
                background: none;
                font-size: 16px;
                margin-top: 8px;
            }
            .react-calendar__navigation button:enabled:hover,
            .react-calendar__navigation button:enabled:focus {
                background-color: hsl(var(--accent));
            }
            .react-calendar__month-view__weekdays {
                text-align: center;
                text-transform: uppercase;
                font-weight: bold;
                font-size: 0.75em;
                text-decoration: none !important; 
            }
            .react-calendar__month-view__days__day {
                color: inherit;
            }
            .react-calendar__tile {
                max-width: 100%;
                text-align: center;
                padding: 0.75em 0.5em;
                background: none;
            }
             .react-calendar__tile:disabled {
                background-color: transparent !important;
                color: hsl(var(--muted-foreground)) !important; 
                opacity: 0.5;
            }
            .react-calendar__tile:enabled:hover,
            .react-calendar__tile:enabled:focus {
                background-color: hsl(var(--accent));
                color: hsl(var(--accent-foreground));
                border-radius: 6px;
            }
            .react-calendar__tile--now {
                background: hsl(var(--secondary)) !important;
                color: hsl(var(--secondary-foreground)) !important;
                border-radius: 6px;
            }
            .react-calendar__tile--now:enabled:hover,
            .react-calendar__tile--now:enabled:focus {
                background: hsl(var(--secondary));
            }
             .react-calendar__tile--active {
                background: hsl(var(--primary)) !important;
                color: hsl(var(--primary-foreground)) !important;
                border-radius: 6px;
            }
            .react-calendar__tile--active:enabled:hover,
            .react-calendar__tile--active:enabled:focus {
                background: hsl(var(--primary));
            }
            abbr[title] {
                text-decoration: none !important;
            }
        `}</style>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
