import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  BackendDLQRecord,
  BackendJob,
  BackendMetricPoint,
  BackendWorker,
  IClusterDatabase,
  MetricEventRecord,
  ProcessedExecutionRecord,
} from '../types';

export class SqliteDatabase implements IClusterDatabase {
  private db: Database.Database;
  private isClosed = false;

  constructor(dbPath: string = path.resolve(process.cwd(), 'data', 'orchestrix.db')) {
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Remove orphaned WAL/SHM sidecar files if the primary DB file is absent
      if (!fs.existsSync(dbPath)) {
        this.removeSidecarFiles(dbPath);
      }
    }

    try {
      this.db = this.openAndVerify(dbPath);
    } catch (err) {
      if (dbPath === ':memory:') {
        throw err;
      }
      console.warn(
        `[SqliteDatabase] Detected corrupted or malformed SQLite database at ${dbPath}. Recreating cleanly:`,
        err instanceof Error ? err.message : err
      );
      this.removeDatabaseFiles(dbPath);
      this.db = this.openAndVerify(dbPath);
    }
  }

  private removeSidecarFiles(dbPath: string): void {
    for (const suffix of ['-wal', '-shm']) {
      const sidecar = `${dbPath}${suffix}`;
      if (fs.existsSync(sidecar)) {
        fs.rmSync(sidecar, { force: true });
      }
    }
  }

  private removeDatabaseFiles(dbPath: string): void {
    for (const target of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { force: true });
      }
    }
  }

  private openAndVerify(dbPath: string): Database.Database {
    const db = new Database(dbPath);
    try {
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      const checkRow = db.pragma('quick_check(1)', { simple: true });
      if (checkRow !== 'ok') {
        throw new Error(`SQLite quick_check failed: ${String(checkRow)}`);
      }
      this.db = db;
      this.initSchema();
      return db;
    } catch (err) {
      try {
        db.close();
      } catch {
        // Ignore close failure on corrupted handle
      }
      throw err;
    }
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        effective_priority REAL NOT NULL,
        enqueued_at INTEGER NOT NULL,
        started_timestamp INTEGER NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dlq_records (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        quarantined_at INTEGER NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS metrics_history (
        timestamp INTEGER PRIMARY KEY,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS metric_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        job_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        wait_time_ms REAL
      );

      CREATE TABLE IF NOT EXISTS processed_executions (
        idempotency_key TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        execution_token TEXT NOT NULL,
        completed_at INTEGER NOT NULL,
        result_payload TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_metric_events_ts ON metric_events (timestamp);
      CREATE INDEX IF NOT EXISTS idx_dlq_job_id ON dlq_records (job_id);
      CREATE INDEX IF NOT EXISTS idx_processed_job_id ON processed_executions (job_id);
    `);
  }

  public loadJobs(): BackendJob[] {
    const rows = this.db.prepare('SELECT payload FROM jobs').all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as BackendJob);
  }

  public upsertJob(job: BackendJob): void {
    if (this.isClosed) return;
    this.db
      .prepare(
        `INSERT INTO jobs (id, status, priority, effective_priority, enqueued_at, started_timestamp, payload)
         VALUES (@id, @status, @priority, @effective_priority, @enqueued_at, @started_timestamp, @payload)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           priority = excluded.priority,
           effective_priority = excluded.effective_priority,
           enqueued_at = excluded.enqueued_at,
           started_timestamp = excluded.started_timestamp,
           payload = excluded.payload`
      )
      .run({
        id: job.id,
        status: job.status,
        priority: job.priority,
        effective_priority: job.effectivePriority,
        enqueued_at: job.enqueuedAt,
        started_timestamp: job.startedTimestamp,
        payload: JSON.stringify(job),
      });
  }

  public upsertJobs(jobs: BackendJob[]): void {
    if (this.isClosed || jobs.length === 0) return;
    const stmt = this.db.prepare(
      `INSERT INTO jobs (id, status, priority, effective_priority, enqueued_at, started_timestamp, payload)
       VALUES (@id, @status, @priority, @effective_priority, @enqueued_at, @started_timestamp, @payload)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         priority = excluded.priority,
         effective_priority = excluded.effective_priority,
         enqueued_at = excluded.enqueued_at,
         started_timestamp = excluded.started_timestamp,
         payload = excluded.payload`
    );
    const tx = this.db.transaction((items: BackendJob[]) => {
      for (const job of items) {
        stmt.run({
          id: job.id,
          status: job.status,
          priority: job.priority,
          effective_priority: job.effectivePriority,
          enqueued_at: job.enqueuedAt,
          started_timestamp: job.startedTimestamp,
          payload: JSON.stringify(job),
        });
      }
    });
    tx(jobs);
  }

  public deleteJob(id: string): void {
    if (this.isClosed) return;
    this.db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  }

  public loadWorkers(): BackendWorker[] {
    const rows = this.db.prepare('SELECT payload FROM workers').all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as BackendWorker);
  }

  public upsertWorker(worker: BackendWorker): void {
    if (this.isClosed) return;
    this.db
      .prepare(
        `INSERT INTO workers (id, status, payload)
         VALUES (@id, @status, @payload)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           payload = excluded.payload`
      )
      .run({
        id: worker.id,
        status: worker.status,
        payload: JSON.stringify(worker),
      });
  }

  public upsertWorkers(workers: BackendWorker[]): void {
    if (this.isClosed || workers.length === 0) return;
    const stmt = this.db.prepare(
      `INSERT INTO workers (id, status, payload)
       VALUES (@id, @status, @payload)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         payload = excluded.payload`
    );
    const tx = this.db.transaction((items: BackendWorker[]) => {
      for (const worker of items) {
        stmt.run({
          id: worker.id,
          status: worker.status,
          payload: JSON.stringify(worker),
        });
      }
    });
    tx(workers);
  }

  public loadDLQRecords(): BackendDLQRecord[] {
    const rows = this.db
      .prepare('SELECT payload FROM dlq_records ORDER BY quarantined_at DESC')
      .all() as Array<{ payload: string }>;
    return rows.map((r) => JSON.parse(r.payload) as BackendDLQRecord);
  }

  public upsertDLQRecord(record: BackendDLQRecord): void {
    if (this.isClosed) return;
    this.db
      .prepare(
        `INSERT INTO dlq_records (id, job_id, quarantined_at, payload)
         VALUES (@id, @job_id, @quarantined_at, @payload)
         ON CONFLICT(id) DO UPDATE SET
           job_id = excluded.job_id,
           quarantined_at = excluded.quarantined_at,
           payload = excluded.payload`
      )
      .run({
        id: record.id,
        job_id: record.jobId,
        quarantined_at: record.quarantinedAt,
        payload: JSON.stringify(record),
      });
  }

  public deleteDLQRecord(id: string): void {
    if (this.isClosed) return;
    this.db.prepare('DELETE FROM dlq_records WHERE id = ?').run(id);
  }

  public clearDLQRecords(): void {
    if (this.isClosed) return;
    this.db.prepare('DELETE FROM dlq_records').run();
  }

  public loadMetricsHistory(limit = 50): BackendMetricPoint[] {
    const rows = this.db
      .prepare('SELECT payload FROM metrics_history ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as Array<{ payload: string }>;
    return rows.reverse().map((r) => JSON.parse(r.payload) as BackendMetricPoint);
  }

  public insertMetricPoint(point: BackendMetricPoint): void {
    if (this.isClosed) return;
    this.db
      .prepare(
        `INSERT INTO metrics_history (timestamp, payload)
         VALUES (@timestamp, @payload)
         ON CONFLICT(timestamp) DO UPDATE SET
           payload = excluded.payload`
      )
      .run({
        timestamp: point.timestamp,
        payload: JSON.stringify(point),
      });
  }

  public trimMetricsHistory(keepCount: number): void {
    if (this.isClosed) return;
    this.db
      .prepare(
        `DELETE FROM metrics_history
         WHERE timestamp NOT IN (
           SELECT timestamp FROM metrics_history ORDER BY timestamp DESC LIMIT ?
         )`
      )
      .run(keepCount);
  }

  public loadMetricEvents(sinceTimestamp: number): MetricEventRecord[] {
    const rows = this.db
      .prepare(
        `SELECT event_type as eventType, job_id as jobId, timestamp, wait_time_ms as waitTimeMs
         FROM metric_events
         WHERE timestamp >= ?
         ORDER BY timestamp ASC`
      )
      .all(sinceTimestamp) as Array<{
      eventType: 'completed' | 'failed' | 'dispatched';
      jobId: string;
      timestamp: number;
      waitTimeMs: number | null;
    }>;

    return rows.map((r) => ({
      eventType: r.eventType,
      jobId: r.jobId,
      timestamp: r.timestamp,
      waitTimeMs: r.waitTimeMs ?? undefined,
    }));
  }

  public insertMetricEvent(event: MetricEventRecord): void {
    if (this.isClosed) return;
    this.db
      .prepare(
        `INSERT INTO metric_events (event_type, job_id, timestamp, wait_time_ms)
         VALUES (@eventType, @jobId, @timestamp, @waitTimeMs)`
      )
      .run({
        eventType: event.eventType,
        jobId: event.jobId,
        timestamp: event.timestamp,
        waitTimeMs: event.waitTimeMs ?? null,
      });
  }

  public pruneMetricEvents(olderThanTimestamp: number): void {
    if (this.isClosed) return;
    this.db.prepare('DELETE FROM metric_events WHERE timestamp < ?').run(olderThanTimestamp);
  }

  public hasProcessedIdempotencyKey(idempotencyKey: string): boolean {
    if (this.isClosed) return false;
    const row = this.db
      .prepare('SELECT 1 FROM processed_executions WHERE idempotency_key = ? LIMIT 1')
      .get(idempotencyKey);
    return !!row;
  }

  public getProcessedExecution(idempotencyKey: string): ProcessedExecutionRecord | undefined {
    if (this.isClosed) return undefined;
    const row = this.db
      .prepare(
        `SELECT idempotency_key as idempotencyKey, job_id as jobId, execution_token as executionToken,
                completed_at as completedAt, result_payload as resultPayload
         FROM processed_executions
         WHERE idempotency_key = ?`
      )
      .get(idempotencyKey) as
      | {
          idempotencyKey: string;
          jobId: string;
          executionToken: string;
          completedAt: number;
          resultPayload: string;
        }
      | undefined;
    if (!row) return undefined;
    return {
      idempotencyKey: row.idempotencyKey,
      jobId: row.jobId,
      executionToken: row.executionToken,
      completedAt: row.completedAt,
      resultPayload: JSON.parse(row.resultPayload) as Record<string, unknown>,
    };
  }

  public recordProcessedExecution(record: ProcessedExecutionRecord): void {
    if (this.isClosed) return;
    this.db
      .prepare(
        `INSERT INTO processed_executions (idempotency_key, job_id, execution_token, completed_at, result_payload)
         VALUES (@idempotencyKey, @jobId, @executionToken, @completedAt, @resultPayload)
         ON CONFLICT(idempotency_key) DO NOTHING`
      )
      .run({
        idempotencyKey: record.idempotencyKey,
        jobId: record.jobId,
        executionToken: record.executionToken,
        completedAt: record.completedAt,
        resultPayload: JSON.stringify(record.resultPayload ?? {}),
      });
  }

  public runInTransaction<T>(fn: () => T): T {
    if (this.isClosed) return fn();
    const tx = this.db.transaction(fn);
    return tx();
  }

  public flush(): void {
    if (this.isClosed) return;
    try {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (err) {
      console.warn('[SqliteDatabase] Checkpoint flush warning:', err);
    }
  }

  public close(): void {
    if (this.isClosed) return;
    this.flush();
    this.db.close();
    this.isClosed = true;
  }
}
