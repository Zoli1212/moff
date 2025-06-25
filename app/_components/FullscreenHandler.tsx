'use client';

import { useEffect } from 'react';

export default function FullscreenHandler() {
  useEffect(() => {
    const handleFullscreen = () => {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };
      
      const requestFullscreen = async () => {
        try {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          } else if (docEl.msRequestFullscreen) {
            await docEl.msRequestFullscreen();
          }
        } catch (err) {
          console.error('Fullscreen hiba:', err);
        }
      };

      // Csak mobil eszközökön próbáljuk meg
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Késleltetés az oldal betöltéséhez
        const timer = setTimeout(() => {
          requestFullscreen();
          
          // Kattintásra újrapróbálkozás, ha kiléptünk
          const handleClick = () => {
            if (!document.fullscreenElement) {
              requestFullscreen();
            }
          };
          
          document.addEventListener('click', handleClick);
          
          // Tisztítás
          return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClick);
          };
        }, 1000);
      }
    };

    // Futtatás
    handleFullscreen();
    
    // Újrafuttatás, ha láthatóvá válik az oldal
    document.addEventListener('visibilitychange', handleFullscreen);
    
    // Tisztítás
    return () => {
      document.removeEventListener('visibilitychange', handleFullscreen);
    };
  }, []);

  return null; // Nem renderel semmit
}
