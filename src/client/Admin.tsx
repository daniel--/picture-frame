import { useAuth } from "./hooks/useAuth";
import "./Admin.css";
import { Header } from "./components/Header";
import { useSlideShow } from "./hooks/useSlideShow";
import { SlideshowControls } from "./components/SlideshowControls";
import { useUserForm } from "./hooks/useUserForm";
import { GIT_HASH, BUILD_TIME } from "./version";

export function Admin() {
  const { user, logoutAndRedirect } = useAuth();
  const slideshow = useSlideShow();
  const { formData, setFormData, error, success, isSubmitting, handleSubmit } = useUserForm();

  return (
    <div className="settings-container">
      <Header
        userName={user?.name ?? null}
        connected={slideshow.connected}
        onLogout={logoutAndRedirect}
      />
      <main className="settings-main">
        <div className="settings-content">
          <h2 className="settings-title">Admin</h2>

          <div className="settings-section">
            <label className="settings-label">Invite New User</label>
            <form onSubmit={handleSubmit} className="settings-user-form">
              {error && <div className="settings-form-error">{error}</div>}
              {success && <div className="settings-form-success">{success}</div>}
              <div className="settings-form-group">
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="settings-form-submit">
                {isSubmitting ? "Sending Invite..." : "Send Invite"}
              </button>
            </form>
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
              An email with a registration link will be sent to the user. The invite expires in 7
              days.
            </p>
          </div>

          <div className="settings-version-info">
            <div className="settings-version-item">
              <span className="settings-version-label">Version:</span>
              <code className="settings-version-value">{GIT_HASH}</code>
            </div>
            <div className="settings-version-item">
              <span className="settings-version-label">Built:</span>
              <span className="settings-version-value">
                {new Date(BUILD_TIME).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </main>
      <SlideshowControls
        isPlaying={slideshow.isPlaying}
        onPrevious={slideshow.previous}
        onNext={slideshow.next}
        onPlay={slideshow.play}
        onPause={slideshow.pause}
        randomOrder={slideshow.randomOrder}
        onToggleShuffle={
          slideshow.randomOrder !== null
            ? () => slideshow.updateRandomOrder(!slideshow.randomOrder)
            : undefined
        }
        slideshowSpeed={slideshow.speed}
        onSpeedChange={slideshow.updateSpeed}
        disabled={slideshow.images.length === 0}
      />
    </div>
  );
}
