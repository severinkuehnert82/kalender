import Dexie from 'https://unpkg.com/dexie/dist/dexie.mjs';

export const db = new Dexie("MeinKalenderDB");

db.version(1).stores({
    termine: '++id, datum, titel, uhrzeit'
});