import React from "react";
import "./Avatar.css";

/**
 * ATOM: Avatar Component
 * Displays user avatar with fallback to initials
 */

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User avatar",
  initials,
  size = "md",
}) => {
  return (
    <div className={`avatar avatar--${size}`}>
      {src ? (
        <img src={src} alt={alt} className="avatar__image" />
      ) : (
        <div className="avatar__initials">{initials || "?"}</div>
      )}
    </div>
  );
};
