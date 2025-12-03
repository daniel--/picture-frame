import { useAuth } from "./hooks/useAuth";
import "./Admin.css";
import { Header } from "./components/Header";
import { useSlideShow } from "./hooks/useSlideShow";
import { SlideshowControls } from "./components/SlideshowControls";
import { useUserForm } from "./hooks/useUserForm";

export function Admin() {
  const { user, logoutAndRedirect } = useAuth();
  const { connected, images, slideshowState, slideshowNext, slideshowPrevious, slideshowPlay, slideshowPause, updateSlideshowSpeed, slideshowSpeed, randomOrder, updateRandomOrder } = useSlideShow();
  const { formData, setFormData, error, success, isSubmitting, handleSubmit } = useUserForm();

  return (
    <div className="settings-container">
      <Header
        userName={user?.name ?? null}
        connected={connected}
        onLogout={logoutAndRedirect}
      />
      <main className="settings-main">
        <div className="settings-content">
          <h2 className="settings-title">Admin</h2>
          
          <div className="settings-section">
            <label className="settings-label">
              Create New User
            </label>
            <form onSubmit={handleSubmit} className="settings-user-form">
              {error && (
                <div className="settings-form-error">{error}</div>
              )}
              {success && (
                <div className="settings-form-success">{success}</div>
              )}
              <div className="settings-form-group">
                <label htmlFor="user-name">Name</label>
                <input
                  id="user-name"
                  type="text"
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="settings-form-group">
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="settings-form-group">
                <label htmlFor="user-password">Password</label>
                <input
                  id="user-password"
                  type="password"
                  placeholder="Enter password (min 8 characters)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="settings-form-submit"
              >
                {isSubmitting ? "Creating..." : "Create User"}
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

