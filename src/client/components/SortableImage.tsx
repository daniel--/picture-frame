import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Image } from "../../server/db/schema.js";
import { useIsMobile } from "../hooks/useMediaQuery.js";
import { DragHandleIcon, StarIcon, DeleteIcon } from "./icons/index.js";

interface SortableImageProps {
  image: Image;
  isCurrent: boolean;
  onSelect?: (imageId: number) => void;
  onDelete?: (imageId: number) => void;
}

export function SortableImage({ image, isCurrent, onSelect, onDelete }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const isMobile = useIsMobile();

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

  // On mobile, use handle for dragging; on desktop, drag the whole image
  const imageListeners = isMobile ? {} : listeners;
  const handleListeners = isMobile ? listeners : {};

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="sortable-image-container">
      <img
        src={image.thumbnailPath ?? ""}
        alt=""
        className={`grid-image ${isCurrent ? 'grid-image-current' : ''}`}
        {...imageListeners}
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

