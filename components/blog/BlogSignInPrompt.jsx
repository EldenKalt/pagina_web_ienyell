'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/scrollLock';

const PromptContext = createContext(null);

export function useBlogSignIn() {
  return useContext(PromptContext);
}

export default function BlogSignInPrompt({ children }) {
  const [message, setMessage] = useState('');
  const dialog = useRef(null);
  const selection = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const requestSignIn = useCallback((action = 'save your reading activity') => {
    const current = window.getSelection();
    selection.current = current?.rangeCount ? current.getRangeAt(0).cloneRange() : null;
    setMessage(`To ${action}, you need to sign in. Would you like to do that now?`);
  }, []);
  const dismiss = useCallback(() => {
    setMessage('');
    const range = selection.current;
    if (range?.startContainer.isConnected && range?.endContainer.isConnected) {
      const current = window.getSelection();
      current?.removeAllRanges();
      current?.addRange(range);
    }
  }, []);

  useEffect(() => { setMessage(''); }, [pathname]);
  useEffect(() => {
    if (!message) return undefined;
    dialog.current.showModal();
    lockBodyScroll();
    return () => { dialog.current?.close(); unlockBodyScroll(); };
  }, [message]);

  return (
    <PromptContext.Provider value={requestSignIn}>
      {children}
      {message && createPortal(
        <dialog ref={dialog} className="blog-signin-dialog" aria-labelledby="blog-signin-title" aria-describedby="blog-signin-description"
          onCancel={(event) => { event.preventDefault(); dismiss(); }}>
          <h2 id="blog-signin-title">Keep your place</h2>
          <p id="blog-signin-description">{message}</p>
          <div className="blog-note-controls">
            <button type="button" autoFocus onClick={dismiss}>Keep reading</button>
            <button type="button" className="blog-comment-submit" onClick={() => {
              const returnTo = window.location.pathname + window.location.search + window.location.hash;
              setMessage('');
              router.push(`/users/login?returnTo=${encodeURIComponent(returnTo)}`);
            }}>Sign in</button>
          </div>
        </dialog>, document.body,
      )}
    </PromptContext.Provider>
  );
}
