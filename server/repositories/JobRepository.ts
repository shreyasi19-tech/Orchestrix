import {
  BackendJob,
  IClusterDatabase,
  IJobRepository,
  JobFilter,
} from '../types';

export class JobRepository implements IJobRepository {
  private jobs: Map<string, BackendJob> = new Map();

  constructor(private readonly db: IClusterDatabase) {
    const persisted = this.db.loadJobs();
    for (const job of persisted) {
      this.jobs.set(job.id, {
        ...job,
        attemptCount: job.attemptCount ?? (job.retries?.length || 0),
        maxRetries: job.maxRetries ?? 3,
        idempotencyKey: job.idempotencyKey || `idem_${job.id}`,
      });
    }
  }

  public getAll(filter?: JobFilter): BackendJob[] {
    let result = Array.from(this.jobs.values()).map((j) => ({ ...j }));

    if (filter) {
      if (filter.status && filter.status !== 'All') {
        const statusFilter = filter.status.toLowerCase();
        result = result.filter((j) => j.status.toLowerCase() === statusFilter);
      }
      if (filter.priority && filter.priority !== 'All') {
        const priorityFilter = filter.priority.toLowerCase();
        result = result.filter((j) => j.priority.toLowerCase() === priorityFilter);
      }
      if (filter.type && filter.type !== 'All') {
        const typeFilter = filter.type.toLowerCase();
        result = result.filter((j) => j.type.toLowerCase() === typeFilter);
      }
      if (filter.worker && filter.worker !== 'All') {
        const workerFilter = filter.worker.toLowerCase();
        result = result.filter((j) => j.worker.toLowerCase() === workerFilter);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        result = result.filter(
          (j) =>
            j.id.toLowerCase().includes(q) ||
            j.name.toLowerCase().includes(q) ||
            j.type.toLowerCase().includes(q) ||
            j.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      if (filter.sortBy) {
        if (filter.sortBy === 'duration-desc') {
          result.sort((a, b) => b.durationSeconds - a.durationSeconds);
        } else if (filter.sortBy === 'priority-desc') {
          result.sort((a, b) => b.effectivePriority - a.effectivePriority);
        } else if (filter.sortBy === 'id-asc') {
          result.sort((a, b) => a.id.localeCompare(b.id));
        } else {
          result.sort((a, b) => b.startedTimestamp - a.startedTimestamp);
        }
      }
    }

    return result;
  }

  public getById(id: string): BackendJob | undefined {
    const job = this.jobs.get(id);
    return job ? { ...job } : undefined;
  }

  public findByIdempotencyKey(idempotencyKey: string): BackendJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.idempotencyKey === idempotencyKey) {
        return { ...job };
      }
    }
    return undefined;
  }

  public save(job: BackendJob): void {
    this.jobs.set(job.id, job);
    this.db.upsertJob(job);
  }

  public saveAll(jobs: BackendJob[]): void {
    if (jobs.length === 0) return;
    for (const job of jobs) {
      this.jobs.set(job.id, job);
    }
    this.db.upsertJobs(jobs);
  }

  public delete(id: string): boolean {
    const existed = this.jobs.delete(id);
    if (existed) {
      this.db.deleteJob(id);
    }
    return existed;
  }

  public count(): number {
    return this.jobs.size;
  }

  public flush(): void {
    this.db.upsertJobs(Array.from(this.jobs.values()));
    this.db.flush();
  }
}
