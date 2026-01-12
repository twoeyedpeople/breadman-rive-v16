"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  Alignment,
  Fit,
  MascotCall,
  MascotClient,
  MascotProvider,
  MascotRive,
  useMascotElevenlabs,
  useMascot,
  useMascotPlayback,
} from "@mascotbot-sdk/react";
import { Loader } from "./components/loader";
import { Privacy } from "./components/privacy";
import { CloseBtnX } from "./components/closeBtnX";
import { RestartBtnIcon } from "./components/restartBtnIcon";
import { PromoGiftCard } from "./components/PromoGiftCard";
import QRCode from "./components/QRCode";
import { cn } from "./util/ui";

type CvRect = { x: number; y: number; width: number; height: number };
type CvRectVector = {
  size: () => number;
  get: (i: number) => CvRect;
  delete: () => void;
};
type CvCascade = {
  load: (path: string) => boolean;
  detectMultiScale: (
    src: unknown,
    found: CvRectVector,
    scaleFactor?: number,
    minNeighbors?: number,
    flags?: number,
    minSize?: unknown
  ) => void;
  delete?: () => void;
};
type CvApi = {
  CascadeClassifier: { new (): CvCascade };
  RectVector: { new (): CvRectVector };
  imread: (canvas: HTMLCanvasElement) => unknown;
  Mat: { new (): unknown };
  cvtColor: (src: unknown, dst: unknown, code: number, dstCn?: number) => void;
  COLOR_RGBA2GRAY: number;
  FS_createDataFile: (
    parent: string,
    name: string,
    data: Uint8Array,
    canRead: boolean,
    canWrite: boolean,
    canOwn: boolean
  ) => void;
  onRuntimeInitialized?: () => void;
  resize?: (...args: any[]) => void;
  Size?: new (...args: any[]) => any;
  INTER_AREA?: number;
  FS_createPath?: (
    parent: string,
    name: string,
    canRead: boolean,
    canWrite: boolean
  ) => void;
  FS_unlink?: (path: string) => void;
};

interface ElevenLabsAvatarProps {
  dynamicVariables?: Record<string, string | number | boolean>;
  isLoading?: boolean;
}

function ElevenLabsAvatar({
  dynamicVariables,
  isLoading,
}: ElevenLabsAvatarProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [didUserHangUp, setDidUserHangUp] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const [isKeypadActive, setIsKeypadActive] = useState(false);
  const [isCCActive, setIsCCActive] = useState(false);
  const [isPrivacyActive, setIsPrivacyActive] = useState(false);
  const [isRestartActive, setIsRestartActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [qrCodeURL, setQRCodeURL] = useState<string | null>(null);
  const urlRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTime = useRef<number | null>(null);
  const didUserHangUpRef = useRef(false);
  const [botMessage, setBotMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const debugCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const detectBusyRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lastDetectTimeRef = useRef(0);
  const cvRef = useRef<CvApi | null>(null);
  const cvLoadRef = useRef<Promise<void> | null>(null);
  const cascadeRef = useRef<CvCascade | null>(null);
  const cascadeReadyRef = useRef(false);
  const detectIntervalRef = useRef<number | null>(null);
  const presentFramesRef = useRef(0);
  const absentFramesRef = useRef(0);
  const lastActionRef = useRef<number>(0);
  const prevImageRef = useRef<ImageData | null>(null);
  const [isDetectionEnabled, setDetectionEnabled] = useState(false);
  const [hasPressedStart, setHasPressedStart] = useState(false);

  const { customInputs, rive } = useMascot();
  const mascotPlayback = useMascotPlayback();

  // Natural lip sync settings
  const [naturalLipSyncEnabled] = useState(true);
  const [lipSyncConfig] = useState({
    minVisemeInterval: 40,
    mergeWindow: 60,
    keyVisemePreference: 0.6,
    preserveSilence: true,
    similarityThreshold: 0.4,
    preserveCriticalVisemes: true,
    criticalVisemeMinDuration: 80,
  });

  // Initialize ElevenLabs conversation
  const conversation = useConversation({
    micMuted: isMuted,
    onConnect: () => {
      //console.log("ElevenLabs Connected");
      setIsConnecting(false);
      setDidUserHangUp(false);
      didUserHangUpRef.current = false;

      // Calculate and log connection time
      if (connectionStartTime.current) {
        const timeElapsed = Date.now() - connectionStartTime.current;
        //console.log(`Connection established in ${timeElapsed}ms`);
        connectionStartTime.current = null;
      }
    },
    onDisconnect: () => {
      console.log(
        "ElevenLabs Disconnected, did user initiate",
        didUserHangUpRef.current
      );
      setIsConnecting(false);
      // const shouldRestart = !didUserHangUpRef.current;
      const shouldRestart = true;
      setShowQRCode(false);
      setIsPrivacyActive(false);
      setIsKeypadActive(false);

      if (shouldRestart) {
        setDetectionEnabled(true);
      }
      setDidUserHangUp(false);
      didUserHangUpRef.current = false;
    },
    onError: (error: any) => {
      console.error("ElevenLabs Error:", error);
      setIsConnecting(false);
    },
    onMessage: (message) => {
      // Empty handler to prevent errors
      //console.log("Received message:", message);
      if (message.source === "ai") {
        setBotMessage(message.message);
      }
    },
    onDebug: () => {
      // Empty handler to prevent errors
    },
  });

  const conversationStatusRef = useRef(conversation.status);
  useEffect(() => {
    conversationStatusRef.current = conversation.status;
  }, [conversation.status]);

  // Enable avatar with real-time lip sync
  const { isIntercepting, messageCount } = useMascotElevenlabs({
    conversation,
    gesture: true,
    naturalLipSync: naturalLipSyncEnabled,
    naturalLipSyncConfig: lipSyncConfig,
  });

  // Get signed URL for ElevenLabs
  const getSignedUrl = async (): Promise<string> => {
    console.log("customInputs", customInputs);
    const response = await fetch(`/api/get-signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        dynamicVariables: dynamicVariables || {},
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to get signed url: ${response.statusText}`);
    }
    const data = await response.json();
    return data.signedUrl;
  };

  // Fetch and cache signed URL
  const fetchAndCacheUrl = useCallback(async () => {
    try {
      //console.log("Fetching signed URL...");
      const url = await getSignedUrl();
      setCachedUrl(url);
      //console.log("Signed URL cached successfully");
    } catch (error) {
      console.error("Failed to fetch signed URL:", error);
      setCachedUrl(null);
    }
  }, [dynamicVariables]);

  // Set up URL pre-fetching and refresh
  useEffect(() => {
    // Fetch URL immediately on page load
    fetchAndCacheUrl();

    // Set up refresh interval (every 9 minutes)
    urlRefreshInterval.current = setInterval(() => {
      //console.log("Refreshing cached URL...");
      fetchAndCacheUrl();
    }, 9 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (urlRefreshInterval.current) {
        clearInterval(urlRefreshInterval.current);
        urlRefreshInterval.current = null;
      }
    };
  }, [fetchAndCacheUrl]);

  // Start conversation
  const startConversation = useCallback(
    async (voiceConfig: any) => {
      try {
        setHasPressedStart(true);
        //console.log("Starting conversation...");
        setIsConnecting(true);
        connectionStartTime.current = Date.now();

        await navigator.mediaDevices.getUserMedia({ audio: true });

        //console.log("Fetching fresh signed URL for session...");
        const signedUrl = await getSignedUrl();

        //console.log("Signed url: ", signedUrl);
        if (!signedUrl) {
          throw new Error("The signed URL is missing.");
        }

        let _voiceConfig: any = {
          signedUrl,
          dynamicVariables: dynamicVariables,
          clientTools: {
            end_call: async () => {
              console.error("client tool end call was called");
              restartConversation();
            },
            show_qr_code: async (parameters: { url: string }) => {
              console.log("show user link: ", parameters.url);
              setQRCodeURL(parameters.url);
              setShowQRCode(true);
            },
            check_if_user_won: async () => {
              try {
                const today = new Date().toISOString().slice(0, 10);
                const storageKey = "promoGiftCardQuota";
                let issuedCount = 0;
                const raw =
                  typeof window !== "undefined"
                    ? localStorage.getItem(storageKey)
                    : null;
                if (raw) {
                  try {
                    const parsed = JSON.parse(raw) as {
                      date?: string;
                      numbers?: string[];
                    };
                    if (
                      parsed?.date === today &&
                      Array.isArray(parsed?.numbers)
                    ) {
                      issuedCount = parsed.numbers.length;
                    }
                  } catch {}
                }
                const maxWins = Number(process.env.NEXT_PUBLIC_MAX_WINS ?? 40);
                if (issuedCount >= maxWins) {
                  return "User did not win";
                }
                const randVal = Math.random();
                let didWin = randVal < 0.5;

                if (didWin) {
                  if (customInputs?.cardWon && customInputs.cardWon.fire) {
                    customInputs.cardWon.fire();
                  }
                  setTimeout(() => {
                    setIsKeypadActive(true);
                  }, 5000);

                  return "User did win!";
                }
                return "User did not win";
              } catch {
                return "User did not win";
              }
            },
            show_keypad: async () => {
              setIsKeypadActive(true);
            },
          },
        };
        if (voiceConfig) {
          _voiceConfig = {
            ..._voiceConfig,
            ...voiceConfig,
          };
        }
        await conversation.startSession(_voiceConfig);
        setDetectionEnabled(false);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        setIsConnecting(false);
        connectionStartTime.current = null;
      }
    },
    [conversation, dynamicVariables]
  );

  const hangUp = useCallback(async () => {
    console.log("Hanging up...");
    setDidUserHangUp(true);
    didUserHangUpRef.current = true;
    await conversation.endSession();
  }, [conversation, setDidUserHangUp]);

  // Stop conversation
  const stopConversation = useCallback(async () => {
    //console.log("Stopping conversation...");

    await conversation.endSession();
  }, [conversation]);

  const toggleCC = useCallback(() => {
    const newCCState = !isCCActive;
    setIsCCActive(newCCState);
  }, [isCCActive]);

  const togglePrivacy = useCallback(() => {
    const newPrivacyState = !isPrivacyActive;
    setIsPrivacyActive(newPrivacyState);
  }, [isPrivacyActive]);

  const toggleRestart = useCallback(() => {
    const newRestartState = !isRestartActive;
    setIsRestartActive(newRestartState);
  }, [isRestartActive]);

  const toggleKeypad = useCallback(() => {
    const newKeypadState = !isKeypadActive;
    setIsKeypadActive(newKeypadState);
  }, [isKeypadActive]);

  const toggleQRCode = useCallback(() => {
    const newQRCodeState = !showQRCode;
    setShowQRCode(newQRCodeState);
  }, [showQRCode]);

  const didTapCloseKeypad = useCallback(() => {
    setShowQRCode(false);
    setIsPrivacyActive(false);
    setIsKeypadActive(false);
    setIsRestartActive(false);

    mascotPlayback.reset();
  }, []);
  const didTapStartOver = useCallback(() => {
    setDidUserHangUp(true);
    restartConversation();
  }, []);

  const didTapSubmit = useCallback(() => {
    if (customInputs?.sessionEnded && customInputs.sessionEnded.fire) {
      console.warn("firing sessionEnded");
      customInputs.sessionEnded.fire();
    }
  }, [customInputs]);

  const restartConversation = useCallback(
    (config: any = null) => {
      console.log("restarting conversation");
      setShowQRCode(false);
      setIsPrivacyActive(false);
      setIsKeypadActive(false);
      setIsRestartActive(false);

      stopConversation();
      setDetectionEnabled(true);
    },
    [stopConversation, startConversation, customInputs]
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!isDetectionEnabled || isLoading || !hasPressedStart) {
      return;
    }

    const init = async () => {
      const loadCv = async () => {
        if (cvRef.current) return;
        if (cvLoadRef.current) {
          await cvLoadRef.current;
          return;
        }
        cvLoadRef.current = new Promise<void>((resolve, reject) => {
          const existing = (window as unknown as { cv?: CvApi }).cv;
          if (existing) {
            cvRef.current = existing;
            const runtimeInit = existing.onRuntimeInitialized;
            if (typeof runtimeInit === "function") {
              existing.onRuntimeInitialized = () => resolve();
              return;
            }
            resolve();
            return;
          }
          const already = document.querySelector(
            'script[data-opencv-js="true"]'
          );
          if (already) {
            const ready = (window as unknown as { cv?: CvApi }).cv;
            if (ready) {
              cvRef.current = ready;
              const ri = ready.onRuntimeInitialized;
              if (typeof ri === "function") {
                ready.onRuntimeInitialized = () => resolve();
              } else {
                resolve();
              }
            }
            return;
          }
          const s = document.createElement("script");
          s.src = "https://docs.opencv.org/4.x/opencv.js";
          s.async = true;
          s.setAttribute("data-opencv-js", "true");
          s.onload = () => {
            const cv = (window as unknown as { cv?: CvApi }).cv;
            if (!cv) {
              reject(new Error("cv not found after script load"));
              return;
            }
            cvRef.current = cv;
            const runtimeInit = cv.onRuntimeInitialized;
            if (typeof runtimeInit === "function") {
              cv.onRuntimeInitialized = () => resolve();
            } else {
              resolve();
            }
          };
          s.onerror = () => reject(new Error("Failed to load OpenCV.js"));
          document.body.appendChild(s);
        });
        await cvLoadRef.current;
      };

      await loadCv();

      const cv = cvRef.current!;
      const maybeCtor = (
        cv as unknown as { CascadeClassifier?: new () => CvCascade }
      ).CascadeClassifier;
      if (typeof maybeCtor === "function") {
        if (!cascadeRef.current) {
          cascadeRef.current = new cv.CascadeClassifier();
        }
        try {
          if (!cascadeReadyRef.current) {
            try {
              let xmlText: string | null = null;
              try {
                const local = await fetch(
                  "/haarcascade_frontalface_default.xml"
                );
                if (local.ok) xmlText = await local.text();
              } catch {}
              if (!xmlText) {
                const resp = await fetch(
                  "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml"
                );
                xmlText = await resp.text();
              }
              const data = new TextEncoder().encode(xmlText!);
              try {
                (cv as any).FS_createPath("/", "data", true, true);
              } catch {}
              try {
                (cv as any).FS_unlink?.(
                  "/data/haarcascade_frontalface_default.xml"
                );
              } catch {}
              cv.FS_createDataFile(
                "/data",
                "haarcascade_frontalface_default.xml",
                data,
                true,
                false,
                false
              );
              cascadeReadyRef.current = true;
            } catch (e) {
              console.error("Failed to load cascade", e);
            }
          }
          // Always call load() on the instance to ensure it is ready
          cascadeRef.current.load("/data/haarcascade_frontalface_default.xml");
        } catch (e) {
          console.error("Failed to load cascade", e);
        }
      } else {
        cascadeRef.current = null;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (canvasRef.current && videoRef.current) {
          const w = 320;
          const h = 240;
          canvasRef.current.width = w;
          canvasRef.current.height = h;
          if (debugCanvasRef.current) {
            debugCanvasRef.current.width = w;
            debugCanvasRef.current.height = h;
            debugCtxRef.current = debugCanvasRef.current.getContext("2d", {
              willReadFrequently: true,
            });
          }
          canvasCtxRef.current = canvasRef.current.getContext("2d", {
            willReadFrequently: true,
          });
        }

        const detect = () => {
          if (!canvasRef.current || !videoRef.current) return;
          const ctx = canvasCtxRef.current;
          if (!ctx) return;
          const w = canvasRef.current.width;
          const h = canvasRef.current.height;
          if (videoRef.current.readyState < 2) return;
          ctx.drawImage(videoRef.current, 0, 0, w, h);

          let present = false;
          const boxes: CvRect[] = [];

          if (cascadeRef.current && cascadeReadyRef.current && cvRef.current) {
            const cv = cvRef.current;
            let src: any = null;
            let gray: any = null;
            let small: any = null;
            let found: any = null;
            try {
              src = cv!.imread(canvasRef.current);
              gray = new cv!.Mat();
              cv!.cvtColor(src, gray, cv!.COLOR_RGBA2GRAY, 0);
              small = new cv!.Mat();
              (cv as any).resize(
                gray,
                small,
                new (cv as any).Size(0, 0),
                0.75,
                0.75,
                (cv as any).INTER_AREA
              );
              found = new cv!.RectVector();
              cascadeRef.current.detectMultiScale(
                small,
                found,
                1.2,
                2,
                0,
                new (cv as any).Size(0, 0)
              );
              const scaleX = w / small.cols;
              const scaleY = h / small.rows;
              for (let i = 0; i < found.size(); i++) {
                const r = found.get(i);
                boxes.push({
                  x: Math.round(r.x * scaleX),
                  y: Math.round(r.y * scaleY),
                  width: Math.round(r.width * scaleX),
                  height: Math.round(r.height * scaleY),
                });
              }
              if (boxes.length === 0) {
                try {
                  found.delete();
                } catch {}
                found = new cv!.RectVector();
                cascadeRef.current.detectMultiScale(
                  gray,
                  found,
                  1.1,
                  2,
                  0,
                  new (cv as any).Size(0, 0)
                );
                for (let i = 0; i < found.size(); i++) {
                  const r = found.get(i);
                  boxes.push({
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height,
                  });
                }
              }
              present = boxes.length > 0;
            } catch (e) {
              //console.warn("OpenCV detect error", e);
            } finally {
              try {
                src && src.delete();
              } catch {}
              try {
                gray && gray.delete();
              } catch {}
              try {
                small && small.delete();
              } catch {}
              try {
                found && found.delete();
              } catch {}
            }
          } else {
            const frame = ctx.getImageData(0, 0, w, h);
            const prev = prevImageRef.current;
            if (prev) {
              const cols = 8;
              const rows = 6;
              const cellW = Math.floor(w / cols);
              const cellH = Math.floor(h / rows);
              const counts = new Array(rows * cols).fill(0);
              const stride = 2;
              for (let y = 0; y < h; y += stride) {
                for (let x = 0; x < w; x += stride) {
                  const idx = (y * w + x) * 4;
                  const r = frame.data[idx];
                  const g = frame.data[idx + 1];
                  const b = frame.data[idx + 2];
                  const pr = prev.data[idx];
                  const pg = prev.data[idx + 1];
                  const pb = prev.data[idx + 2];
                  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                  const plum = 0.2126 * pr + 0.7152 * pg + 0.0722 * pb;
                  const diff = Math.abs(lum - plum);
                  if (diff > 25) {
                    const ci = Math.floor(x / cellW);
                    const ri = Math.floor(y / cellH);
                    if (ci >= 0 && ci < cols && ri >= 0 && ri < rows) {
                      counts[ri * cols + ci] += 1;
                    }
                  }
                }
              }
              const perCellTotal = (cellW * cellH) / (stride * stride);
              for (let ri = 0; ri < rows; ri++) {
                for (let ci = 0; ci < cols; ci++) {
                  const changed = counts[ri * cols + ci] / perCellTotal;
                  if (changed > 0.08) {
                    const x = ci * cellW;
                    const y = ri * cellH;
                    boxes.push({ x, y, width: cellW, height: cellH });
                  }
                }
              }
              present = boxes.length > 0;
            }
            prevImageRef.current = frame;
          }

          if (present) {
            presentFramesRef.current += 1;
            absentFramesRef.current = 0;
          } else {
            absentFramesRef.current += 1;
            presentFramesRef.current = 0;
          }

          const now = Date.now();
          const cooldownMs = 2000;
          if (
            presentFramesRef.current >= 5 &&
            conversationStatusRef.current === "disconnected" &&
            now - lastActionRef.current > cooldownMs
          ) {
            lastActionRef.current = now;
            setDetectionEnabled(false);
            try {
              stream?.getTracks().forEach((t) => t.stop());
            } catch {}
            startConversation({});
          }
          if (
            absentFramesRef.current >= 10 &&
            conversationStatusRef.current === "connected" &&
            now - lastActionRef.current > cooldownMs
          ) {
            lastActionRef.current = now;
            stopConversation();
          }

          const dctx = debugCtxRef.current || null;
          if (dctx && debugCanvasRef.current) {
            dctx.drawImage(videoRef.current, 0, 0, w, h);
            if (present) {
              dctx.strokeStyle = "#22c55e";
              dctx.lineWidth = 2;
              for (const rect of boxes) {
                dctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
              }
            } else {
              dctx.strokeStyle = "#ef4444";
              dctx.lineWidth = 2;
              dctx.strokeRect(2, 2, w - 4, h - 4);
            }
          }
        };

        const tick = () => {
          const now = performance.now();
          if (!detectBusyRef.current && now - lastDetectTimeRef.current > 150) {
            detectBusyRef.current = true;
            try {
              detect();
            } finally {
              lastDetectTimeRef.current = now;
              detectBusyRef.current = false;
            }
          }
          rafIdRef.current = window.requestAnimationFrame(tick);
        };
        rafIdRef.current = window.requestAnimationFrame(tick);
      } catch (err) {
        console.error(err);
      }
    };

    init();

    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      try {
        stream?.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, [
    startConversation,
    stopConversation,
    isDetectionEnabled,
    isLoading,
    hasPressedStart,
  ]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: "#000000" }}
    >
      <div className="h-screen w-full flex items-center justify-center">
        {/* Mascot Display Area */}
        <div className="relative w-full h-full">
          {/* Background pattern SVG - now full width */}
          <div
            className="absolute inset-0 pointer-events-none bg-black"
            style={{ opacity: 1.0 }}
          >
            {/* <img
              src="/bg-room.jpg"
              alt=""
              className="object-cover object-center w-full h-full bg-black"
            /> */}
          </div>

          {/* Mascot wrapper */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-full">
              <MascotRive showLoadingSpinner={true} />
            </div>
          </div>

          {/* <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/overlay-big.png"
              alt=""
              className="h-screen w-auto max-w-none flex-none object-center"
            />
          </div> */}

          {/* HIDDEN RESTART */}
          <div className="absolute top-0 left-0  flex items-center justify-center z-20">
            <button
              onClick={toggleRestart}
              disabled={isConnecting}
              className={`bg-transparent bg-center bg-contain flex items-center justify-center gap-x-2.5 h-20 w-20 text-lg font-mono truncate transition ${
                isConnecting ? "pointer-events-none" : ""
              }`}
            ></button>
          </div>
          {isRestartActive && (
            <>
              <div
                className="absolute inset-0 flex flex-col gap-10 items-center justify-center z-50 p-10 backdrop-blur-md"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.30)",
                  backgroundImage: "url(/privacy-bg.png)",
                  backgroundSize: "cover",
                }}
              >
                <div className="text-3xl text-center">
                  Are you sure you want to restart the experience?
                </div>
                <button
                  onClick={restartConversation}
                  className="closeBtn px-6 py-3 flex items-center justify-center gap-x-2.5"
                >
                  Restart <RestartBtnIcon />
                </button>
              </div>

              <button
                onClick={toggleRestart}
                className="absolute top-4 right-2 px-6 py-3 flex items-center justify-center gap-x-2.5 z-[60] "
              >
                <CloseBtnX />
              </button>
            </>
          )}

          {/* PRIVACY */}
          {isPrivacyActive && (
            <div
              className="absolute inset-0 flex flex-col gap-10 items-center justify-center z-50 p-10 backdrop-blur-md"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.70)",
                backgroundImage: "url(/privacy-bg.png)",
                backgroundSize: "cover",
              }}
            >
              <Privacy />
              <button
                onClick={togglePrivacy}
                className="closeBtn px-6 py-3 flex items-center justify-center gap-x-2.5"
              >
                Close <CloseBtnX />
              </button>
            </div>
          )}

          {/* QR Code */}
          {showQRCode && (
            <div
              className="absolute inset-0 flex flex-col gap-10 items-center justify-center z-50 p-10 backdrop-blur-md"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.30)",
                backgroundImage: "url(/privacy-bg.png)",
                backgroundSize: "cover",
              }}
            >
              <div className="w-[400px] aspect-square bg-black border-white border-8 text-white">
                {qrCodeURL && <QRCode data={qrCodeURL as string} width={400} />}
              </div>
              <button
                onClick={toggleQRCode}
                className="closeBtn px-6 py-3 flex items-center justify-center gap-x-2.5"
              >
                Close <CloseBtnX />
              </button>
            </div>
          )}

          {/* CC */}
          <div
            className={cn(
              "absolute bottom-[10vh] left-0 right-0 flex items-center justify-center z-30 px-10 transition-all duration-300",
              isCCActive && conversation.isSpeaking && botMessage.length > 0
                ? "opacity-100 bottom-[15vh]"
                : "opacity-0 bottom-[18vh]"
            )}
          >
            {!isKeypadActive &&
            isCCActive &&
            conversation.isSpeaking &&
            botMessage.length > 0 ? (
              <div className="relative">
                <div
                  className="absolute -top-[30px] left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "30px solid transparent",
                    borderRight: "30px solid transparent",
                    borderBottom: "30px solid rgba(134, 41, 12, 0.80)",
                  }}
                />
                <div
                  className="text-white text-base font-bold rounded-3xl p-3 shadow-2xl text-center leading-tight"
                  style={{ backgroundColor: "rgba(134, 41, 12, 0.80)" }}
                >
                  {conversation.isSpeaking ? botMessage : "..."}
                </div>
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div className="absolute bottom-[5vh] left-0 right-0 flex items-center justify-between z-20 px-10">
            <div className="flex w-1/4 justify-start">
              <button
                onClick={toggleCC}
                disabled={isConnecting}
                className={`bg-no-repeat bg-center bg-contain flex items-center justify-center gap-x-2.5 h-[60px] w-[100px] text-lg font-mono truncate transition ${
                  isConnecting ? "pointer-events-none" : ""
                }`}
                style={{
                  backgroundImage: isCCActive
                    ? "url(/cc-active.png)"
                    : "url(/cc-inactive.png)",
                  color: "#FFFFFF",
                }}
              ></button>
            </div>
            <div className="flex items-center justify-center gap-4">
              {conversation.status === "connected" ? (
                <div className="flex gap-x-5">
                  <button
                    className="bg-no-repeat bg-center bg-cover flex items-center justify-center gap-x-2.5 h-[8vh] w-[8vh] text-lg font-mono truncate transition scale-125"
                    style={{
                      backgroundImage: "url(/call-end.png)",
                      color: "#FFFFFF",
                    }}
                    onClick={hangUp}
                  ></button>
                </div>
              ) : (
                <button
                  onClick={startConversation}
                  disabled={isConnecting}
                  className={cn(
                    `bg-no-repeat bg-center bg-cover flex items-center justify-center gap-x-2.5 h-[8vh] w-[8vh] text-lg font-mono truncate transition scale-125 rounded-full ${
                      isConnecting ? "pointer-events-none" : ""
                    }`,
                    isConnecting ? "animate-scale-up-down" : "",
                    isDetectionEnabled ? "border-2 border-[#D9A475]" : ""
                  )}
                  style={{
                    backgroundImage: isConnecting
                      ? "url(/call-empty.png)"
                      : "url(/call.png)",
                    color: "#FFFFFF",
                  }}
                >
                  {isConnecting ? <Loader /> : ""}
                </button>
              )}
            </div>
            <div className="flex w-1/4 items-end justify-end">
              <button
                onClick={togglePrivacy}
                className={`bg-no-repeat bg-center bg-contain flex items-center justify-center gap-x-2.5 h-24 w-[180px] text-lg font-mono truncate transition ${
                  isConnecting ? "pointer-events-none" : ""
                }`}
                style={{
                  backgroundImage: isPrivacyActive
                    ? "url(/privacy-active.png)"
                    : "url(/privacy-inactive.png)",
                  color: "#FFFFFF",
                }}
              ></button>
            </div>
          </div>

          {/* HIDDEN KEYPAD TRIGGER */}
          <div className="absolute top-0 right-0  flex items-center justify-end z-20">
            <button
              onClick={toggleKeypad}
              className={` bg-center bg-contain flex items-center justify-center gap-x-2.5 h-20 w-20 text-lg font-mono truncate transition`}
            ></button>
          </div>
          {/* Keypad */}
          {isKeypadActive && (
            <div className="absolute inset-0 flex items-center justify-center z-20 px-10">
              <PromoGiftCard
                isOpen={true}
                onOpenChange={didTapCloseKeypad}
                onFinish={didTapStartOver}
                onSubmit={didTapSubmit}
              />
            </div>
          )}

          <div className={cn(isDetectionEnabled ? "hidden" : "hidden")}>
            <video ref={videoRef} className="hidden" playsInline muted></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            {/* <div className="absolute bottom-4 right-4 border rounded bg-white/70 p-2 shadow z-50">
              <canvas
                ref={debugCanvasRef}
                className="w-[320px] h-[240px]"
              ></canvas>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const mascotUrl = "/gingerkoala_05-oldSDK_compressed.riv";

  // Hardcoded dynamic variables for testing
  const dynamicVariables = {};

  return (
    <MascotProvider>
      <main className="w-full h-screen text-white">
        <MascotClient
          src={mascotUrl}
          artboard="Character"
          inputs={["is_speaking", "cardWon", "sessionEnded"]}
          layout={{
            fit: Fit.Contain,
            alignment: Alignment.BottomCenter,
          }}
          onRiveLoad={(riveInstance) => {
            setIsLoading(false);
          }}
        >
          <ElevenLabsAvatar
            dynamicVariables={dynamicVariables}
            isLoading={isLoading}
          />
        </MascotClient>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-[9999] bg-black">
            <Loader width={100} height={100} />
            <p className="text-white text-lg font-mono mt-4">Loading...</p>
          </div>
        )}
      </main>
    </MascotProvider>
  );
}
