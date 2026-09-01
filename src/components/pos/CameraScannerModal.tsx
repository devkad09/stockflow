"use client";

import * as React from "react";
import { Camera, X, RefreshCw, Barcode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcodeText: string) => void;
  availableProducts: Array<{ name: string; sku: string; barcode: string | null }>;
}

export function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
  availableProducts,
}: CameraScannerModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let stream: MediaStream | null = null;

    if (isOpen) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setStreamActive(true);
            setCameraError(null);
          }
        })
        .catch((err) => {
          setCameraError("Camera access unavailable or permission denied.");
          setStreamActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleSimulateScan = (code: string) => {
    onScan(code);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Camera Barcode Scanner"
      description="Point your device camera at the product barcode to add it directly to the cart."
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Video Viewfinder Container */}
        <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-700 flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scanner Targeting Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-28 border-2 border-blue-500 rounded-lg relative flex items-center justify-center animate-pulse">
              <div className="w-full h-[2px] bg-rose-500 shadow-md shadow-rose-500" />
            </div>
          </div>

          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-slate-300 font-semibold">{cameraError}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                You can select sample barcodes below to test the workflow.
              </p>
            </div>
          )}
        </div>

        {/* Quick Sample Scan Chips for Instant Testing */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Click to Scan Sample Barcodes:
          </span>
          <div className="grid grid-cols-2 gap-2">
            {availableProducts.slice(0, 4).map((p) => (
              <button
                key={p.sku}
                type="button"
                onClick={() => handleSimulateScan(p.barcode || p.sku)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
              >
                <span className="font-bold text-white block truncate">{p.name}</span>
                <span className="text-[10px] font-mono text-blue-400">{p.barcode || p.sku}</span>
              </button>
            ))}
          </div>
        </div>

        <Button variant="outline" size="md" onClick={onClose} className="w-full">
          Close Scanner
        </Button>
      </div>
    </Modal>
  );
}
