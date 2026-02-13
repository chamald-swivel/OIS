import React from "react";
import "./Text.css";

/**
 * ATOM: Text Component
 * Reusable text component with different variants for consistent typography
 */

interface TextProps {
  variant?: "body" | "caption" | "label" | "heading" | "subheading";
  children: React.ReactNode;
  className?: string;
}

export const Text: React.FC<TextProps> = ({
  variant = "body",
  children,
  className = "",
}) => {
  return (
    <span className={`text text--${variant} ${className}`}>{children}</span>
  );
};
