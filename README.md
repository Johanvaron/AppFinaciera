# Mis finanzas

App personal para llevar los gastos del mes: checklist de gastos fijos, movimientos, presupuesto por categoría y reportes. Corre en tu propio computador; los datos quedan en un archivo SQLite local (`data/finanzas.db`) que nunca sube a git.

## Cómo levantarla

Requiere Node 24+ y pnpm.

```bash
pnpm install
pnpm dev
```

Abre <http://localhost:5173>. `pnpm dev` levanta dos procesos: la API local (puerto 8787) y la web (puerto 5173).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | API + web en modo desarrollo |
| `pnpm test` | Pruebas (API contra SQLite en memoria + formato de cifras) |
| `pnpm typecheck` | Tipos de todo el proyecto |
| `pnpm build` | Build de producción de la web |

## Estructura

```
shared/contract.ts   Contrato único: schemas Zod y tipos que usan la API y la web
server/              API local (Hono + node:sqlite): routes → services → repositories
src/lib/             api.ts (único lugar que hace HTTP), queries.ts (TanStack Query), format.ts
src/components/ui/   Componentes base
src/views/           Una pantalla por archivo
data/                Tu base de datos (ignorada por git)
```

## Reglas del proyecto

- La plata se guarda en pesos enteros; los porcentajes viajan como fracción y solo se formatean al mostrarse.
- Todo cambio de forma de datos pasa primero por `shared/contract.ts`.
- Sin gradientes decorativos, páginas a todo el ancho, texto mínimo de 13 px.
- Respaldo: Ajustes → Descargar respaldo (JSON).
