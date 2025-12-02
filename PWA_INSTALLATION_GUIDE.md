# PWA Installation & Share Target Guide

## Changes Made

### 1. Updated `vite.config.ts`
- Changed `share_target.action` from `/` to `/share-target` (avoids conflicts with precaching)
- Added `purpose: "any"` to icon entries for better compatibility
- Added `injectManifest` configuration with glob patterns
- Removed `workbox` config (handled in service worker with `injectManifest`)

### 2. Updated `src/sw.ts`
- Added navigation route handling for standalone mode
- Changed share target endpoint to `/share-target`
- Improved error handling
- Added workbox-routing for proper navigation handling

### 3. Installed Dependencies
- Added `workbox-routing` package

## Installation Steps

### 1. Build the App
```bash
npm run build
```

### 2. Start the Server
```bash
npm start
```

### 3. Install on Android Chrome

**Critical:** The PWA must be installed as a full app, not just a shortcut!

1. Open the app in Chrome on Android
2. Tap the menu (three dots) → **"Install app"** or **"Add to Home screen"**
3. **Verify Installation:**
   - The app should appear in your **app drawer** (not just home screen)
   - Check **Settings → Apps** - it should be listed there
   - If it only appears on home screen, it's NOT fully installed

### 4. Verify Service Worker

1. Open Chrome DevTools (connect via USB or use remote debugging)
2. Go to **Application → Service Workers**
3. Should show: **"activated and is running"**
4. Check for any errors in the console

### 5. Verify Manifest

1. In DevTools → **Application → Manifest**
2. Scroll to **"Share Target"** section
3. Should show:
   - Action: `/share-target`
   - Method: `POST`
   - Accepts: `image/*`

### 6. Test Share Target

1. Open Gallery/Photos app on Android
2. Select an image
3. Tap **Share**
4. Look for **"Family Photos"** in the share menu
5. If it appears, tap it to share the image

## Troubleshooting

### App Only Appears as Shortcut (Not in App Drawer)

**This is the main issue!** If the app only appears on the home screen:

1. **Check Service Worker:**
   - DevTools → Application → Service Workers
   - Must be "activated and is running"
   - No errors in console

2. **Check Manifest:**
   - DevTools → Application → Manifest
   - Look for installability errors (red text)
   - All required fields should be present

3. **Clear and Reinstall:**
   - Uninstall the PWA
   - Clear Chrome cache (Settings → Privacy → Clear browsing data)
   - Rebuild: `npm run build`
   - Restart server: `npm start`
   - Reinstall the PWA

4. **HTTPS Required:**
   - Must be served over HTTPS (or localhost)
   - Check for mixed content warnings

5. **Icons Must Be Accessible:**
   - Verify icons exist at `/pwa-192x192.png` and `/pwa-512x512.png`
   - Check network tab for 404 errors

### Share Target Doesn't Appear

1. **PWA Must Be Fully Installed:**
   - Must appear in app drawer (see above)

2. **Service Worker Must Be Active:**
   - Check DevTools → Application → Service Workers

3. **Test in DevTools:**
   - Application → Manifest → Share Target → "Test" button
   - This simulates a share

4. **Check Console:**
   - Look for errors when sharing
   - Check Network tab for POST to `/share-target`

### Service Worker Errors

1. **Check Build Output:**
   - Ensure `dist/sw.js` was created
   - Check for TypeScript errors during build

2. **Check Registration:**
   - DevTools → Application → Service Workers
   - Should show the service worker URL
   - Status should be "activated"

3. **Common Issues:**
   - Syntax errors in `src/sw.ts`
   - Missing workbox imports
   - Incorrect file paths

## Verification Checklist

- [ ] App builds without errors
- [ ] Service worker file (`dist/sw.js`) exists
- [ ] Manifest includes `share_target` with action `/share-target`
- [ ] PWA installs and appears in app drawer
- [ ] Service worker is active (no errors)
- [ ] Share target appears in share menu
- [ ] Sharing an image works correctly

## Current Configuration

- **Share Target Action:** `/share-target`
- **Method:** `POST`
- **Content Type:** `multipart/form-data`
- **Accepts:** All image types
- **Service Worker:** Custom with injectManifest strategy
- **Display Mode:** `standalone`

## Next Steps

1. Build and test the app
2. Install on Android Chrome
3. Verify it appears in app drawer
4. Test sharing from Gallery app
5. Check DevTools for any errors

If the app still only appears as a shortcut, check the DevTools installability criteria - it will tell you exactly what's missing!

