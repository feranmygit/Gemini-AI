import React, { useRef } from 'react';
import { AttachedFile } from '../types';

interface AttachmentBarProps {
  attachments: AttachedFile[];
  onAdd: (files: AttachedFile[]) => void;
  onRemove: (id: string) => void;
}

const ACCEPT = 'image/*,application/pdf,text/plain,text/csv,text/markdown,.py,.js,.ts,.tsx,.jsx,.json,.xml,.html,.css,.md,.csv';

function fileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  if (type.startsWith('text/')) return '📝';
  return '📎';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const AttachmentBar: React.FC<AttachmentBarProps> = ({ attachments, onAdd, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList) => {
    const results: AttachedFile[] = [];
    for (const file of Array.from(fileList)) {
      const base64 = await readBase64(file);
      results.push({
        id: Math.random().toString(36).slice(2),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64,
        size: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      });
    }
    onAdd(results);
  };

  const readBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      {/* Attach button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Attach file or image"
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#777', cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,107,255,0.12)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,107,255,0.3)';
          (e.currentTarget as HTMLButtonElement).style.color = '#9a8fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
          (e.currentTarget as HTMLButtonElement).style.color = '#777';
        }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        📎
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {/* Attachment pills */}
      {attachments.map(file => (
        <div
          key={file.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px 4px 6px',
            background: 'rgba(124,107,255,0.1)',
            border: '1px solid rgba(124,107,255,0.2)',
            borderRadius: 20, maxWidth: 200,
          }}
        >
          {file.previewUrl ? (
            <img
              src={file.previewUrl}
              alt={file.name}
              style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <span style={{ fontSize: 14, flexShrink: 0 }}>{fileIcon(file.mimeType)}</span>
          )}
          <span style={{
            fontSize: 11, color: '#b4a8ff', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
          }}>
            {file.name}
          </span>
          <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>
            {formatSize(file.size)}
          </span>
          <button
            onClick={() => onRemove(file.id)}
            style={{
              background: 'none', border: 'none', color: '#555',
              cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1,
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#555'}
          >✕</button>
        </div>
      ))}
    </div>
  );
};

export default AttachmentBar;
