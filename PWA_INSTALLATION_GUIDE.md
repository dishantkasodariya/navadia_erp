# Navadia PWA Installation Guide

This document provides step-by-step instructions on how to install the **Navadia** Progressive Web App (PWA) on both **Android** and **iOS (Apple)** devices.

---

## Table of Contents
1. [Overview](#overview)
2. [How to Install on iOS (iPhone & iPad)](#how-to-install-on-ios-iphone--ipad)
3. [How to Install on Android](#how-to-install-on-android)
4. [How to Install on Desktop (Chrome/Edge/Safari)](#how-to-install-on-desktop-chromeedgesafari)
5. [Technical Troubleshooting](#technical-troubleshooting)

---

## 1. Overview
A Progressive Web App (PWA) behaves like a native application but runs directly through the web browser. It has several advantages:
- No app store download required.
- Fast launch from the device Home Screen.
- Premium, full-screen experience (no browser address bar).
- Automatic updates (always runs the latest version).

---

## 2. How to Install on iOS (iPhone & iPad)

Apple iOS (Safari) does not support automatic automatic pop-up prompts (like Android does) to install PWAs. Instead, users must install it manually via Safari's Share menu.

### Step-by-Step Instructions:

1. **Open Safari**: Open the default **Safari** browser on your iPhone or iPad. 
   > [!IMPORTANT]  
   > Third-party browsers (like Chrome, Firefox, or in-app browsers in Facebook/Instagram) do not support the installation menu on iOS. You **must** open it in the native **Safari** browser.

2. **Navigate to the App**: Go to the URL: `https://navadia-vm27.onrender.com/` (or your local/production URL).

3. **Tap the Share Button**: Locate the **Share** icon in Safari (a square box with an arrow pointing upwards) at the bottom center of the screen (on iPhone) or top right (on iPad).
   
   ![iOS Share Icon](https://img.icons8.com/ios/50/000000/share.png)

4. **Add to Home Screen**: Scroll down through the share options menu and tap on **"Add to Home Screen"** (marked with a `+` icon).

5. **Confirm Details**: Enter a name for the shortcut (default is "navadia") and tap **"Add"** in the top right corner.

6. **Launch**: The Navadia icon will now appear on your home screen, operating like a standalone native app!

---

## 3. How to Install on Android

Android devices running Google Chrome, Samsung Internet, or Opera support automatic install prompts.

### Method A: The Install Prompt Banner (Recommended)
1. Open the app in **Google Chrome** on your Android device.
2. After a few seconds, a banner at the bottom of the screen will appear saying **"Add Navadia to Home screen"**.
3. Tap the banner and select **"Install"**.

### Method B: Manual Chrome Installation
If the banner does not appear automatically:
1. Open **Google Chrome** and navigate to your app URL.
2. Tap the **Three Dots Menu** (top-right corner of the Chrome browser).
3. Select **"Install App"** (or **"Add to Home screen"**).
4. Tap **"Install"** to confirm.

---

## 4. How to Install on Desktop (Chrome/Edge/Safari)

You can also run Navadia as a desktop application on Windows, macOS, or Linux.

### Google Chrome or Microsoft Edge (Desktop):
1. Navigate to the app URL on your computer.
2. Look at the right side of the address bar at the top: you will see an **Install Icon** (a computer screen with a down arrow).
3. Click the icon and choose **"Install"**.
4. The app will launch in a dedicated borderless window, and a shortcut will be created on your Desktop/Applications list.

---

## 5. Technical Troubleshooting

If the PWA installation option is missing or disabled:

1. **Verify HTTPS**: PWAs require secure connections. Ensure you are accessing the app over `https://` (except for `localhost`).
2. **Clear Cache**: In Safari, go to *Settings > Safari > Clear History and Website Data*, then reload the page.
3. **Apple iOS Limitations**: iOS restricts PWA features in "Private Browsing" mode. Ensure you are using a standard Safari tab.
4. **App Settings Check**: Ensure `manifest.json` and Apple touch icons are linked correctly inside `<head>` in `index.html`:
   ```html
   <link rel="manifest" href="/manifest.json" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="default" />
   <meta name="apple-mobile-web-app-title" content="navadia" />
   <link rel="apple-touch-icon" href="/logo.png" />
   ```
