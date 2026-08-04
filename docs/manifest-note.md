# Why the PWA manifest is a static file

`app/manifest.ts` used to generate it. That file has been deleted, and
the manifest now lives at `public/manifest.webmanifest`.

## What went wrong

Next injects `<link rel="manifest">` itself when `app/manifest.ts`
exists, and **it does not apply `basePath` to that link**. Setting
`metadata.manifest` does not override it either — the generated route
wins.

Deployed under `/PHOS/` on GitHub Pages, every page therefore carried:

```html
<link rel="manifest" href="/manifest.webmanifest" />
```

which 404s. Without a reachable manifest a browser will not offer to
install PHOS as an app at all — the single most important thing about
the deployment, broken silently, on a build where all 416 tests passed.

## Why a static file fixes it properly

Every URL inside a web manifest resolves **relative to the manifest's
own address**, per spec. So with the file served from
`/PHOS/manifest.webmanifest`:

| In the file                   | Resolves to                |
| ----------------------------- | -------------------------- |
| `"start_url": "dashboard/"`   | `/PHOS/dashboard/`         |
| `"scope": "./"`               | `/PHOS/`                   |
| `"src": "icons/icon-192.png"` | `/PHOS/icons/icon-192.png` |

And served from a domain root, the same file resolves to `/dashboard/`,
`/`, `/icons/…`.

The manifest is therefore correct at **any** base path, with no
templating and nothing to keep in sync. `metadata.manifest` in
`app/layout.tsx` supplies the `<link>`, wrapped in `withBasePath()`
like every other hand-written URL.

## The guard

`scripts/verify-base-path.mjs` runs after the build and fails it if any
in-site URL in `out/` points at the domain root instead of the
configured base path. It caught 47 of them the first time it ran.
