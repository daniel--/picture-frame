import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "./api";
import "./Login.css";

function ResetPasswordRequest() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await api("/api/password/reset-request", {
        method: "POST",
        body: { email },
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
            <h1>Check Your Email</h1>
            <p style={{ marginBottom: "1rem" }}>
              If an account with that email exists, a password reset link has been sent.
            </p>
            <p style={{ marginBottom: "1rem", fontSize: "0.9rem", opacity: 0.9 }}>
              Please check your inbox and click the link to reset your password. The link will
              expire in 1 hour.
            </p>
            <button onClick={() => navigate("/login")} className="btn">
              Back to Login
            </button>
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
          <p style={{ marginBottom: "1rem", opacity: 0.9 }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn">
              {isLoading ? "Sending..." : "Send Reset Link"}
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

export default ResetPasswordRequest;
