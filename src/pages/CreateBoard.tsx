import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { validateLightningAddress } from "../libs/lighting";
import { generateBoardId, generateEphemeralKeys } from "../libs/crypto";
import type { BoardConfig, StoredBoard } from "../types/types";
import { publishBoardConfig, verifyUserEligibility } from "../libs/nostr";
import { generatePremiumInvoice, monitorPremiumPayment,
} from "../libs/payments";
import RetroFrame from "../components/Frame";
import NostrLoginOverlay from "../components/NostrLoginOverlay";
import { PREMIUM_AMOUNT, PREMIUM_LIGHTNING_ADDRESS } from "../libs/payments";
import { QRCodeSVG } from "qrcode.react";

function CreateBoard() {
  const navigate = useNavigate();

  // Board settings
  const [boardName, setBoardName] = useState("");
  const [lightningAddress, setLightningAddress] = useState("");
  const [minZapAmount, setMinZapAmount] = useState(1000);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Explorable board state
  const [isExplorable, setIsExplorable] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Eligibility verification states
  const [isVerifyingEligibility, setIsVerifyingEligibility] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");

  // Payment states
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [premiumInvoice, setPremiumInvoice] = useState("");
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Load existing boards from localStorage
  const [prevBoards, setPrevBoards] = useState<StoredBoard[]>([]);
  const [showPrevBoards, setShowPrevBoards] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<StoredBoard>();

  // Generate board ID
  const boardId = generateBoardId();

  useEffect(() => {
    const boards: StoredBoard[] = JSON.parse(
      localStorage.getItem("boards") || "[]"
    );
    if (boards.length) setPrevBoards(boards);
  }, []);

  // Handle explorable toggle
  const handleExplorableToggle = (checked: boolean) => {
    if (checked && !isLoggedIn) {
      setShowLoginOverlay(true);
    } else if (!checked) {
      setIsExplorable(false);
      setIsLoggedIn(false);
      setUserPubkey("");
      setIsPaid(false);
      setShowPaymentQR(false);
    }
  };

  // Handle successful login
  const handleLoginSuccess = async (pubkey: string) => {
    setUserPubkey(pubkey);
    setIsLoggedIn(true);
    setIsExplorable(true);
    setShowLoginOverlay(false);

    // Verify user eligibility after login
    setIsVerifyingEligibility(true);
    setEligibilityError("");

    try {
      const result = await verifyUserEligibility(pubkey);

      if (result.eligible) {
        setIsEligible(true);
        // Show payment QR
        showPaymentModal(boardId, pubkey);
      } else {
        setIsEligible(false);
        setIsExplorable(false);
        setEligibilityError(
          result.reason || "Not eligible to create explorable board"
        );
      }
    } catch (err) {
      setIsEligible(false);
      setIsExplorable(false);
      setEligibilityError("Failed to verify eligibility. Please try again.");
    } finally {
      setIsVerifyingEligibility(false);
    }
  };

  // Show payment modal
  const showPaymentModal = async (boardId: string, pubkey: string) => {
    const res = await generatePremiumInvoice(boardId, pubkey);
    setPremiumInvoice(res!.invoice);
    setShowPaymentQR(true);
    setIsWaitingPayment(true);

    // Monitor for payment
    const cleanup = monitorPremiumPayment(
      boardId,
      pubkey,
      () => {
        setIsPaid(true);
        setIsWaitingPayment(false);
        setShowPaymentQR(false);
      },
      (error) => {
        setError(error);
        setIsWaitingPayment(false);
      }
    );

    // Store cleanup function for unmount
    return cleanup;
  };

  // Handle login modal close
  const handleLoginClose = () => {
    setShowLoginOverlay(false);
    if (!isLoggedIn) {
      setIsExplorable(false);
    }
    setEligibilityError("");
  };

  const handleCreateBoard = async () => {
    // Validation
    if (!boardName.trim()) {
      setError("Please enter a board name");
      return;
    }

    if (!lightningAddress.trim()) {
      setError("Please enter a Lightning address");
      return;
    }

    if (isExplorable && !isPaid) {
      setError("Please complete payment to create explorable board");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      // Validate Lightning address
      const validation = await validateLightningAddress(lightningAddress);
      if (!validation.valid) {
        setError(validation.error || "Invalid Lightning address");
        setIsCreating(false);
        return;
      }

      // Handle Keys
      let privateKey: Uint8Array | null = null;
      let publicKey: string;

      if (isExplorable && isLoggedIn) {
        publicKey = userPubkey;
        privateKey = null; // use extension for signing
      } else {
        const keys = generateEphemeralKeys();
        privateKey = keys.privateKey;
        publicKey = keys.publicKey;
      }

      // Create board config
      const boardConfig: BoardConfig = {
        boardId,
        boardName,
        minZapAmount,
        lightningAddress,
        creatorPubkey: publicKey,
        createdAt: Date.now(),
        isExplorable: isExplorable && isPaid,
      };

      // Publish to Nostr
      await publishBoardConfig(boardConfig, privateKey, isExplorable && isPaid);

      // Store in localStorage
      const boards: StoredBoard[] = JSON.parse(
        localStorage.getItem("boards") || "[]"
      );
      boards.push({
        boardId,
        config: boardConfig,
        createdAt: Date.now(),
      });
      localStorage.setItem("boards", JSON.stringify(boards));

      // Navigate to BoardDisplay
      navigate(`/board/${boardId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  // Check if create button should be enabled
  const isCreateButtonEnabled = () => {
    const hasBasicInfo = boardName.trim() && lightningAddress.trim();
    if (!isExplorable) {
      return hasBasicInfo;
    }
    // If explorable, also need payment completed
    return hasBasicInfo && isLoggedIn && isEligible && isPaid;
  };

  const renderPreviousBoardsModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-4 border-yellow-400 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-yellow-300 font-bold text-xl mb-4">
          Select a Previous Board
        </h2>

        <div className="space-y-3 mb-4">
          {prevBoards.map((board) => {
            const isSelected = selectedBoard?.boardId === board.boardId;
            return (
              <button
                key={board.boardId}
                onClick={() => setSelectedBoard(board)}
                className={`w-full text-left font-bold py-3 px-4 uppercase border-2 transition-all duration-200 ${
                  isSelected
                    ? "bg-yellow-400 text-black border-yellow-300"
                    : "bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-500 hover:text-black"
                }`}
              >
                {board.config.boardName}
              </button>
            );
          })}
        </div>

        {selectedBoard && (
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/board/${selectedBoard.boardId}`)}
              className="w-full bg-green-400 hover:bg-green-500 text-black font-bold py-3 uppercase border-2 border-green-300 transition-all duration-200"
            >
              Open Board
            </button>

            <button
              onClick={() => {
                const confirmDelete = confirm(
                  `Delete "${selectedBoard.config.boardName}"?`
                );
                if (!confirmDelete) return;

                const updatedBoards = prevBoards.filter(
                  (b) => b.boardId !== selectedBoard.boardId
                );
                localStorage.setItem("boards", JSON.stringify(updatedBoards));
                setPrevBoards(updatedBoards);
                setSelectedBoard(undefined);
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 uppercase border-2 border-red-400 transition-all duration-200"
            >
              Delete Board
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setShowPrevBoards(false);
            setSelectedBoard(undefined);
          }}
          className="w-full mt-4 bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-gray-800 transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderPaymentQR = () => {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-black border-4 border-yellow-400 p-6 max-w-md w-full">
          <h2 className="text-yellow-300 font-bold text-xl mb-4">
            Premium Board Payment
          </h2>
          <p className="text-white mb-4">
            Zap{" "}
            <span className="text-yellow-300 font-bold">{PREMIUM_AMOUNT}</span>{" "}
            to{" "}
            <span className="text-green-400 font-mono">
              {PREMIUM_LIGHTNING_ADDRESS}
            </span>
          </p>

          <div className="bg-white p-4 mb-4">
            <QRCodeSVG
              value={premiumInvoice}
              size={220}
              level="M"
              className="mx-auto"
              style={{ width: "100%", height: "auto" }}
            />
          </div>

          <div className="mb-4 p-3 bg-gray-900 border border-yellow-400 rounded break-all text-xs text-white font-mono">
            {premiumInvoice}
          </div>

          {isWaitingPayment && (
            <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-400 rounded">
              <p className="text-yellow-300 text-center animate-pulse">
                ⚡ Waiting for payment confirmation...
              </p>
            </div>
          )}

          {isPaid && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-400 rounded">
              <p className="text-green-400 text-center font-bold">
                ✓ Payment Confirmed!
              </p>
            </div>
          )}

          <button
            onClick={() => {
              setShowPaymentQR(false);
              setIsExplorable(false);
              setIsLoggedIn(false);
              setIsPaid(false);
            }}
            className="w-full bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-gray-800 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black p-8 flex items-center justify-center">
      <div className="w-full h-full max-w-5xl mx-auto">
        <RetroFrame className="h-full">
          <div className="max-w-lg w-full mx-auto p-8">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6 uppercase">
              Create Your Board
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-yellow-300 mb-2 font-bold">
                  Board Name
                </label>
                <input
                  type="text"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="Bitcoin Conference Q&A"
                  className="w-full px-4 py-3 bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-green-400"
                />
              </div>

              <div>
                <label className="block text-yellow-300 mb-2 font-bold">
                  Lightning Address
                </label>
                <input
                  type="text"
                  value={lightningAddress}
                  onChange={(e) => setLightningAddress(e.target.value)}
                  placeholder="you@getalby.com"
                  className="w-full px-4 py-3 bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-green-400"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Where zaps will be received
                </p>
              </div>

              <div>
                <label className="block text-yellow-300 mb-2 font-bold">
                  Minimum Zap Amount (sats)
                </label>
                <input
                  type="number"
                  value={minZapAmount}
                  onChange={(e) => setMinZapAmount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-black text-white border-2 border-yellow-400 focus:outline-none focus:border-green-400"
                />
              </div>

              {/* Explorable Toggle */}
              <div className="bg-black border-2 border-yellow-400 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-yellow-300 font-bold">
                      Make Board Explorable
                    </label>
                    <p className="text-gray-400 text-sm mt-1">
                      {PREMIUM_AMOUNT} sats - List publicly for discovery on
                      explore section
                    </p>

                    {isLoggedIn && isVerifyingEligibility && (
                      <p className="text-yellow-400 text-sm mt-1">
                        Verifying eligibility...
                      </p>
                    )}

                    {isLoggedIn && isEligible && !isPaid && (
                      <p className="text-yellow-400 text-sm mt-1">
                        Payment required
                      </p>
                    )}

                    {isPaid && (
                      <p className="text-green-400 text-sm mt-1">
                        ✓ Payment confirmed
                      </p>
                    )}

                    {eligibilityError && (
                      <p className="text-red-400 text-sm mt-1">
                        {eligibilityError}
                      </p>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={isExplorable}
                      onChange={(e) => handleExplorableToggle(e.target.checked)}
                      disabled={isVerifyingEligibility || isExplorable}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 peer-disabled:opacity-50"></div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/50 border-2 border-red-500 p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleCreateBoard}
                disabled={isCreating || !isCreateButtonEnabled()}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-700 disabled:border-gray-600 disabled:cursor-not-allowed disabled:text-gray-500 text-black font-bold py-3 uppercase border-2 border-yellow-300 transition-all duration-200"
              >
                {isCreating ? "Creating..." : "Create Board"}
              </button>

              {prevBoards.length > 0 && (
                <button
                  onClick={() => setShowPrevBoards(true)}
                  className="w-full bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-gray-800 transition-all duration-200"
                >
                  Use Previous Board
                </button>
              )}
            </div>
          </div>
        </RetroFrame>
      </div>

      {/* Modals */}
      {showLoginOverlay && (
        <NostrLoginOverlay
          onSuccess={handleLoginSuccess}
          onClose={handleLoginClose}
        />
      )}

      {showPrevBoards && renderPreviousBoardsModal()}
      {showPaymentQR && renderPaymentQR()}
    </div>
  );
}

export default CreateBoard;
