# API de manutenção (`/api/maintenance/*`)

O alojamento não tem SSH. Esta API permite a manutenção remota (estado do
sistema, logs, migrações, cache) com um **token próprio**, separado das contas
de utilizador.

- Só faz as operações listadas abaixo: nada de comandos arbitrários, SQL,
  nem escrita de ficheiros.
- Cada token é criado por um **super admin**. Na base de dados guarda-se só o
  hash: o token aparece **uma única vez**, quando é criado.
- Cada token tem permissões (`read`, `write`), pode ter validade e pode ser
  revogado a qualquer momento.
- Cada chamada fica registada em `maintenance_logs` (veja `GET /audit`).
- Limite de 60 pedidos por minuto.

## Criar um token (consola do browser, sessão de super admin)

```js
(async () => {
  const h = { Authorization: 'Bearer ' + localStorage.getItem('auth_token'), Accept: 'application/json', 'Content-Type': 'application/json' };
  console.log(await (await fetch('/api/admin/system/migrate', { method: 'POST', headers: h })).json());
  console.log(await (await fetch('/api/admin/maintenance-tokens', { method: 'POST', headers: h,
    body: JSON.stringify({ name: 'Claude (manutenção)', abilities: ['read', 'write'], expires_days: 180 }) })).json());
})()
```

A resposta traz `token` (começa por `mt_`). Guarde-o **fora do repositório**,
porque o repositório é público, no ficheiro:

```
%USERPROFILE%\.superloja\maintenance-token
```

## Listar e revogar

```js
const h = { Authorization: 'Bearer ' + localStorage.getItem('auth_token'), Accept: 'application/json' };
fetch('/api/admin/maintenance-tokens', { headers: h }).then(r => r.json()).then(console.table);
fetch('/api/admin/maintenance-tokens/ID', { method: 'DELETE', headers: h }).then(r => r.json()).then(console.log);
```

## Operações

Todas com `Authorization: Bearer mt_…`.

| Método | Rota | Permissão | O que faz |
|---|---|---|---|
| GET | `/api/maintenance/status` | read | App, base de dados (latência), cache, storage (link, escrita, espaço em disco), fila, migrações pendentes, contadores do negócio, último erro |
| GET | `/api/maintenance/migrations` | read | Migrações corridas e pendentes, último lote |
| GET | `/api/maintenance/logs?limit=50&level=error&q=texto&since=2026-10-15T10:00:00Z` | read | Últimas entradas do log do Laravel. Tokens, passwords, chaves e e-mails vêm mascarados |
| GET | `/api/maintenance/demand?days=30` | read | Ranking de procura do marketplace e pesquisas mais feitas |
| GET | `/api/maintenance/audit?limit=50` | read | Chamadas feitas com tokens de manutenção |
| POST | `/api/maintenance/migrate` `{"file":"AAAA_MM_DD_HHMMSS_nome.php"}` ou `{"all":true}` | write | Corre uma migração (o normal) ou todas as pendentes |
| POST | `/api/maintenance/cache/clear` `{"scope":"app\|views\|config\|all"}` | write | Limpa caches |
| POST | `/api/maintenance/storage-link` | write | Cria `public/storage` se faltar |
| POST | `/api/maintenance/opcache-reset` | write | Limpa o OPcache da web, para as classes acabadas de enviar entrarem em vigor |

Atalho local: `bash scripts/manutencao.sh status` (lê o token do ficheiro acima e nunca o mostra). O procedimento de deploy completo está em `DEPLOY.md`.
