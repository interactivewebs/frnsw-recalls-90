import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-frnsw-red text-white p-4 rounded-lg shadow-lg z-50 md:max-w-md md:left-auto">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install FRNSW Recalls 90</h3>
          <p className="text-xs mt-1 opacity-90">
            Install this app for quick access and offline functionality
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={handleInstallClick}
            className="bg-white text-frnsw-red px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-white hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
