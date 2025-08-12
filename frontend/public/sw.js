// FRNSW Recalls 90 Service Worker
// Handles caching, offline functionality, and push notifications

const CACHE_NAME = 'frnsw-recalls-90-v1.0.0';
const API_CACHE_NAME = 'frnsw-recalls-90-api-v1.0.0';

// Files to cache immediately
const STATIC_CACHE_URLS = [
  '/FRNSWRecalls90/',
  '/FRNSWRecalls90/static/js/bundle.js',
  '/FRNSWRecalls90/static/css/main.css',
  '/FRNSWRecalls90/manifest.json',
  '/FRNSWRecalls90/icons/icon-192x192.png',
  '/FRNSWRecalls90/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/auth/profile',
  '/api/recalls',
  '/api/reports/fairness'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(CACHE_NAME).then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_CACHE_URLS.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      }),
      // Cache API responses
      caches.open(API_CACHE_NAME).then(cache => {
        console.log('Service Worker: Preparing API cache');
        return cache;
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      // Force activation of new service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests and chrome-extension requests
  if (url.origin !== location.origin && !url.origin.includes('fonts.googleapis.com')) {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const isApiRequest = url.pathname.startsWith('/api/');
  const isStaticAsset = url.pathname.includes('/static/') || 
                       url.pathname.includes('/icons/') ||
                       url.pathname.includes('manifest.json') ||
                       url.pathname.includes('fonts.googleapis.com');
  
  try {
    if (isApiRequest) {
      return await handleApiRequest(request);
    } else if (isStaticAsset) {
      return await handleStaticRequest(request);
    } else {
      return await handleNavigationRequest(request);
    }
  } catch (error) {
    console.error('Service Worker: Error handling request:', error);
    return new Response('Network error', { status: 503 });
  }
}

// Handle API requests with cache-then-network strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  // For GET requests, try cache first
  if (request.method === 'GET') {
    const cachedResponse = await cache.match(request);
    
    try {
      // Always try network first for fresh data
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Cache successful responses
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } else {
        // Return cached version if network fails
        return cachedResponse || networkResponse;
      }
    } catch (error) {
      // Network error - return cached version if available
      if (cachedResponse) {
        console.log('Service Worker: Serving API request from cache due to network error');
        return cachedResponse;
      }
      throw error;
    }
  } else {
    // For non-GET requests, always go to network
    return fetch(request);
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // If network fails, serve the cached app shell
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/FRNSWRecalls90/');
    
    if (cachedResponse) {
      console.log('Service Worker: Serving offline app shell');
      return cachedResponse;
    }
    
    throw error;
  }
}

// Push notification handling
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification received');
  
  if (!event.data) {
    console.log('Service Worker: Push event has no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('Service Worker: Push data:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/FRNSWRecalls90/icons/icon-192x192.png',
      badge: data.badge || '/FRNSWRecalls90/icons/badge-72x72.png',
      tag: data.tag || 'frnsw-recall',
      renotify: true,
      requireInteraction: true,
      data: data.data || {},
      actions: data.actions || [
        {
          action: 'available',
          title: '✅ Available',
          icon: '/FRNSWRecalls90/icons/action-available.png'
        },
        {
          action: 'not_available',
          title: '❌ Not Available',
          icon: '/FRNSWRecalls90/icons/action-not-available.png'
        }
      ],
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      silent: false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Service Worker: Error processing push notification:', error);
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click received:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'available' || action === 'not_available') {
    // Handle recall response actions
    event.waitUntil(
      handleRecallResponse(action, data)
    );
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll().then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('/FRNSWRecalls90') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          const targetUrl = data.recallId 
            ? `/FRNSWRecalls90/recalls/${data.recallId}`
            : '/FRNSWRecalls90/recalls';
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});

// Handle recall response from notification
async function handleRecallResponse(response, data) {
  try {
    if (!data.recallId || !data.token) {
      console.error('Service Worker: Missing recall data for response');
      return;
    }
    
    const apiUrl = `/api/recalls/${data.recallId}/respond`;
    const requestBody = {
      response: response,
      token: data.token
    };
    
    const result = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (result.ok) {
      // Show success notification
      await self.registration.showNotification(
        '✅ Response Recorded',
        {
          body: `Your response "${response === 'available' ? 'Available' : 'Not Available'}" has been recorded.`,
          icon: '/FRNSWRecalls90/icons/icon-192x192.png',
          badge: '/FRNSWRecalls90/icons/badge-72x72.png',
          tag: 'response-success',
          requireInteraction: false,
          silent: true
        }
      );
    } else {
      throw new Error(`HTTP ${result.status}: ${result.statusText}`);
    }
  } catch (error) {
    console.error('Service Worker: Error recording recall response:', error);
    
    // Show error notification
    await self.registration.showNotification(
      '❌ Response Failed',
      {
        body: 'Failed to record your response. Please open the app and try again.',
        icon: '/FRNSWRecalls90/icons/icon-192x192.png',
        badge: '/FRNSWRecalls90/icons/badge-72x72.png',
        tag: 'response-error',
        requireInteraction: true,
        actions: [
          {
            action: 'open_app',
            title: 'Open App'
          }
        ]
      }
    );
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync event:', event.tag);
  
  if (event.tag === 'recall-response') {
    event.waitUntil(syncRecallResponses());
  }
});

// Sync recall responses when back online
async function syncRecallResponses() {
  try {
    // Get pending responses from IndexedDB
    const pendingResponses = await getPendingResponses();
    
    for (const response of pendingResponses) {
      try {
        const result = await fetch(`/api/recalls/${response.recallId}/respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${response.token}`
          },
          body: JSON.stringify({
            response: response.response
          })
        });
        
        if (result.ok) {
          // Remove from pending responses
          await removePendingResponse(response.id);
          console.log('Service Worker: Synced recall response:', response.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync response:', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error during background sync:', error);
  }
}

// IndexedDB helpers for offline functionality
async function getPendingResponses() {
  // Implementation would depend on IndexedDB setup
  // For now, return empty array
  return [];
}

async function removePendingResponse(id) {
  // Implementation would depend on IndexedDB setup
  console.log('Service Worker: Would remove pending response:', id);
}

// Message handling from main app
self.addEventListener('message', event => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker: Script loaded successfully');