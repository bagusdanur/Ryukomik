import { FiArrowDown, FiArrowUp, FiMessageCircle, FiPause, FiPlay } from "react-icons/fi";
import NavBtn from "./NavBtn";

interface ReaderSideActionsProps {
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  onComment: () => void;
}

export default function ReaderSideActions({ autoScroll, onToggleAutoScroll, onComment }: ReaderSideActionsProps) {
  return (
    <div
      className="fixed right-4 bottom-24 z-10 flex flex-col gap-3"
      onClick={(e) => e.stopPropagation()}
    >
      <NavBtn icon={<FiMessageCircle />} onClick={onComment} />
      <NavBtn
        icon={autoScroll ? <FiPause /> : <FiPlay />}
        onClick={onToggleAutoScroll}
        className={autoScroll ? "animate-pulse border-cyan-300/70 bg-cyan-500 text-black transition-colors duration-200 hover:bg-cyan-400 hover:text-black" : ""}
      />
      <NavBtn
        icon={<FiArrowUp />}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      />
      <NavBtn
        icon={<FiArrowDown />}
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
      />
    </div>
  );
}
