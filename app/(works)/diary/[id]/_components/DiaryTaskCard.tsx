import React from "react";

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

const DiaryTaskCard: React.FC<TaskCardProps> = ({
  title,
  deadline = "",
  summary = "",
  progress = 0,
  checked = false,
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

    </div>
  );
};

export default DiaryTaskCard;
