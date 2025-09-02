"use client";

import * as React from "react";

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color?: string;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, max, label, unit, color = "bg-blue-500" }, ref) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    return (
      <div className="w-full" ref={ref}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-medium text-gray-700">
            {value} / {max} {unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${color}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
