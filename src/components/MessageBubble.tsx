import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

function fileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  return '📝';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const hasAttachments = isUser && message.attachments && message.attachments.length > 0;
  const hasImages = !isUser && message.generatedImages && message.generatedImages.length > 0;
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <div style={{
        display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start', gap: 12,
        animation: 'fadeSlideIn 0.3s ease-out',
      }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          background: isUser ? 'linear-gradient(135deg, #4a90d9, #6b5ff0)' : 'linear-gradient(135deg, #7c6bff, #b06bff)',
          boxShadow: isUser ? '0 2px 12px rgba(74,144,217,0.3)' : '0 2px 12px rgba(124,107,255,0.3)',
        }}>
          {isUser ? '◯' : '✦'}
        </div>

        <div style={{
          maxWidth: 'min(680px, 85%)', display: 'flexe', flexDirection: 'column',
          gap: 8, alignItems: isUser ? 'flex-end' : 'flex-start',
          minWidth: 0,
        }}>
          {/* User attachment previews */}
          {hasAttachments && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              {message.attachments!.map(file => (
                file.previewUrl ? (
                  <img key={file.id} src={file.previewUrl} alt={file.name}
                    style={{ maxWidth: 240, maxHeight: 180, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(124,107,255,0.2)', cursor: 'pointer' }}
                    onClick={() => setLightbox(file.previewUrl!)}
                  />
                ) : (
                  <div key={file.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 10, background: 'rgba(124,107,255,0.1)', border: '1px solid rgba(124,107,255,0.2)',
                    fontSize: 12, color: '#b4a8ff',
                  }}>
                    <span>{fileIcon(file.mimeType)}</span>
                    <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Generating image placeholder */}
          {message.isGeneratingImage && (
            <div style={{
              padding: '20px 24px',
              borderRadius: '6px 18px 18px 18px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              minWidth: 220,
            }}>
              {/* Animated shimmer box */}
              <div style={{
                width: 260, height: 180, borderRadius: 12,
                background: 'linear-gradient(90deg, rgba(124,107,255,0.08) 25%, rgba(124,107,255,0.18) 50%, rgba(124,107,255,0.08) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.6s infinite',
                border: '1px solid rgba(124,107,255,0.15)',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9a8fff', fontSize: 13 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(124,107,255,0.3)', borderTopColor: '#7c6bff',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Generating image…
              </div>
            </div>
          )}

          {/* Generated images */}
          {hasImages && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {message.generatedImages!.map((img, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={img.prompt}
                    onClick={() => setLightbox(`data:${img.mimeType};base64,${img.base64}`)}
                    style={{
                      maxWidth: 420, width: '100%', borderRadius: 14,
                      border: '1px solid rgba(124,107,255,0.2)',
                      cursor: 'zoom-in',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.01)';
                      (e.currentTarget as HTMLImageElement).style.boxShadow = '0 12px 40px rgba(124,107,255,0.25)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLImageElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
                    }}
                  />
                  {/* Download button */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={`data:${img.mimeType};base64,${img.base64}`}
                      download={`generated-${Date.now()}.png`}
                      style={{
                        fontSize: 11, color: '#7c6bff', textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(124,107,255,0.08)',
                        border: '1px solid rgba(124,107,255,0.2)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.18)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.08)')}
                    >
                      ↓ Download
                    </a>
                    <button
                      onClick={() => setLightbox(`data:${img.mimeType};base64,${img.base64}`)}
                      style={{
                        fontSize: 11, color: '#7c6bff', background: 'rgba(124,107,255,0.08)',
                        border: '1px solid rgba(124,107,255,0.2)', borderRadius: 6,
                        padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.18)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,107,255,0.08)')}
                    >
                      ⤢ Expand
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Text content */}
          {(message.content || (message.isStreaming && !message.isGeneratingImage)) && (
            <div style={{
              padding: isUser ? '10px 16px' : '14px 18px',
              borderRadius: isUser ? '18px 6px 18px 18px' : '6px 18px 18px 18px',
              background: isUser ? 'linear-gradient(135deg, #2a3a6e, #1e2d5a)' : 'rgba(255,255,255,0.04)',
              border: isUser ? '1px solid rgba(74,144,217,0.2)' : '1px solid rgba(255,255,255,0.07)',
              fontSize: 14, lineHeight: 1.7, color: '#ddd9f0',
            }}>
              {isUser ? (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
              ) : (
                <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, children, className, ...props }) {
                      const isInline = !className;

                      const codeString = Array.isArray(children)
                        ? children.join('')
                        : String(children);

                      const [copied, setCopied] = React.useState(false);

                      const handleCopy = () => {
                        navigator.clipboard.writeText(codeString);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      };

                      if (isInline) {
                        return <code {...props}>{children}</code>;
                      }

                      return (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={handleCopy}
                            style={{
                              position: 'absolute',
                              top: -10,
                              right: 8,
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 11,
                              color: '#c4b8ff',
                              cursor: 'pointer',
                              zIndex: 2,
                            }}
                          >
                            <div className="flex gap-2 items-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 16 16"
                              >
                                <path
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinejoin="round"
                                  strokeWidth="1"
                                  d="M12 10.5h1.5v-8h-8V4m-3 9.5h8v-8h-8z"
                                />
                              </svg>
                              <span>{copied ? 'Copied' : 'Copy code'}</span>
                            </div>
                          </button>

                          <pre>
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>


                  {message.isStreaming && (
                    <span style={{
                      display: 'inline-block', width: 8, height: 14, background: '#7c6bff',
                      borderRadius: 2, marginLeft: 2, animation: 'blink 0.8s step-end infinite', verticalAlign: 'text-bottom',
                    }} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, cursor: 'zoom-out',
            animation: 'fadeSlideIn 0.2s ease-out',
          }}
        >
          <img src={lightbox} alt="Full size"
            style={{ maxWidth: '90vw', maxHeight: '90dvh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(null)} style={{
            position: 'fixed', top: 20, right: 20,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '50%', width: 40, height: 40,
            color: '#fff', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

export default MessageBubble;
