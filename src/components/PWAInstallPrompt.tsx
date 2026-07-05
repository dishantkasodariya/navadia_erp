import { useState, useEffect } from "react";
import { X, Share, PlusSquare, MonitorCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Detect if running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (navigator as any).standalone === true;

    if (isStandalone) return;

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Check if user dismissed prompt recently (within 5 days)
    const dismissedTime = localStorage.getItem("navadia_pwa_prompt_dismissed");
    const isDismissed = dismissedTime && (Date.now() - parseInt(dismissedTime, 10)) < 5 * 24 * 60 * 60 * 1000;

    if (isIosDevice && !isDismissed) {
      setShowPrompt(true);
    }

    // 4. Handle Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("navadia_pwa_prompt_dismissed", Date.now().toString());
    setShowPrompt(false);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card/95 backdrop-blur-md border border-muted/50 shadow-2xl p-4 rounded-2xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <img src="/logo.png" alt="Navadia Logo" className="h-7 w-7 object-contain rounded-lg" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Install Navadia App</h3>
              <p className="text-xs text-muted-foreground">Add to Home Screen for the full premium experience</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isIOS ? (
          <div className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-xl border border-muted/30">
            To install on your iPhone:
            <ol className="list-decimal pl-4 mt-1.5 space-y-1">
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
          </div>
        ) : deferredPrompt ? (
          <Button 
            onClick={handleAndroidInstall} 
            className="w-full bg-[#e7b008] hover:bg-[#c59606] text-white rounded-xl gap-2 font-medium"
          >
            <MonitorCheck className="h-4 w-4" /> Install Now
          </Button>
        ) : null}
      </div>
    </div>
  );
}
