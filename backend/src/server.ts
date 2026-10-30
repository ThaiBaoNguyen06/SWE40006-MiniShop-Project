import app from './app';
import { pool } from './db';
import { synchronizeCatalogue } from './catalogue';
const PORT = Number(process.env.PORT) || 3000;
synchronizeCatalogue(pool).then(() => {
 app.listen(PORT, () => console.log('MiniShop backend listening on port ' + PORT));
}).catch(() => { console.error('Catalogue initialization failed. Check database and catalogue configuration.'); process.exit(1); });
