// Service Worker for Birthday Page - Image Caching Optimization
const CACHE_NAME = 'birthday-images-v1';
const IMAGE_CACHE_NAME = 'birthday-images-store-v1';

// Cache all images on install
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Network-first strategy for images with cache fallback
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Only handle image requests
    if (event.request.destination === 'image' || 
        url.pathname.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)) {
        
        event.respondWith(
            // Try network first for fresh content
            fetch(event.request)
                .then((response) => {
                    // Clone the response before caching
                    const responseClone = response.clone();
                    
                    // Cache successful responses
                    if (response.status === 200) {
                        caches.open(IMAGE_CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    
                    return response;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Return a placeholder if image not found
                        return new Response(
                            '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Image not available</text></svg>',
                            { headers: { 'Content-Type': 'image/svg+xml' } }
                        );
                    });
                })
        );
    }
});

// Message handler for pre-caching images
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_IMAGES') {
        const imagePaths = event.data.images;
        event.waitUntil(
            caches.open(IMAGE_CACHE_NAME).then((cache) => {
                return cache.addAll(imagePaths).catch((error) => {
                    console.log('Error caching images:', error);
                });
            })
        );
    }
});
