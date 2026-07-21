# Cricket player card templates

These assets power `CricketPlayerCard` / `CricketCardPresentation`.

| File | Tier |
|------|------|
| `bronze.svg` | Bronze |
| `silver.svg` | Silver |
| `gold.svg` | Gold |
| `toty.svg` | Team of the Week / Year |
| `legend.svg` | Icon / legend |
| `cricket-shield-mask.svg` | Shared clip mask (bat-shield silhouette) |

Templates are **cricket-themed** (leather seam pattern, stumps watermark, league slot) — not FIFA hex shapes.

Regenerate SVGs:

```bash
node apps/cricinsights/scripts/generate-cricket-card-svgs.mjs
```

If you add raster PNGs later, keep the same basenames and update `card-tiers.ts` paths.
