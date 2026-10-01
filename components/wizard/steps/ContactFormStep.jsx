'use client';

import { useEffect, useRef, useState } from 'react';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function FilePreview({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="wiz-file-preview">
      {previewUrl && <img src={previewUrl} alt="" />}
      <button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove}>×</button>
      <span title={file.name}>{file.name}</span>
    </div>
  );
}

function FileField({ field, files, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const maxFiles = field.maxFiles ?? 10;
  const maxSize = (field.maxSizeMB ?? 5) * 1024 * 1024;

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList ?? []);
    const invalidType = incoming.find((file) => !ACCEPTED_TYPES.has(file.type));
    if (invalidType) {
      setError('Only JPG, PNG and WEBP files are allowed.');
      return;
    }
    if (incoming.some((file) => file.size > maxSize)) {
      setError(`File too large. Max ${field.maxSizeMB ?? 5} MB.`);
      return;
    }
    const nextFiles = [...files, ...incoming].slice(0, maxFiles);
    setError(incoming.length + files.length > maxFiles ? `Maximum ${maxFiles} files allowed.` : '');
    onChange(nextFiles);
  };

  return (
    <div className="wiz-form-field">
      <span className="wiz-form-label">{field.label}</span>
      <input ref={inputRef} className="wiz-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => addFiles(event.target.files)} />
      <button
        type="button"
        className={`wiz-file-dropzone${isDragging ? ' is-dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }}
      >
        {field.placeholder ?? 'Drop images here or click to browse'}
      </button>
      {field.hint && <span className="wiz-form-hint">{field.hint}</span>}
      {error && <span className="wiz-form-error">{error}</span>}
      {files.length > 0 && <div className="wiz-file-previews">{files.map((file, index) => <FilePreview key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} />)}</div>}
    </div>
  );
}

export default function ContactFormStep({ step, value = {}, onChange }) {
  const updateValue = (fieldId, fieldValue) => onChange({ ...value, [fieldId]: fieldValue });

  return (
    <div className="wiz-step">
      <h3 className="wiz-step-title">{step.title}</h3>
      {step.description && <p className="wiz-step-description">{step.description}</p>}
      <div className="wiz-contact-form">
        {(step.fields ?? []).map((field) => {
          if (field.type === 'file') return <FileField key={field.id} field={field} files={Array.isArray(value[field.id]) ? value[field.id] : []} onChange={(files) => updateValue(field.id, files)} />;
          const sharedProps = { className: 'wiz-step-input', id: `wiz-${step.id}-${field.id}`, value: value[field.id] ?? '', placeholder: field.placeholder ?? '', onChange: (event) => updateValue(field.id, event.target.value) };
          return (
            <label className="wiz-form-field" key={field.id} htmlFor={sharedProps.id}>
              <span className="wiz-form-label">{field.label}{field.required && <span className="wiz-required"> *</span>}</span>
              {field.hints?.length > 0 && <span className="wiz-form-hints"><span>Include:</span><ul>{field.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul></span>}
              {field.type === 'textarea' ? <textarea {...sharedProps} /> : <input {...sharedProps} type={field.type ?? 'text'} />}
            </label>
          );
        })}
        {(step.checkboxes ?? []).map((checkbox) => {
          const checked = Boolean(value[checkbox.id]);
          return <button key={checkbox.id} type="button" className="wiz-form-checkbox-row" onClick={() => updateValue(checkbox.id, !checked)} aria-pressed={checked}><span className={`wiz-form-checkbox${checked ? ' is-checked' : ''}`} aria-hidden="true">{checked && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}</span><span>{checkbox.label}{checkbox.required && <span className="wiz-required"> *</span>}</span></button>;
        })}
      </div>
    </div>
  );
}
