'use client';

import { useEffect } from 'react';

export default function FullscreenHandler() {
  useEffect(() => {
    const handleFullscreen = () => {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };
      
      const requestFullscreen = () => {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) { // Safari
          docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) { // IE11
          docEl.msRequestFullscreen();
        }
      };

      // Try to enter fullscreen on mobile devices
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Add a small delay to ensure the page is fully loaded
        setTimeout(() => {
          requestFullscreen();
          
          // Add a click handler to the document to re-enter fullscreen if user exits
          const handleClick = () => {
            if (!document.fullscreenElement) {
              requestFullscreen();
            }
          };
          
          document.addEventListener('click', handleClick);
          
          // Clean up event listener
          return () => {
            document.removeEventListener('click', handleClick);
          };
        }, 1000);
      }
    };

    // Run the fullscreen handler
    handleFullscreen();
    
    // Re-run when the page becomes visible again (e.g., after switching tabs)
    document.addEventListener('visibilitychange', handleFullscreen);
    
    return () => {
      document.removeEventListener('visibilitychange', handleFullscreen);
    };
  }, []);

  return null; // This component doesn't render anything
}
