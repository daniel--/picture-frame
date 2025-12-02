import { useNavigate } from "react-router-dom";
import { useState, FormEvent } from "react";
import { useAuth } from "./hooks/useAuth";
import "./Admin.css";
import { Header } from "./components/Header";
import { useSlideShow } from "./hooks/useSlideShow";
import { SlideshowControls } from "./components/SlideshowControls";
import { api, ApiError } from "./api";

export function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { connected, images, slideshowState, slideshowNext, slideshowPrevious, slideshowPlay, slideshowPause, updateSlideshowSpeed, slideshowSpeed, randomOrder, updateRandomOrder } = useSlideShow();

  const handleLogout = () => {
    logout();
    navigate("/login");
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
          <h2 className="settings-title">Admin</h2>
          
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
        onToggleShuffle={(randomOrder !== null) ? () => updateRandomOrder(!randomOrder) : undefined}
        slideshowSpeed={slideshowSpeed}
        onSpeedChange={updateSlideshowSpeed}
        disabled={images.length === 0}
      />
    </div>
  );
}

