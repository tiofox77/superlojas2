# Como se envia uma actualização para a produção — SuperLoja (out/2026)

Procedimento para ser seguido por uma pessoa ou por outra IA. Não tem
credenciais: os scripts vão buscá-las a ficheiros fora do repositório
(`~/.superloja/ftp.env` e `~/.superloja/maintenance-token`). Nunca imprimir a
palavra-passe FTP nem o token de manutenção.

## 1. Modelo

- **Produção:** superloja.vip, alojamento partilhado cPanel (softechost). Não
  há SSH, cron nem fila.
- **O FTP copia o caminho tal e qual:** a raiz do repositório é a raiz FTP
  (`api/X.php` → `/api/X.php`, `dist/…` → `/dist/…`).
  - `public/` é a pasta do Vite: o build copia-a para `dist/`.
  - Também há cópias na raiz do servidor (ícones, `sw.js`, `manifest`,
    `robots.txt`), e essas têm prioridade sobre `dist/`.
- **O git é a fonte de verdade.** Em setembro alguém enviou código que nunca
  entrou no git, e foi preciso reconstruí-lo (commit `4e59815`). Por isso:
  - antes de enviar, compara-se sempre com a cópia da produção;
  - o que estiver na produção e não estiver no git é para trazer para o git,
    nunca para apagar por cima.
- **Deploy ficheiro a ficheiro.** Enviar um ficheiro que depende de outro que
  ainda não subiu deita o site abaixo.
- **Comandos na produção:** só pela API de manutenção (`MAINTENANCE.md`,
  `scripts/manutencao.sh`), que tem uma lista fechada de operações.
- **O FTPS deste alojamento corta transferências a meio** (cerca de 16 KB) de
  vez em quando. Em out/2026 isso deixou o `routes/api.php` truncado e a API
  em baixo 13 minutos. Por isso nunca se envia um ficheiro por cima do vivo
  sem passar pelo `ftp_deploy.sh`.
- **O PC é Windows e a produção é Linux:** maiúsculas e minúsculas contam nos
  nomes de pastas e de classes. Use a grafia do `git ls-files`.

## 2. Scripts (Git Bash)

| Script | Para quê |
|---|---|
| `bash scripts/ftp_deploy.sh f1 f2 …` | Envia cada ficheiro para `<f>.up`, retoma se cortar, descarrega-o de volta e compara o MD5, e só então troca pelo vivo. Põe `api/routes/*` e `dist/index.html` sempre em último. Termina com `DEPLOY CONFIRMADO` (exit 0) ou `DEPLOY INCOMPLETO` (exit 2). Para caminhos diferentes: `local:remoto` (ex.: `public/sw.js:sw.js`). Recusa `bootstrap/app.php` e `AppServiceProvider` sem `--criticos`, e recusa sempre os `.env`. |
| `bash scripts/instantaneo_ftp.sh [f …]` | Só lê. Descarrega a versão viva de cada ficheiro de `scripts/.lista-deploy.txt` para `recovery/pre-deploy/` (o ponto de reposição) e diz se é igual ao local, se difere (e em quantas linhas) ou se está AUSENTE (ficheiro novo). |
| `bash scripts/manutencao.sh <comando>` | API de manutenção, sem nunca mostrar o token: `status`, `migracoes`, `migrar <ficheiro>`, `erros [desde]`, `logs`, `opcache-reset`, `cache-limpar`, `procura`, `auditoria`. |
| `bash scripts/ftp_baixar.sh <destino> caminho…` | Descarrega ficheiros da produção. |
| `bash scripts/ftp_delete.sh --confirmar caminho…` | Apaga no servidor. Primeiro guarda uma cópia em `recovery/deleted/`; sem `--confirmar` só mostra o que faria. Recusa ficheiros essenciais. |

`recovery/` e `scripts/.lista-deploy.txt` estão no `.gitignore`.

## 3. Antes de enviar

1. **Ensaios locais.**
   - Backend: `php -l` em cada PHP alterado e, se houver migrações,
     `php artisan migrate` na base local.
   - Frontend: `npx tsc --noEmit -p tsconfig.app.json` (só são aceitáveis os
     erros antigos de `src/data/mock.ts`) e `npm run build`.
   - Teste no browser com o build a apontar para a API de produção.
2. **Lista do que vai** em `scripts/.lista-deploy.txt`, um caminho por linha.
3. **Instantâneo:** `bash scripts/instantaneo_ftp.sh`.
4. **Comparar cada ficheiro:**
   `diff -u --strip-trailing-cr recovery/pre-deploy/<f> <f>`. A diferença tem
   de ser **só** a alteração que se quer enviar. Se aparecer mais, alguém
   mudou a produção (ou o local traz trabalho alheio): parar e perceber antes
   de enviar.
5. **Commit e push** só depois de procurar segredos (o repositório GitHub é
   público).

## 4. Ordem do envio

1. **Migrações primeiro, uma a uma.**
   - Enviar só o ficheiro da migração e depois correr
     `bash scripts/manutencao.sh migrar AAAA_MM_DD_HHMMSS_nome.php`.
   - As migrações têm de ter guardas `hasTable`/`hasColumn`: há tabelas que
     foram criadas à mão.
   - `migrar --todas` só se `migracoes` mostrar que todas as pendentes são
     para correr.
2. **Código PHP:** serviços, modelos e middleware, depois controladores e, por
   fim, `api/routes/*.php` (o `ftp_deploy.sh` já põe as rotas em último).
3. **Frontend.** Primeiro `npm run build`, depois:
   - `dist/assets/*` novos (JS e CSS);
   - `public/sw.js:sw.js` e `dist/sw.js`, se o service worker mudou (e mude
     `CACHE` em `public/sw.js`);
   - `dist/index.html` em **último** e sozinho, porque é ele que muda a versão
     viva. O `main-seo.php` e o `store-seo.php` lêem-no.
4. **Ficheiros da raiz** (`.htaccess`, `main-seo.php`, `store-seo.php`,
   `sitemap.php`): só depois de comparar com a produção. Um `.htaccess`
   errado deita o site todo abaixo.

## 5. Depois do envio

1. Se mudaram classes PHP: `bash scripts/manutencao.sh opcache-reset`.
2. Se mudou config ou rotas: `cache-limpar config`. A produção não usa
   `config:cache` nem `route:cache`.
3. Verificar:
   - `curl -o /dev/null -w "%{http_code}" https://superloja.vip/` e
     `/api/site-settings` devolvem 200;
   - `bash scripts/manutencao.sh erros`: não pode haver erros novos desde a
     hora do deploy (o script lê-a de `recovery/deploy-log.txt`);
   - no browser: início, loja, produto, pesquisa, checkout (sem confirmar),
     login, sem erros na consola.

## 6. Voltar atrás

- **Um ficheiro:** copiar `recovery/pre-deploy/<caminho>` para o lugar do
  local, reenviá-lo com `ftp_deploy.sh` e correr `opcache-reset`.
- **Frontend:** voltar a pôr no `dist/index.html` o backup
  `dist/index.backup-AAAAMMDD-HHMMSS.html`. Os assets antigos continuam no
  servidor.
- **Migração:** só com uma migração nova que desfaça a anterior. Não há
  `rollback` pela API.

## 7. Regras que não se quebram

- Não alterar dados de produção sem ordem do dono. Mudanças de dados vão em
  migrações com guardas (ex.: `2026_10_15_100000_update_superloja_store_banner`).
- Nada de credenciais, dados pessoais ou palavras-passe em URLs nem no
  repositório. Os tokens vão no header `Authorization`.
- Nunca enviar nem descarregar o `api/.env`.
- Não apagar nada do servidor sem ordem: usar `ftp_delete.sh`, que guarda
  cópia.
- Não deixar scripts de diagnóstico em `api/public/` (alguns têm chaves fixas).
- Os produtos com stock 0 continuam na API, porque o bot do WhatsApp precisa
  deles. Esconde-os só o frontend.
