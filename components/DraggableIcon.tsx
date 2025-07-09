"use client";

import { useState, useRef, useEffect } from "react";

interface Position {
  x: number;
  y: number;
}

interface DraggableIconProps {
  id: string;
  position: Position;
  onPositionChange: (x: number, y: number) => void;
  children: React.ReactNode;
}

export default function DraggableIcon({
  id,
  position,
  onPositionChange,
  children,
}: DraggableIconProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  console.log(id);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!iconRef.current) return;

    const rect = iconRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const x = e.clientX - offset.x;
    const y = e.clientY - offset.y;

    onPositionChange(x, y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={iconRef}
      style={{
        position: "absolute",
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(-50%, -50%)",
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: isDragging ? 10 : 1,
        transition: isDragging ? "none" : "left 0.1s ease, top 0.1s ease",
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
