'use client';
import { Component, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { if (this.state.error) return <div className="p-6 text-center"><h2>Something went wrong with the game view.</h2><button className="mt-4 rounded bg-cyan-600 px-4 py-2 text-white" onClick={() => window.location.reload()}>Reload</button></div>; return this.props.children; }
}
