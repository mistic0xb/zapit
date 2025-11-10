import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig, subscribeToMessages } from "../libs/nostr";
import type { BoardConfig, ZapMessage } from "../types";
import { monitorZapReceipts } from "../libs/nostr";
import RetroFrame from "../components/Frame";

function BoardDisplay() {
  const { boardId } = useParams<{ boardId: string }>();
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [messages, setMessages] = useState<ZapMessage[]>([]);
  const [totalSats, setTotalSats] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Load board config from Nostr
  useEffect(() => {
    const loadBoard = async () => {
      if (!boardId) return;

      setLoading(true);

      try {
        // First try Nostr
        const config = await fetchBoardConfig(boardId);

        if (config) {
          setBoardConfig(config);
        } else {
          // Fallback to localStorage
          const boards = JSON.parse(localStorage.getItem("boards") || "[]");
          const board = boards.find((b: any) => b.boardId === boardId);

          if (board) {
            setBoardConfig(board.config);
          } else {
            setError("Board not found");
          }
        }
      } catch (err) {
        console.error("Failed to load board:", err);
        setError("Failed to load board");
      } finally {
        setLoading(false);
      }
    };

    loadBoard();
  }, [boardId]);

  //   // Subscribe to messages
  //   useEffect(() => {
  //     if (!boardId) return;

  //     console.log("Subscribing to messages for board:", boardId);

  //     const unsubscribe = subscribeToMessages(boardId, (message) => {
  //       console.log("New message received:", message);

  //       setMessages((prev) => {
  //         // Avoid duplicates
  //         if (prev.find((m) => m.id === message.id)) return prev;
  //         return [...prev, message];
  //       });

  //       setTotalSats((prev) => prev + message.zapAmount);
  //     });

  //     return () => {
  //       console.log("Unsubscribing from messages");
  //       unsubscribe();
  //     };
  //   }, [boardId]);

  //  Monitor
  useEffect(() => {
    if (!boardId || !boardConfig) return;

    console.log("Monitoring zap receipts for board:", boardId);

    const unsubscribe = monitorZapReceipts(
      boardId,
      boardConfig.creatorPubkey,
      (message) => {
        console.log("New zap message:", message);

        setMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        setTotalSats((prev) => prev + message.zapAmount);
      }
    );

    return () => unsubscribe();
  }, [boardId, boardConfig]);

  // Sort messages: highest sats first, then by time if equal
  const sortedMessages = [...messages].sort((a, b) => {
    if (b.zapAmount !== a.zapAmount) {
      return b.zapAmount - a.zapAmount;
    }
    return b.timestamp - a.timestamp;
  });
  console.log(sortedMessages);

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return "Now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // Convert sats to USD (fixing for now, TODO: make api call)
  const satsToUSD = (sats: number) => {
    const btcPrice = 100_000;
    const btc = sats / 100_000_000;
    return (btc * btcPrice).toFixed(2);
  };


      console.log(`${window.location.origin}/pay/${boardId}`)

  
  if (loading) {
    return (
      <RetroFrame>
        <div className="text-yellow-300 text-xl font-mono">
          Loading board...
        </div>
      </RetroFrame>
    );
  }

  if (error || !boardConfig) {
    return (
      <RetroFrame>
        <div className="text-red-400 text-xl font-mono">
          {error || "Board not found"}
        </div>
      </RetroFrame>
    );
  }
  return (
    <div className="min-h-screen bg-black p-8 flex items-center justify-center">
      <div className="w-full h-full max-w-7xl mx-auto">
        {" "}
        <RetroFrame>
          {/* Loading */}
          {loading && (
            <div className="text-yellow-300 text-xl font-mono">
              Loading board...
            </div>
          )}

          {/* Error */}
          {!loading && (error || !boardConfig) && (
            <div className="text-red-400 text-xl font-mono">
              {error || "Board not found"}
            </div>
          )}

          {/* Main Board */}
          {!loading && boardConfig && (
            <div className="max-w-7xl w-full mx-auto font-mono text-yellow-200">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-yellow-400 uppercase">
                  {boardConfig.displayName}
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Messages Feed */}
                <div className="lg:col-span-2 space-y-4">
                  {sortedMessages.length === 0 ? (
                    <div className="border-2 border-yellow-500 p-12 text-center bg-black">
                      <div className="text-6xl mb-4">⚡</div>
                      <p className="text-yellow-300 text-xl">
                        Waiting for messages...
                      </p>
                      <p className="text-yellow-500 text-sm mt-2">
                        Scan the QR code to send a zap with your message
                      </p>
                    </div>
                  ) : (
                    sortedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="bg-black border-2 border-yellow-500 p-6 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-black font-bold">
                                {msg.sender?.[0]?.toUpperCase() || "A"}
                              </span>
                            </div>
                            <span className="text-yellow-200 font-medium">
                              {msg.sender?.slice(0, 5) || "Anon"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-yellow-400 text-black font-bold px-4 py-1 rounded-full">
                              {msg.zapAmount.toLocaleString()} sats
                            </span>
                            <span className="text-yellow-500 text-sm">
                              {formatTimeAgo(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-yellow-100 text-lg leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Right: Stats + QR Code */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Total Support */}
                  <div className="border-2 border-yellow-500 p-8 text-center bg-black">
                    <div className="text-yellow-400 text-sm uppercase tracking-wide mb-2">
                      Total Support
                    </div>
                    <div className="text-6xl font-bold text-brightGreen mb-2">
                      {totalSats.toLocaleString()}
                    </div>
                    <div className="text-2xl text-yellow-400 mb-1">sats</div>
                    <div className="text-yellow-300 text-xl font-semibold">
                      ${satsToUSD(totalSats)}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="border-2 border-yellow-500 p-6 bg-black">
                    <div className="bg-black p-4 rounded-lg mb-4 border border-yellow-400">
                      <QRCodeSVG
                        value={`${window.location.origin}/pay/${boardId}`}
                        size={256}
                        level="M"
                        className="mx-auto"
                        style={{ width: "100%", height: "auto" }}
                      />
                    </div>
                    <p className="text-center text-yellow-300 font-bold text-lg">
                      Scan to send a zap
                    </p>
                    <p className="text-center text-yellow-500 text-sm mt-2">
                      Min: {boardConfig.minZapAmount} sats
                    </p>
                  </div>

                  {/* Message Count */}
                  <div className="border-2 border-yellow-500 p-6 text-center bg-black">
                    <div className="text-4xl font-bold text-yellow-400">
                      {messages.length}
                    </div>
                    <div className="text-yellow-300 mt-2">
                      {messages.length === 1 ? "Message" : "Messages"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </RetroFrame>
      </div>
    </div>
  );
}

export default BoardDisplay;
