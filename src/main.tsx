import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupGlobalErrorHandlers } from "./utils/errorLogger";
import { registerSW } from 'virtual:pwa-register';
import { registerPeriodicBackgroundSync } from '@/utils/backgroundSync';

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('Service Worker registered:', swUrl);
    
    // Register periodic background sync after service worker is ready
    if (registration) {
      registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
      });
      
      // Try to register periodic background sync
      setTimeout(async () => {
        try {
          await registerPeriodicBackgroundSync();
          console.log('✅ Background sync setup complete');
        } catch (error) {
          console.error('❌ Background sync setup failed:', error);
        }
      }, 2000); // Wait 2 seconds for SW to be fully ready
    }
  }
});

// Setup global error handlers
setupGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
