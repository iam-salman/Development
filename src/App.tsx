"use client";

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
  type FC,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import {
  Share2,
  X,
  MapPin,
  ChevronDown,
  BatteryFull,
  CheckCircle,
  Copy,
  AlertTriangle,
  Info,
  Sun,
  Moon,
  User,
  Save,
  History,
  LayoutGrid,
  ChevronsRight,
  Target,
  BatteryCharging,
  Clock,
  XCircle,
  Boxes,
  ScanLine,
  Zap,
  Upload,
  ZapOff,
  PlusCircle,
  Trash2,
  ZoomIn,
  Search,
  Lock
} from "lucide-react";

// --- Global Types & Styles ---

declare global {
  interface MediaTrackCapabilities {
    torch?: boolean;
    zoom?: { max: number; min: number; step: number };
  }
  interface MediaTrackConstraintSet {
    torch?: boolean;
    zoom?: number;
  }
}

const APP_NAME = "SnapStock";
const FONT_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";

const STATIONS_DATA = [
  { id: "De963991", name: "Hallo Majra", city: "Chandigarh" },
  { id: "De425627", name: "Raipur Khurd", city: "Chandigarh" },
  { id: "De988915", name: "Sector 42", city: "Chandigarh" },
  { id: "De316535", name: "Maloya", city: "Chandigarh" },
  { id: "De337282", name: "Daria", city: "Chandigarh" },
  { id: "De258797", name: "Sector 20", city: "Chandigarh" },
  { id: "De455892", name: "Sector 35", city: "Chandigarh" },
  { id: "De297974", name: "Sector 26", city: "Chandigarh" },
];

type Theme = "light" | "dark";
type ActiveView = "main" | "history" | "profile";
type ToastType = "success" | "error" | "info";
type Profile = { stationId: string; stationName: string };
type BatteryEntry = { batteryId: string; timestamp: string };
type InventoryItem = { name: string; count: number };
type ScanSession = {
  date: string;
  timestamp: string;
  items: InventoryItem[];
  entries: BatteryEntry[];
};
type ScannedData = { [stationId: string]: ScanSession[] };
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
type SharePayload = ScanSession | null;
type StationOption = { id: string; name: string; city: string };

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  profile: Profile;
  updateProfile: (newProfile: Profile) => void;
  showToast: (message: string, type?: ToastType) => void;
  scannedData: ScannedData;
  commitSessionToHistory: (session: ScanSession) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  triggerShare: (payload: SharePayload) => void;
}

const AppContext = createContext<AppContextType | null>(null);
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within an AppProvider");
  return context;
};

// --- Styles ---

const GlobalStyles: FC = () => (
  <style>{`
    :root {
      --font-primary: 'Outfit', sans-serif;
      --radius: 0.75rem;
      --c-bg: #F4F7FE;
      --c-bg-alt: #FFFFFF;
      --c-text: #0D111C;
      --c-text-alt: #5C677D;
      --c-text-faint: #9CA3AF;
      --c-border: #E5E9F2;
      --c-accent: #4F46E5;
      --c-accent-glow: rgba(79, 70, 229, 0.2);
      --c-accent-text: #FFFFFF;
      --c-danger: #e54646;
      --c-success: #22c55e;
      --shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.06);
    }
    html.dark {
      --c-bg: #0D1117;
      --c-bg-alt: #161B22;
      --c-text: #E6EDF3;
      --c-text-alt: #8D96A0;
      --c-text-faint: #4B5563;
      --c-border: #30363D;
      --c-accent: #58A6FF;
      --c-accent-glow: rgba(88, 166, 255, 0.15);
      --c-accent-text: #0D1117;
      --c-danger: #f87171;
      --c-success: #4ade80;
    }
    body {
      font-family: var(--font-primary);
      background-color: var(--c-bg);
      color: var(--c-text);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overscroll-behavior: none;
    }
    /* Specific scanner overrides */
    #html5-qrcode-anchor-scan-type-change { display: none !important; }
    #html5-qrcode-button-camera-permission { display: none !important; }
    #video-container video { 
      object-fit: cover !important; 
      width: 100% !important; 
      height: 100% !important; 
      border-radius: var(--radius);
    }
    .scanner-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    @keyframes scan { 0% { transform: translateY(0px); } 100% { transform: translateY(280px); } }
    .animate-scan { animation: scan 2.5s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; }
  `}</style>
);

// --- Shared Components ---

const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-[var(--c-bg-alt)] rounded-[var(--radius)] shadow-[var(--shadow)] transition-all ${className}`}>
    {children}
  </div>
);

const Modal: FC<{ isOpen: boolean; onClose?: () => void; title: string; children: ReactNode; hideCloseButton?: boolean; }> = ({ isOpen, onClose, title, children, hideCloseButton = false }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
        onClick={hideCloseButton ? undefined : onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-[var(--c-bg)] rounded-xl shadow-[var(--shadow-lg)] w-full max-w-sm border border-[var(--c-border)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--c-border)]">
            <h3 className="text-lg font-semibold">{title}</h3>
            {!hideCloseButton && (
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--c-border)] text-[var(--c-text-alt)] cursor-pointer">
                <X size={20} />
              </button>
            )}
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ToastContainer: FC<{ toasts: ToastItem[]; onDismiss: (id: number) => void; }> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-5 right-5 z-[1001] space-y-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id} layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="flex items-center bg-[var(--c-bg-alt)] text-[var(--c-text)] py-3 px-4 rounded-lg shadow-[var(--shadow-lg)] border border-[var(--c-border)] min-w-[320px] pointer-events-auto"
          >
            {toast.type === 'success' && <CheckCircle size={20} className="mr-3 text-[var(--c-success)]" />}
            {toast.type === 'error' && <AlertTriangle size={20} className="mr-3 text-[var(--c-danger)]" />}
            {toast.type === 'info' && <Info size={20} className="mr-3 text-[var(--c-accent)]" />}
            <span className="flex-grow text-sm font-medium">{toast.message}</span>
            <button onClick={() => onDismiss(toast.id)} className="ml-2 p-1 rounded-full hover:bg-[var(--c-border)] text-[var(--c-text-alt)] cursor-pointer">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// --- SCANNER COMPONENT (REWRITTEN) ---

type ScannerState = "idle" | "loading" | "scanning" | "error" | "permission_denied";
interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onStateChange?: (state: ScannerState) => void;
  showToast: (msg: string, type?: ToastType) => void;
}
interface ScannerControls {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
}

const Scanner = forwardRef<ScannerControls, ScannerProps>(
  ({ onScanSuccess, onStateChange, showToast }, ref) => {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);
    const [zoomCapability, setZoomCapability] = useState<{ min: number; max: number; step: number; value: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const setState = (state: ScannerState) => {
      onStateChange?.(state);
    };

    useImperativeHandle(ref, () => ({
      start: async () => {
        if (!html5QrCodeRef.current) {
           html5QrCodeRef.current = new Html5Qrcode("video-container", { verbose: false });
        }
        
        if (html5QrCodeRef.current.isScanning) return;

        setState("loading");

        // Strategy: Try High Res first (better for small codes), then fallback to standard
        const startCamera = async (widthIdeal: number) => {
            try {
                // Config for scanning
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }, // Logical box, visuals handled by CSS
                    aspectRatio: 1.0, // Force 1:1 ratio for the processing canvas to match our container roughly
                };

                // Constraints for the camera
                const constraints = {
                    facingMode: "environment",
                    focusMode: "continuous", // Crucial for small codes
                    width: { min: 640, ideal: widthIdeal, max: 3840 },
                    height: { min: 480, ideal: widthIdeal, max: 3840 } 
                };

                await html5QrCodeRef.current!.start(
                    constraints,
                    config,
                    (decodedText) => onScanSuccess(decodedText),
                    () => {} // error callback (noisy, ignore)
                );
                
                // After start, check capabilities
                const capabilities = html5QrCodeRef.current!.getRunningTrackCapabilities();
                
                setIsTorchSupported(!!capabilities.torch);
                
                // Manual check for zoom because types are sometimes loose
                const trackSettings = html5QrCodeRef.current?.getRunningTrackSettings();
                // @ts-ignore - zoom is part of modern spec but library types might lag
                if (capabilities.zoom) {
                    // @ts-ignore
                    setZoomCapability({ ...capabilities.zoom, value: trackSettings?.zoom || capabilities.zoom.min });
                }

                setState("scanning");
            } catch (err: any) {
                console.warn("Camera Start Error:", err);
                const errorMessage = err?.toString() || "";

                // Permission Denied Check
                if (errorMessage.includes("NotAllowedError") || errorMessage.includes("PermissionDeniedError")) {
                    setState("permission_denied");
                    return; 
                }

                // If resolution was too high and not a permission error, retry with lower res
                if (widthIdeal > 720) {
                    await startCamera(640); 
                } else {
                    setState("error");
                    if (!errorMessage.includes("NotAllowed")) {
                        showToast("Camera failed to start.", "error");
                    }
                }
            }
        };

        // Try 1080p+ ideal first for iPhone/High-End Android
        await startCamera(1280);
      },
      stop: async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          try {
            await html5QrCodeRef.current.stop();
            setState("idle");
          } catch (err) {
            console.error("Error stopping scanner:", err);
          }
        }
      },
      pause: () => {
        if (html5QrCodeRef.current?.isScanning) html5QrCodeRef.current.pause(true);
      },
      resume: () => {
        if (html5QrCodeRef.current?.isScanning) html5QrCodeRef.current.resume();
      },
    }));

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(e => console.error(e));
            }
        };
    }, []);

    const toggleTorch = useCallback(async () => {
      if (html5QrCodeRef.current && isTorchSupported) {
        try {
          const torchState = !isTorchOn;
          await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: torchState }] });
          setIsTorchOn(torchState);
        } catch (err) {
          showToast("Flashlight control failed.", "error");
        }
      }
    }, [isTorchOn, isTorchSupported, showToast]);

    const handleZoomChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        if (zoomCapability && html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ zoom: newZoom }] });
                setZoomCapability({ ...zoomCapability, value: newZoom });
            } catch (err) {
                console.error("Zoom failed", err);
            }
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && html5QrCodeRef.current) {
            showToast("Processing image...", "info");
            try {
                const decodedText = await html5QrCodeRef.current.scanFile(file, false);
                onScanSuccess(decodedText);
            } catch (err) {
                showToast("No QR code found in image.", "error");
            }
        }
        if (event.target) event.target.value = "";
    }

    return (
      <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl">
        <div id="video-container" className="w-full h-full object-cover"></div>
        
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
          {isTorchSupported && (
            <button onClick={toggleTorch} className="w-12 h-12 flex items-center justify-center bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors cursor-pointer backdrop-blur-md border border-white/10 shadow-lg">
              {isTorchOn ? <ZapOff size={24} /> : <Zap size={24} />}
            </button>
          )}
          <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 flex items-center justify-center bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors cursor-pointer backdrop-blur-md border border-white/10 shadow-lg">
            <Upload size={24} />
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>

        {/* Zoom Slider - Critical for small codes */}
        {zoomCapability && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 max-w-[200px] z-30 flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <ZoomIn size={16} className="text-white/80" />
                <input 
                    type="range" 
                    min={zoomCapability.min} 
                    max={zoomCapability.max} 
                    step={zoomCapability.step} 
                    value={zoomCapability.value} 
                    onChange={handleZoomChange}
                    className="scanner-range w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
             </div>
        )}

        {/* Visual Reticle */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="relative w-[280px] h-[280px]">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--c-accent)] rounded-tl-lg shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--c-accent)] rounded-tr-lg shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--c-accent)] rounded-bl-lg shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--c-accent)] rounded-br-lg shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                
                {/* Scan Line */}
                <div className="absolute top-0 w-full h-0.5 bg-[var(--c-danger)] shadow-[0_0_15px_var(--c-danger)] animate-scan opacity-80"></div>
                
                {/* Guide Text */}
                <p className="absolute -bottom-8 left-0 right-0 text-center text-white/80 text-sm font-medium drop-shadow-md">
                    Align QR code within frame
                </p>
            </div>
        </div>
      </div>
    );
  }
);
Scanner.displayName = "Scanner";

// --- Sub-components for Main Flow ---

const CustomDropdown: FC<{
  options: StationOption[];
  selected: Profile;
  onSelect: (profile: Pick<Profile, "stationId" | "stationName">) => void;
}> = ({ options, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: StationOption) => {
    onSelect({ stationId: option.id, stationName: option.name });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[var(--c-bg)] p-3 rounded-lg border border-[var(--c-border)] hover:border-[var(--c-accent)] focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px] focus:shadow-[var(--c-accent-glow)] outline-none cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3">
          <MapPin size={18} className="text-[var(--c-accent)]" />
          <span className="font-medium text-[var(--c-text)]">
            {selected.stationName || "Select a Station"}
          </span>
        </div>
        <ChevronDown size={20} className={`text-[var(--c-text-alt)] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-[var(--c-bg-alt)] border border-[var(--c-border)] rounded-lg shadow-[var(--shadow-lg)] z-10 p-1 max-h-60 overflow-y-auto"
          >
            {options.map((option) => (
              <li
                key={option.id}
                onClick={() => handleSelect(option)}
                className="flex items-center justify-between p-2.5 rounded-md hover:bg-[var(--c-accent)] hover:text-[var(--c-accent-text)] cursor-pointer text-sm font-medium group transition-colors"
              >
                <div>
                  <div className="text-[var(--c-text)] group-hover:text-[var(--c-accent-text)]">{option.name}</div>
                  <span className="block text-xs text-[var(--c-text-alt)] group-hover:text-white/80">{option.city}</span>
                </div>
                {option.id === selected.stationId && <CheckCircle size={16} />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

const AddItemModal: FC<{ isOpen: boolean; onClose: () => void; onAdd: (name: string) => void; }> = ({ isOpen, onClose, onAdd }) => {
    const [itemName, setItemName] = useState("");
    const handleSave = () => {
        if (itemName.trim()) {
            onAdd(itemName.trim());
            onClose();
        }
    };
    useEffect(() => { if(isOpen) setItemName(""); }, [isOpen]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Inventory Item">
            <div className="space-y-4">
                <div>
                    <label htmlFor="item-name-input" className="text-sm font-medium text-[var(--c-text-alt)] flex items-center gap-2 mb-1">
                        <Boxes size={16} /> Item Name
                    </label>
                    <input
                        id="item-name-input" type="text" value={itemName} placeholder="e.g., Cables" autoFocus
                        onChange={(e) => setItemName(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && handleSave()}
                        className="w-full text-lg font-bold p-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg focus:border-[var(--c-accent)] focus:shadow-[0_0_0_3px] focus:shadow-[var(--c-accent-glow)] outline-none text-[var(--c-text)]"
                    />
                </div>
                <button onClick={handleSave} disabled={!itemName.trim()} className="w-full flex items-center justify-center gap-2 bg-[var(--c-accent)] text-[var(--c-accent-text)] font-bold py-3 rounded-xl transition-all active:scale-95 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                    <PlusCircle size={18} /> Add Item
                </button>
            </div>
        </Modal>
    );
};

// --- Scanning Flow & Main Logic ---

const ScanningFlow: FC<{ onExit: () => void }> = ({ onExit }) => {
  type Stage = "items" | "scanning";
  const [stage, setStage] = useState<Stage>("items");
  const [items, setItems] = useState<{ name: string; count: number | "" }[]>([ { name: "Chargers", count: "" } ]);
  const [sessionEntries, setSessionEntries] = useState<BatteryEntry[]>([]);
  const [isListOpen, setIsListOpen] = useState(false);
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [lastScannedEntry, setLastScannedEntry] = useState<BatteryEntry | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  
  const { commitSessionToHistory, triggerShare, showToast, profile } = useAppContext();
  const scannerRef = useRef<ScannerControls | null>(null);
  const sessionEntriesRef = useRef(sessionEntries);

  useEffect(() => { sessionEntriesRef.current = sessionEntries; }, [sessionEntries]);

  // Auto-start camera when stage becomes "scanning"
  useEffect(() => {
    if (stage === "scanning") {
      const timer = setTimeout(() => {
        scannerRef.current?.start();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const startScanning = () => {
    if (!profile.stationId) {
      showToast("Please set a station profile first.", "error");
      onExit();
      return;
    }
    setStage("scanning");
  };

  const handleItemCountChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].count = value === "" ? "" : parseInt(value, 10);
    setItems(newItems);
  };

  const handleScanSuccess = (decodedText: string) => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);
    scannerRef.current?.pause();
    
    // Check duplicates
    if (sessionEntriesRef.current.some(e => e.batteryId === decodedText)) {
      showToast("Battery already scanned.", "info");
      setTimeout(() => {
        setIsProcessingScan(false);
        scannerRef.current?.resume();
      }, 500);
      return;
    }

    if (navigator.vibrate) navigator.vibrate(200);

    const newEntry: BatteryEntry = {
      batteryId: decodedText,
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
    
    setSessionEntries(prev => [newEntry, ...prev]);
    setLastScannedEntry(newEntry);
  };
  
  const handleContinueScanning = () => {
    setLastScannedEntry(null);
    setTimeout(() => {
        setIsProcessingScan(false);
        scannerRef.current?.resume();
    }, 200);
  };

  const completeAndSave = () => {
    scannerRef.current?.stop();
    if (sessionEntries.length > 0 || items.some(i => Number(i.count) >= 0)) {
        const finalItems = items
          .map(item => ({ name: item.name, count: Number(item.count) || 0 }))
          .filter(item => item.count >= 0);

        const session: ScanSession = {
            date: new Date().toISOString(),
            timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
            items: finalItems,
            entries: sessionEntries,
        };
        commitSessionToHistory(session);
        triggerShare(session);
    } else {
        showToast("Session cancelled.", "info");
    }
    onExit();
  };

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 350, damping: 40 }} className="fixed inset-0 bg-[var(--c-bg)] z-[100] flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-[var(--c-border)] shrink-0 bg-[var(--c-bg)]">
        <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--c-text)]">
          <Target size={20} className="text-[var(--c-accent)]" /> New Scan Session
        </h2>
        <button onClick={() => { scannerRef.current?.stop(); onExit(); }} className="p-2 rounded-full hover:bg-[var(--c-border)] text-[var(--c-text-alt)] cursor-pointer">
          <X size={20} />
        </button>
      </header>

      <div className="flex flex-col flex-grow overflow-hidden relative">
        {stage === "items" ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--c-text)]">Step 1: Inventory Counts</h3>
            <Card className="p-4 space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-grow">
                    <label className="text-sm font-medium text-[var(--c-text-alt)] flex items-center gap-2 mb-1">
                      <Boxes size={16} /> {item.name}
                    </label>
                    <input type="number" value={item.count} placeholder="0" onChange={(e) => handleItemCountChange(index, e.target.value)} className="w-full text-xl font-bold p-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg focus:border-[var(--c-accent)] outline-none text-[var(--c-text)]" />
                  </div>
                  {index > 0 && (
                    <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 mt-7 text-[var(--c-danger)] hover:bg-[var(--c-danger)]/10 rounded-full">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setIsAddItemModalOpen(true)} className="w-full flex items-center justify-center gap-2 text-[var(--c-accent)] font-semibold py-2.5 rounded-lg border-2 border-dashed border-[var(--c-accent)]/50 hover:bg-[var(--c-accent)]/10 transition-colors mt-2">
                <PlusCircle size={18} /> Add Custom Item
              </button>
            </Card>
            <button onClick={startScanning} disabled={items.some(i => i.count === "")} className="w-full flex items-center justify-center gap-2 bg-[var(--c-accent)] text-[var(--c-accent-text)] font-bold py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-lg shadow-[var(--c-accent-glow)]">
              <ChevronsRight size={18} /> Start Scanning
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-grow flex flex-col relative h-full">
            {/* Camera Area */}
            <div className="flex-grow relative bg-black overflow-hidden">
                {scannerState === "loading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 z-20">
                        <Clock size={40} className="animate-spin mb-3" />
                        <p className="font-medium">Initializing Camera...</p>
                    </div>
                )}
                {scannerState === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 z-20 p-6 text-center">
                        <XCircle size={48} className="mb-4" />
                        <p className="font-bold text-lg">Camera Error</p>
                        <p className="text-sm mt-2 opacity-80">Please ensure you are using a mobile device with a working camera.</p>
                        <button onClick={() => scannerRef.current?.start()} className="mt-6 px-6 py-2 bg-white/10 rounded-full text-white text-sm font-semibold hover:bg-white/20 transition-colors">
                            Try Again
                        </button>
                    </div>
                )}
                {/* Robust Permission Denied UI */}
                {scannerState === "permission_denied" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 p-6 text-center text-white">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                            <Lock size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Camera Access Denied</h3>
                        <p className="text-gray-300 mb-6 text-sm leading-relaxed max-w-xs">
                            SnapStock cannot access your camera. To scan items, you must enable camera permissions in your browser.
                        </p>
                        <div className="bg-white/10 p-4 rounded-xl text-left w-full max-w-xs mb-8 space-y-4 border border-white/5">
                             <div className="flex gap-3 text-sm text-gray-200">
                                <span className="flex-shrink-0 w-6 h-6 bg-[var(--c-accent)] rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                <span>Tap the <strong>Lock Icon</strong> 🔒 or <strong>Settings</strong> ⚙️ in your browser's address bar.</span>
                             </div>
                             <div className="flex gap-3 text-sm text-gray-200">
                                <span className="flex-shrink-0 w-6 h-6 bg-[var(--c-accent)] rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                <span>Find <strong>Camera</strong> and select <strong>Allow</strong> or <strong>Ask</strong>.</span>
                             </div>
                             <div className="flex gap-3 text-sm text-gray-200">
                                <span className="flex-shrink-0 w-6 h-6 bg-[var(--c-accent)] rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                <span>Return here and tap <strong>Retry</strong>.</span>
                             </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button onClick={() => scannerRef.current?.start()} className="bg-white text-black font-bold py-3.5 px-8 rounded-xl hover:bg-gray-200 transition-colors active:scale-95">
                                Retry Access
                            </button>
                            <button onClick={onExit} className="text-sm text-gray-400 hover:text-white py-2">
                                Cancel Session
                            </button>
                        </div>
                    </div>
                )}

                <Scanner ref={scannerRef} onScanSuccess={handleScanSuccess} onStateChange={setScannerState} showToast={showToast} />
            </div>

            {/* Bottom Sheet for Scanned Items */}
            <div className="bg-[var(--c-bg)] border-t border-[var(--c-border)] shrink-0 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-[var(--c-bg-alt)] transition-colors" onClick={() => setIsListOpen(!isListOpen)}>
                  <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--c-accent)] flex items-center justify-center text-white font-bold text-sm">
                          {sessionEntries.length}
                      </div>
                      <span className="font-semibold text-[var(--c-text)]">Scanned Batteries</span>
                  </div>
                  <ChevronDown size={20} className={`text-[var(--c-text-alt)] transition-transform duration-300 ${isListOpen ? "rotate-180" : ""}`} />
                </div>
                
                <AnimatePresence>
                    {isListOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-[var(--c-bg-alt)]">
                             <div className="max-h-48 overflow-y-auto p-2">
                                {sessionEntries.length > 0 ? (
                                    sessionEntries.map((entry) => (
                                        <div key={entry.batteryId} className="flex items-center justify-between p-3 border-b border-[var(--c-border)] last:border-0">
                                            <div className="flex items-center gap-3">
                                                <BatteryFull className="text-[var(--c-success)]" size={18} />
                                                <span className="font-mono text-sm text-[var(--c-text)] font-medium">{entry.batteryId}</span>
                                            </div>
                                            <span className="text-xs text-[var(--c-text-alt)]">{entry.timestamp}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-[var(--c-text-alt)] flex flex-col items-center gap-2">
                                        <Search size={24} className="opacity-50" />
                                        <p>No scans yet.</p>
                                    </div>
                                )}
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <div className="p-4 bg-[var(--c-bg)] border-t border-[var(--c-border)]">
                    <button onClick={completeAndSave} className="w-full flex items-center justify-center gap-2 bg-[var(--c-success)] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-90 shadow-lg shadow-green-500/20">
                        <CheckCircle size={20} /> Finish & Save
                    </button>
                </div>
            </div>
          </motion.div>
        )}
      </div>

      <AddItemModal isOpen={isAddItemModalOpen} onClose={() => setIsAddItemModalOpen(false)} onAdd={(name) => setItems([...items, { name, count: "" }])} />

      <Modal isOpen={!!lastScannedEntry} onClose={handleContinueScanning} title="Scan Successful" hideCloseButton>
        {lastScannedEntry && (
            <div className="text-center space-y-6 py-2">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={40} className="text-[var(--c-success)]" />
                </div>
                <div>
                    <p className="text-sm text-[var(--c-text-alt)] uppercase tracking-wide font-semibold">Battery ID</p>
                    <p className="font-mono text-3xl font-bold text-[var(--c-text)] mt-1">{lastScannedEntry.batteryId}</p>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                    <button onClick={handleContinueScanning} className="w-full flex items-center justify-center gap-2 bg-[var(--c-accent)] text-[var(--c-accent-text)] font-bold py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-90">
                        <ScanLine size={18} /> Scan Next
                    </button>
                    <button onClick={() => { setLastScannedEntry(null); completeAndSave(); }} className="w-full text-center text-[var(--c-text-alt)] font-medium py-2 hover:text-[var(--c-text)]">
                        Finish Session
                    </button>
                </div>
            </div>
        )}
      </Modal>
    </motion.div>
  );
};

const ShareModal: FC<{ payload: SharePayload; onClose: () => void }> = ({ payload, onClose }) => {
  const { profile, showToast } = useAppContext();
  const isOpen = !!payload;
  
  const shareText = useMemo(() => {
    if (!payload) return "";
    const itemsList = payload.items.length > 0 ? payload.items.map(item => `- ${item.name}: ${item.count}`).join('\n') : "No inventory items recorded.";
    const batteryList = payload.entries.length > 0 ? payload.entries.map(e => `\`${e.batteryId}\``).join('\n') : "No batteries in this session.";

    return `*SnapStock Report* ⚡\n\n` +
           `🏢 *Station:* ${profile.stationName} (${profile.stationId})\n` +
           `📅 *Date:* ${new Date(payload.date).toLocaleDateString("en-GB")}, ${payload.timestamp}\n\n` +
           `*Inventory*\n${itemsList}\n\n` +
           `*Batteries Scanned (${payload.entries.length})*\n` +
           `──────────────────\n${batteryList}\n──────────────────\n` +
           `Total: *${payload.entries.length}*`;
  }, [payload, profile]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareText).then(() => { showToast("Copied to clipboard!", "success"); onClose(); }, () => showToast("Failed to copy", "error"));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Report">
      <div className="space-y-4">
        <div className="p-3 bg-[var(--c-bg)] rounded-lg text-xs text-[var(--c-text-alt)] whitespace-pre-wrap h-40 overflow-y-auto border border-[var(--c-border)] font-mono">
          {shareText}
        </div>
        <div className="flex flex-col space-y-3">
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" onClick={onClose} className="w-full text-center bg-[#25D366] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-opacity hover:opacity-90">
            Share on WhatsApp
          </a>
          <button onClick={copyToClipboard} className="w-full text-center bg-[var(--c-bg)] text-[var(--c-text)] font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 border border-[var(--c-border)] hover:bg-[var(--c-border)]">
            <Copy size={16} /> Copy Text
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Main Views ---

const MainView: FC = () => {
  const { profile, scannedData, setActiveView } = useAppContext();
  const { chargers, batteries } = useMemo(() => {
    const stationHistory = scannedData[profile.stationId] || [];
    if (!Array.isArray(stationHistory) || stationHistory.length === 0) return { chargers: 0, batteries: 0 };
    const latestSession = [...stationHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const chargerItem = latestSession?.items?.find(item => item.name.toLowerCase() === 'chargers');
    const allEntries = stationHistory.flatMap((session) => session.entries);
    return { chargers: chargerItem?.count ?? 0, batteries: new Set(allEntries.map((e) => e.batteryId)).size };
  }, [scannedData, profile.stationId]);

  if (!profile.stationId) {
    return (
      <div className="p-6 text-center flex flex-col items-center justify-center flex-grow">
        <Card className="p-8 max-w-sm">
          <User size={48} className="mx-auto text-[var(--c-accent)] mb-4" />
          <h2 className="text-xl font-bold">Welcome to {APP_NAME}</h2>
          <p className="text-[var(--c-text-alt)] mt-2 mb-6">Setup your profile to start scanning inventory.</p>
          <button onClick={() => setActiveView("profile")} className="w-full flex items-center justify-center gap-2 bg-[var(--c-accent)] text-[var(--c-accent-text)] font-bold py-3 rounded-xl transition-all active:scale-95 hover:opacity-90">
            Setup Profile <ChevronsRight size={18} />
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
            <BatteryCharging size={20} />
          </div>
          <span className="text-xs text-[var(--c-text-alt)] uppercase font-semibold tracking-wider">Chargers</span>
          <p className="text-3xl font-bold mt-1 text-[var(--c-text)]">{chargers}</p>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center">
           <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
            <BatteryFull size={20} />
          </div>
          <span className="text-xs text-[var(--c-text-alt)] uppercase font-semibold tracking-wider">Unique IDs</span>
          <p className="text-3xl font-bold mt-1 text-[var(--c-text)]">{batteries}</p>
        </Card>
      </div>
      <Card className="p-5">
         <h3 className="font-bold text-lg mb-4 flex items-center gap-2"> <LayoutGrid size={18} className="text-[var(--c-accent)]" /> Dashboard</h3>
         <div className="grid grid-cols-2 gap-3">
             <div className="bg-[var(--c-bg)] p-3 rounded-lg border border-[var(--c-border)]">
                 <p className="text-xs text-[var(--c-text-alt)] mb-1">Last Scan</p>
                 <p className="font-medium text-sm">Today</p>
             </div>
             <div className="bg-[var(--c-bg)] p-3 rounded-lg border border-[var(--c-border)]">
                 <p className="text-xs text-[var(--c-text-alt)] mb-1">Station</p>
                 <p className="font-medium text-sm truncate">{profile.stationName}</p>
             </div>
         </div>
      </Card>
    </div>
  );
};

const HistoryView: FC = () => {
    const { profile, scannedData, triggerShare } = useAppContext();
    const sortedHistory = useMemo(() => {
        const stationHistory = scannedData[profile.stationId] || [];
        return stationHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [scannedData, profile.stationId]);

    if (!profile.stationId) return <div className="p-10 text-center text-[var(--c-text-alt)]">Please select a profile.</div>;

    return (
        <div className="p-4 space-y-4">
             <h2 className="text-2xl font-extrabold flex items-center gap-3 text-[var(--c-text)]">
                <History size={24} /> History
             </h2>
             {sortedHistory.length > 0 ? (
                 sortedHistory.map((session, i) => (
                    <Card key={i} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="font-bold text-[var(--c-text)]">{new Date(session.date).toLocaleDateString()}</p>
                                <p className="text-xs text-[var(--c-text-alt)] flex items-center gap-1"><Clock size={12}/> {session.timestamp}</p>
                            </div>
                            <button onClick={() => triggerShare(session)} className="text-[var(--c-accent)] p-2 hover:bg-[var(--c-bg)] rounded-full"><Share2 size={18}/></button>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <span className="text-xs bg-[var(--c-bg)] px-2 py-1 rounded text-[var(--c-text-alt)] font-medium">
                                {session.entries.length} Batteries
                            </span>
                            {session.items.map(item => (
                                <span key={item.name} className="text-xs bg-[var(--c-bg)] px-2 py-1 rounded text-[var(--c-text-alt)] font-medium">
                                    {item.count} {item.name}
                                </span>
                            ))}
                        </div>
                    </Card>
                 ))
             ) : (
                <div className="text-center py-20 text-[var(--c-text-alt)]">
                    <History size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No history found.</p>
                </div>
             )}
        </div>
    );
}

const ProfileView: FC = () => {
  const { profile, updateProfile, setActiveView, showToast, theme, toggleTheme } = useAppContext();
  const [localProfile, setLocalProfile] = useState<Profile>(profile);
  
  const handleSave = () => {
    if (!localProfile.stationId) { showToast("Select a station", "error"); return; }
    updateProfile(localProfile);
    showToast("Saved!", "success");
    setActiveView("main");
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-extrabold flex items-center gap-3 text-[var(--c-text)]"><User size={24} /> Profile</h2>
      <Card className="p-6 space-y-5">
        <div>
            <label className="text-sm font-medium text-[var(--c-text-alt)] mb-2 block">Station</label>
            <CustomDropdown options={STATIONS_DATA} selected={localProfile} onSelect={(s) => setLocalProfile({ ...localProfile, ...s })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                 <label className="text-xs font-medium text-[var(--c-text-alt)] mb-1 block">ID</label>
                 <div className="p-3 bg-[var(--c-bg)] rounded-lg text-sm font-mono text-[var(--c-text)] border border-[var(--c-border)]">{localProfile.stationId || "-"}</div>
            </div>
             <div>
                 <label className="text-xs font-medium text-[var(--c-text-alt)] mb-1 block">City</label>
                 <div className="p-3 bg-[var(--c-bg)] rounded-lg text-sm text-[var(--c-text)] border border-[var(--c-border)]">Chandigarh</div>
            </div>
        </div>
      </Card>
      <Card className="p-4 flex items-center justify-between">
         <span className="font-medium text-[var(--c-text)] flex items-center gap-2">{theme === 'light' ? <Sun size={18}/> : <Moon size={18}/>} Dark Mode</span>
         <button onClick={toggleTheme} className={`w-12 h-7 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-[var(--c-accent)]' : 'bg-gray-300'}`}>
             <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${theme === 'dark' ? 'left-6' : 'left-1'}`}></div>
         </button>
      </Card>
      <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-[var(--c-accent)] text-[var(--c-accent-text)] font-bold py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-90 shadow-lg shadow-[var(--c-accent-glow)]">
        <Save size={18} /> Save & Continue
      </button>
    </div>
  );
};

// --- App Root ---

const App: FC = () => {
  const [theme, setTheme] = useState<Theme>("light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [profile, setProfile] = useState<Profile>({ stationId: "", stationName: "" });
  const [scannedData, setScannedData] = useState<ScannedData>({});
  const [activeView, setActiveView] = useState<ActiveView>("main");
  const [sharePayload, setSharePayload] = useState<SharePayload>(null);
  const [isScanFlowActive, setIsScanFlowActive] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem("app-theme") as Theme;
    if (savedTheme) setTheme(savedTheme);
    try {
        const p = localStorage.getItem("app-profile");
        if(p) setProfile(JSON.parse(p));
        const d = localStorage.getItem("scanned-data");
        if(d) setScannedData(JSON.parse(d));
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => { if (isMounted) document.documentElement.className = theme; }, [theme, isMounted]);

  const toggleTheme = useCallback(() => {
    setTheme((p) => { const n = p === "light" ? "dark" : "light"; localStorage.setItem("app-theme", n); return n; });
  }, []);

  const updateProfile = useCallback((p: Profile) => { setProfile(p); localStorage.setItem("app-profile", JSON.stringify(p)); }, []);
  
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToasts((p) => [...p, { id: Date.now() + Math.random(), message, type }]);
    setTimeout(() => setToasts(prev => prev.slice(1)), 3000);
  }, []);

  const commitSessionToHistory = useCallback((session: ScanSession) => {
      setScannedData((prev) => {
          const newData = { ...prev, [profile.stationId]: [session, ...(prev[profile.stationId] || [])] };
          localStorage.setItem("scanned-data", JSON.stringify(newData));
          return newData;
      });
  }, [profile.stationId]);

  if (!isMounted) return null;

  const appContextValue: AppContextType = {
    theme, toggleTheme, profile, updateProfile, showToast, scannedData, commitSessionToHistory, activeView, setActiveView, triggerShare: setSharePayload
  };

  const NavBtn = ({ view, icon: Icon, label }: { view: ActiveView; icon: any; label: string }) => (
      <button onClick={() => setActiveView(view)} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeView === view ? 'text-[var(--c-accent)]' : 'text-[var(--c-text-alt)]'}`}>
          <Icon size={24} strokeWidth={activeView === view ? 2.5 : 2} />
          <span className="text-[10px] font-medium mt-1">{label}</span>
      </button>
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <link rel="stylesheet" href={FONT_URL} />
      <GlobalStyles />
      <div className="flex flex-col h-screen overflow-hidden bg-[var(--c-bg)]">
        {/* Header */}
        <header className="px-4 py-3 bg-[var(--c-bg-alt)]/80 backdrop-blur-md border-b border-[var(--c-border)] z-10 flex items-center justify-between sticky top-0">
             <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--c-accent)] to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-[var(--c-accent-glow)]">
                    <Boxes size={18} />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-[var(--c-text)]">{APP_NAME}</h1>
             </div>
             {profile.stationId && (
                 <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--c-text-alt)] bg-[var(--c-bg)] px-2.5 py-1.5 rounded-full border border-[var(--c-border)]">
                     <MapPin size={12} /> {profile.stationId}
                 </div>
             )}
        </header>

        {/* Content */}
        <main className="flex-grow overflow-y-auto pb-24 relative">
             <AnimatePresence mode="wait">
                <motion.div key={activeView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="min-h-full">
                    {activeView === 'main' && <MainView />}
                    {activeView === 'history' && <HistoryView />}
                    {activeView === 'profile' && <ProfileView />}
                </motion.div>
             </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--c-bg-alt)] border-t border-[var(--c-border)] pb-safe pt-2 px-6 h-[80px] flex items-start justify-between z-40">
            <NavBtn view="main" icon={LayoutGrid} label="Home" />
            <NavBtn view="history" icon={History} label="History" />
            
            <div className="relative -top-6">
                <button onClick={() => setIsScanFlowActive(true)} className="w-14 h-14 bg-[var(--c-accent)] rounded-full flex items-center justify-center text-white shadow-xl shadow-[var(--c-accent-glow)] border-4 border-[var(--c-bg-alt)] active:scale-95 transition-transform">
                    <ScanLine size={24} />
                </button>
            </div>

            <button onClick={toggleTheme} className="flex flex-col items-center justify-center p-2 rounded-xl text-[var(--c-text-alt)]">
                {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                <span className="text-[10px] font-medium mt-1">Theme</span>
            </button>
            <NavBtn view="profile" icon={User} label="Profile" />
        </nav>

        {/* Overlays */}
        <AnimatePresence>
            {isScanFlowActive && <ScanningFlow onExit={() => setIsScanFlowActive(false)} />}
        </AnimatePresence>

        <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(t => t.filter(x => x.id !== id))} />
        <ShareModal payload={sharePayload} onClose={() => setSharePayload(null)} />
      </div>
    </AppContext.Provider>
  );
};

export default App;