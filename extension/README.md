# ◈ Recrunex Chrome Extension

Quick-access job search from any tab. Get notified when fresh jobs are posted.

## Install in Chrome (Dev Mode)

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this project
5. Pin the ◈ icon to your toolbar

## Requirements

Backend must be running:
```bash
cd backend
node server.js
```

## Features

| Feature | Description |
|---|---|
| 🔍 Quick Search | Search jobs by role + location from any tab |
| 🔥 Time Filter | Filter by 24h / 48h / 7 days / All |
| 🔔 Job Alerts | Set keyword alerts — get Chrome notifications |
| 💾 Remembers last search | Auto-fills your previous search |
| 🚀 Open Full App | One click to open Recrunex web app |

## How Alerts Work

1. Click the 🔔 bell icon in the popup
2. Enter keyword + optional location
3. Choose check frequency (30min / 1h / 3h / 6h)
4. Chrome will notify you when fresh matching jobs appear

> Alerts only fire when your computer is on and Chrome is running.