import React from "react";
import { toast } from "sonner";

interface TaskCardProps {
  id: number;
  title: string;
  deadline?: string;
  summary?: string;
  progress?: number;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  deadline = "",
  summary = "",
  progress = 0,
  checked = false,
  onCheck,
  children,
  className = "",
}) => {
  return (
    <div
      className={`w-full max-w-full flex items-start rounded-xl mb-4 p-4 ${checked ? 'border-2 border-blue-500 bg-blue-50' : 'border border-gray-200 bg-white'} ${className}`}
    >
      <div className="flex-1">
        <div className="font-bold text-lg">{title}</div>
        {deadline && (
          <div className="text-xs text-gray-500">Határidő: {deadline}</div>
        )}
        {summary && <div className="text-sm mt-1">{summary}</div>}
        {/* Progress bar below */}
        <div className="mt-3">
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-blue-500 mt-1">{progress}% kész</div>
        </div>
        {/* Render children below progress bar */}
        {children}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={async () => {
          if (!onCheck) return;
          toast("Napló elem frissítése", {
            id: "frissites",
            duration: 50000,
            style: {
              background: '#d1fae5', // light green
              color: '#065f46', // dark green text
              fontSize: 13,
              padding: '6px 18px',
              borderRadius: 8,
              minHeight: 0,
              boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
            },
            className: 'sonner-toast--mini',
          });
          try {
            await onCheck(!checked);
          } finally {
            toast.dismiss("frissites");
          }
        }}
        className="ml-4 mt-2 w-5 h-5 accent-blue-500 rounded border-gray-300"
      />
    </div>
  );
};

export default TaskCard;
