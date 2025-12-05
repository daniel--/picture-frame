/**
 * Shares an image using the Web Share API
 * Falls back to copying the image URL to clipboard if Web Share is not available
 */
export async function shareImage(imageUrl: string, imageName: string): Promise<void> {
  // Convert relative URL to absolute URL
  const absoluteUrl = imageUrl.startsWith("http")
    ? imageUrl
    : `${window.location.origin}${imageUrl}`;

  // Check if Web Share API is available and supports files
  if (navigator.share && navigator.canShare) {
    try {
      // Fetch the image as a blob
      const response = await fetch(absoluteUrl);
      const blob = await response.blob();
      const file = new File([blob], imageName, { type: blob.type });

      // Check if we can share this file
      const shareData: ShareData = {
        title: "Family Photo",
        text: "Check out this photo!",
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      // If sharing fails, fall back to URL sharing
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sharing file:", error);
      } else {
        // User cancelled, don't show error
        return;
      }
    }
  }

  // Fallback: Share URL or copy to clipboard
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Family Photo",
        text: "Check out this photo!",
        url: absoluteUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        // Fall back to clipboard
        await copyToClipboard(absoluteUrl);
      }
    }
  } else {
    // Copy URL to clipboard
    await copyToClipboard(absoluteUrl);
  }
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    // Show a brief notification (you might want to use a toast library)
    alert("Image URL copied to clipboard!");
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    alert("Failed to share image. Please copy the URL manually.");
  }
}
