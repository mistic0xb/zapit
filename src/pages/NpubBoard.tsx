import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { nip19 } from "nostr-tools";
import { fetchUserProfile, fetchBoardConfig } from "../libs/nostr";
import { generateEphemeralKeys } from "../libs/crypto";
import { publishBoardConfig } from "../libs/nostr";
import type { BoardConfig, StoredBoard } from "../types/types";
import Loading from "../components/Loading";
import { FiAlertCircle } from "react-icons/fi";

export default function NpubBoard() {
  const { npub } = useParams<{ npub: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrCreateBoard = async (npubString: string) => {
      try {
        setLoading(true);
        setError("");

        // Decode npub to hex pubkey
        let hexPubkey: string;
        try {
          const decoded = nip19.decode(npubString);
          if (decoded.type !== "npub") {
            throw new Error("Invalid npub format");
          }
          hexPubkey = decoded.data;
        } catch (err) {
          setError("Invalid npub format. Please check the URL and try again.");
          setLoading(false);
          return;
        }

        // Check localStorage first
        const boards: StoredBoard[] = JSON.parse(localStorage.getItem("boards") || "[]");
        const existingBoard = boards.find(b => b.boardId === npubString);

        if (existingBoard) {
          console.log("Board found in localStorage, loading...");
          navigate(`/board/${npubString}`);
          return;
        }

        // Check Nostr relays
        console.log("Board not in localStorage, checking Nostr relays...");
        const boardConfig = await fetchBoardConfig(npubString);

        if (boardConfig) {
          console.log("Board found on Nostr relays, loading...");

          // Save to localStorage for future use
          boards.push({
            boardId: npubString,
            config: boardConfig,
            createdAt: Date.now(),
          });
          localStorage.setItem("boards", JSON.stringify(boards));

          navigate(`/board/${npubString}`);
          return;
        }

        // Board doesn't exist, create new one
        // Fetch user profile
        const profileData = await fetchUserProfile(hexPubkey);

        if (!profileData) {
          setError("Profile not found. This npub may not have a Nostr profile yet.");
          setLoading(false);
          return;
        }

        // Extract Lightning Address (lud16)
        const lightningAddress = profileData.lud16;
        if (!lightningAddress) {
          setError(
            "No Lightning Address found in profile. Please add a Lightning Address (lud16) to your Nostr profile and try again."
          );
          setLoading(false);
          return;
        }

        // Extract username
        const username = profileData.name || profileData.display_name || "Anonymous";
        const boardName = `${username}'s board`;
        const keys = generateEphemeralKeys();

        // Create board config using npub as boardId
        const newBoardConfig: BoardConfig = {
          boardId: npubString, // using npub as boardId
          boardName,
          minZapAmount: 10, // Default 10 sats
          lightningAddress,
          creatorPubkey: keys.publicKey,
          createdAt: Date.now(),
          isExplorable: false, // Premium off by default
        };

        // Publish board config to Nostr
        await publishBoardConfig(newBoardConfig, keys.privateKey, false);

        // Save to localStorage
        boards.push({
          boardId: npubString,
          config: newBoardConfig,
          createdAt: Date.now(),
        });
        localStorage.setItem("boards", JSON.stringify(boards));

        // Navigate to board display
        navigate(`/board/${npubString}`);
      } catch (err) {
        console.error("Error loading/creating board from npub:", err);
        setError(err instanceof Error ? err.message : "Failed to load or create board");
        setLoading(false);
      }
    };

    if (!npub) {
      setError("No npub provided in URL");
      setLoading(false);
      return;
    }

    loadOrCreateBoard(npub);
  }, [npub, navigate]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blackish flex items-center justify-center p-6">
        <div className="card-style p-8 max-w-md w-full">
          <div className="flex items-start gap-4 mb-6">
            <FiAlertCircle className="text-red-400 text-3xl shrink-0 mt-1" />
            <div>
              <h2 className="text-red-400 font-bold text-xl mb-2">Unable to Load Board</h2>
              <p className="text-gray-300 text-sm">{error}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 uppercase transition-all duration-300"
            >
              Go to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 border-2 border-gray-600 hover:border-gray-500 uppercase transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
