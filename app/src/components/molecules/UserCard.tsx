import React from "react";
import { Card } from "../atoms/Card";
import { Text } from "../atoms/Text";
import { Avatar } from "../atoms/Avatar";
import "./UserCard.css";

/**
 * MOLECULE: UserCard Component
 * Displays user information using Card, Text, and Avatar atoms
 */

interface UserCardProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  userName,
  userEmail,
  avatarUrl,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="user-card">
      <div className="user-card__content">
        <Avatar
          src={avatarUrl}
          alt={userName}
          initials={getInitials(userName)}
          size="md"
        />
        <div className="user-card__info">
          <Text variant="label">{userName}</Text>
          <Text variant="caption">{userEmail}</Text>
        </div>
      </div>
    </Card>
  );
};
