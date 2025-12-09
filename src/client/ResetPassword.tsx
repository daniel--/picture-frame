import { useState, FormEvent, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api, ApiError } from "./api";
import { PasswordStrength } from "./components/PasswordStrength";
import zxcvbn from "zxcvbn";
import "./Login.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Calculate password strength in real-time
  const passwordStrength = useMemo(() => {
    if (!password) {
      return null;
    }
    return zxcvbn(password);
  }, [password]);

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    if (!password) return false;
    if (password !== confirmPassword) return false;
    if (!passwordStrength || passwordStrength.score < 2) return false;
    return true;
  }, [password, confirmPassword, passwordStrength]);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await api("/api/password/reset", {
        method: "POST",
        body: { token, newPassword: password },
      });

      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Network error. Please try again.");
      }
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="App">
        <div className="container">
          <div className="card login-card">
            <h1>Password Reset Successful</h1>
            <p style={{ marginBottom: "1rem" }}>
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button onClick={() => navigate("/login")} className="btn">
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="App">
        <div className="container">
          <div className="card login-card">
            <h1>Invalid Reset Link</h1>
            {error && <div className="error-message">{error}</div>}
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <Link to="/reset-password-request" style={{ color: "inherit", opacity: 0.9 }}>
                Request a new password reset
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <div className="card login-card">
          <h1>Reset Password</h1>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <PasswordStrength strength={passwordStrength} />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading || !isFormValid} className="btn">
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to="/login" style={{ color: "inherit", opacity: 0.9 }}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
