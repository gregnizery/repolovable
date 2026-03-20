import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, ScanLine, AlertTriangle, Keyboard, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose?: () => void;
  className?: string;
}

export default function BarcodeScanner({ onScan, onClose, className }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);
  const lastCodeRef = useRef("");

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [cameraAvailable, setCameraAvailable] = useState(true);

  // Detect camera availability on mount
  useEffect(() => {
    const check = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraAvailable(false);
          setManualMode(true);
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(d => d.kind === "videoinput");
        if (!hasCamera) {
          setCameraAvailable(false);
          setManualMode(true);
        }
      } catch {
        setCameraAvailable(false);
        setManualMode(true);
      }
    };
    check();
  }, []);

  const handleDetection = useCallback((code: string) => {
    if (cooldownRef.current || code === lastCodeRef.current) return;
    lastCodeRef.current = code;
    cooldownRef.current = true;
    setScanCount(prev => prev + 1);
    onScan(code);
    setTimeout(() => {
      cooldownRef.current = false;
      lastCodeRef.current = "";
    }, 2000);
  }, [onScan]);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // ignore cleanup errors
    }
    setIsActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setManualMode(false);

    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const containerId = "barcode-scanner-viewport";
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      // Set active BEFORE starting so the container is visible and has dimensions
      setIsActive(true);

      // Wait for a frame so React renders the visible container
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 4 / 3,
        },
        (decodedText) => {
          handleDetection(decodedText);
        },
        () => {
          // ignore scan failures (no code in frame)
        }
      );
    } catch (err) {
      const msg = (err as Error).message || String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Accès caméra refusé. Autorisez l'accès dans les paramètres du navigateur, ou utilisez la saisie manuelle.");
      } else if (msg.includes("NotFound") || msg.includes("Requested device not found")) {
        setError("Aucune caméra détectée. Utilisez la saisie manuelle ci-dessous.");
      } else if (msg.includes("NotReadableError") || msg.includes("Could not start")) {
        setError("Caméra inaccessible (peut-être utilisée par une autre app). Utilisez la saisie manuelle.");
      } else {
        setError(`Erreur caméra : ${msg}`);
      }
      setIsActive(false);
      setManualMode(true);
    }
  }, [handleDetection, stopCamera]);

  const handleManualSubmit = useCallback(() => {
    const code = manualCode.trim();
    if (!code) return;
    handleDetection(code);
    setManualCode("");
  }, [manualCode, handleDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) {
            scannerRef.current.stop().catch(() => { });
          }
          scannerRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Camera viewport */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/50 bg-muted/30">
        {/*
          Html5Qrcode needs a visible container with real dimensions.
          We keep it always in the DOM but use opacity/z-index to show/hide.
        */}
        <div
          id="barcode-scanner-viewport"
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: isActive ? 1 : 0,
            zIndex: isActive ? 1 : -1,
            pointerEvents: isActive ? "auto" : "none",
          }}
        />

        {/* Inactive state — show start buttons */}
        {!isActive && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {cameraAvailable ? <Camera className="h-8 w-8 text-primary" /> : <Keyboard className="h-8 w-8 text-primary" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {cameraAvailable ? "Scanner de codes-barres" : "Saisie manuelle"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {cameraAvailable
                  ? "Caméra ou saisie manuelle"
                  : "Caméra non disponible. Utilisez la saisie manuelle."}
              </p>
            </div>
            <div className="flex gap-2">
              {cameraAvailable && (
                <Button
                  onClick={startCamera}
                  className="gradient-primary text-white rounded-xl gap-2 hover:opacity-90"
                >
                  <Camera className="h-4 w-4" /> Activer la caméra
                </Button>
              )}
              <Button
                onClick={() => setManualMode(true)}
                variant="outline"
                className="rounded-xl gap-2"
              >
                <Keyboard className="h-4 w-4" /> Saisie manuelle
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 z-10">
            <AlertTriangle className="h-10 w-10 text-warning" />
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <div className="flex gap-2">
              <Button onClick={startCamera} variant="outline" size="sm" className="rounded-xl gap-2">
                Réessayer
              </Button>
              <Button onClick={() => { setError(null); setManualMode(true); }} variant="outline" size="sm" className="rounded-xl gap-2">
                <Keyboard className="h-3.5 w-3.5" /> Saisie manuelle
              </Button>
            </div>
          </div>
        )}

        {/* Active camera controls */}
        {isActive && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <button
              onClick={() => { stopCamera(); onClose?.(); }}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Active status bar */}
        {isActive && (
          <div className="absolute bottom-3 left-0 right-0 text-center z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
              <ScanLine className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs text-white/80">
                Détection active · {scanCount} scan(s)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Manual input — always available */}
      <div className={cn("mt-3 transition-all", manualMode || isActive ? "opacity-100" : "opacity-60")}>
        <div className="flex gap-2">
          <Input
            placeholder="Saisir code-barres / N° série / nom..."
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
            className="h-10 rounded-xl"
          />
          <Button
            onClick={handleManualSubmit}
            disabled={!manualCode.trim()}
            size="sm"
            className="h-10 rounded-xl gap-1.5 px-4"
          >
            <Send className="h-4 w-4" /> OK
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
          Saisissez le code-barres, le numéro de série ou le nom du matériel
        </p>
      </div>
    </div>
  );
}
