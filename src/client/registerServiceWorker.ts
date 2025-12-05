import { Workbox } from "workbox-window";

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    const wb = new Workbox("/sw.js");

    // Add event listeners to handle service worker lifecycle
    wb.addEventListener("waiting", () => {
      console.log("New service worker is waiting...");
      // Automatically skip waiting and reload to activate new version
      wb.messageSkipWaiting();
    });

    wb.addEventListener("controlling", () => {
      console.log("New service worker is now controlling the page");
      // Reload the page to ensure all assets are updated
      window.location.reload();
    });

    wb.addEventListener("activated", (event) => {
      // New service worker activated
      if (!event.isUpdate) {
        console.log("Service worker activated for the first time");
      } else {
        console.log("Service worker updated successfully");
      }
    });

    // Register the service worker
    wb.register()
      .then((registration) => {
        console.log("Service worker registered:", registration);

        // Check for updates every hour
        setInterval(
          () => {
            registration?.update();
          },
          60 * 60 * 1000
        ); // 1 hour
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  }
}
