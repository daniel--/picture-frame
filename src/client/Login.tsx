import { useState, FormEvent, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "./api";
import { useAuth } from "./hooks/useAuth";
import "./Login.css";

interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    createdAt: string | null;
    updatedAt: string | null;
  };
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loginData = await api<LoginResponse>("/login", {
        method: "POST",
        body: { email, password },
      });

      // Store authentication state using the hook
      setAuth(loginData.token, loginData.user);

      // Redirect to home page
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Network error. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="card login-card">
          <h1>Login</h1>
          {error && <div className="error-message">{error}</div>}
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
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn">
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to="/reset-password-request" style={{ color: "inherit", opacity: 0.9 }}>
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
