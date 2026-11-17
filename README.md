# Cuentas claras

App para llevar las cuentas entre Angel y Nelson. Corre en **Cloudflare**:

- **Worker** (`src/worker.js`): sirve la página y la API `/api/records`. Al pedir
  la página incrusta el historial en el HTML para que se vea al instante.
- **D1** (`cuentas-claras`): base de datos SQLite con la tabla `records`
  (`migrations/`). No se pausa por inactividad.
- **Frontend** (`public/`): `npm run build` compila Tailwind, convierte los
  iconos a SVG, copia las fuentes y deja todo en `dist/`.

## Comandos

```bash
npm install
npm run dev        # build + servidor local con D1 local (http://localhost:8787)
npm run deploy     # build + despliegue a Cloudflare
npm run db:migrate # aplica migraciones nuevas a la base de datos remota
```

`wrangler` necesita `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (o `wrangler login`).

URL: https://cuentas-claras.angelalarcon-aa.workers.dev/?user=angel
