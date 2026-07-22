import Dexie from 'https://unpkg.com/dexie/dist/dexie.mjs';

export const db = new Dexie("OmniaAppDB");

db.version(1).stores({
    mitspieler: '++id, name'
});