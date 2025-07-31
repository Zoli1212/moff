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
}) => {
  return (
    <div
      style={{
        border: checked ? "2px solid #3498db" : "1px solid #ccc",
        borderRadius: 12,
        marginBottom: 16,
        padding: 16,
        background: checked ? "#eaf6ff" : "#fff",
        boxShadow: "0 2px 8px #eee",
        display: "flex",
        alignItems: "flex-start",
        maxWidth: 420,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        {deadline && <div style={{ fontSize: 13, color: "#888" }}>Határidő: {deadline}</div>}
        {summary && <div style={{ fontSize: 14, marginTop: 4 }}>{summary}</div>}
        {/* Progress bar below */}
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 8, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, background: '#3498db', height: '100%' }} />
          </div>
          <div style={{ fontSize: 12, color: '#3498db', marginTop: 2 }}>{progress}% kész</div>
        </div>
        {/* Render children below progress bar */}
        {children}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onCheck && onCheck(!checked)}
        style={{ marginLeft: 16, marginTop: 8 }}
      />
    </div>
  );
};

export default TaskCard;
