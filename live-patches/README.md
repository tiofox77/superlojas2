# Live frontend patches

**Read this before touching the frontend.**

The frontend running on superloja.vip was built and deployed on 2026-09-26 from
source that was never committed or uploaded (it is not in git, not in the
server's `src/`, and not on this machine). It includes September work that
exists only in the built bundle: the "SuperLoja" rebrand, checkout phone
validation and "Recolha na loja", password reset, product-form validations,
the "Destaques" slider, etc.

**Do not run `vite build` from this repo and deploy it** — that would wipe all
of the above from the live site. Until the source is recovered, change the
frontend by patching the built bundle, as below.

## Current production assets (2026-10-13)

| File | Notes |
|---|---|
| `dist/assets/index-DPsHM3DV-loja-v2.js` | live bundle `index-DPsHM3DV.js` + store-page patch |
| `dist/assets/index-CMPXkRrn-loja-v2.css` | live CSS `index-CMPXkRrn.css` + `store-page-v2/extra.css` appended |
| `dist/index.html` | only the two asset references changed |

SHA-256: base bundle `9cdfd1f7…b58f`, patched bundle `c54d07da…aa0`, base CSS `caae81ac…735b`.

**Rollback:** restore `dist/index.backup-20261013-104709.html` over
`dist/index.html` on the server (it points back at the unpatched assets,
which are still there).

## store-page-v2 — /lojas/:slug (and store subdomain routes)

Replaces the bundle's `Nl` component and extends `useStore` (`HD`):

- newest products first by default; sort by price, discount, rating, name
- out-of-stock products are not listed (store page only — the API still
  returns them, the WhatsApp bot relies on stock 0 for "esgotado"/reservations)
- desktop filter sidebar / mobile filter drawer: category (+subcategory),
  price ranges + custom min/max, "Em promoção", "Novidades (30 dias)",
  active-filter chips, "Carregar mais" (24 per page), "Novo" badge (≤14 days)
- real store data: today's hours + open/closed (Africa/Luanda), weekly hours,
  phone, e-mail, minimum order, "Na SuperLoja desde"
- `useStore` now passes `phone`, `email`, `businessHours`, `minOrderValue`,
  `createdAt` and per-product `createdAt`/`subcategoryName` (the Sep-26
  transformer dropped them, so the store e-mail never showed)

### Rebuild the patch

```bash
ES=node_modules/@esbuild/win32-x64/esbuild.exe
$ES live-patches/store-page-v2/StoreDetailNew.jsx --loader:.jsx=jsx \
  --jsx-factory=d.createElement --jsx-fragment=d.Fragment --target=es2019 \
  --minify --outfile=StoreDetailNew.min.js
curl -s https://superloja.vip/assets/index-DPsHM3DV.js -o base.js   # unpatched base
php live-patches/store-page-v2/splice.php base.js StoreDetailNew.min.js patched.js
node --check patched.js
curl -s https://superloja.vip/assets/index-CMPXkRrn.css -o base.css
cat base.css live-patches/store-page-v2/extra.css > patched.css
```

The component references the bundle's minified bindings (`d` = React,
`ce` = Link, `En` = ProductCard, icons, hooks…) through aliases at its top;
`splice.php` refuses to run if the shape it expects isn't found.

`extra.css` holds only Tailwind rules the live CSS lacked, none of them used
elsewhere in the bundle, so appending them changes nothing on other pages.
New Tailwind classes in the component must be added there (generate with the
Tailwind CLI from the component, minify with esbuild
`--target=chrome87,edge88,firefox78,safari14`, drop rules already in the live CSS).

Deploy order: upload the new JS and CSS under new names, verify both return
200, then swap the references in `dist/index.html` (back it up first).

## reconstructed/

Source recovered by hand from the bundle, for when the frontend is rebuilt:

- `SearchResults.tsx` — the `/pesquisa` page (bundle function `RR`).
