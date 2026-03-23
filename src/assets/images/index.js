const toDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

export const KRYSTIAN_NOWAK_AVATAR = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
  <defs>
    <linearGradient id="gradA" x1="8" y1="8" x2="72" y2="72" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5EC269"/>
      <stop offset="1" stop-color="#3C7E44"/>
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="40" fill="url(#gradA)"/>
  <circle cx="40" cy="31" r="14" fill="#EAF9EE"/>
  <path d="M16 69c5-12 14-19 24-19s19 7 24 19" fill="#EAF9EE"/>
  <text x="40" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#1D3D22">KN</text>
</svg>
`)

export const KASIA_JEDRYCHOWSKA_AVATAR = toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
  <defs>
    <linearGradient id="gradB" x1="10" y1="8" x2="69" y2="71" gradientUnits="userSpaceOnUse">
      <stop stop-color="#77DB89"/>
      <stop offset="1" stop-color="#5EC269"/>
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="40" fill="url(#gradB)"/>
  <circle cx="40" cy="30" r="13" fill="#F5FFF7"/>
  <path d="M14 69c5-13 15-20 26-20s20 7 26 20" fill="#F5FFF7"/>
  <text x="40" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#24502B">KJ</text>
</svg>
`)
