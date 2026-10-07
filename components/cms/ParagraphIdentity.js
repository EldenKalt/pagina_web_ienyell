'use client';

import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

// Keep identity when editing a paragraph; pasted/split duplicates get new IDs.
export default Extension.create({
  name: 'paragraphIdentity',
  addGlobalAttributes() {
    return [{ types: ['paragraph'], attributes: {
      paragraphId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-paragraph-id'),
        renderHTML: (attributes) => attributes.paragraphId ? { 'data-paragraph-id': attributes.paragraphId } : {},
      },
    } }];
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      appendTransaction(transactions, _old, state) {
        if (!transactions.some((transaction) => transaction.docChanged)) return null;
        const seen = new Set();
        const transaction = state.tr;
        state.doc.descendants((node, position) => {
          if (node.type.name !== 'paragraph') return;
          const id = node.attrs.paragraphId;
          if (!id || seen.has(id)) {
            const fresh = crypto.randomUUID();
            transaction.setNodeMarkup(position, undefined, { ...node.attrs, paragraphId: fresh });
            seen.add(fresh);
          } else seen.add(id);
        });
        return transaction.docChanged ? transaction : null;
      },
    })];
  },
});
