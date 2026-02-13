import React from "react";
import { Card } from "../atoms/Card";
import { Text } from "../atoms/Text";
import { Button } from "../atoms/Button";
import "./ErrorMessage.css";

/**
 * MOLECULE: ErrorMessage Component
 * Displays error messages using Card and Text atoms
 */

interface ErrorMessageProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <Card className="error-message">
      <div className="error-message__content">
        <div className="error-message__icon">⚠️</div>
        <div className="error-message__text">
          <Text variant="label">Error</Text>
          <Text variant="body">{error}</Text>
        </div>
        {onDismiss && (
          <Button variant="secondary" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </Card>
  );
};
