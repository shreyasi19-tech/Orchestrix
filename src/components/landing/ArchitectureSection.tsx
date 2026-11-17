import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  Layers, 
  Terminal, 
  Copy, 
  Check, 
  GitBranch, 
  Cpu, 
  HardDrive 
} from 'lucide-react';

export const ArchitectureSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diagram' | 'docker' | 'cicd' | 'worker'>('diagram');
  const [copied, setCopied] = useState<boolean>(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dockerComposeContent = `version: '3.8'

services:
  # 1. API Gateway (FastAPI)
  api-gateway:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    ports:
      - "8000:8000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://orchestrix:secret@postgres:5432/orchestrix_db
    depends_on:
      - redis
      - postgres
    restart: always

  # 2. Redis Priority Queues & PubSub
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --save 60 1
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

  # 3. PostgreSQL Database (State Machine & History)
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: orchestrix
      POSTGRES_PASSWORD: secret_password
      POSTGRES_DB: orchestrix_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  # 4. Central Smart Scheduler Service
  scheduler:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: python -m app.scheduler.engine
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://orchestrix:secret@postgres:5432/orchestrix_db
      - AGING_RATE_PER_SEC=1.5
    depends_on:
      - redis
      - postgres
    restart: always

  # 5. Specialized Worker 01: Text & LLM
  worker-text:
    build:
      context: ./workers
    command: python worker.py --type text_llm --concurrency 4
    environment:
      - WORKER_ID=worker-01
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    restart: on-failure

  # 6. Specialized Worker 02: Document OCR & PDF
  worker-documents:
    build:
      context: ./workers
    command: python worker.py --type documents --concurrency 4
    environment:
      - WORKER_ID=worker-02
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    restart: on-failure

  # 7. Specialized Worker 03: Data Processing (Pandas/Polars)
  worker-data:
    build:
      context: ./workers
    command: python worker.py --type data_processing --concurrency 8
    environment:
      - WORKER_ID=worker-03
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    restart: on-failure

  # 8. Specialized Worker 04: Image & Vision
  worker-images:
    build:
      context: ./workers
    command: python worker.py --type image_analysis --concurrency 2
    environment:
      - WORKER_ID=worker-04
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    restart: on-failure

volumes:
  redis_data:
  postgres_data:`;

  const cicdWorkflowContent = `name: Orchestrix CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-and-lint:
    name: Lint & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Dependencies
        run: |
          pip install --upgrade pip
          pip install -r requirements.txt pytest flake8 black

      - name: Run Code Linter
        run: |
          flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
          black --check .

      - name: Execute Pytest Suite (Scheduler, Failure recovery, DLQ)
        env:
          TEST_MODE: mock
        run: |
          pytest tests/test_scheduler.py tests/test_failure_recovery.py -v

  build-and-push:
    name: Build & Push Docker Images
    needs: test-and-lint
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Gateway & Scheduler Images
        run: |
          docker build -t orchestrix-api:latest ./backend
          docker build -t orchestrix-worker:latest ./workers

      - name: Verification Smoke Test
        run: |
          docker-compose -f docker-compose.test.yml up --exit-code-from test-runner`;

  const workerPyContent = `"""
Specialized Worker Process (Python)
Implements:
1. Periodic heartbeat leases with Redis TTL
2. Domain task execution
3. Safe shutdown signal trapping (SIGTERM / SIGINT)
"""
import time
import os
import signal
import sys
import redis
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
WORKER_ID = os.getenv("WORKER_ID", "worker-01")
WORKER_TYPE = os.getenv("WORKER_TYPE", "documents")

r = redis.Redis.from_url(REDIS_URL)

def emit_heartbeat():
    """Send heartbeat key with 5-second expiration lease"""
    heartbeat_key = f"heartbeat:{WORKER_ID}"
    r.set(heartbeat_key, json.dumps({
        "worker_id": WORKER_ID,
        "type": WORKER_TYPE,
        "timestamp": time.time(),
        "status": "healthy"
    }), ex=5)

def process_job(job_data):
    logger.info(f"Processing job {job_data['id']} of type {job_data['task_type']}")
    # Domain specific work execution...
    time.sleep(1.8)
    return {"status": "SUCCESS", "records_processed": 1420}

def main_loop():
    logger.info(f"Starting {WORKER_ID} specialized in {WORKER_TYPE}")
    while True:
        emit_heartbeat()
        
        # Pop from specialized priority queue
        queue_key = f"queue:{WORKER_TYPE}"
        job_raw = r.rpop(queue_key)
        
        if job_raw:
            job = json.loads(job_raw)
            try:
                # Mark as running in Postgres / Redis
                r.set(f"job:active:{job['id']}", WORKER_ID, ex=60)
                result = process_job(job)
                r.publish("events:job_completed", json.dumps({"job_id": job['id'], "result": result}))
            except Exception as e:
                logger.error(f"Execution error: {e}")
                r.publish("events:job_failed", json.dumps({"job_id": job['id'], "error": str(e)}))
        else:
            time.sleep(0.5)

if __name__ == "__main__":
    main_loop()`;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-[#E8DFD3]">
      <div className="max-w-2xl mb-10 sm:mb-12">
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#874924] font-medium block mb-2">
          Phase 8 · System Architecture &amp; DevOps
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#292019] tracking-tight mb-4">
          Production-grade distributed system.
        </h2>
        <p className="text-sm sm:text-base text-[#5D5044] leading-relaxed">
          Built with an enterprise API gateway, Redis sorted-set priority queues, specialized asynchronous workers, and a persistent state machine.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#E8DEC8] pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('diagram')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'diagram'
              ? 'bg-[#874924] text-white shadow-xs'
              : 'text-[#5D5044] hover:bg-[#F2E8DC]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Distributed Topology</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('docker')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'docker'
              ? 'bg-[#874924] text-white shadow-xs'
              : 'text-[#5D5044] hover:bg-[#F2E8DC]'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>docker-compose.yml</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cicd')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'cicd'
              ? 'bg-[#874924] text-white shadow-xs'
              : 'text-[#5D5044] hover:bg-[#F2E8DC]'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>GitHub Actions CI/CD</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('worker')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'worker'
              ? 'bg-[#874924] text-white shadow-xs'
              : 'text-[#5D5044] hover:bg-[#F2E8DC]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>worker.py (Heartbeat Lease)</span>
        </button>
      </div>

      {/* Tab 1: Interactive System Topology */}
      {activeTab === 'diagram' && (
        <div className="bg-[#FCFAF6] border border-[#E9DFD2] rounded-3xl p-4 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 relative">
            {/* Step 1: Ingestion & API */}
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7DC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#874924] flex items-center justify-center mb-3">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#292019] mb-1 font-sans">
                  FastAPI Gateway
                </h3>
                <p className="text-xs text-[#5D5044] leading-relaxed mb-4">
                  Accepts job requests with task type, priority, and payload. Validates JSON schemas and assigns UUID.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#874924] bg-[#FAF3EB] p-2 rounded-lg">
                POST /api/v1/jobs
              </div>
            </div>

            {/* Step 2: Queue & Redis */}
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7DC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center mb-3">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#292019] mb-1 font-sans">
                  Redis Priority Queues
                </h3>
                <p className="text-xs text-[#5D5044] leading-relaxed mb-4">
                  ZSET sorted sets by effective priority. Employs background priority aging worker to re-score items every 1s.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#B45309] bg-[#FFFBEB] p-2 rounded-lg">
                ZADD queue:active [score]
              </div>
            </div>

            {/* Step 3: Smart Scheduler */}
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7DC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#874924] flex items-center justify-center mb-3">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#292019] mb-1 font-sans">
                  Smart Scheduler
                </h3>
                <p className="text-xs text-[#5D5044] leading-relaxed mb-4">
                  Computes weighted scoring function per worker candidate. Tracks 3-second heartbeat leases.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#874924] bg-[#FAF3EB] p-2 rounded-lg">
                Score(w, t) Evaluation
              </div>
            </div>

            {/* Step 4: Workers & Postgres */}
            <div className="bg-white rounded-2xl p-5 border border-[#EFE7DC] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mb-3">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#292019] mb-1 font-sans">
                  Workers &amp; Postgres
                </h3>
                <p className="text-xs text-[#5D5044] leading-relaxed mb-4">
                  Specialized workers execute workloads and stream results. PostgreSQL archives complete audit lifecycle.
                </p>
              </div>
              <div className="text-[11px] font-mono text-[#6D28D9] bg-[#F5F3FF] p-2 rounded-lg">
                ACID State &amp; Dead Letter
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Docker Compose */}
      {activeTab === 'docker' && (
        <div className="relative bg-[#201A15] text-[#F3EDE5] rounded-3xl p-4 sm:p-6 font-mono text-xs overflow-hidden shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3D332A]">
            <span className="text-[#DFB286] font-medium">docker-compose.yml</span>
            <button
              type="button"
              onClick={() => copyToClipboard(dockerComposeContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#382E25] hover:bg-[#4E3F32] text-xs text-[#E5D7C7] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Config'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto max-h-[460px] text-[11px] leading-relaxed">
            {dockerComposeContent}
          </pre>
        </div>
      )}

      {/* Tab 3: CI/CD Workflow */}
      {activeTab === 'cicd' && (
        <div className="relative bg-[#201A15] text-[#F3EDE5] rounded-3xl p-4 sm:p-6 font-mono text-xs overflow-hidden shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3D332A]">
            <span className="text-[#DFB286] font-medium">.github/workflows/ci-cd.yml</span>
            <button
              type="button"
              onClick={() => copyToClipboard(cicdWorkflowContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#382E25] hover:bg-[#4E3F32] text-xs text-[#E5D7C7] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Config'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto max-h-[460px] text-[11px] leading-relaxed">
            {cicdWorkflowContent}
          </pre>
        </div>
      )}

      {/* Tab 4: Worker Python */}
      {activeTab === 'worker' && (
        <div className="relative bg-[#201A15] text-[#F3EDE5] rounded-3xl p-4 sm:p-6 font-mono text-xs overflow-hidden shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3D332A]">
            <span className="text-[#DFB286] font-medium">workers/worker.py</span>
            <button
              type="button"
              onClick={() => copyToClipboard(workerPyContent)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#382E25] hover:bg-[#4E3F32] text-xs text-[#E5D7C7] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto max-h-[460px] text-[11px] leading-relaxed">
            {workerPyContent}
          </pre>
        </div>
      )}
    </section>
  );
};
