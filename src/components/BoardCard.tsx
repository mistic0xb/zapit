import { FaBoltLightning } from "react-icons/fa6";
import type { BoardConfig } from "../types";

interface BoardCardProps {
  board: BoardConfig;
  onClick?: () => void;
}

function formatDate(timestamp: number): string{
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  
  // Add ordinal suffix (st, nd, rd, th)
  const suffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${day}${suffix(day)} ${month}, ${year}`;
};

export default function BoardCard({ board, onClick }: BoardCardProps) {
  return (
    <div
      onClick={onClick}
      className="
        bg-black text-white border border-yellow-400 
        hover:shadow-lg hover:shadow-yellow-700/40 transition-all
        cursor-pointer p-4 flex flex-col space-y-2
      "
    >
      <div>
        <h2 className="text-xl font-bold text-yellow-400">
          {board.boardName}
        </h2>
        <p className="text-sm font-bold text-yellow-400/60 wrap-break-word">
          {board.boardId.slice(0, 16)}
        </p>
      </div>

      <p className="text-sm text-gray-300 flex gap-1 items-baseline ">
        <FaBoltLightning className="size-2.5 text-yellow-600"></FaBoltLightning>{" "}
        {board.lightningAddress || "No Lightning Address"}
      </p>

      <p className="text-sm text-gray-400">
        Created On: {formatDate(board.createdAt)}
      </p>
    </div>
  );
}
