import React from "react";
import "./Spinner.css";

/**
 * ATOM: Spinner Component
 * Loading indicator component with size and color variations
 */

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "#0078d4",
}) => {
  return (
    <div className={`spinner spinner--${size}`}>
      <div className="spinner__circle" style={{ borderTopColor: color }}></div>
    </div>
  );
};
