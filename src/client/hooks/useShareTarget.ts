import { useEffect, useState, useRef } from "react";
import { api } from "../api";

/**
 * Hook to handle Web Share Target API - processes files shared to the app
 * The service worker intercepts the POST and stores files, then we process them here
 */
// Shared state across all hook instances to prevent duplicates
const globalProcessedTimestamps = new Set<number>();
const isProcessingLock = { current: false };

// Helper function to clear specific timestamp from IndexedDB
async function clearFromIndexedDB(timestamp: number) {
  try {
    const db = await openIndexedDB();
    const transaction = db.transaction(["sharedFiles"], "readwrite");
    const store = transaction.objectStore("sharedFiles");
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const records = getAllRequest.result;
      records.forEach((record) => {
        if (record.timestamp === timestamp) {
          store.delete(record.id!);
        }
      });
    };
  } catch (error) {
    console.error("Error clearing from IndexedDB:", error);
  }
}

export function useShareTarget() {
  const [isProcessing, setIsProcessing] = useState(false);
  const hasProcessedMessage = useRef(false);

  useEffect(() => {
    // Listen for messages from service worker about shared files
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "SHARE_TARGET" && event.data.files && event.data.timestamp) {
        // Check if we've already processed this share (global check)
        if (globalProcessedTimestamps.has(event.data.timestamp)) {
          console.log("Share already processed (timestamp check), skipping");
          // Clear from IndexedDB if already processed
          await clearFromIndexedDB(event.data.timestamp);
          return;
        }

        // Check processing lock
        if (isProcessingLock.current) {
          console.log("Already processing a share, skipping");
          return;
        }

        // Mark that we received a message (so we don't check IndexedDB)
        hasProcessedMessage.current = true;
        
        // Clear from IndexedDB BEFORE processing to prevent race conditions
        await clearFromIndexedDB(event.data.timestamp);
        
        // Mark as processing
        globalProcessedTimestamps.add(event.data.timestamp);
        isProcessingLock.current = true;
        
        // Process files
        await processSharedFiles(event.data.files, event.data.timestamp);
      }
    };

    // Check for shared files in IndexedDB (stored by service worker)
    // Only used if app wasn't open when share happened
    const checkIndexedDB = async () => {
      // Wait longer to ensure message handler has a chance to run first
      await new Promise(resolve => setTimeout(resolve, 500));

      // If we already processed a message, don't check IndexedDB
      if (hasProcessedMessage.current) {
        return;
      }

      try {
        const db = await openIndexedDB();
        const transaction = db.transaction(["sharedFiles"], "readwrite");
        const store = transaction.objectStore("sharedFiles");
        const request = store.getAll();

        request.onsuccess = async () => {
          const records = request.result;
          if (records.length > 0) {
            // Process the most recent share
            const latest = records.sort((a, b) => b.timestamp - a.timestamp)[0];
            
            // Check if we've already processed this share (global check)
            if (globalProcessedTimestamps.has(latest.timestamp)) {
              console.log("Share already processed (IndexedDB check), skipping");
              // Clear already processed files
              await clearFromIndexedDB(latest.timestamp);
              return;
            }

            // Check processing lock
            if (isProcessingLock.current) {
              console.log("Already processing (IndexedDB check), skipping");
              return;
            }

            // Clear from IndexedDB BEFORE processing to prevent race conditions
            await clearFromIndexedDB(latest.timestamp);
            
            // Mark as processing
            globalProcessedTimestamps.add(latest.timestamp);
            isProcessingLock.current = true;
            
            // Process files
            await processSharedFiles(latest.files, latest.timestamp);
          }
        };
      } catch (error) {
        console.error("Error checking IndexedDB for shared files:", error);
      }
    };

    const processSharedFiles = async (files: Array<{ name: string; type: string; size: number; data: Uint8Array | number[] }>, timestamp: number) => {
      if (files.length === 0) {
        isProcessingLock.current = false;
        return;
      }

      setIsProcessing(true);
      console.log(`Processing share with timestamp: ${timestamp}`);

      try {
        for (const fileData of files) {
          // Convert Uint8Array or number array back to File
          let dataArray: Uint8Array;
          if (fileData.data instanceof Uint8Array) {
            dataArray = fileData.data;
          } else if (Array.isArray(fileData.data)) {
            dataArray = new Uint8Array(fileData.data);
          } else {
            console.error("Invalid file data format");
            continue;
          }
          
          // Create a new ArrayBuffer from the Uint8Array to ensure compatibility
          const buffer = new ArrayBuffer(dataArray.byteLength);
          new Uint8Array(buffer).set(dataArray);
          const file = new File([buffer], fileData.name, { type: fileData.type });
          const formData = new FormData();
          formData.append("image", file);

          await api("/api/images/upload", {
            method: "POST",
            body: formData,
          });
        }
        console.log(`Successfully processed share with timestamp: ${timestamp}`);
      } catch (error) {
        console.error("Failed to process shared files:", error);
        alert("Failed to upload shared image(s). Please try again.");
        // Remove timestamp on error so it can be retried
        globalProcessedTimestamps.delete(timestamp);
      } finally {
        setIsProcessing(false);
        isProcessingLock.current = false;
      }
    };

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    // Check IndexedDB on mount
    checkIndexedDB();

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, []);

  return { isProcessing };
}

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("shareTargetDB", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("sharedFiles")) {
        db.createObjectStore("sharedFiles", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

