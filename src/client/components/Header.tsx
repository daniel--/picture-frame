import { Link } from "react-router-dom";
import { useState } from "react";
import "./Header.css";

interface HeaderProps {
  userName: string | null;
  connected: boolean;
  onLogout: () => void;
}

export function Header({ userName, connected, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">Family Photos</h1>
        <button 
          className="header-hamburger"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span className={`header-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`header-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`header-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
        </button>
        <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="/" className="header-nav-link" onClick={closeMobileMenu}>Home</Link>
          <Link to="/slideshow" className="header-nav-link" onClick={closeMobileMenu}>Slideshow</Link>
          <Link to="/settings" className="header-nav-link" onClick={closeMobileMenu}>Settings</Link>
        </nav>
        <div className="header-right">
          {userName && (
            <span className="header-user">
              <span className="header-user-label">Logged in as:</span>
              <span className="header-user-name">
                <span className={`header-connection-dot ${connected ? 'connected' : 'disconnected'}`}></span>
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

