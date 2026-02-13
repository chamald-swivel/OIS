import React from "react";
import "./Button.css";

/**
 * ATOM: Button Component
 * Basic, reusable button component with variants and loading states
 */

interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  loading = false,
  children,
  type = "button",
}) => {
  return (
    <button
      type={type}
      className={`button button--${variant} button--${size} ${loading ? "button--loading" : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className="button__spinner"></span> : children}
    </button>
  );
};
