import React, { useState } from 'react';

interface Props {
  onSignUp: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
}

const SavePromptBanner: React.FC<Props> = ({ onSignUp, onSignIn, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .save-banner {
          position: fixed;
          bottom: 88px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
          width: calc(100% - 32px);
          max-width: 640px;
          background: linear-gradient(135deg, rgba(124,107,255,0.12), rgba(176,107,255,0.12));
          border: 1px solid rgba(124,107,255,0.3);
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          animation: slideUp 0.3s ease-out;
          box-sizing: border-box;
        }

        .save-banner__inner {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .save-banner__icon {
          font-size: 22px;
          flex-shrink: 0;
          line-height: 1;
        }

        .save-banner__text {
          flex: 1;
          min-width: 0;
        }

        .save-banner__title {
          font-size: 13px;
          font-weight: 600;
          color: #c4b8ff;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .save-banner__subtitle {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        .save-banner__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .save-banner__btn-signup {
          padding: 8px 14px;
          border-radius: 9px;
          border: none;
          background: linear-gradient(135deg, #7c6bff, #b06bff);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(124,107,255,0.4);
          white-space: nowrap;
          line-height: 1;
        }

        .save-banner__btn-signin {
          padding: 8px 12px;
          border-radius: 9px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #888;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          line-height: 1;
        }

        .save-banner__btn-dismiss {
          background: none;
          border: none;
          color: #555;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          line-height: 1;
          flex-shrink: 0;
        }

        /* ── Mobile: stack text above buttons ── */
        @media (max-width: 480px) {
          .save-banner {
            bottom: 72px;
            width: calc(100% - 24px);
            padding: 12px 14px;
            border-radius: 14px;
          }

          .save-banner__inner {
            flex-wrap: wrap;
            gap: 10px;
          }

          .save-banner__icon {
            font-size: 20px;
          }

          /* Text takes remaining row with dismiss pushed to far right */
          .save-banner__text {
            flex: 1;
          }

          .save-banner__subtitle {
            display: none; /* hide on very small screens to save space */
          }

          /* Actions move to their own full-width row */
          .save-banner__actions {
            width: 100%;
            /* indent to align under text (icon width + gap) */
            padding-left: 34px;
          }

          .save-banner__btn-signup,
          .save-banner__btn-signin {
            flex: 1;
            text-align: center;
          }
        }

        /* ── Very small phones ── */
        @media (max-width: 360px) {
          .save-banner__btn-signin {
            display: none;
          }
          .save-banner__btn-signup {
            flex: unset;
            width: 100%;
          }
        }
      `}</style>

      <div className="save-banner" role="banner">
        <div className="save-banner__inner">
          {/* Icon + text row */}
          <span className="save-banner__icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="18" d="M8 19h-1c-2.5 0 -4 -2 -4 -4c0 -2 1.5 -4 4 -4c1 0 1.5 0.5 1.5 0.5M16 19h1c2.5 0 4 -2 4 -4c0 -2 -1.5 -4 -4 -4c-1 0 -1.5 0.5 -1.5 0.5"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.5s" values="18;0"/></path><path stroke-dasharray="12" stroke-dashoffset="12" d="M7 11v-1c0 -2.5 2 -5 5 -5M17 11v-1c0 -2.5 -2 -5 -5 -5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.5s" dur="0.4s" to="0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M12 20v-6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.9s" dur="0.2s" to="0"/></path><path stroke-dasharray="6" stroke-dashoffset="6" d="M12 13l2 2M12 13l-2 2"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.1s" dur="0.2s" to="0"/></path></g></svg>
          </span>

          <div className="save-banner__text">
            <div className="save-banner__title">Don't lose your conversation</div>
            <div className="save-banner__subtitle">
              Sign up free to save your chats and access them from any device.
            </div>
          </div>

          {/* Dismiss lives here on desktop (aligned right in flex row) */}
          <button
            className="save-banner__btn-dismiss"
            onClick={handleDismiss}
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            ✕
          </button>

          {/* CTA buttons — on mobile these drop to a second row */}
          <div className="save-banner__actions">
            <button className="save-banner__btn-signup" onClick={onSignUp}>
              Sign up free
            </button>
            <button className="save-banner__btn-signin" onClick={onSignIn}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SavePromptBanner;