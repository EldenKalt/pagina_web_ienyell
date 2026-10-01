'use client';

import { useCallback, useRef, useState } from 'react';

export default function CmsCoverUpload({
  coverUrl,
  onChange,
  uploadFile,
  emptyLabel = 'Upload cover image',
  uploadingLabel = 'Uploading…',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    setUploading(true);
    try {
      const result = await uploadFile(file);
      if (result?.url) onChange(result.url);
    } catch (error) {
      console.error('Cover upload failed:', error);
    } finally {
      setUploading(false);
    }
  }, [onChange, uploadFile]);

  return (
    <div className="cms-cover-upload">
      {coverUrl ? (
        <div className="cms-cover-preview">
          <img src={coverUrl} alt="Cover" />
          <div className="cms-cover-actions">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="cms-cover-remove"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="cms-cover-empty"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? uploadingLabel : emptyLabel}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
    </div>
  );
}
