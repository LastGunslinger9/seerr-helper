# seerr-helper

A Chrome extension that enhances Letterboxd film pages with Overseerr / Jellyseerr request status and HD/4K request buttons — without leaving the page.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)

## Features

- Shows HD and 4K availability / request status directly in the Letterboxd sidebar
- Request movies in HD or 4K with one click
- Displays who made the request and when
- Shows theatrical, digital, and physical release dates
- Works with both Overseerr and Jellyseerr

## Setup

1. Install the extension from the Chrome Web Store *(or load unpacked from `dist/`)*
2. Click the toolbar icon to open Settings
3. Enter your Seerr base URL (e.g. `http://192.168.1.10:5055`) and API key
4. Save — then visit any Letterboxd film page

## Development

```
npm install
npm run build   # compile to dist/
npm test        # run test suite
```

Load the extension by pointing Chrome's **Load unpacked** at the `dist/` folder.

## Requirements

- A running [Overseerr](https://overseerr.dev) or [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) instance
- A Seerr API key (Settings → General → API Key)

## Privacy

This extension does not collect, store, or transmit any personal data. The only data saved locally is the Seerr base URL and API key you enter in Settings, which are used solely to communicate with your own self-hosted server. No analytics, tracking, or third-party services are used.
