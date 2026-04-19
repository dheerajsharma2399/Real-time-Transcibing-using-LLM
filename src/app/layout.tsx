import './globals.css';

import type { ReactNode } from 'react';

export const metadata = {
  title: 'TwinMind — Live Suggestions',
  description: 'Desktop-only live meeting copilot with transcript, suggestions, and chat.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
