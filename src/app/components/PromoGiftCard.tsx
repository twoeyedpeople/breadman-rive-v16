"use client";

import { useMemo, useState } from "react";

type PromoGiftCardProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFinish?: () => void;
  onSubmit?: () => void;
};

export function PromoGiftCard({
  triggerLabel = "Show Promo",
  triggerClassName = "",
  isOpen,
  onOpenChange,
  onFinish,
  onSubmit,
}: PromoGiftCardProps) {
  const [showPromoInternal, setShowPromoInternal] = useState(false);

  const [phoneDigits, setPhoneDigits] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showPromo = typeof isOpen === "boolean" ? isOpen : showPromoInternal;
  const [showKeypad, setShowKeypad] = useState(showPromo);
  const formattedNumber = useMemo(() => {
    const groups: string[] = [];
    const raw = phoneDigits.join("");
    for (let i = 0; i < raw.length; i += 3) {
      groups.push(raw.slice(i, i + 3));
    }
    return groups.join(" ");
  }, [phoneDigits]);

  const isSuccess = !!statusMessage && !isError;

  const handleDigit = (digit: string) => {
    setPhoneDigits((prev) => (prev.length >= 12 ? prev : [...prev, digit]));
  };

  const handleBackspace = () => {
    setPhoneDigits((prev) => prev.slice(0, -1));
  };

  const handleClosePromo = () => {
    onOpenChange?.(false);
    if (typeof isOpen === "boolean") {
    } else {
      setShowPromoInternal(false);
    }
    setShowKeypad(false);
    setPhoneDigits([]);
    setStatusMessage(null);
    setIsError(false);
  };

  const handleStartOver = () => {
    onFinish?.();
    handleClosePromo();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const raw = phoneDigits.join("");
    const normalized = raw;
    if (raw.length < 10) {
      setStatusMessage("Please enter a valid phone number");
      setIsError(true);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = "promoGiftCardQuota";
    let record: { date: string; numbers: string[] } = {
      date: today,
      numbers: [],
    };
    if (typeof window !== "undefined") {
      try {
        const existing = localStorage.getItem(storageKey);
        if (existing) {
          const parsed = JSON.parse(existing) as {
            date?: string;
            numbers?: string[];
          };
          if (parsed.date === today && Array.isArray(parsed.numbers)) {
            record = { date: today, numbers: parsed.numbers };
          }
        }
      } catch {
        // ignore parse errors and use default record
      }
    }

    if (record.numbers.includes(normalized)) {
      setStatusMessage("This number has already redeemed a gift card.");
      setIsError(true);
      return;
    }
    const maxWins = Number(process.env.NEXT_PUBLIC_MAX_WINS ?? 40);
    if (record.numbers.length >= maxWins) {
      setStatusMessage("Sorry, today’s gift card limit has been reached.");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Sending your gift card...");
    setIsError(false);

    try {
      if (onSubmit) {
        onSubmit();
      }
      const res = await fetch("/api/promo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        const message = data?.error ?? "Unable to send gift card right now.";
        throw new Error(message);
      }

      record.numbers.push(normalized);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(record));
        } catch {
          // ignore storage errors
        }
      }

      setStatusMessage(
        "We just sent you a link to redeem your gift card. It may take a few minutes to arrive."
      );
      setIsError(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send gift card right now.";
      setStatusMessage(message);
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {showPromo && showKeypad && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-end p-4 pb-8"
          onClick={handleClosePromo}
        >
          <div
            className="rounded-3xl border-8 shadow-2xl border-white bg-cover"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#F5D996",
              backgroundImage: "url('/keypad_bg.jpg')",
            }}
          >
            <button
              onClick={handleClosePromo}
              className="absolute top-4 right-4 h-16 w-16 z-40 rounded-full bg-white/80 text-black text-3xl font-semibold shadow hover:bg-white"
              aria-label="Close keypad"
            >
              ×
            </button>
            <div className="w-[60vw] max-w-[60vw] text-center text-[#6B4827] space-y-6 relative p-5 pb-12">
              <div
                className={`text-lg font-bold ${
                  isError ? "text-red-500" : "text-[#6B4827]"
                }`}
              >
                {statusMessage ?? (
                  <div className="flex flex-col gap-0">
                    <span className="leading-[10px]">
                      You&apos;ve scored a{" "}
                      <img
                        src="/giftcard.png"
                        alt="Gift Card"
                        className="inline-block h-12 relative -top-2 mx-1 mr-0"
                      />{" "}
                      Gift Card
                    </span>
                    <span className="leading-[10px]">
                      enter your phone number!
                    </span>
                  </div>
                )}
              </div>
              {!isSuccess && (
                <>
                  <div className="phonenumber text-4xl tracking-wide font-black flex items-center justify-center p-1">
                    {formattedNumber || "\u00a0"}
                  </div>
                  <div className="grid grid-cols-3 gap-0 justify-items-center">
                    {[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "",
                      "0",
                      "backspace",
                    ].map((n, idx) => {
                      if (n === "")
                        return (
                          <div
                            key={`empty-${idx}`}
                            className="h-[10vw] w-[10vw] bg-no-repeat bg-center bg-cover"
                            style={{
                              backgroundImage: "url('keypad_" + n + ".png')",
                            }}
                          />
                        );
                      if (n === "backspace") {
                        return (
                          <button
                            key="backspace"
                            onClick={handleBackspace}
                            disabled={isSubmitting}
                            className="h-[10vw] w-[10vw] rounded-full bg-no-repeat bg-center bg-contain  hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{
                              backgroundImage: "url('keypad_x.png')",
                            }}
                          ></button>
                        );
                      }
                      return (
                        <button
                          key={n}
                          onClick={() => handleDigit(n)}
                          disabled={isSubmitting}
                          className="h-[10vw] w-[10vw] rounded-full bg-no-repeat bg-center bg-contain  hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed"
                          style={{
                            backgroundImage: "url('keypad_" + n + ".png')",
                          }}
                        ></button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="closeBtn w-auto px-6 mt-2 rounded-lg bg-white !text-2xl  py-3 !font-black shadow !border-4  disabled:opacity-70 disabled:cursor-not-allowed absolute -bottom-6 -translate-x-1/2"
                  >
                    {isSubmitting ? "Sending..." : "Submit"}
                  </button>
                </>
              )}
              {isSuccess && (
                <button
                  onClick={handleStartOver}
                  className="closeBtn w-full mt-2 rounded-lg bg-white text-black py-3 font-medium shadow hover:bg-gray-100"
                >
                  Start Over
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PromoGiftCard;
