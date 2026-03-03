# Subdomínios por Loja — Guia de Configuração

## Como funciona

Cada loja com plano **Premium** ou **Empresarial** (`custom_domain = true`) pode ter o seu próprio subdomínio:

```
techzone.superlojas.ao     → Loja TechZone Angola
casabela.superlojas.ao     → Loja Casa Bela
sportmax.superlojas.ao     → Loja SportMax
superlojas.ao              → Site principal (marketplace)
```

O subdomínio é o **slug** da loja. Quando um utilizador acede a `techzone.superlojas.ao`, o frontend detecta o subdomínio, resolve a loja via API, verifica se o plano permite, e apresenta o layout dedicado da loja (sem header/footer do marketplace).

---

## Arquitectura

```
Browser → techzone.superlojas.ao
         ↓
  Apache (.htaccess) → mesma pasta, mesmo dist/index.html
         ↓
  React (App.tsx) → detecta subdomínio via VITE_BASE_DOMAIN
         ↓
  useSubdomain.ts → extrai "techzone" do hostname
         ↓
  SubdomainStoreProvider → GET /api/subdomain/resolve/techzone
         ↓
  API verifica: loja existe? plano permite custom_domain?
         ↓
  SubdomainStoreLayout → layout dedicado da loja
```

### Ficheiros envolvidos

| Ficheiro | Função |
|---|---|
| `.env` → `VITE_BASE_DOMAIN` | Domínio base para detecção |
| `src/hooks/useSubdomain.ts` | Extrai slug do hostname |
| `src/hooks/useStoreSlug.ts` | Hook unificado (URL params ou subdomínio) |
| `src/contexts/SubdomainStoreContext.tsx` | Provider que resolve a loja via API |
| `src/layouts/SubdomainStoreLayout.tsx` | Layout dedicado (header/footer da loja) |
| `src/App.tsx` | Routing condicional por subdomínio |
| `api/routes/api.php` | Endpoint `GET /api/subdomain/resolve/{slug}` |
| `api/app/Models/Plan.php` | Campo `custom_domain` boolean |

---

## Configuração Local (Laragon)

### 1. Adicionar domínios no hosts

Editar `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1   lojas.test
127.0.0.1   techzone-angola.lojas.test
127.0.0.1   casa-bela.lojas.test
127.0.0.1   sportmax.lojas.test
127.0.0.1   moda-kwanza.lojas.test
```

### 2. Configurar Apache Virtual Host (Laragon)

Menu Laragon → Apache → sites-enabled → adicionar ficheiro `lojas.test.conf`:

```apache
<VirtualHost *:80>
    ServerName lojas.test
    ServerAlias *.lojas.test
    DocumentRoot "C:/laragon/www/lojas"

    <Directory "C:/laragon/www/lojas">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Reiniciar Apache no Laragon.

### 3. Configurar .env

```env
VITE_API_URL=http://lojas.test/api
VITE_BASE_DOMAIN=lojas.test
```

### 4. Build

```bash
npm run build
```

### 5. Testar

- `http://lojas.test` → Site principal (marketplace)
- `http://techzone-angola.lojas.test` → Layout da loja TechZone

---

## Configuração em Produção (cPanel)

### 1. Domínio e Wildcard DNS

No painel do registador de domínio (ou Cloudflare):

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | `superlojas.ao` | `IP_DO_SERVIDOR` | 3600 |
| A | `*.superlojas.ao` | `IP_DO_SERVIDOR` | 3600 |
| CNAME | `www` | `superlojas.ao` | 3600 |

> O registo `*.superlojas.ao` é o **wildcard** — faz com que QUALQUER subdomínio aponte para o mesmo servidor.

### 2. Wildcard Subdomain no cPanel

1. Aceder ao **cPanel** → **Subdomains** (ou **Domains** no novo tema)
2. Criar subdomínio wildcard:
   - **Subdomain:** `*`
   - **Domain:** `superlojas.ao`
   - **Document Root:** `/public_html` (ou a pasta raiz do projecto)
3. Guardar

> **Alternativa:** Se o cPanel não permitir `*`, ir a **Zone Editor** → adicionar registo A wildcard manualmente.

### 3. SSL Wildcard (Let's Encrypt)

#### Opção A: Cloudflare (Recomendado)

1. Usar Cloudflare como proxy DNS
2. SSL mode: **Full (strict)**
3. Cloudflare fornece SSL wildcard automaticamente para `*.superlojas.ao`

#### Opção B: Let's Encrypt via cPanel

1. cPanel → **SSL/TLS** → **Let's Encrypt**
2. Gerar certificado para `superlojas.ao` E `*.superlojas.ao`
3. Nota: Let's Encrypt wildcard requer **validação DNS** (não HTTP)
4. Se o cPanel suportar AutoSSL com wildcard, ativar; caso contrário, usar certbot:

```bash
# No terminal SSH do servidor
certbot certonly --manual --preferred-challenges dns \
  -d superlojas.ao -d '*.superlojas.ao'
```

Seguir as instruções para adicionar o registo TXT DNS para validação.

#### Opção C: Cloudflare Origin Certificate

1. Cloudflare → SSL/TLS → Origin Server
2. Create Certificate → incluir `superlojas.ao` e `*.superlojas.ao`
3. Instalar no cPanel → SSL/TLS → Manage SSL Sites

### 4. .htaccess (na pasta raiz do projecto)

O `.htaccess` existente já funciona — não precisa de alterações. O Apache serve o mesmo `dist/index.html` para todos os subdomínios, e o React detecta o subdomínio no browser.

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Laravel API
  RewriteCond %{REQUEST_URI} ^/api/
  RewriteRule ^api/(.*)$ /api/public/index.php [L,QSA]

  # Sanctum
  RewriteCond %{REQUEST_URI} ^/sanctum/
  RewriteRule ^sanctum/(.*)$ /api/public/index.php [L,QSA]

  # Storage
  RewriteCond %{REQUEST_URI} ^/storage/(.*)$
  RewriteCond %{DOCUMENT_ROOT}/api/public/storage/%1 -f
  RewriteRule ^storage/(.*)$ /api/public/storage/$1 [L]

  # Static files
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]

  # Assets from dist/
  RewriteCond %{DOCUMENT_ROOT}/dist%{REQUEST_URI} -f
  RewriteRule ^(.*)$ /dist/$1 [L]

  # SPA fallback
  RewriteRule ^ /dist/index.html [L]
</IfModule>
```

### 5. Configurar .env de produção

```env
VITE_API_URL=https://superlojas.ao/api
VITE_BASE_DOMAIN=superlojas.ao
```

### 6. CORS (Laravel)

O `config/cors.php` já tem `allowed_origins => ['*']`, o que permite todos os subdomínios. Em produção, pode restringir:

```php
'allowed_origins_patterns' => [
    '/^https?:\/\/([a-z0-9\-]+\.)?superlojas\.ao$/',
],
```

### 7. Build e Deploy

```bash
npm run build
```

Upload da pasta `dist/` + `api/` para o cPanel.

### 8. Laravel .env (api/.env)

Garantir que `APP_URL` e `SANCTUM_STATEFUL_DOMAINS` incluem wildcard:

```env
APP_URL=https://superlojas.ao
SANCTUM_STATEFUL_DOMAINS=superlojas.ao,*.superlojas.ao,localhost
SESSION_DOMAIN=.superlojas.ao
```

> **Nota:** `SESSION_DOMAIN=.superlojas.ao` (com ponto no início) permite que cookies de sessão sejam partilhados entre todos os subdomínios.

---

## Gestão de Planos

Os subdomínios são controlados pelo campo `custom_domain` na tabela `plans`:

| Plano | `custom_domain` | Subdomínio |
|-------|-----------------|------------|
| Gratuito | `false` | ❌ |
| Básico | `false` | ❌ |
| Profissional | `false` | ❌ |
| Premium | `true` | ✅ |
| Empresarial | `true` | ✅ |

Quando uma loja com plano sem `custom_domain` tenta usar subdomínio, o utilizador vê uma mensagem de erro com sugestão de upgrade.

Para activar subdomínio para um plano:

```sql
UPDATE plans SET custom_domain = 1 WHERE slug = 'profissional';
```

---

## Subdomínios reservados

Os seguintes subdomínios são ignorados pelo sistema (não são tratados como lojas):

- `www`
- `api`
- `admin`
- `mail`
- `ftp`
- `cpanel`
- `webmail`
- `cpcalendars`
- `cpcontacts`

Para adicionar mais, editar `src/hooks/useSubdomain.ts` → array `reserved`.

---

## Fluxo de resolução

```
1. Utilizador acede a techzone.superlojas.ao
2. DNS wildcard → mesmo servidor
3. Apache serve dist/index.html (SPA)
4. React detecta hostname ≠ VITE_BASE_DOMAIN
5. useSubdomain.ts extrai slug "techzone"
6. App.tsx entra em modo subdomínio
7. SubdomainStoreProvider chama GET /api/subdomain/resolve/techzone
8. Backend verifica:
   a. Loja existe e está activa? → senão, 404
   b. Plano tem custom_domain? → senão, 403 + mensagem upgrade
   c. Tudo OK → retorna dados da loja
9. SubdomainStoreLayout renderiza com header/footer da loja
10. StoreDetail usa useStoreSlug() que retorna slug do subdomínio
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Subdomínio mostra site principal | Verificar `VITE_BASE_DOMAIN` no `.env` e rebuild |
| "Loja nao encontrada" | Verificar se o slug da loja corresponde ao subdomínio |
| "Plano nao permite subdominio" | Fazer upgrade do plano para Premium/Empresarial |
| CORS errors | Verificar `config/cors.php` permite o subdomínio |
| Cookies/sessão não funcionam | Verificar `SESSION_DOMAIN=.superlojas.ao` no Laravel `.env` |
| SSL error nos subdomínios | Verificar certificado wildcard instalado |
| API calls falham no subdomínio | `VITE_API_URL` deve usar o domínio principal (não subdomínio) |
