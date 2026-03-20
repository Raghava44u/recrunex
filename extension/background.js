// ══ Recrunex Background Service Worker ═══════════════════════════════════════
// Handles job alert alarms and notifications

const API_BASE = 'http://localhost:3001/api';

// ── Alarm handler ──────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm.name.startsWith('job_alert_')) return;
  await checkAlerts();
});

// ── On install: set up periodic check ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Recrunex] Extension installed');
  // Check alerts every 30 min as a fallback
  chrome.alarms.create('recrunex_heartbeat', { periodInMinutes: 30 });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'recrunex_heartbeat') checkAlerts();
});

// ── Check all active alerts ────────────────────────────────────────────────────
async function checkAlerts() {
  const data  = await chrome.storage.local.get(['alerts', 'seenJobs']);
  const alerts  = data.alerts  || [];
  const seenJobs = new Set(data.seenJobs || []);

  for (const alert of alerts) {
    try {
      const params = new URLSearchParams({ query: alert.keyword });
      if (alert.location) params.set('location', alert.location);

      const res  = await fetch(`${API_BASE}/jobs?${params}`);
      if (!res.ok) continue;
      const json = await res.json();

      // Find jobs posted in last 24h that we haven't notified about
      const fresh = (json.jobs || []).filter(j =>
        j.isRecent && !seenJobs.has(String(j.id))
      );

      if (fresh.length > 0) {
        // Mark as seen
        fresh.forEach(j => seenJobs.add(String(j.id)));
        await chrome.storage.local.set({ seenJobs: [...seenJobs] });

        // Fire notification
        const first = fresh[0];
        chrome.notifications.create(`job_${Date.now()}`, {
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: `🔥 ${fresh.length} new job${fresh.length>1?'s':''} — "${alert.keyword}"`,
          message: `${first.title} at ${first.company} · ${first.primaryLocation}`,
          buttons: [{ title: 'View Jobs' }],
          priority: 2,
        });
      }
    } catch(e) {
      console.error('[Recrunex alert check]', e.message);
    }
  }
}

// ── Notification click → open app ─────────────────────────────────────────────
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (btnIdx === 0) {
    chrome.tabs.create({ url: 'http://127.0.0.1:5500/frontend/' });
  }
  chrome.notifications.clear(notifId);
});

chrome.notifications.onClicked.addListener(notifId => {
  chrome.tabs.create({ url: 'http://127.0.0.1:5500/frontend/' });
  chrome.notifications.clear(notifId);
});