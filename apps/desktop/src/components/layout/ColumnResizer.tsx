import { useEffect, useRef, useState } from "react";

export function readStoredNumber(
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof localStorage === "undefined") {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(parsed)));
  } catch {
    return fallback;
  }
}

export function saveStoredNumber(key: string, value: number): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, String(Math.round(value)));
  } catch {
    // Ignore storage quota errors.
  }
}

interface ColumnResizerProps {
  value: number;
  min: number;
  max: number;
  onChange: (nextWidth: number) => void;
  onReset: () => void;
  title?: string;
}

export function ColumnResizer({
  value,
  min,
  max,
  onChange,
  onReset,
  title = "Arraste para redimensionar · Duplo clique para restaurar",
}: ColumnResizerProps) {
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startValRef = useRef(value);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const clamped = Math.min(max, Math.max(min, Math.round(startValRef.current + delta)));
      onChange(clamped);
    };

    const onMouseUp = () => {
      setDragging(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, min, max, onChange]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      title={title}
      className={`col-resizer ${dragging ? "dragging" : ""}`}
      onMouseDown={(e) => {
        e.preventDefault();
        startXRef.current = e.clientX;
        startValRef.current = value;
        setDragging(true);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onReset();
      }}
    />
  );
}
