import { useState, useCallback } from "react";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MaterielQrHoverProps {
  id: string;
  name: string;
  barcode?: string | null;
  serialNumber?: string | null;
}

export function MaterielQrHover({ id, name, barcode, serialNumber }: MaterielQrHoverProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const content = barcode || serialNumber || id;

  const generateQr = useCallback(async () => {
    if (qrDataUrl) return;
    setLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(content, { width: 160, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [content, qrDataUrl]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={e => { e.stopPropagation(); generateQr(); }}
          onMouseEnter={generateQr}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Voir QR code"
        >
          <QrCode className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3 flex flex-col items-center gap-2"
        onClick={e => e.stopPropagation()}
      >
        {loading && (
          <div className="w-40 h-40 flex items-center justify-center text-muted-foreground text-xs">
            Génération…
          </div>
        )}
        {qrDataUrl && (
          <>
            <img src={qrDataUrl} alt={`QR ${name}`} className="w-40 h-40 rounded-lg" />
            <p className="text-[10px] text-muted-foreground font-mono text-center max-w-[160px] truncate">{content}</p>
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = qrDataUrl;
                a.download = `qr-${name.replace(/\s+/g, "-").toLowerCase()}.png`;
                a.click();
              }}
              className="text-xs text-primary hover:underline"
            >
              Télécharger
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
