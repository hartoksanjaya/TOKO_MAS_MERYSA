/**
 * 🔥 Service Worker Premium - Toko Mas Merysa
 * ✅ Offline Support | ✅ Cache Strategy | ✅ Background Sync Ready
 * ✅ PWA Builder Store-Ready Compliant
 */

// ===== 📦 KONFIGURASI CACHE =====
const CACHE_VERSION = 'v2.1.0';
const STATIC_CACHE = `merysa-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `merysa-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `merysa-images-${CACHE_VERSION}`;

// ===== 🗂️ ASSET YANG DI-CACHE (STATIC) =====
const STATIC_ASSETS = [
  './',
  './TOKO_MAS_MERYSA/',
  './TOKO_MAS_MERYSA/index.html',
  './TOKO_MAS_MERYSA/manifest.json',
  './TOKO_MAS_MERYSA/images/logo.png',
  './TOKO_MAS_MERYSA/images/bg.jpg',
  './TOKO_MAS_MERYSA/images/placeholder.jpg',
  './TOKO_MAS_MERYSA/images/icons/icon-192x192.png',
  './TOKO_MAS_MERYSA/images/icons/icon-512x512.png',
  './TOKO_MAS_MERYSA/audio/musik_latar.mp3',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Poppins:wght@300;400;500;600&display=swap',
  'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXDTzYgFE.woff2',
  'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.woff2',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js'
];

// ===== 🎯 POLA URL YANG DI-CACHE (DYNAMIC) =====
const DYNAMIC_PATTERNS = [
  /^https:\/\/firebasestorage\.googleapis\.com\/.*\.(jpg|jpeg|png|webp|gif)$/i,
  /^https:\/\/firestore\.googleapis\.com\/.*$/i,
  /^https:\/\/.*\.firebaseio\.com\/.*$/i
];

// ===== 🖼️ EKSTENSI GAMBAR UNTUK IMAGE CACHE =====
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'];

// ===== 🚫 URL YANG TIDAK DI-CACHE =====
const SKIP_CACHE = [
  /analytics\.google\.com/i,
  /googletagmanager\.com/i,
  /facebook\.com\/plugins/i,
  /connect\.facebook\.net/i,
  /wa\.me/i,
  /api\.whatsapp\.com/i
];

// ===== 📊 INSTALL EVENT =====
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${CACHE_VERSION}...`);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'no-cache' });
        }));
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );
});

// ===== 🔄 ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${CACHE_VERSION}...`);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Hapus cache lama yang tidak sesuai versi
              return cacheName.startsWith('merysa-') && 
                     !cacheName.includes(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients...');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activate failed:', error);
      })
  );
});

// ===== 🌐 FETCH EVENT - STRATEGI CACHE PREMIUM =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cache untuk URL tertentu
  if (SKIP_CACHE.some(pattern => pattern.test(url.href))) {
    return;
  }

  // Strategi berdasarkan tipe request
  if (isImageRequest(request)) {
    // 🖼️ Gambar: Cache First, lalu Network
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } 
  else if (isFirebaseRequest(request)) {
    // 🔥 Firebase: Network First, fallback ke Cache
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  } 
  else if (isStaticAsset(request)) {
    // 📦 Static Assets: Cache First
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } 
  else if (isNavigationRequest(request)) {
    // 🧭 Navigasi: Stale While Revalidate
    event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
  } 
  else {
    // 🔄 Default: Network First
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  }
});

// ===== 🎯 HELPER FUNCTIONS =====

function isImageRequest(request) {
  return IMAGE_EXTENSIONS.some(ext => 
    request.url.toLowerCase().endsWith(ext)
  ) || request.destination === 'image';
}

function isFirebaseRequest(request) {
  return /firebaseio\.com|firebasestorage\.googleapis\.com|firestore\.googleapis\.com/i.test(request.url);
}

function isStaticAsset(request) {
  const url = request.url;
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         /\.(css|js|woff2?|ttf|eot)$/i.test(url);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' && request.method === 'GET';
}

// ===== 🗄️ CACHE STRATEGIES =====

/**
 * 🥇 Cache First: Untuk gambar & static assets
 * Cache → Network → Fallback
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      // Update cache di background (stale-while-revalidate behavior)
      event.waitUntil(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              return caches.open(cacheName)
                .then((cache) => cache.put(request, response));
            }
          })
          .catch(() => {})
      );
      return cached;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn(`[SW] Cache First failed: ${request.url}`, error);
    // Fallback image untuk request gambar yang gagal
    if (isImageRequest(request)) {
      return caches.match('./TOKO_MAS_MERYSA/images/placeholder.jpg');
    }
    return new Response('Offline: Resource tidak tersedia', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * 🥈 Network First: Untuk data dinamis & Firebase
 * Network → Cache → Fallback
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn(`[SW] Network First failed, trying cache: ${request.url}`, error);
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Fallback untuk Firebase requests
    if (isFirebaseRequest(request)) {
      return new Response(JSON.stringify({ offline: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('Offline: Periksa koneksi Anda', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * 🥉 Stale While Revalidate: Untuk navigasi halaman
 * Cache → Network (update cache)
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  try {
    const cached = await caches.match(request);
    
    const fetchPromise = fetch(request)
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(cacheName);
          cache.then(c => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => cached); // Fallback ke cache jika network gagal
    
    return cached || fetchPromise;
  } catch (error) {
    console.error('[SW] Stale While Revalidate failed:', error);
    return caches.match('/TOKO_MAS_MERYSA/index.html');
  }
}

// ===== 📡 BACKGROUND SYNC (Opsional - untuk form offline) =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-data') {
    event.waitUntil(syncFormData());
  }
});

async function syncFormData() {
  // Implementasi sync form saat online
  console.log('[SW] Background sync: Mengirim data form...');
  // TODO: Kirim data yang tersimpan di IndexedDB ke server
}

// ===== 🔔 PUSH NOTIFICATIONS (Opsional) =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const options = {
    body: event.data.text(),
    icon: './TOKO_MAS_MERYSA/images/icons/icon-192x192.png',
    badge: './TOKO_MAS_MERYSA/images/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: { url: './TOKO_MAS_MERYSA/' },
    actions: [
      { action: 'open', title: 'Buka Toko' },
      { action: 'close', title: 'Tutup' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Toko Mas Merysa ✨', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// ===== 🧹 CACHE MANAGEMENT UTILS =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .then(() => console.log('[SW] All caches cleared'))
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      caches.keys()
        .then(keys => {
          return Promise.all(keys.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            return { name: cacheName, count: requests.length };
          }));
        })
        .then(status => {
          event.source.postMessage({
            type: 'CACHE_STATUS',
            payload: status
          });
        })
    );
  }
});

// ===== 📊 LOGGING & DEBUG =====
console.log(`
╔════════════════════════════════════╗
║  🔥 Toko Mas Merysa Service Worker ║
║  Version: ${CACHE_VERSION}
║  Status: ✅ Active & Ready
╚════════════════════════════════════╝
`);

// Register error reporting
self.addEventListener('error', (event) => {
  console.error('[SW] Unhandled error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});