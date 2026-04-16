import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gordon Pro Field App',
    short_name: 'GP Field',
    description: 'Tree assessment tool for Gordon Pro Tree Service',
    start_url: '/operator',
    display: 'standalone',
    background_color: '#1C3A2B',
    theme_color: '#1C3A2B',
    orientation: 'portrait',
    icons: [
      {
        src: '/images/gptslogo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/gptslogo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
