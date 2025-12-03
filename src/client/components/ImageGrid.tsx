import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useState, useEffect } from "react";
import { Image } from "../../server/db/schema.js";
import { SortableImage } from "./SortableImage";
import { UploadPlaceholder } from "./UploadPlaceholder";
import "./ImageGrid.css";

interface ImageGridProps {
  images: Image[];
  currentImageId: number | null;
  onReorder: (imageOrders: Array<{ id: number; displayOrder: number }>) => void;
  onSelectImage?: (imageId: number) => void;
  onDeleteImage?: (imageId: number) => void;
}

export function ImageGrid({
  images,
  currentImageId,
  onReorder,
  onSelectImage,
  onDeleteImage,
}: ImageGridProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [items, setItems] = useState<Image[]>(images);
  const [activeImageId, setActiveImageId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync items with images from props
  useEffect(() => {
    setItems(images);
  }, [images]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        setItems(newItems);

        // Update displayOrder for all images
        const imageOrders = newItems.map((item, index) => ({
          id: item.id,
          displayOrder: index,
        }));

        onReorder(imageOrders);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeImage = activeId ? items.find((img) => img.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items.map((img) => img.id)} strategy={rectSortingStrategy}>
        <div className="images-grid">
          <UploadPlaceholder />
          {items.map((image) => (
            <SortableImage 
              key={image.id} 
              image={image} 
              isCurrent={currentImageId === image.id}
              isActive={activeImageId === image.id}
              onSelect={onSelectImage}
              onDelete={onDeleteImage}
              onToggleActive={setActiveImageId}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeImage ? (
          <img
            src={activeImage.thumbnailPath ?? ""}
            alt=""
            className="grid-image"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

