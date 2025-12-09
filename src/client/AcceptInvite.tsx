import { useState, FormEvent, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "./api";
import { useAuth } from "./hooks/useAuth";
import { PasswordStrength } from "./components/PasswordStrength";
import zxcvbn from "zxcvbn";
import "./Login.css";

interface AcceptInviteResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    createdAt: string | null;
    updatedAt: string | null;
  };
}

function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate password strength in real-time
  const passwordStrength = useMemo(() => {
    if (!password) {
      return null;
    }
    return zxcvbn(password, [email, name]);
  }, [password, email, name]);

  // Check if form is valid for submission
  const isFormValid = useMemo(() => {
    if (!name.trim()) return false;
    if (!password) return false;
    if (password !== confirmPassword) return false;
    if (!passwordStrength || passwordStrength.score < 2) return false;
    return true;
  }, [name, password, confirmPassword, passwordStrength]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Validate invite token on mount
  useEffect(() => {
    if (!token) {
      setValidationError("Invalid invite link. Please request a new invite.");
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const data = await api<{ email: string; valid: boolean }>(`/api/invite/${token}`);
        setEmail(data.email);
        setIsValidating(false);
      } catch (err) {
        if (err instanceof ApiError) {
          setValidationError(err.message);
        } else {
          setValidationError("Failed to validate invite. Please try again.");
        }
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid invite link. Please request a new invite.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await api<AcceptInviteResponse>(`/api/invite/${token}/accept`, {
        method: "POST",
        body: { name: name.trim(), password },
      });

      // Store authentication state
      setAuth(data.token, data.user);

      // Redirect to home page
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create account. Please try again.");
      }
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="App">
        <div className="container">
          <div className="card login-card">
            <h1>Validating Invite...</h1>
            <p>Please wait while we validate your invite.</p>
          </div>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="App">
        <div className="container">
          <div className="card login-card">
            <h1>Invalid Invite</h1>
            {validationError && <div className="error-message">{validationError}</div>}
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button onClick={() => navigate("/login")} className="btn">
                Go to Login
              </button>
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
          <h1>Create Your Account</h1>
          <p style={{ marginBottom: "1rem", opacity: 0.9 }}>
            You've been invited! Complete the form below to create your account.
          </p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter password"
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
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading || !isFormValid} className="btn">
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AcceptInvite;
