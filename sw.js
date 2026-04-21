/**
 * ==========================================
 * SERVICE WORKER - Toko Mas Merysa PWA
 * Version: 2.0.0 Premium
 * ==========================================
 */

const CACHE_NAME = 'merysa-v2.0.0';
const STATIC_CACHE = 'merysa-static-v1';
const DYNAMIC_CACHE = 'merysa-dynamic-v1';
const IMAGE_CACHE = 'merysa-images-v1';

// Assets yang akan di-cache saat install (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Images yang akan di-cache
const IMAGES = [
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ==========================================
// INSTALL EVENT - Cache App Shell
// ==========================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching App Shell');
        return cache.addAll(APP_SHELL).catch(err => {
          console.log('[SW] App Shell cache failed (non-critical):', err);
        });
      }),
      
      // Cache images
      caches.open(IMAGE_CACHE).then((cache) => {
        console.log('[SW] Caching Images');
        return cache.addAll(IMAGES).catch(err => {
          console.log('[SW] Image cache failed (non-critical):', err);
        });
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// ==========================================
// ACTIVATE EVENT - Clean old caches
// ==========================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && 
                     cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// ==========================================
// FETCH EVENT - Network First with Cache Fallback
// ==========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;
  
  // ==========================================
  // STRATEGY 1: Cache First - Images & Fonts
  // ==========================================
  if (request.destination === 'image' || 
      request.destination === 'font' ||
      url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
    
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => {});
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Return placeholder image if offline
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#1a1a1a" width="400" height="300"/><text fill="#666" x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16">Gambar tidak tersedia</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }
  
  // ==========================================
  // STRATEGY 2: Network First - HTML & API
  // ==========================================
  if (request.destination === 'document' || 
      url.pathname === '/' || 
      url.pathname === '/index.html') {
    
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the fresh response
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Offline: return cached version
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }
  
  // ==========================================
  // STRATEGY 3: Cache First with Network Fallback - CSS & JS
  // ==========================================
  if (request.destination === 'style' || 
      request.destination === 'script') {
    
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
  
  // ==========================================
  // STRATEGY 4: Network First with Cache Fallback - Default
  // ==========================================
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ==========================================
// MESSAGE EVENT - Handle messages from client
// ==========================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(urls);
      })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// ==========================================
// PUSH NOTIFICATION EVENT
// ==========================================
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Promo baru dari Toko Mas Merysa!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/#products'
    },
    actions: [
      { action: 'view', title: 'Lihat Promo' },
      { action: 'close', title: 'Tutup' }
    ],
    tag: 'merysa-notification',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification('🛍️ Toko Mas Merysa', options)
  );
});

// ==========================================
// NOTIFICATION CLICK EVENT
// ==========================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service Worker Loaded - Toko Mas Merysa PWA Premium');