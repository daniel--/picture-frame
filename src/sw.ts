/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

// Skip waiting to activate new service worker immediately
self.skipWaiting();

// Take control of all clients immediately
clientsClaim();

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Handle navigation requests (important for standalone mode)
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler, {
  allowlist: [/^\/$/],
});
registerRoute(navigationRoute);

// Handle Web Share Target API - MUST be registered before other fetch handlers
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle share target POST requests to /share-target
  if (
    event.request.method === "POST" &&
    url.origin === self.location.origin &&
    url.pathname === "/share-target"
  ) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll("image") as File[];

          if (files.length === 0) {
            console.warn("Share target: No files found in form data");
            return Response.redirect(self.location.origin + "/", 303);
          }

          console.log(`Share target: Processing ${files.length} file(s)`);

          // Convert files to ArrayBuffer for storage
          const fileData = await Promise.all(
            Array.from(files).map(async (file) => {
              const arrayBuffer = await file.arrayBuffer();
              return {
                name: file.name || `shared-image-${Date.now()}.jpg`,
                type: file.type || "image/jpeg",
                size: file.size,
                data: Array.from(new Uint8Array(arrayBuffer)),
              };
            })
          );

          // Store timestamp for deduplication
          const timestamp = Date.now();

          // Store in IndexedDB
          const db = await openIndexedDB();
          const transaction = db.transaction(["sharedFiles"], "readwrite");
          const store = transaction.objectStore("sharedFiles");
          await store.add({ files: fileData, timestamp: timestamp });

          // Notify only focused/visible clients to prevent duplicates
          // Only send to one client to avoid multiple tabs processing the same share
          const clients = await self.clients.matchAll({
            includeUncontrolled: false,
            type: "window",
          });

          // Prefer focused client, otherwise use the first one
          const focusedClient = clients.find((client) => client.focused);
          const targetClient = focusedClient || clients[0];

          if (targetClient) {
            targetClient.postMessage({
              type: "SHARE_TARGET",
              files: fileData,
              timestamp: timestamp,
            });
            console.log(`Sent share message to client: ${targetClient.id}`);
          } else {
            console.log("No clients available, will process from IndexedDB on next open");
          }

          // Redirect to the app (or open if not already open)
          if (clients.length === 0) {
            await self.clients.openWindow(self.location.origin + "/");
          }

          return Response.redirect(self.location.origin + "/", 303);
        } catch (error) {
          console.error("Error handling share target:", error);
          return Response.redirect(self.location.origin + "/", 303);
        }
      })()
    );
    return; // Prevent other handlers from processing this request
  }
});

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
