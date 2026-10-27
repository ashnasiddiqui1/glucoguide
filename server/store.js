import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const EMPTY = { users: [], glucose: [], medications: [], doseEvents: [], meals: [], activities: [] };

export function createStore(file = path.join(process.cwd(), 'server/data/db.json')) {
  let data = null;
  async function load() {
    if (data) return data;
    try { data = { ...EMPTY, ...JSON.parse(await fs.readFile(file, 'utf8')) }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; data = structuredClone(EMPTY); await save(); }
    return data;
  }
  async function save() { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(data, null, 2)); }
  return {
    async all(collection) { return (await load())[collection]; },
    async find(collection, predicate) { return (await this.all(collection)).find(predicate); },
    async insert(collection, values) { const row = { id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...values }; (await this.all(collection)).push(row); await save(); return row; },
    async update(collection, id, predicate, values) { const rows = await this.all(collection); const index = rows.findIndex((row) => row.id === id && predicate(row)); if (index < 0) return null; rows[index] = { ...rows[index], ...values, updatedAt: new Date().toISOString() }; await save(); return rows[index]; },
    async remove(collection, id, predicate) { const rows = await this.all(collection); const index = rows.findIndex((row) => row.id === id && predicate(row)); if (index < 0) return false; rows.splice(index, 1); await save(); return true; },
    async persist() { await load(); await save(); }
  };
}
