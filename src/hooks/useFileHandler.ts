import { useCallback, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, DragEvent } from 'react';
import { AttachedFile } from '../types';

export const ACCEPTED_UPLOAD_TYPES =
  'image/*,application/pdf,text/plain,text/csv,text/markdown,.py,.js,.ts,.tsx,.jsx,.json,.xml,.html,.css,.md,.csv';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readFilesAsBase64(fileList: File[]): Promise<AttachedFile[]> {
  const results: AttachedFile[] = [];

  for (const file of fileList) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    results.push({
      id: generateId(),
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64,
      size: file.size,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    });
  }

  return results;
}

export function useFileHandler() {
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const handleFileInput = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return;
    }

    const next = await readFilesAsBase64(Array.from(event.target.files));
    setAttachments((previous) => [...previous, ...next]);
    event.target.value = '';
  }, []);

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const imageItems = Array.from(event.clipboardData.items).filter((item) => item.type.startsWith('image/'));
    if (!imageItems.length) {
      return;
    }

    event.preventDefault();
    const files = imageItems
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    const next = await readFilesAsBase64(files);
    setAttachments((previous) => [...previous, ...next]);
  }, []);

  const handleDrop = useCallback(async (event: DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) {
      return;
    }

    const next = await readFilesAsBase64(files);
    setAttachments((previous) => [...previous, ...next]);
  }, []);

  return {
    attachments,
    setAttachments,
    removeAttachment,
    clearAttachments,
    handleFileInput,
    handlePaste,
    handleDrop,
    acceptedUploadTypes: ACCEPTED_UPLOAD_TYPES,
  };
}
