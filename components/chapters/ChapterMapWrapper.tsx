'use client';
// components/chapters/ChapterMapWrapper.tsx
// MeowNet v0.9.0 Social Impact — #hackthekitty 2026

import dynamic from 'next/dynamic';
import type { ChapterPin } from './ChapterMap';

const ChapterMap = dynamic(() => import('./ChapterMap'), {
  ssr: false,
});

export default function ChapterMapWrapper({ chapters = [] }: { readonly chapters?: ChapterPin[] }) {
  return <ChapterMap chapters={chapters} />;
}
