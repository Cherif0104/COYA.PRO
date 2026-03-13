# Alignement projet Supabase (app vs MCP)

## Projet utilisé par l’application

L’app **coya-pro** utilise par défaut le projet Supabase suivant (défini dans [services/supabaseService.ts](coya-pro/services/supabaseService.ts)) :

- **URL :** `https://tdwbqgyubigaurnjzbfv.supabase.co`
- **Projet (ref) :** `tdwbqgyubigaurnjzbfv`
- Les variables d’environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` surchargent ces valeurs si elles sont définies (fichier `.env` ou `.env.local` à la racine de `coya-pro`).

## Projet utilisé par le MCP Supabase

Le serveur MCP Supabase (Cursor) est configuré de son côté et peut pointer vers **un autre projet** (par exemple un projet Supabase Pro différent). Pour que les migrations appliquées via MCP soient effectives sur l’environnement où tourne l’app :

- **Option A (recommandée) :** Configurer le MCP Supabase pour qu’il utilise le **même projet** que l’app (`tdwbqgyubigaurnjzbfv`). Ainsi, les appels à `apply_migration` créent les tables sur le projet utilisé au runtime.
- **Option B :** Si le MCP reste sur un autre projet, exécuter les scripts SQL du dossier `coya-pro/scripts/` **manuellement** dans le **SQL Editor** du Dashboard Supabase du projet `tdwbqgyubigaurnjzbfv` (dans l’ordre indiqué dans [scripts/README-MIGRATIONS.md](coya-pro/scripts/README-MIGRATIONS.md)).

## Vérification

- **Côté app :** l’URL utilisée au runtime est celle de `supabaseService.ts` (ou de `.env`). Les requêtes partent vers cette URL.
- **Côté MCP :** utiliser l’outil `get_project_url` pour afficher l’URL du projet ciblé par le MCP. Elle doit être identique à l’URL du projet utilisé par l’app pour que les migrations MCP et l’app soient alignées.

## Résumé

| Contexte | URL / projet |
|----------|----------------|
| App (défaut) | `https://tdwbqgyubigaurnjzbfv.supabase.co` |
| MCP | À vérifier via `get_project_url` ; doit être le même que l’app pour un alignement complet. |

Une fois alignés, toutes les migrations appliquées via MCP sont immédiatement visibles par l’application (plus de 404 sur les tables créées par ces migrations).
