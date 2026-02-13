import React from "react";
import "./Input.css";

/**
 * ATOM: Input Component
 * Reusable input field with label and error handling
 */

interface InputProps {
  label?: string;
  type?: "text" | "email" | "password" | "number";
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}) => {
  return (
    <div className="input-wrapper">
      {label && (
        <label className="input__label">
          {label}
          {required && <span className="input__required">*</span>}
        </label>
      )}
      <input
        type={type}
        className={`input ${error ? "input--error" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      />
      {error && <span className="input__error-message">{error}</span>}
    </div>
  );
};
