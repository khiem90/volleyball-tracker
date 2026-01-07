"use client";

import { useState, useCallback, type KeyboardEvent } from "react";

interface HeaderProps {
  onReset: () => void;
}

export const Header = ({ onReset }: HeaderProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirm = useCallback(() => {
    onReset();
    setShowConfirm(false);
  }, [onReset]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, action: "confirm" | "cancel") => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (action === "confirm") {
          handleConfirm();
        } else {
          handleCancel();
        }
      }
    },
    [handleConfirm, handleCancel]
  );

  return (
    <header className="relative bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-white"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 2 C12 12, 22 12, 22 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M12 2 C12 12, 2 12, 2 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2 12 C12 12, 12 22, 12 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Volleyball<span className="text-amber-400">Score</span>
          </h1>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={handleResetClick}
          aria-label="Reset game"
          className="
            px-4 py-2 rounded-lg
            bg-slate-800 hover:bg-slate-700
            text-slate-300 hover:text-white
            font-medium text-sm
            transition-all duration-150
            border border-slate-600/50 hover:border-slate-500
            active:scale-95
          "
        >
          Reset Game
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="bg-slate-800 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-slate-700">
            <h2
              id="reset-dialog-title"
              className="text-xl font-bold text-white mb-2"
            >
              Reset Game?
            </h2>
            <p className="text-slate-400 mb-6">
              This will reset both scores to 0 and clear the history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                onKeyDown={(e) => handleKeyDown(e, "cancel")}
                className="
                  flex-1 px-4 py-3 rounded-xl
                  bg-slate-700 hover:bg-slate-600
                  text-slate-300 font-medium
                  transition-all duration-150
                  active:scale-95
                "
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                onKeyDown={(e) => handleKeyDown(e, "confirm")}
                className="
                  flex-1 px-4 py-3 rounded-xl
                  bg-red-600 hover:bg-red-500
                  text-white font-medium
                  transition-all duration-150
                  active:scale-95
                "
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

