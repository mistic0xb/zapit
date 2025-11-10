import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { FaGithub, FaQrcode } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import { nip19 } from "nostr-tools";
import type { NProfile, ProfilePointer } from "nostr-tools/nip19";

function Footer() {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const npub =
    "npub1kuzk93p4mea2yxehddet03szwx2h4uw3wqz3ehvqrwj9ssd0tetqs5adr6";
  const decoded = nip19.decode(
    "npub1kuzk93p4mea2yxehddet03szwx2h4uw3wqz3ehvqrwj9ssd0tetqs5adr6"
  );
  const profilePointer : ProfilePointer = {
    pubkey: decoded.data ,
    relays: [
      "wss://relay.damus.io",
      "wss://relay.nostr.band",
      "wss://nos.lol",
      "wss://relay.snort.social",
    ],
  };
  const nprofile = nip19.nprofileEncode(profilePointer);
  console.log(nprofile)

  const handleCopy = () => {
    navigator.clipboard.writeText(npub);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  function handleQrDisplay() {
    setShowQr((prev) => !prev);
  }

  return (
    <footer className="bg-black border-t-2 border-yellow-500/50 p-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-white">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <a
            href="https://github.com/mistic0xb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-2"
          >
            <FaGithub size={24} />
            GitHub
          </a>

          <div
            className="flex items-center gap-2 cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors"
            onClick={handleCopy}
          >
            <span>nostr-npub</span>
            <FiCopy size={20} />
          </div>
          <div
            className="cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors"
            onClick={handleQrDisplay}
          >
            <FaQrcode size={20} />
          </div>

          {/* QR Code Display */}
          {showQr && (
            <div className="mt-4 flex justify-center">
              <div className="bg-black p-4 border-2 border-yellow-500 inline-block">
                <QRCodeSVG value={`nostr:${nprofile}`} size={256} />
              </div>
            </div>
          )}
        </div>

        <div className="text-white/70 text-sm text-center md:text-right">
          {copied ? "NPUB Copied! ✅" : ""}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
