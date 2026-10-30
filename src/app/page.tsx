'use client';
import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
import HUD from '@/game/ui/HUD';
import ErrorBoundary from './error-boundary';
const GameCanvas = dynamic(() => import('@/game/scene/GameCanvas'), { ssr: false, loading: () => <div className="flex h-full items-center justify-center">Loading sky bridge…</div> });
export default function Page() {
  const [showcase, setShowcase] = useState(false);
  useEffect(() => { setShowcase(new URLSearchParams(window.location.search).get('showcase') === '1'); }, []);
  return (<main className="relative h-dvh w-full overflow-hidden bg-slate-300"><ErrorBoundary><Suspense fallback={null}><GameCanvas showcase={showcase} /></Suspense><HUD /></ErrorBoundary></main>);
}
