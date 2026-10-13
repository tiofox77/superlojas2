# Build e deploy — SuperLoja (superloja.vip)

**Regra de ouro: o git é a única fonte de verdade.** Nada é alterado
diretamente no servidor sem o mesmo commit existir aqui. Em 2026-09-26 o
frontend foi publicado a partir de código que nunca foi guardado no git. Foi
reconstruído a partir do bundle em produção em 2026-10-13 (ramo `prod-sep26`,
commit `4e59815`; o processo está descrito nessa mensagem de commit).

## Estrutura

A raiz do repositório espelha a raiz FTP do alojamento:

| Caminho | O que é |
|---|---|
| `api/` | Laravel 12 (API em `/api/*`, via `.htaccess`) |
| `src/`, `index.html` | Frontend React + Vite |
| `public/` | Ficheiros estáticos copiados para `dist/` no build (ícones, `manifest.webmanifest`, `sw.js`, `robots.txt`, `llms*.txt`) |
| `dist/` | Build publicado (o `.htaccess` serve `/assets/*` e os ficheiros estáticos a partir daqui) |
| `.htaccess` | Rotas: API, storage, sitemaps, `dist/`, SEO |
| `main-seo.php` / `store-seo.php` | Lêem `dist/index.html` e injetam no servidor o título, Open Graph e Schema.org (marketplace / domínios de loja) |
| `sitemap.php` | `/sitemap*.xml` |

Os ficheiros de `public/` também existem na raiz FTP e têm prioridade sobre
`dist/`. Quando mudar um deles (por exemplo `sw.js`), envie-o também para a
raiz do servidor.

## Build do frontend

```bash
npm ci
npm run build
```

O `.env.production` aponta o build para `https://superloja.vip/api`, e o
`.env` serve para desenvolvimento local.

## Deploy (FTP, sem SSH)

1. Faça backup do `dist/index.html` atual no servidor (`dist/index.backup-AAAAMMDD-HHMMSS.html`).
2. Envie **todos** os ficheiros novos de `dist/assets/` (JS **e** CSS) e confirme que respondem 200.
3. Se `public/sw.js` mudou, envie-o para `/sw.js` e para `/dist/sw.js`, e mude a constante `CACHE` para os clientes limparem a cache antiga.
4. Envie o `dist/index.html` **em último lugar**, para nunca apontar para um asset que ainda não existe.
5. Teste no browser: início, página de loja, produto, pesquisa, checkout (sem confirmar) e login.

FTPS: `curl --ssl-reqd -k`. O código de saída 18 no upload é ruído do FTPS;
confirme comparando o tamanho local com o remoto.

## Backend

Envie só os ficheiros alterados em `api/`. Nunca envie nem descarregue o
`api/.env`. As migrações correm a partir da consola do browser, com sessão de
super admin:

```js
fetch('/api/admin/system/migrate',{method:'POST',headers:{Authorization:'Bearer '+localStorage.getItem('auth_token'),Accept:'application/json'}}).then(r=>r.json()).then(console.log)
```

## Nunca fazer commit de

`api/.env`, `tmp_*`, `temp_*`, dumps, zips, ou scripts de diagnóstico em
`api/public/` (alguns têm chaves fixas; o repositório é público).
