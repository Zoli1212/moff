"use client";
import React, { useState } from "react";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format } from "date-fns";

interface CalendarMonthViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  diaryDates: Date[];
}

export default function CalendarMonthView({ selectedDate, onDateSelect, diaryDates }: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  // No nextMonth() - only backward navigation!

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <button onClick={prevMonth} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">◀</button>
      <span className="font-bold text-lg">{format(currentMonth, "yyyy. MMMM")}</span>
      <span className="w-8" />
    </div>
  );

  const renderDays = () => {
    const days = [];
    const date = startOfWeek(currentMonth, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-xs text-center font-semibold text-gray-600">
          {format(addDays(date, i), "EEE")}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-1">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const isDiaryDay = diaryDates.some((d) => isSameDay(d, day));
        days.push(
          <button
            key={day.toISOString()}
            className={`w-8 h-8 m-1 rounded-full flex items-center justify-center text-sm
              ${isSameMonth(day, monthStart) ? "" : "text-gray-400"}
              ${isSameDay(day, selectedDate) ? "bg-blue-500 text-white" : isDiaryDay ? "bg-green-100 text-green-700" : "hover:bg-gray-200"}`}
            onClick={() => isSameMonth(day, monthStart) && onDateSelect(day)}
            disabled={!isSameMonth(day, monthStart)}
          >
            {formattedDate}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
