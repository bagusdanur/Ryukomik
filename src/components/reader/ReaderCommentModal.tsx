import { FiX } from "react-icons/fi";
import CommentsSupabase from "@/components/CommentsSupabase";

interface ReaderCommentModalProps {
  source: string;
  slugStr: string;
  onClose: () => void;
}

export default function ReaderCommentModal({ source, slugStr, onClose }: ReaderCommentModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/80 backdrop-blur-sm">
      <div className="rk-card flex max-h-[90vh] w-full flex-col rounded-t-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <span className="text-lg font-black">Komentar</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <CommentsSupabase type="chapter" slug={`${source}-${slugStr}`} chapter={slugStr} />
        </div>
      </div>
    </div>
  );
}
