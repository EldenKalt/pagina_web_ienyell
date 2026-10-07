'use client';

// Shared with the backend so normalisation and UTF-16 offsets stay identical.
import core from '../shared/annotationCore.cjs';
export const { indexText, selectorFromRange, findQuote, resolveSelector } = core;
