import { useEffect } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

// Downscale the document below 1728px reference width — desktop only.
// On tablet/mobile (<1024px) skip zoom so responsive breakpoints work.
const ZOOM_SCRIPT = `(function(){function u(){var w=document.documentElement.clientWidth;var z=(w>=1024&&w<1728)?w/1728:1;document.documentElement.style.zoom=String(z);}u();window.addEventListener('resize',u);})();`

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Gainly — The All-in-One Platform for Fitness Coaches' },
      {
        name: 'description',
        content:
          'Build training programs, track client progress and PRs, plan nutrition, and keep clients accountable — all from one platform.',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://api.fontshare.com' },
      {
        rel: 'preconnect',
        href: 'https://cdn.fontshare.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800,900&f[]=satoshi@400,500,700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Re-apply responsive zoom after hydration.
  useEffect(() => {
    const u = () => {
      const w = document.documentElement.clientWidth
      const z = w >= 1024 && w < 1728 ? w / 1728 : 1
      document.documentElement.style.zoom = String(z)
    }
    u()
    window.addEventListener('resize', u)
    return () => window.removeEventListener('resize', u)
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: ZOOM_SCRIPT }} />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
