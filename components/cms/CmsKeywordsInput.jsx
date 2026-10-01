'use client';

import { useState } from 'react';

export default function CmsKeywordsInput({ keywords = [], onChange }) {
  const [input, setInput] = useState('');

  const addKeyword = () => {
    const word = input.trim().toLowerCase();
    if (!word || keywords.includes(word)) {
      setInput('');
      return;
    }
    onChange([...keywords, word]);
    setInput('');
  };

  const removeKeyword = (index) => {
    onChange(keywords.filter((_, keywordIndex) => keywordIndex !== index));
  };

  return (
    <div className="cms-keywords-input">
      <div className="cms-keywords-tags">
        {keywords.map((keyword, index) => (
          <span key={keyword} className="cms-keyword-tag">
            {keyword}
            <button
              type="button"
              onClick={() => removeKeyword(index)}
              aria-label={`Remove ${keyword}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="cms-keywords-add">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addKeyword();
            }
          }}
          placeholder="Add keyword…"
          className="cms-input"
        />
        <button
          type="button"
          className="cms-btn-add"
          onClick={addKeyword}
          disabled={!input.trim()}
        >
          +
        </button>
      </div>
    </div>
  );
}
