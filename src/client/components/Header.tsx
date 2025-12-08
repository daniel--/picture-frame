import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import "./Header.css";

// Declare global type for injected config
declare global {
  interface Window {
    __APP_CONFIG__?: {
      appName: string;
    };
  }
}

interface HeaderProps {
  userName: string | null;
  connected: boolean;
  onLogout: () => void;
}

export function Header({ userName, connected, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const appName = window.__APP_CONFIG__?.appName || "Family Photos";

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="header-title-link">
          <h1 className="header-title">{appName}</h1>
        </Link>
        <button className="header-hamburger" onClick={toggleMobileMenu} aria-label="Toggle menu">
          <span className={`header-hamburger-line ${mobileMenuOpen ? "open" : ""}`}></span>
          <span className={`header-hamburger-line ${mobileMenuOpen ? "open" : ""}`}></span>
          <span className={`header-hamburger-line ${mobileMenuOpen ? "open" : ""}`}></span>
        </button>
        <nav className={`header-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <NavLink
            to="/"
            className={({ isActive }) => `header-nav-link ${isActive ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            Home
          </NavLink>
          <NavLink
            to="/slideshow"
            className={({ isActive }) => `header-nav-link ${isActive ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            Slideshow
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => `header-nav-link ${isActive ? "active" : ""}`}
            onClick={closeMobileMenu}
          >
            Admin
          </NavLink>
        </nav>
        <div className="header-right">
          {userName && (
            <span className="header-user">
              <span className="header-user-label">Logged in as:</span>
              <span className="header-user-name">
                <span
                  className={`header-connection-dot ${connected ? "connected" : "disconnected"}`}
                ></span>
                {userName}
              </span>
            </span>
          )}
          <button className="header-logout-btn" onClick={onLogout}>
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}
