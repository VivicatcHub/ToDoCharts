"use client";

interface GoogleDriveButtonProps {
  onClick: () => void;
  connecting?: boolean;
}

export default function GoogleDriveButton({
  onClick,
  connecting,
}: GoogleDriveButtonProps) {
  return (
    <button
      className="cursor-pointer hover:bg-[#262b36] rounded-lg disabled:cursor-default disabled:opacity-60"
      type="button"
      onClick={onClick}
      disabled={connecting}
    >
      {connecting ? "Connecting..." : "Connect Google Drive"}
    </button>
  );
}
