"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  Alignment,
  Fit,
  MascotClient,
  MascotProvider,
  MascotRive,
  useMascotElevenlabs,
} from "@mascotbot-sdk/react";
import { Loader } from "./components/loader";
import { Privacy } from "./components/privacy";
import { CloseBtnX } from "./components/closeBtnX";
import { RestartBtnIcon } from "./components/restartBtnIcon";
import { PromoGiftCard } from "./components/PromoGiftCard";
import QRCode from "./components/QRCode";
import { cn } from "./util/ui";

interface ElevenLabsAvatarProps {
  dynamicVariables?: Record<string, string | number | boolean>;
}

function ElevenLabsAvatar({ dynamicVariables }: ElevenLabsAvatarProps) {
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
      const shouldRestart = !didUserHangUpRef.current;
      if (shouldRestart) {
        setTimeout(() => {
          restartConversation();
        }, 5000);
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

  // Enable avatar with real-time lip sync
  const { isIntercepting, messageCount } = useMascotElevenlabs({
    conversation,
    gesture: true,
    naturalLipSync: naturalLipSyncEnabled,
    naturalLipSyncConfig: lipSyncConfig,
  });

  // Get signed URL for ElevenLabs
  const getSignedUrl = async (): Promise<string> => {
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
  const startConversation = useCallback(async () => {
    try {
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
      await conversation.startSession({
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
                console.error("USER DID NOT WIN, MAX EXCEEDED");
                return "User did not win";
              }
              const randVal = Math.random();
              const didWin = randVal < 0.5;
              console.warn("Checking...", randVal, didWin);
              if (didWin) {
                console.warn("USER DID WIN!!!!");
                setIsKeypadActive(true);
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
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setIsConnecting(false);
      connectionStartTime.current = null;
    }
  }, [conversation, dynamicVariables]);

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

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    //console.log(`Microphone ${newMuteState ? "muted" : "unmuted"}`);
  }, [isMuted]);

  const toggleCC = useCallback(() => {
    const newCCState = !isCCActive;
    setIsCCActive(newCCState);
    //console.log(`CC: ${newCCState ? "active" : "inactive"}`);
  }, [isCCActive]);

  const togglePrivacy = useCallback(() => {
    const newPrivacyState = !isPrivacyActive;
    setIsPrivacyActive(newPrivacyState);
    //console.log(`Privacy: ${newPrivacyState ? "active" : "inactive"}`);
  }, [isPrivacyActive]);

  const toggleRestart = useCallback(() => {
    const newRestartState = !isRestartActive;
    setIsRestartActive(newRestartState);
    //console.log(`Restart: ${newRestartState ? "active" : "inactive"}`);
  }, [isRestartActive]);

  const toggleKeypad = useCallback(() => {
    const newKeypadState = !isKeypadActive;
    setIsKeypadActive(newKeypadState);
    //console.log(`Keypad: ${newKeypadState ? "active" : "inactive"}`);
  }, [isKeypadActive]);

  const toggleQRCode = useCallback(() => {
    const newQRCodeState = !showQRCode;
    setShowQRCode(newQRCodeState);
    //console.log(`QR Code: ${newQRCodeState ? "active" : "inactive"}`);
  }, [showQRCode]);

  const restartConversation = useCallback(() => {
    setShowQRCode(false);
    setIsPrivacyActive(false);
    setIsKeypadActive(false);
    setIsRestartActive(false);
    stopConversation();
    startConversation();
  }, [stopConversation, startConversation]);

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
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 1.0 }}
          >
            <img
              src="/bg-room.jpg"
              alt=""
              className="object-cover object-center w-full h-full bg-black"
            />
          </div>

          {/* Mascot wrapper */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[calc(9_*_100vh_/16)] h-full scale-77 -translate-y-48">
              <MascotRive />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/overlay-big.png"
              alt=""
              className="h-screen w-auto max-w-none flex-none object-center"
            />
          </div>

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
                backgroundColor: "rgba(0, 0, 0, 0.30)",
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
              "absolute bottom-56 left-0 right-0 flex items-center justify-center z-20 px-10 transition-all duration-300",
              isCCActive && conversation.isSpeaking && botMessage.length > 0
                ? "opacity-100 bottom-56"
                : "opacity-0 bottom-60"
            )}
          >
            {isCCActive && conversation.isSpeaking && botMessage.length > 0 ? (
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
                  className="text-white text-lg font-bold rounded-3xl p-3 shadow-2xl text-center"
                  style={{ backgroundColor: "rgba(134, 41, 12, 0.80)" }}
                >
                  {conversation.isSpeaking ? botMessage : "..."}
                </div>
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div className="absolute bottom-20 left-0 right-0 flex items-center justify-between z-20 px-10">
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
                    className="bg-no-repeat bg-center bg-cover flex items-center justify-center gap-x-2.5 h-24 w-24 text-lg font-mono truncate transition scale-125"
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
                    `bg-no-repeat bg-center bg-cover flex items-center justify-center gap-x-2.5 h-24 w-24 text-lg font-mono truncate transition scale-125 ${
                      isConnecting ? "pointer-events-none" : ""
                    }`,
                    isConnecting ? "animate-scale-up-down" : ""
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
                onOpenChange={setIsKeypadActive}
                onFinish={restartConversation}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // Add your mascot .riv file to the public folder
  // Available with Mascot Bot SDK subscription
  let mascotUrl = "/mascot/bear.riv";

  // mascotUrl = "/mascot/ginger_koala-test_04.riv";

  // Hardcoded dynamic variables for testing
  const dynamicVariables = {
    name: "Charlie",
    // Add more variables as needed
  };

  return (
    <MascotProvider>
      <main className="w-full h-screen">
        <MascotClient
          src={mascotUrl}
          artboard="Character"
          inputs={["is_speaking2", "gesture2"]}
          layout={{
            fit: Fit.Contain,
            alignment: Alignment.BottomCenter,
          }}
          onRiveLoad={(riveInstance) => {
            // const r =
            //   riveInstance && "rive" in riveInstance
            //     ? (riveInstance as any).rive
            //     : riveInstance;
            // const artboardName = "Character";
            // try {
            //   const names = r?.stateMachineNames ?? [];
            //   console.group(`Artboard: ${artboardName}`);
            //   names.forEach((smName: string) => {
            //     const inputs = r?.stateMachineInputs?.(smName) ?? [];
            //     console.group(`State Machine: ${smName}`);
            //     console.table(
            //       inputs.map((input: any) => ({
            //         name: input.name,
            //         type: input.type,
            //         value: input.value,
            //       }))
            //     );
            //     console.groupEnd();
            //   });
            //   console.groupEnd();
            // } catch (e) {
            //   console.warn("Failed to enumerate state machines/inputs", e);
            // }
          }}
        >
          <ElevenLabsAvatar dynamicVariables={dynamicVariables} />
        </MascotClient>
      </main>
    </MascotProvider>
  );
}
