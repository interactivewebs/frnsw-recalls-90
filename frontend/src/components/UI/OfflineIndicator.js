import React, { useState, useEffect } from 'react';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-indicator bg-yellow-500 text-white text-center py-2 text-sm font-medium fixed top-0 left-0 right-0 z-50">
      🔄 You are currently offline. Some features may not work.
    </div>
  );
};

export default OfflineIndicator;
