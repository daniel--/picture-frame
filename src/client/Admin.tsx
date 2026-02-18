import { useState, useEffect } from "react";
import { useAuth, User } from "./hooks/useAuth";
import "./Admin.css";
import { Header } from "./components/Header";
import { useSlideShow } from "./hooks/useSlideShow";
import { SlideshowControls } from "./components/SlideshowControls";
import { useUserForm } from "./hooks/useUserForm";
import { GIT_HASH, BUILD_TIME } from "./version";
import { api, ApiError } from "./api";

interface Invite {
  id: number;
  email: string;
  token: string;
  expiresAt: string;
  used: number;
  createdAt: string | null;
  updatedAt: string | null;
  isExpired: boolean;
  isPending: boolean;
}

export function Admin() {
  const { user, logoutAndRedirect } = useAuth();
  const slideshow = useSlideShow();
  const { formData, setFormData, error, success, isSubmitting, handleSubmit } = useUserForm();
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<number | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  // Fetch users when component mounts or after successful invite
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const data = await api<{ users: User[] }>("/api/users");
        setUsers(data.users);
      } catch (err) {
        if (err instanceof ApiError) {
          setUsersError(err.message);
        } else {
          setUsersError("Failed to load users. Please try again.");
        }
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch invites when component mounts
  useEffect(() => {
    const fetchInvites = async () => {
      setInvitesLoading(true);
      setInvitesError(null);
      try {
        const data = await api<{ invites: Invite[] }>("/api/invites");
        setInvites(data.invites);
      } catch (err) {
        if (err instanceof ApiError) {
          setInvitesError(err.message);
        } else {
          setInvitesError("Failed to load invites. Please try again.");
        }
      } finally {
        setInvitesLoading(false);
      }
    };

    fetchInvites();
  }, []);

  // Refresh users and invites list when invite is successfully sent
  useEffect(() => {
    if (success) {
      const fetchData = async () => {
        try {
          const [usersData, invitesData] = await Promise.all([
            api<{ users: User[] }>("/api/users"),
            api<{ invites: Invite[] }>("/api/invites"),
          ]);
          setUsers(usersData.users);
          setInvites(invitesData.invites);
        } catch (err) {
          // Silently fail - lists will show old data
        }
      };
      fetchData();
    }
  }, [success]);

  const handleResendInvite = async (inviteId: number) => {
    setResendingInviteId(inviteId);
    setInvitesError(null);
    try {
      await api(`/api/invites/${inviteId}/resend`, {
        method: "POST",
      });
      // Refresh invites list
      const data = await api<{ invites: Invite[] }>("/api/invites");
      setInvites(data.invites);
    } catch (err) {
      if (err instanceof ApiError) {
        setInvitesError(err.message);
      } else {
        setInvitesError("Failed to resend invite. Please try again.");
      }
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    setCancellingInviteId(inviteId);
    setInvitesError(null);
    try {
      await api(`/api/invites/${inviteId}`, {
        method: "DELETE",
      });
      // Refresh invites list
      const data = await api<{ invites: Invite[] }>("/api/invites");
      setInvites(data.invites);
    } catch (err) {
      if (err instanceof ApiError) {
        setInvitesError(err.message);
      } else {
        setInvitesError("Failed to cancel invite. Please try again.");
      }
    } finally {
      setCancellingInviteId(null);
    }
  };

  const handleRemoveUser = async (userId: number, userName: string) => {
    if (!confirm(`Remove ${userName}? They will no longer be able to log in.`)) return;
    setRemovingUserId(userId);
    setUsersError(null);
    try {
      await api(`/api/users/${userId}`, { method: "DELETE" });
      const data = await api<{ users: User[] }>("/api/users");
      setUsers(data.users);
    } catch (err) {
      if (err instanceof ApiError) {
        setUsersError(err.message);
      } else {
        setUsersError("Failed to remove user. Please try again.");
      }
    } finally {
      setRemovingUserId(null);
    }
  };

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

          <div className="settings-section">
            <label className="settings-label">Pending Invites</label>
            {invitesError && <div className="settings-form-error">{invitesError}</div>}
            {invitesLoading ? (
              <p className="settings-placeholder">Loading invites...</p>
            ) : invites.filter((inv) => inv.used === 0 && (inv.isPending || inv.isExpired))
                .length === 0 ? (
              <p className="settings-placeholder">No pending or expired invites.</p>
            ) : (
              <div className="settings-invites-list">
                {invites
                  .filter((inv) => inv.used === 0 && (inv.isPending || inv.isExpired))
                  .map((inv) => (
                    <div key={inv.id} className="settings-invite-item">
                      <div className="settings-invite-info">
                        <div className="settings-invite-email">{inv.email}</div>
                        <div className="settings-invite-status">
                          {inv.isPending ? (
                            <span className="settings-invite-status-pending">Pending</span>
                          ) : inv.used === 1 ? (
                            <span className="settings-invite-status-used">Used</span>
                          ) : (
                            <span className="settings-invite-status-expired">Expired</span>
                          )}
                        </div>
                        <div className="settings-invite-date">
                          {inv.isPending
                            ? `Expires: ${new Date(inv.expiresAt).toLocaleDateString()}`
                            : inv.used === 1
                              ? `Used on: ${inv.updatedAt ? new Date(inv.updatedAt).toLocaleDateString() : "N/A"}`
                              : `Expired: ${new Date(inv.expiresAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="settings-invite-actions">
                        <button
                          onClick={() => handleResendInvite(inv.id)}
                          disabled={resendingInviteId === inv.id || inv.used === 1}
                          className="settings-invite-resend-btn"
                        >
                          {resendingInviteId === inv.id ? "Resending..." : "Resend"}
                        </button>
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          disabled={cancellingInviteId === inv.id || inv.used === 1}
                          className="settings-invite-cancel-btn"
                        >
                          {cancellingInviteId === inv.id ? "Cancelling..." : "Cancel"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="settings-section">
            <label className="settings-label">Users</label>
            {usersLoading ? (
              <p className="settings-placeholder">Loading users...</p>
            ) : usersError ? (
              <div className="settings-form-error">{usersError}</div>
            ) : users.length === 0 ? (
              <p className="settings-placeholder">No users yet.</p>
            ) : (
              <div className="settings-users-list">
                {users.map((u) => (
                  <div key={u.id} className="settings-user-item">
                    <div className="settings-user-info">
                      <div className="settings-user-name">{u.name}</div>
                      <div className="settings-user-email">{u.email}</div>
                      <div className="settings-user-date">
                        Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                    {u.id !== user?.id && (
                      <div className="settings-invite-actions">
                        <button
                          onClick={() => handleRemoveUser(u.id, u.name)}
                          disabled={removingUserId === u.id}
                          className="settings-invite-cancel-btn"
                        >
                          {removingUserId === u.id ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
