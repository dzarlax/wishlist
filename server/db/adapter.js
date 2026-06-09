/**
 * Database adapter interface.
 * All methods are async. Both SQLite and PostgreSQL implement the same API.
 *
 * query(sql, params)   → { rows: [...] }  (array of objects with named keys)
 * run(sql, params)     → { changes: N }
 * getOne(sql, params)  → object | null
 * getAll(sql, params)  → [...]
 * close()              → void
 */

class SqliteAdapter {
  constructor(db, saveCallback) {
    this.db = db;
    this._save = saveCallback;
  }

  /**
   * Convert sql.js positional array rows to named objects
   */
  _toObjects(execResult) {
    if (!execResult || !execResult[0]) return [];
    const { columns, values } = execResult[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  async query(sql, params = []) {
    if (params.length > 0) {
      // exec() doesn't support params — use prepare/bind
      return { rows: await this.getAll(sql, params) };
    }
    const result = this.db.exec(sql);
    return { rows: this._toObjects(result) };
  }

  async run(sql, params = []) {
    this.db.run(sql, params);
    const changes = this.db.getRowsModified();
    if (this._save) this._save();
    return { changes };
  }

  async getOne(sql, params = []) {
    // Use prepare/bind/step for parameterized single-row queries
    const stmt = this.db.prepare(sql);
    try {
      if (params.length > 0) stmt.bind(params);
      if (!stmt.step()) return null;
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = values[i];
      });
      return obj;
    } finally {
      stmt.free();
    }
  }

  async getAll(sql, params = []) {
    if (params.length > 0) {
      // Use prepare/bind for parameterized queries
      const stmt = this.db.prepare(sql);
      try {
        stmt.bind(params);
        const results = [];
        const columns = stmt.getColumnNames();
        while (stmt.step()) {
          const values = stmt.get();
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = values[i];
          });
          results.push(obj);
        }
        return results;
      } finally {
        stmt.free();
      }
    }
    const result = this.db.exec(sql);
    return this._toObjects(result);
  }

  /**
   * Run a SQL statement that returns the last inserted id (SQLite-specific).
   * Executes INSERT then SELECT last_insert_rowid().
   */
  async insert(sql, params = []) {
    this.db.run(sql, params);
    if (this._save) this._save();
    const result = this.db.exec('SELECT last_insert_rowid() as id');
    return this._toObjects(result)[0]?.id;
  }

  async close() {
    this.db.close();
  }

  async transaction(callback) {
    await this.run('BEGIN IMMEDIATE');
    try {
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  get dialect() {
    return 'sqlite';
  }
}

class PgAdapter {
  constructor(pool, ownsPool = true) {
    this.pool = pool;
    this.ownsPool = ownsPool;
  }

  /**
   * Convert ? placeholders to $1, $2, ... for PostgreSQL.
   * Skips ? inside single-quoted strings.
   */
  _toPgParams(sql) {
    let idx = 0;
    let inString = false;
    let result = '';
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === "'" && sql[i - 1] !== '\\') {
        inString = !inString;
        result += ch;
      } else if (ch === '?' && !inString) {
        idx++;
        result += `$${idx}`;
      } else {
        result += ch;
      }
    }
    return result;
  }

  async query(sql, params = []) {
    const result = await this.pool.query(this._toPgParams(sql), params);
    return { rows: result.rows };
  }

  async run(sql, params = []) {
    const result = await this.pool.query(this._toPgParams(sql), params);
    return { changes: result.rowCount };
  }

  async getOne(sql, params = []) {
    const result = await this.pool.query(this._toPgParams(sql), params);
    return result.rows[0] || null;
  }

  async getAll(sql, params = []) {
    const result = await this.pool.query(this._toPgParams(sql), params);
    return result.rows;
  }

  /**
   * Run an INSERT with RETURNING id and return the id.
   */
  async insert(sql, params = []) {
    // Append RETURNING id if not already present
    const normalized = sql.trimEnd().replace(/;$/, '');
    const withReturning = /returning\s/i.test(normalized)
      ? normalized
      : `${normalized} RETURNING id`;
    const result = await this.pool.query(this._toPgParams(withReturning), params);
    return result.rows[0]?.id;
  }

  async close() {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txDb = new PgAdapter(client, false);
      const result = await callback(txDb);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  get dialect() {
    return 'postgres';
  }
}

module.exports = { SqliteAdapter, PgAdapter };
