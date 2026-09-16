"use client";

interface GoogleDriveButtonProps {
  onClick: () => void;
  connecting?: boolean;
  label?: string;
}

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7A22 22 0 0 0 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.7 28.3a13.2 13.2 0 0 1 0-8.6v-5.7H4.3a22 22 0 0 0 0 20l7.4-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 30 2 24 2 15.4 2 8 7 4.3 14l7.4 5.7c1.7-5.2 6.6-9 12.3-9z"
      />
    </svg>
  );
}

export default function GoogleDriveButton({
  onClick,
  connecting,
  label = "Connect Google Drive",
}: GoogleDriveButtonProps) {
  return (
    <button
      className="btn google"
      type="button"
      onClick={onClick}
      disabled={connecting}
    >
      <GoogleLogo />
      {connecting ? "Connecting…" : label}
    </button>
  );
}
