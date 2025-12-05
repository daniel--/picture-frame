import { useRef, useImperativeHandle, forwardRef, useState } from "react";
import { api } from "../api";
import "./UploadPlaceholder.css";

export interface UploadPlaceholderRef {
  reset: () => void;
}

interface UploadPlaceholderProps {
  // No props needed - component is self-contained
}

export const UploadPlaceholder = forwardRef<UploadPlaceholderRef, UploadPlaceholderProps>(
  (_, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    }));

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      setIsUploading(true);
      setUploadProgress({ current: 0, total: fileArray.length });

      try {
        // Upload files sequentially to avoid overwhelming the server
        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i];
          const formData = new FormData();
          formData.append("image", file);

          await api("/api/images/upload", {
            method: "POST",
            body: formData,
          });

          setUploadProgress({ current: i + 1, total: fileArray.length });
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Failed to upload image(s):", error);
        alert(
          `Failed to upload ${fileArray.length > 1 ? "some images" : "image"}. Please try again.`
        );
      } finally {
        setIsUploading(false);
        setUploadProgress({ current: 0, total: 0 });
      }
    };

    return (
      <>
        <div
          className="grid-upload-placeholder"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          aria-label="Upload new image(s)"
        >
          {isUploading ? (
            <div className="upload-placeholder-content">
              <div className="upload-spinner"></div>
              <span>
                {uploadProgress.total > 1
                  ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                  : "Uploading..."}
              </span>
            </div>
          ) : (
            <div className="upload-placeholder-content">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="upload-icon"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add Image(s)</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </>
    );
  }
);
