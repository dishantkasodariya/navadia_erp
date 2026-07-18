import { useState, useEffect, useRef } from "react";
import { X, Share, PlusSquare, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isTransitionActive, setIsTransitionActive] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss helper (5 seconds)
  const startTimer = () => {
    if (showManualInstructions) return; // Don't auto-dismiss if they clicked to see instructions
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsTransitionActive(false);
      setTimeout(() => {
        setShowPrompt(false);
      }, 500); // Matches the 500ms CSS transition duration
    }, 5000); // 5 seconds
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    // 1. Detect standalone mode
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (navigator as any).standalone === true;

    if (isStandalone) return;

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Check dismissed flag (using sessionStorage for dev/testing ease)
    const isDismissed = sessionStorage.getItem("navadia_pwa_prompt_dismissed") === "true";

    // 4. Handle beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
        setTimeout(() => {
          setIsTransitionActive(true);
        }, 50);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Trigger showing the prompt after a brief delay if not dismissed
    if (!isDismissed) {
      const initialShowTimer = setTimeout(() => {
        setShowPrompt(true);
        setTimeout(() => {
          setIsTransitionActive(true);
        }, 50);
      }, 1500);

      return () => {
        clearTimeout(initialShowTimer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // When showPrompt becomes true, start the 5-second timer
  useEffect(() => {
    if (showPrompt) {
      startTimer();
    }
    return () => clearTimer();
  }, [showPrompt, showManualInstructions]);

  const handleDismiss = () => {
    sessionStorage.setItem("navadia_pwa_prompt_dismissed", "true");
    setIsTransitionActive(false);
    setTimeout(() => {
      setShowPrompt(false);
    }, 500);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      clearTimer();
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsTransitionActive(false);
        setTimeout(() => {
          setShowPrompt(false);
        }, 500);
      }
    } else {
      clearTimer();
      setShowManualInstructions(true);
    }
  };

  if (!showPrompt) return null;

  const isAndroid = /android/.test(window.navigator.userAgent.toLowerCase());

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 w-[310px] sm:w-[350px] md:w-[380px] transition-all duration-500 ease-in-out ${
        isTransitionActive 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-8 scale-95 pointer-events-none"
      }`}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      <div className="bg-card/95 backdrop-blur-md border border-muted/50 shadow-2xl p-4 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <img src="/logo.png" alt="Navadia Logo" className="h-8 w-8 object-contain rounded-lg" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Install Navadia App</h3>
              <p className="text-[11px] text-muted-foreground leading-tight font-sans">Add to Home Screen for the full premium experience</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Install Action Button (Visible first, removed bounce/pulse) */}
        {!showManualInstructions && (
          <Button 
            onClick={handleInstall} 
            className="w-full bg-[#e7b008] hover:bg-[#c59606] text-white rounded-xl gap-2 font-medium font-sans"
          >
            <MonitorPlay className="h-4 w-4" /> Install Now
          </Button>
        )}

        {/* Manual Fallback Instructions */}
        {showManualInstructions && (
          <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-xl border border-muted/30 font-sans mt-1 animate-in fade-in duration-200">
            {isIOS ? (
              <>
                <p className="font-semibold text-foreground mb-1">To install on your iPhone / iPad:</p>
                <ol className="list-decimal pl-4 mt-1.5 space-y-1.5">
                  <li>
                    Tap the <span className="font-semibold text-foreground inline-flex items-center gap-1">Share <Share className="h-3 w-3 inline text-primary" /></span> button in Safari.
                  </li>
                  <li>
                    Scroll down and select <span className="font-semibold text-foreground inline-flex items-center gap-1">Add to Home Screen <PlusSquare className="h-3 w-3 inline text-primary" /></span>.
                  </li>
                  <li>
                    Tap <span className="font-semibold text-foreground">Add</span> in the top right corner.
                  </li>
                </ol>
              </>
            ) : isAndroid ? (
              <>
                <p className="font-semibold text-foreground mb-1">To install on Android:</p>
                <ol className="list-decimal pl-4 mt-1.5 space-y-1.5">
                  <li>Tap the browser menu <span className="font-semibold text-foreground">(three dots)</span> at the top/bottom right.</li>
                  <li>Select <span className="font-semibold text-foreground">"Install app"</span> or <span className="font-semibold text-foreground">"Add to Home screen"</span>.</li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground mb-1">To install on Desktop:</p>
                <ol className="list-decimal pl-4 mt-1.5 space-y-1.5">
                  <li>Look at your browser's address bar (top right).</li>
                  <li>Click the **Install Icon** (computer screen with a down arrow).</li>
                  <li>Click <span className="font-semibold text-foreground">Install</span> to confirm.</li>
                </ol>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
