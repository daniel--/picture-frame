import "./App.css";

import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Login from "./Login";
import { useAuth } from "./useAuth";
import { api, ApiError } from "./api";

function Home() {
  const { logout, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset messages
    setUploadError(null);
    setUploadSuccess(null);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api<{
        id: number;
        filename: string;
        originalName: string;
        url: string;
        thumbnailUrl: string | null;
      }>("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      setUploadSuccess(`Image "${response.originalName}" uploaded successfully!`);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setUploadError(error.message);
      } else {
        setUploadError("Failed to upload image. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Welcome</h1>
        {user && (
          <p className="welcome-message">
            Welcome, {user.name || user.email}!
          </p>
        )}
        <div className="home-content">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            onClick={handleFileSelect}
            disabled={uploading}
            className="btn"
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </button>
          
          {uploadError && (
            <div className="error-message" style={{ marginTop: "1rem" }}>
              {uploadError}
            </div>
          )}
          
          {uploadSuccess && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.875rem",
                backgroundColor: "#e8f5e9",
                border: "1px solid #c8e6c9",
                borderRadius: "8px",
                color: "#2e7d32",
                fontSize: "0.9rem",
              }}
            >
              {uploadSuccess}
            </div>
          )}

          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ marginTop: "1rem" }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null; // Prevent flash of content before redirect
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
