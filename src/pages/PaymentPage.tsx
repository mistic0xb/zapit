import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig } from "../libs/nostr";
import { generateInvoice } from "../libs/nip57";
import type { BoardConfig } from "../types";
import RetroFrame from "../components/Frame";

function PaymentPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [amount, setAmount] = useState<number>(1000);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [error, setError] = useState("");

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
      });

      if (!invoiceData || !invoiceData.invoice) {
        throw new Error("Failed to generate invoice");
      }

      console.log(
        "Invoice generated:",
        invoiceData.invoice.slice(0, 30) + "..."
      );
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

  if (loading) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <RetroFrame>
        <div className="text-white text-xl">Loading...</div>
      </RetroFrame>
    </div>
  );
}

if (error && !boardConfig) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <RetroFrame>
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
          {error}
        </div>
      </RetroFrame>
    </div>
  );
}

return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
    <RetroFrame className="max-w-lg w-full">
      {!invoice ? (
        // Step 1: Input form
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
          <h2 className="text-3xl font-bold text-white mb-2">⚡ Send a Zap</h2>
          <p className="text-gray-300 mb-6">to {boardConfig?.displayName}</p>

          <div className="space-y-6">
            <div>
              <label className="block text-white mb-2 font-medium">
                Amount (sats)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={boardConfig?.minZapAmount}
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-orange-500 text-lg"
              />
              <p className="text-gray-400 text-sm mt-2">
                Minimum: {boardConfig?.minZapAmount} sats
              </p>
            </div>

            <div>
              <label className="block text-white mb-2 font-medium">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a question or leave a comment..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-yellow-500 resize-none"
              />
              <p className="text-gray-400 text-sm mt-2">
                {message.length}/500 characters
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleSendZap}
              disabled={processing}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-4 rounded-lg text-lg transition-colors"
            >
              {processing ? "Generating Invoice..." : `Zap ${amount} sats ⚡`}
            </button>

            <button
              onClick={() => navigate(`/board/${boardId}`)}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Back to Board
            </button>
          </div>
        </div>
      ) : (
        // Step 2: Show invoice
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Scan to Pay</h2>
          <p className="text-gray-300 mb-6">{amount.toLocaleString()} sats</p>
          <div>{invoice}</div>
          <div className="bg-white p-6 rounded-xl mb-6">
            <QRCodeSVG
              value={invoice}
              size={300}
              level="M"
              className="mx-auto"
              style={{ width: "100%", height: "auto" }}
            />
          </div>

          <button
            onClick={openInWallet}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg text-lg mb-3 transition-colors"
          >
            Open in Wallet
          </button>

          <button
            onClick={() => {
              setInvoice(null);
              setMessage("");
            }}
            className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Create Another Zap
          </button>

          <p className="text-gray-400 text-sm mt-6">
            After payment, your message will appear on the board
          </p>
        </div>
      )}
    </RetroFrame>
  </div>
);
}

export default PaymentPage;
