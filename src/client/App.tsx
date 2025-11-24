import "./App.css";

import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Login from "./Login";
import Slideshow from "./Slideshow";
import { useAuth } from "./useAuth";
import { api, ApiError } from "./api";
import { useWebSocket } from "./useWebSocket";

interface ImageItem {
  id: number;
  filename: string;
  originalName: string;
  size: number;
  thumbnailPath: string | null;
  displayOrder: number;
}

interface SortableImageItemProps {
  image: ImageItem;
  slideshowState: { currentImageId: number | null; isPlaying: boolean };
  slideshowGoto: (id: number) => void;
  handleDelete: (id: number) => void;
  deleting: number | null;
}

function SortableImageItem({
  image,
  slideshowState,
  slideshowGoto,
  handleDelete,
  deleting,
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: image.id,
    animateLayoutChanges: () => true,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging 
      ? 'none' 
      : (transition || 'transform 300ms cubic-bezier(0.2, 0, 0.2, 1), opacity 200ms ease'),
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "0.75rem",
        backgroundColor: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
      className="image-card"
    >
      <div className="image-container" style={{ position: "relative", marginBottom: "0.5rem", width: "100%", overflow: "hidden" }}>
        {image.thumbnailPath ? (
          <img
            src={image.thumbnailPath}
            alt={image.originalName}
            className="image-thumbnail"
            style={{
              width: "100%",
              height: "auto",
              minHeight: "150px",
              maxHeight: "250px",
              objectFit: "cover",
              borderRadius: "4px",
              display: "block",
              maxWidth: "100%",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "150px",
              backgroundColor: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
            }}
          >
            No thumbnail
          </div>
        )}
        <div
          className="image-overlay-buttons"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            display: "flex",
            gap: "0.5rem",
            transition: "opacity 0.2s ease",
            zIndex: 10,
            pointerEvents: "auto",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              slideshowGoto(image.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              border: "none",
              borderRadius: "4px",
              backgroundColor: image.id === slideshowState.currentImageId ? "#2196f3" : "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              cursor: "pointer",
              minHeight: "36px",
              fontWeight: "500",
              backdropFilter: "blur(4px)",
            }}
          >
            {image.id === slideshowState.currentImageId ? "● Current" : "Set Current"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(image.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={deleting === image.id}
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "rgba(244, 67, 54, 0.9)",
              color: "#fff",
              cursor: deleting === image.id ? "not-allowed" : "pointer",
              opacity: deleting === image.id ? 0.5 : 1,
              minHeight: "36px",
              fontWeight: "500",
              backdropFilter: "blur(4px)",
            }}
          >
            {deleting === image.id ? "Deleting..." : "Delete"}
          </button>
        </div>
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          style={{
            position: "absolute",
            top: "0.5rem",
            left: "0.5rem",
            width: "32px",
            height: "32px",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isDragging ? "grabbing" : "grab",
            zIndex: 5,
            opacity: 0.5,
            transition: "opacity 0.2s ease",
            backdropFilter: "blur(4px)",
            touchAction: "none",
          }}
          className="drag-handle"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="white"
            style={{ pointerEvents: "none" }}
          >
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="13" cy="3" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="13" cy="8" r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
            <circle cx="13" cy="13" r="1.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Home() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const {
    images,
    connected,
    error: wsError,
    reorderImages,
    slideshowState,
    slideshowNext,
    slideshowPrevious,
    slideshowPlay,
    slideshowPause,
    slideshowGoto,
  } = useWebSocket();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [localImages, setLocalImages] = useState<typeof images>([]);
  
  // Initialize local images when images change (but not during reordering)
  useEffect(() => {
    if (!reordering) {
      setLocalImages(images);
    }
  }, [images, reordering]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDelete = async (imageId: number) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    setDeleting(imageId);
    try {
      await api(`/api/images/${imageId}`, {
        method: "DELETE",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        alert(`Failed to delete image: ${error.message}`);
      } else {
        alert("Failed to delete image. Please try again.");
      }
    } finally {
      setDeleting(null);
    }
  };


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localImages.findIndex((img) => img.id === active.id);
    const newIndex = localImages.findIndex((img) => img.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    setReordering(true);
    
    // Calculate new order
    const newImages = [...localImages];
    const [draggedItem] = newImages.splice(oldIndex, 1);
    newImages.splice(newIndex, 0, draggedItem);
    
    // Calculate new display orders based on the new positions
    const newOrders = newImages.map((img, index) => ({
      id: img.id,
      displayOrder: index + 1, // displayOrder is 1-indexed
    }));
    
    // Wait for dnd-kit's animation to complete before updating local state
    // This ensures items animate smoothly from their current positions
    setTimeout(() => {
      setLocalImages(newImages);
      reorderImages(newOrders);
      setTimeout(() => setReordering(false), 100);
    }, 350);
  };

  return (
    <div className="App">
      <div className="container">
        <div style={{ 
          marginBottom: "0.5rem", 
          display: "flex", 
          alignItems: "center", 
          gap: "0.75rem",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: connected ? "#4caf50" : "#f44336",
              }}
            />
            <span style={{ fontSize: "0.8rem", color: "#666" }}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {wsError && (
            <span style={{ fontSize: "0.8rem", color: "#f44336" }}>
              {wsError}
            </span>
          )}
        </div>

        <div className="home-content" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
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
            style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", minHeight: "44px" }}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </button>

          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", minHeight: "44px" }}
          >
            Logout
          </button>

          {images.length > 0 && (
            <Link
              to="/slideshow"
              className="btn"
              style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", backgroundColor: "#2196f3", display: "block", textDecoration: "none", textAlign: "center", minHeight: "44px", lineHeight: "1.5" }}
            >
              View Slideshow
            </Link>
          )}
        </div>
          
        {uploadError && (
          <div className="error-message" style={{ marginTop: "0.5rem", marginBottom: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>
            {uploadError}
          </div>
        )}
        
        {uploadSuccess && (
          <div
            style={{
              marginTop: "0.5rem",
              marginBottom: "0.5rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "#e8f5e9",
              border: "1px solid #c8e6c9",
              borderRadius: "6px",
              color: "#2e7d32",
              fontSize: "0.8rem",
            }}
          >
            {uploadSuccess}
          </div>
        )}

        {images.length > 0 && (
          <div style={{ marginTop: "0.5rem", padding: "0.5rem", backgroundColor: "#f5f5f5", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={slideshowState.isPlaying ? slideshowPause : slideshowPlay}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "#fff",
                cursor: "pointer",
                minHeight: "44px",
                minWidth: "44px",
              }}
            >
              {slideshowState.isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={slideshowPrevious}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "#fff",
                cursor: "pointer",
                minHeight: "44px",
                minWidth: "44px",
              }}
            >
              ⏮
            </button>
            <button
              onClick={slideshowNext}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "#fff",
                cursor: "pointer",
                minHeight: "44px",
                minWidth: "44px",
              }}
            >
              ⏭
            </button>
            {slideshowState.currentImageId && (
              <span style={{ fontSize: "0.875rem", color: "#666", marginLeft: "0.5rem", fontWeight: "500" }}>
                {images.findIndex(img => img.id === slideshowState.currentImageId) + 1} / {images.length}
              </span>
            )}
          </div>
        )}

        {images.length > 0 && (
          <div style={{ marginTop: "1rem", width: "100%", boxSizing: "border-box" }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localImages.map((img) => img.id)}
                strategy={rectSortingStrategy}
              >
                <div className="images-grid">
                  {localImages.map((image) => (
                    <SortableImageItem
                      key={image.id}
                      image={image}
                      slideshowState={slideshowState}
                      slideshowGoto={slideshowGoto}
                      handleDelete={handleDelete}
                      deleting={deleting}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {images.length === 0 && connected && (
          <div style={{ marginTop: "1rem", textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
            No images yet. Upload your first image!
          </div>
        )}
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
        <Route path="/slideshow" element={<Slideshow />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
