import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Skybound Robot Runway Assault', description: 'Runner-shooter: chibi robots on an endless sky bridge.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return (<html lang="en"><body>{children}</body></html>); }
