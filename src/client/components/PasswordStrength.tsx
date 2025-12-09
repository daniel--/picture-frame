import type { ZXCVBNResult } from "zxcvbn";
import "./PasswordStrength.css";

interface PasswordStrengthProps {
  strength: ZXCVBNResult | null;
}

export function PasswordStrength({ strength }: PasswordStrengthProps) {
  if (!strength) {
    return null;
  }

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["#dc3545", "#fd7e14", "#ffc107", "#20c997", "#28a745"];
  const score = strength.score;
  const label = strengthLabels[score];
  const color = strengthColors[score];

  return (
    <div className="password-strength">
      <div className="password-strength-bar-container">
        <div
          className="password-strength-bar"
          style={{
            width: `${((score + 1) / 5) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="password-strength-info">
        <span className="password-strength-label" style={{ color }}>
          {label}
        </span>
        {strength.feedback.warning && (
          <span className="password-strength-warning">{strength.feedback.warning}</span>
        )}
      </div>
      {strength.feedback.suggestions.length > 0 && (
        <ul className="password-strength-suggestions">
          {strength.feedback.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
