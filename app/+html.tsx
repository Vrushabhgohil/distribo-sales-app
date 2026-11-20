import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Google Fonts: Playwrite FR Moderne, Outfit, DM Sans, and Plus Jakarta Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playwrite+FR+Moderne:wght@100..400&family=DM+Sans:ital,opsz,wght@0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,700&family=Outfit:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
*, *:focus, *:focus-visible {
  outline: none !important;
  -webkit-tap-highlight-color: transparent !important;
}
a, button, [role="button"], [role="tab"] {
  outline: none !important;
  -webkit-tap-highlight-color: transparent !important;
  text-decoration: none;
}
html, body {
  min-height: 100vh;
  background-color: #FAF7F2;
  background-image:
    radial-gradient(120% 80% at 50% -5%, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.7) 35%, rgba(255, 255, 255, 0) 75%),
    radial-gradient(65% 55% at 10% 12%, rgba(241, 221, 175, 0.22) 0%, rgba(255, 255, 255, 0) 50%),
    radial-gradient(60% 50% at 90% 18%, rgba(233, 224, 210, 0.3) 0%, rgba(255, 255, 255, 0) 45%),
    radial-gradient(75% 60% at 75% 80%, rgba(241, 221, 175, 0.16) 0%, rgba(255, 255, 255, 0) 55%),
    radial-gradient(70% 55% at 20% 85%, rgba(233, 224, 210, 0.25) 0%, rgba(255, 255, 255, 0) 55%),
    linear-gradient(180deg, #FFFFFF 0%, #FAF6EF 22%, #F3EBE0 60%, #ECE2D2 100%);
  background-attachment: fixed;
  background-repeat: no-repeat;
  background-size: cover;
  -webkit-font-smoothing: antialiased;
}
#root {
  min-height: 100vh;
  background-color: transparent !important;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #E9E0D2;
  border-radius: 3px;
}`;
