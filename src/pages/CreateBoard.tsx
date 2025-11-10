import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { validateLightningAddress } from "../libs/lighting";
import { generateBoardId, generateEphemeralKeys } from "../libs/crypto";
import type { BoardConfig } from "../types";
import { validateNWC } from "../libs/nwc";
import { publishBoardConfig } from "../libs/nostr";
import { bytesToHex } from "nostr-tools/utils";
import RetroFrame from "../components/Frame";

function CreateBoard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "nwc">("info");

  // Board settings
  const [displayName, setDisplayName] = useState("");
  const [lightningAddress, setLightningAddress] = useState("");
  const [minZapAmount, setMinZapAmount] = useState(1000);

  // NWC string
  const [nwcString, setNwcString] = useState("");
  const [password, setPassword] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  // Check if a board is present
  // useEffect(() => {
  //   const boards = JSON.parse(localStorage.getItem("boards") || "[]");
  //   if(boards.length)
  // })

  const handleNext = async () => {
    if (!displayName.trim()) {
      setError("Please enter a board name");
      return;
    }
    if (!lightningAddress.trim()) {
      setError("Please enter your Lightning address");
      return;
    }

    setIsValidating(false);
    setError("");

    const validation = await validateLightningAddress(lightningAddress);

    if (!validation.valid) {
      setError(validation.error || "Invalid Lightning address");
      setIsValidating(false);
      return;
    }

    setIsValidating(false);
    setStep("nwc");
  };

  const handleCreateBoard = async () => {
    if (!nwcString.trim()) {
      setError("Please paste your NWC connection string");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      // Step 1: Validate NWC
      console.log("Validating NWC...");
      const nwcValidation = await validateNWC(nwcString);
      if (!nwcValidation.valid) {
        throw new Error(nwcValidation.error || "Invalid NWC connection");
      }
      console.log("NWC validated:", nwcValidation.info);

      // Step 2: Generate ephemeral keys
      console.log("Generating ephemeral keys...");
      const { privateKey, publicKey } = generateEphemeralKeys();

      // Step 3: Generate board ID
      const boardId = generateBoardId();

      // Step 4: Create board config
      const boardConfig: BoardConfig = {
        boardId,
        displayName,
        minZapAmount,
        lightningAddress,
        creatorPubkey: publicKey,
        createdAt: Date.now(),
      };
      console.log("Board created:", boardConfig);

      // Step 5: Publish to Nostr ??
      console.log("Publishing to Nostr relays...");
      await publishBoardConfig(boardConfig, privateKey);

      // Step 6: Store in localStorage (temporary, no NWC stored)
      const boards = JSON.parse(localStorage.getItem("boards") || "[]");
      boards.push({
        boardId,
        config: boardConfig,
        privateKey: bytesToHex(privateKey), // Store ephemeral key
        createdAt: Date.now(),
      });
      localStorage.setItem("boards", JSON.stringify(boards));

      // Step 6: Navigate to dashboard
      // We'll pass the NWC string via URL state (not stored)
      navigate(`/dashboard/${boardId}`, {
        state: { nwcString },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setIsValidating(false);
    }
  };


  return (
    <div className="min-h-screen bg-black p-8 flex items-center justify-center">
      <div className="w-full h-full max-w-5xl mx-auto">
        <RetroFrame className="h-full">
          <div className="max-w-lg w-full mx-auto p-8">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6 uppercase">
              Create Your Board
            </h2>

            {step === "info" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-yellow-300 mb-2">
                    Board Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Bitcoin Conference Q&A"
                    className="w-full px-4 py-3 bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-brightGreen"
                  />
                </div>

                <div>
                  <label className="block text-yellow-300 mb-2">
                    Lightning Address
                  </label>
                  <input
                    type="text"
                    value={lightningAddress}
                    onChange={(e) => setLightningAddress(e.target.value)}
                    placeholder="you@getalby.com"
                    className="w-full px-4 py-3 bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-brightGreen"
                  />
                  <p className="text-white/60 text-sm mt-2">
                    Where zaps will be sent
                  </p>
                </div>

                <div>
                  <label className="block text-yellow-300 mb-2">
                    Minimum Zap Amount (sats)
                  </label>
                  <input
                    type="number"
                    value={minZapAmount}
                    onChange={(e) => setMinZapAmount(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black text-white border-2 border-yellow-400 focus:outline-none focus:border-brightGreen"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  onClick={handleNext}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 uppercase border-2 border-yellow-300 transition-all duration-200"
                >
                  Next
                </button>
              </div>
            )}

            {step === "nwc" && (
              // Enter Nwc String
              <div className="space-y-4">
                <div>
                  <label className="block text-yellow-300 mb-2">
                    NWC Connection String
                  </label>
                  <textarea
                    value={nwcString}
                    onChange={(e) => setNwcString(e.target.value)}
                    placeholder="nostr+walletconnect://..."
                    rows={4}
                    className="w-full px-4 py-3 bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-brightGreen font-mono text-sm resize-none"
                  />
                </div>

                {/* // Set Password */}
                <div>
                  <label className="block text-yellow-300 mb-2">
                    Set Password
                  </label>
                  <textarea
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="enter password"
                    rows={4}
                    className="w-full h-12 px-4 py-3  bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-brightGreen font-mono text-sm resize-none"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("info")}
                    className="flex-1 bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-yellow-500 hover:text-black transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateBoard}
                    disabled={isValidating}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold py-3 uppercase border-2 border-yellow-300 transition-all duration-200"
                  >
                    {isValidating ? "Creating..." : "Create Board"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </RetroFrame>
      </div>
    </div>
  );
}

export default CreateBoard;
