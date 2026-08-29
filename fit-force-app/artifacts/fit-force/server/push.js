// Sends a push notification through Expo's push service, which relays it to
// FCM (Android) / APNs (iOS) — this is what lets a notification reach a
// device even while the app is fully closed, since delivery happens at the
// OS level rather than through any code running in the app.

async function sendPush(token, title, body) {
  if (!token) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }),
    });
  } catch (e) {
    console.error('Push send failed:', e.message);
  }
}

module.exports = { sendPush };
