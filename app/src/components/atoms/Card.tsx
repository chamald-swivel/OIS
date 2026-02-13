import React from "react";
import "./Card.css";

/**
 * ATOM: Card Component
 * Container component for content sections with consistent styling
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  padding = "md",
}) => {
  return (
    <div className={`card card--padding-${padding} ${className}`}>
      {children}
    </div>
  );
};
