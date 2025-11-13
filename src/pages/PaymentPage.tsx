import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig, monitorZapReceipts } from "../libs/nostr";
import { generateInvoice } from "../libs/nip57";
import type { BoardConfig, ZapMessage } from "../types";
import RetroFrame from "../components/Frame";
import { FaCopy, FaCheckCircle } from "react-icons/fa";

function PaymentPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [amount, setAmount] = useState<number>(1000);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState("");

  // Preset amount options
  const PRESET_AMOUNTS = [
    21, 69, 121, 420, 1000, 2100, 4200, 10000, 21000, 42000, 69000, 100000,
    210000, 500000, 1000000,
  ];

  // Load board config
  useEffect(() => {
    const loadBoard = async () => {
      if (!boardId) return;

      setLoading(true);
      try {
        const config = await fetchBoardConfig(boardId);

        if (!config) {
          setError("Board not found");
          return;
        }

        setBoardConfig(config);
        setAmount(config.minZapAmount);
      } catch (err) {
        setError("Failed to load board");
      } finally {
        setLoading(false);
      }
    };

    loadBoard();
  }, [boardId]);

  // Monitor for payment success after invoice is generated
  useEffect(() => {
    if (!invoice || !boardId || !boardConfig) return;

    console.log("Starting to monitor for payment...");

    // Monitor zap receipts to detect when payment is made
    const unsubscribe = monitorZapReceipts(
      boardId,
      boardConfig.creatorPubkey,
      (zapMessage: ZapMessage) => {
        // Check if this zap matches our current invoice details
        if (zapMessage.content === message && zapMessage.zapAmount === amount) {
          console.log("Payment detected!", zapMessage);
          setPaymentSuccess(true);

          // Optional: Navigate to board after a delay
          setTimeout(() => {
            navigate(`/board/${boardId}`);
          }, 3000);
        }
      }
    );

    return () => unsubscribe();
  }, [invoice, boardId, boardConfig, message, amount, navigate]);

  // Get valid preset amounts based on minZapAmount
  const getValidPresets = () => {
    if (!boardConfig) return [];
    return PRESET_AMOUNTS.filter(
      (amt) => amt >= boardConfig.minZapAmount
    ).slice(0, 5);
  };

  const handleSendZap = async () => {
    if (!boardConfig || !boardId) return;

    if (amount < boardConfig.minZapAmount) {
      setError(`Minimum amount is ${boardConfig.minZapAmount} sats`);
      return;
    }

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      console.log("Creating zap request...");

      // Create zap request and generate invoice
      const invoiceData = await generateInvoice({
        lightningAddress: boardConfig.lightningAddress,
        amount,
        message,
        boardId,
        recipientPubkey: boardConfig.creatorPubkey,
        displayName: displayName.trim() || "Anonymous",
      });
      console.log(invoiceData);

      if (!invoiceData || !invoiceData.invoice) {
        throw new Error("Failed to generate invoice");
      }

      setInvoice(invoiceData.invoice);
    } catch (err) {
      console.error("Zap error:", err);
      setError(err instanceof Error ? err.message : "Failed to create zap");
    } finally {
      setProcessing(false);
    }
  };

  const openInWallet = () => {
    if (!invoice) return;
    window.location.href = `lightning:${invoice}`;
  };

  const handleCopy = () => {
    if (invoice != null) {
      navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Format large numbers
  const formatAmount = (amt: number) => {
    if (amt >= 1000000) return `${(amt / 1000000).toFixed(1)}M`;
    if (amt >= 1000) return `${(amt / 1000).toFixed(1)}K`;
    return amt.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-2 sm:px-0">
        <RetroFrame className="w-full max-w-md sm:max-w-lg px-2 sm:px-6">
          <div className="text-white text-lg sm:text-xl">Loading...</div>
        </RetroFrame>
      </div>
    );
  }

  if (error && !boardConfig) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-2 sm:px-0">
        <RetroFrame className="w-full max-w-md sm:max-w-lg px-2 sm:px-6 py-4 sm:py-8">
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 text-sm sm:text-base">
            {error}
          </div>
        </RetroFrame>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-1 sm:px-0">
      <RetroFrame className="w-full max-w-lg sm:w-lg px-2 sm:px-8 py-3 sm:py-8">
        {!invoice ? (
          // Step 1: Input form
          <div className="bg-white/10 backdrop-blur-lg p-3 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              ⚡ Send a Zap
            </h2>
            <p className="text-gray-300 mb-6 text-sm sm:text-base">
              to {boardConfig?.boardName}
            </p>

            <div className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-white mb-2 font-medium text-sm sm:text-base">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Anonymous"
                  maxLength={50}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-blue-500 text-base sm:text-lg"
                />
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  Leave empty to post anonymously
                </p>
              </div>

              {/* Amount selection */}
              <div>
                <label className="block text-white mb-2 font-medium text-sm sm:text-base">
                  Amount (sats)
                </label>

                {!showCustomAmount ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {getValidPresets().map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setAmount(preset)}
                          className={`px-2 py-1 font-bold text-base sm:text-lg transition-all ${
                            amount === preset
                              ? "bg-orange-500 text-white border-2 border-orange-400"
                              : "bg-white/20 text-white border border-white/30 hover:bg-white/30"
                          }`}
                        >
                          {formatAmount(preset)}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowCustomAmount(true)}
                        className="w-full px-2 py-1 bg-white/10 text-white border border-white/30 hover:bg-white/20 text-sm transition-colors"
                      >
                        Custom Amount
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      min={boardConfig?.minZapAmount}
                      className="w-full px-4 py-2 sm:py-3 bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-orange-500 text-base sm:text-lg"
                    />
                    <button
                      onClick={() => setShowCustomAmount(false)}
                      className="w-full px-4 py-2 bg-white/10 text-white border border-white/30 hover:bg-white/20 text-sm transition-colors "
                    >
                      Back to Presets
                    </button>
                  </div>
                )}

                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  Minimum: {boardConfig?.minZapAmount} sats
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-white mb-2 font-medium text-sm sm:text-base">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask a question or leave a comment..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-yellow-500 resize-none"
                />
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  {message.length}/500 characters
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 text-sm sm:text-base">
                  {error}
                </div>
              )}

              <button
                onClick={handleSendZap}
                disabled={processing}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-3 sm:py-4 text-base sm:text-lg transition-colors"
              >
                {processing ? "Generating Invoice..." : `Zap ${amount} sats ⚡`}
              </button>

              <button
                onClick={() => navigate(`/board/${boardId}`)}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 text-base transition-colors"
              >
                Back to Board
              </button>
            </div>
          </div>
        ) : (
          // Step 2: Show invoice
          <div className="bg-white/10 backdrop-blur-lg p-3 sm:p-8 text-center">
            {!paymentSuccess ? (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Scan to Pay
                </h2>
                <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
                  {amount.toLocaleString()} sats
                </p>

                <div className="flex flex-col items-center justify-center pb-3 gap-2">
                  <div className="bg-white p-4 sm:p-6 w-full max-w-xs">
                    <QRCodeSVG
                      value={invoice}
                      size={220}
                      level="M"
                      className="mx-auto"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                  {!copied ? (
                    <div
                      className="flex gap-2 items-center text-xs sm:text-sm cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors"
                      onClick={handleCopy}
                    >
                      Copy invoice <FaCopy size={18} />
                    </div>
                  ) : (
                    <div className="text-green-300 text-xs sm:text-sm text-center">
                      lnurl invoice copied!
                    </div>
                  )}
                </div>

                <button
                  onClick={openInWallet}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 sm:py-4 text-base sm:text-lg mb-3 transition-colors"
                >
                  Open in Wallet
                </button>

                <button
                  onClick={() => {
                    setInvoice(null);
                    setMessage("");
                  }}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 text-base transition-colors"
                >
                  Create Another Zap
                </button>

                <p className="text-gray-400 text-xs sm:text-sm mt-4">
                  Waiting for payment...
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <div className="animate-[scale-in_0.5s_ease-out]">
                  <FaCheckCircle
                    className="text-green-400 animate-pulse"
                    size={100}
                  />
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-green-400 mt-6 mb-2 animate-[fade-in_0.5s_ease-out_0.3s_both]">
                  Payment Successful!
                </h2>

                <p className="text-gray-300 text-base sm:text-lg animate-[fade-in_0.5s_ease-out_0.5s_both]">
                  Your message has been sent ⚡
                </p>

                <p className="text-gray-400 text-xs sm:text-sm mt-4 animate-[fade-in_0.5s_ease-out_0.7s_both]">
                  Redirecting to board...
                </p>
              </div>
            )}
          </div>
        )}
      </RetroFrame>
    </div>
  );
}

export default PaymentPage;
