// Service Worker — מערכת סידור עבודה (PWA)
// תפקיד עיקרי: לאפשר התקנה למסך הבית. אין caching אגרסיבי כדי שעדכונים מ-GitHub יופיעו מיד.

const SW_VERSION = 'sidur-v1';

self.addEventListener('install', (e) => {
  // הפעלה מיידית של גרסה חדשה
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Network-first: תמיד מנסה רשת קודם (כדי לקבל עדכונים), נופל ל-cache רק אם אין רשת
self.addEventListener('fetch', (e) => {
  // לא מתערבים בבקשות ל-Supabase או ל-API — תמיד דרך הרשת
  if (e.request.url.includes('supabase.co') || e.request.method !== 'GET') {
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// תמיכה עתידית בהתראות Push (יופעל בשלב OneSignal)
self.addEventListener('push', (e) => {
  let data = { title: 'סידור עבודה', body: 'יש עדכון חדש' };
  try { if (e.data) data = e.data.json(); } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'סידור עבודה', {
      body: data.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      dir: 'rtl',
      lang: 'he'
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
