import { useNavigate } from "react-router-dom";
import { useState, FormEvent } from "react";
import { useAuth } from "./hooks/useAuth";
import "./Settings.css";
import { Header } from "./components/Header";
import { useSlideShow } from "./hooks/useSlideShow";
import { SlideshowControls } from "./components/SlideshowControls";
import { api, ApiError } from "./api";

const SPEED_OPTIONS = [
  { value: 5, label: "5s" },
  { value: 60, label: "1min" },
  { value: 600, label: "10mins" },
  { value: 3600, label: "1hour" },
  { value: 18000, label: "5hours" },
  { value: 86400, label: "1day" },
] as const;

const DEFAULT_SPEED = 5; // 5 seconds

export function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { connected, images, slideshowState, slideshowNext, slideshowPrevious, slideshowPlay, slideshowPause, updateSlideshowSpeed, slideshowSpeed, randomOrder, updateRandomOrder } = useSlideShow();
  
  // Use speed from server, fallback to default if not loaded yet
  const speed = slideshowSpeed !== null ? slideshowSpeed : DEFAULT_SPEED;
  
  // Use random order from server, fallback to false if not loaded yet
  const isRandomOrderEnabled = randomOrder !== null ? randomOrder : false;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSpeedChange = (newSpeed: number) => {
    updateSlideshowSpeed(newSpeed);
  };

  const handleRandomOrderChange = (enabled: boolean) => {
    updateRandomOrder(enabled);
  };

  const handleToggleShuffle = () => {
    updateRandomOrder(!isRandomOrderEnabled);
  };


  // User creation form state
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormSuccess, setUserFormSuccess] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUserFormError(null);
    setUserFormSuccess(null);
    setIsCreatingUser(true);

    try {
      await api("/api/users/create", {
        method: "POST",
        body: userFormData,
      });

      setUserFormSuccess("User created successfully!");
      setUserFormData({ name: "", email: "", password: "" });
    } catch (err) {
      if (err instanceof ApiError) {
        setUserFormError(err.message);
      } else {
        setUserFormError("Failed to create user. Please try again.");
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="settings-container">
      <Header
        userName={user?.name ?? null}
        connected={connected}
        onLogout={handleLogout}
      />
      <main className="settings-main">
        <div className="settings-content">
          <h2 className="settings-title">Settings</h2>
          
          <div className="settings-section">
            <label className="settings-label">
              Slideshow Speed
            </label>
            <div className="settings-speed-control">
              <div className="settings-speed-options">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-speed-option ${speed === option.value ? 'active' : ''}`}
                    onClick={() => handleSpeedChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-label">
              Random Order
            </label>
            <div className="settings-random-order-control">
              <label className="settings-toggle-label">
                <span className="settings-toggle-wrapper">
                  <input
                    type="checkbox"
                    className="settings-toggle-input"
                    checked={isRandomOrderEnabled}
                    onChange={(e) => handleRandomOrderChange(e.target.checked)}
                    disabled={randomOrder === null}
                  />
                  <span className="settings-toggle-slider"></span>
                </span>
                <span className="settings-toggle-text">
                  {isRandomOrderEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
              <p className="settings-toggle-description">
                When enabled, images will be shown in random order during auto play mode.
              </p>
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-label">
              Create New User
            </label>
            <form onSubmit={handleCreateUser} className="settings-user-form">
              {userFormError && (
                <div className="settings-form-error">{userFormError}</div>
              )}
              {userFormSuccess && (
                <div className="settings-form-success">{userFormSuccess}</div>
              )}
              <div className="settings-form-group">
                <label htmlFor="user-name">Name</label>
                <input
                  id="user-name"
                  type="text"
                  placeholder="Enter name"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  required
                  disabled={isCreatingUser}
                />
              </div>
              <div className="settings-form-group">
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  placeholder="Enter email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                  disabled={isCreatingUser}
                />
              </div>
              <div className="settings-form-group">
                <label htmlFor="user-password">Password</label>
                <input
                  id="user-password"
                  type="password"
                  placeholder="Enter password (min 8 characters)"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  required
                  minLength={8}
                  disabled={isCreatingUser}
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingUser}
                className="settings-form-submit"
              >
                {isCreatingUser ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <SlideshowControls
        isPlaying={slideshowState.isPlaying}
        onPrevious={slideshowPrevious}
        onNext={slideshowNext}
        onPlay={slideshowPlay}
        onPause={slideshowPause}
        randomOrder={randomOrder}
        onToggleShuffle={handleToggleShuffle}
        disabled={images.length === 0}
      />
    </div>
  );
}

