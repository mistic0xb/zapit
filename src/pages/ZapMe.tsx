import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FaCopy, FaBitcoin } from "react-icons/fa";
import { BsLightning } from "react-icons/bs";

function ZapMe() {
  const [showOnChain, setShowOnChain] = useState(true);
  const [copied, setCopied] = useState(false);

  const LIGHTNING_ADDRESS = "mist@coinos.io";
  const BITCOIN_ADDRESS = "bc1q6cxtna4zdqh999q06v3dhhafcnk9s6kavw8wut";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-lg w-full mx-auto">
        {/* Main Card */}
        <div className="bg-black border-2 border-yellow-500 p-6 rounded-lg shadow-[0_0_20px_rgba(255,255,0,0.1)]">
          <div className="text-center mb-4">
            <div className="inline-block text-5xl text-yellow-400 mb-2">
              <FaBitcoin />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Bitcoin Only</h2>
            <p className="text-white/70 text-xs leading-snug text-center flex justify-center gap-1">
              <span className="text-white/60">
                No Stripe, No Paypal, No credit cards, Just peer-to-peer electronic cash
              </span>
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowOnChain(true)}
              className={`flex-1 py-2 text-sm font-bold border-2 transition-all ${
                showOnChain
                  ? "bg-yellow-400 text-black border-yellow-300"
                  : "bg-black/50 text-white/70 border-yellow-500/30 hover:border-yellow-500/50"
              }`}
            >
              <FaBitcoin className="inline mr-1" />
              On-Chain
            </button>
            <button
              onClick={() => setShowOnChain(false)}
              className={`flex-1 py-2 text-sm font-bold border-2 transition-all ${
                !showOnChain
                  ? "bg-yellow-400 text-black border-yellow-300"
                  : "bg-black/50 text-white/70 border-yellow-500/30 hover:border-yellow-500/50"
              }`}
            >
              <BsLightning className="inline mr-1" />
              Lightning
            </button>
          </div>

          {/* Address Display */}
          <div className="mb-4">
            <div className="text-center text-yellow-400 text-xs uppercase tracking-wide mb-1">
              {showOnChain ? "Bitcoin Address" : "Lightning Address"}
            </div>
            <div className="bg-black border border-yellow-500/40 p-3 rounded text-center">
              <code className="text-yellow-400 text-sm  font-mono break-all">
                {showOnChain ? BITCOIN_ADDRESS : LIGHTNING_ADDRESS}
              </code>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() =>
                handleCopy(showOnChain ? BITCOIN_ADDRESS : LIGHTNING_ADDRESS)
              }
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 border-2 border-yellow-300 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <FaCopy />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 mb-4 flex justify-center rounded">
            <QRCodeSVG
              value={showOnChain ? BITCOIN_ADDRESS : LIGHTNING_ADDRESS}
              size={160}
              level="M"
              className="mx-auto"
            />
          </div>

          {/* Why Bitcoin Section */}
          <div className="border-t border-yellow-500/30 pt-4">
            <h3 className="text-center text-yellow-400 font-bold text-sm mb-3 uppercase">
              Why Bitcoin?
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-yellow-400 font-bold mb-0.5">
                  No Censorship
                </div>
                <div className="text-white/70">Can’t be blocked</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold mb-0.5">No KYC</div>
                <div className="text-white/70">Private</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold mb-0.5">Global</div>
                <div className="text-white/70">Works anywhere</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="text-center mt-6 text-white/50 italic text-sm">
          "Be Free."
        </div>
      </div>
    </div>
  );
}

export default ZapMe;
