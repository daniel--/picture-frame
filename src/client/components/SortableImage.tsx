import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef } from "react";
import { Image } from "../../server/db/schema.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import { DragHandleIcon, StarIcon, DeleteIcon } from "./icons/index.js";

interface SortableImageProps {
  image: Image;
  isCurrent: boolean;
  isActive: boolean;
  onSelect?: (imageId: number) => void;
  onDelete?: (imageId: number) => void;
  onToggleActive: (imageId: number | null) => void;
}

export function SortableImage({ image, isCurrent, isActive, onSelect, onDelete, onToggleActive }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const isMobile = useIsMobile();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(image.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete && window.confirm("Are you sure you want to delete this image?")) {
      onDelete(image.id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobile && e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current) {
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Only toggle if it was a tap (minimal movement, quick touch)
    // and not a scroll or drag gesture
    const wasTap = deltaX < 10 && deltaY < 10 && deltaTime < 500;

    if (wasTap) {
      // Toggle: if this image is active, deactivate it; otherwise activate it
      onToggleActive(isActive ? null : image.id);
    }

    touchStartRef.current = null;
  };

  // On mobile, use handle for dragging; on desktop, drag the whole image
  const imageListeners = isMobile ? {} : listeners;
  const handleListeners = isMobile ? listeners : {};

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      className={`sortable-image-container ${isActive ? 'active' : ''}`}
    >
      <img
        src={image.thumbnailPath ?? ""}
        alt=""
        className={`grid-image ${isCurrent ? 'grid-image-current' : ''}`}
        {...imageListeners}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      {/* Drag handle for mobile */}
      <div
        className="grid-image-drag-handle"
        {...handleListeners}
      >
        <DragHandleIcon width={20} height={20} />
      </div>
      {onSelect && (
        <button
          className="grid-image-select-button"
          onClick={handleSelectClick}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          title="Select as current slideshow image"
          aria-label="Select as current slideshow image"
        >
          <StarIcon width={16} height={16} />
        </button>
      )}
      {onDelete && (
        <button
          className="grid-image-delete-button"
          onClick={handleDeleteClick}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          title="Delete image"
          aria-label="Delete image"
        >
          <DeleteIcon width={16} height={16} />
        </button>
      )}
    </div>
  );
}

