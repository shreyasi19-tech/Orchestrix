import React, { useState } from 'react';
import { X, Sparkles, Send, Cpu, Layers, HardDrive, Clock, ArrowRight } from 'lucide-react';
import { InfraJobType } from '../../types/orchestration';
import { jobsStore } from '../../services/jobsStore';

interface SubmitJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (jobId: string) => void;
}

export const SubmitJobModal: React.FC<SubmitJobModalProps> = ({ 
  isOpen, 
  onClose,
  onJobCreated 
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<InfraJobType>('Computer Vision');
  const [inputSource, setInputSource] = useState('s3://imagery-pipeline/incoming/batch_4910');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [cpuCores, setCpuCores] = useState('8 vCPU');
  const [gpuRequirement, setGpuRequirement] = useState('NVIDIA A100-SXM4-80GB');
  const [memoryRequirement, setMemoryRequirement] = useState('32 GiB');
  const [workerConstraint, setWorkerConstraint] = useState('Any Specialist Worker');
  const [maxRetries, setMaxRetries] = useState(3);
  const [timeout, setTimeoutVal] = useState('1h 00m');
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'cron'>('immediate');
  const [cronExpression, setCronExpression] = useState('0 */2 * * *');

  if (!isOpen) return null;

  const presets: { label: string; name: string; type: InfraJobType; input: string; priority: 'Critical' | 'High' | 'Medium' | 'Low'; gpu: string; cpu: string; mem: string }[] = [
    {
      label: 'Autonomous Vision Defect',
      name: 'High-Speed Conveyor Defect Inspection',
      type: 'Computer Vision',
      input: 's3://factory-vision/cameras/cam_04_feed.mp4',
      priority: 'High',
      gpu: 'NVIDIA RTX 6000 Ada',
      cpu: '8 vCPU',
      mem: '32 GiB',
    },
    {
      label: 'LLM Fine-Tuning LoRA',
      name: 'Llama-3-70B QLoRA Financial Adaptation',
      type: 'ML Training',
      input: 's3://training-lake/finance/filings_tokenized.bin',
      priority: 'Critical',
      gpu: '2x NVIDIA H100 80GB',
      cpu: '16 vCPU',
      mem: '128 GiB',
    },
    {
      label: 'Clickstream Rollup',
      name: 'Real-Time User Clickstream Deduplication',
      type: 'Data Processing',
      input: 'kafka://cluster.prod.internal:9092/events.clickstream',
      priority: 'Medium',
      gpu: 'None',
      cpu: '16 vCPU',
      mem: '64 GiB',
    },
    {
      label: 'Vector Embeddings RAG',
      name: 'Enterprise Knowledge Base Embeddings',
      type: 'AI Inference',
      input: 's3://kb-archive/notion_exports_q3.jsonl',
      priority: 'High',
      gpu: 'NVIDIA T4 16GB',
      cpu: '4 vCPU',
      mem: '16 GiB',
    }
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setName(p.name);
    setType(p.type);
    setInputSource(p.input);
    setPriority(p.priority);
    setGpuRequirement(p.gpu);
    setCpuCores(p.cpu);
    setMemoryRequirement(p.mem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await jobsStore.submitJob({
        name: name || `${type} Workload`,
        type,
        dataSource: inputSource,
        priority,
        cpuCores,
        gpuAccelerator: gpuRequirement,
        ramCapacity: memoryRequirement,
        workerConstraints: workerConstraint,
      });

      onJobCreated?.(created?.id);
      onClose();
    } catch (err) {
      console.warn('Submit error:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-job-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#EAE1D4] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#EAE1D4] bg-[#FAF6F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAF2EB] border border-[#E8D4C1] flex items-center justify-center text-[#874924]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 id="submit-job-modal-title" className="text-sm font-bold text-[#241812] font-sans">
                Submit AI Workload
              </h2>
              <p className="text-[11px] text-[#5D5044] font-mono">
                Define execution constraints, resource leases, and priority tier
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close submit workload modal"
            className="p-1.5 rounded-md text-[#5D5044] hover:text-[#241812] hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs font-mono">
          {/* Quick Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#5D5044] mb-2 font-sans font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#874924]" />
              <span>Production Workload Presets:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 rounded-md bg-[#FAF6F0] border border-[#EAE1D4] hover:border-[#874924] text-[11px] text-[#5D5044] hover:text-[#874924] transition-colors cursor-pointer font-medium"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Job Name */}
          <div>
            <label htmlFor="submit-job-name" className="block text-[11px] text-[#5D5044] mb-1 font-sans font-medium">
              Job Name / Identifier:
            </label>
            <input
              id="submit-job-name"
              type="text"
              required
              placeholder="e.g. YOLOv10 Satellite Defect Detection"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white border border-[#EAE1D4] text-[#241812] focus:outline-none focus:border-[#874924] text-xs font-mono shadow-2xs"
            />
          </div>

          {/* Job Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="submit-job-type" className="block text-[11px] text-[#5D5044] mb-1 font-sans font-medium">
                Job Type:
              </label>
              <select
                id="submit-job-type"
                value={type}
                onChange={(e) => setType(e.target.value as InfraJobType)}
                className="w-full px-3 py-2 rounded-md bg-white border border-[#EAE1D4] text-[#241812] focus:outline-none focus:border-[#874924] text-xs font-mono shadow-2xs"
              >
                <option value="Computer Vision">Computer Vision</option>
                <option value="ML Training">ML Training</option>
                <option value="Data Processing">Data Processing</option>
                <option value="AI Inference">AI Inference</option>
                <option value="NLP / LLM">NLP / LLM</option>
                <option value="Document OCR">Document OCR</option>
              </select>
            </div>

            <div>
              <label htmlFor="submit-job-priority" className="block text-[11px] text-[#5D5044] mb-1 font-sans font-medium">
                Priority Tier:
              </label>
              <select
                id="submit-job-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-md bg-white border border-[#EAE1D4] text-[#241812] focus:outline-none focus:border-[#874924] text-xs font-mono shadow-2xs"
              >
                <option value="Critical">Critical (P0 — Base 100 pts)</option>
                <option value="High">High (P1 — Base 75 pts)</option>
                <option value="Medium">Medium (P2 — Base 50 pts)</option>
                <option value="Low">Low (P3 — Base 25 pts + Aging)</option>
              </select>
            </div>
          </div>

          {/* Input / Data Source */}
          <div>
            <label htmlFor="submit-job-source" className="block text-[11px] text-[#5D5044] mb-1 font-sans font-medium">
              Input / Data Source (S3, Kafka, or Volume):
            </label>
            <input
              id="submit-job-source"
              type="text"
              required
              value={inputSource}
              onChange={(e) => setInputSource(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white border border-[#EAE1D4] text-[#241812] focus:outline-none focus:border-[#874924] text-xs font-mono shadow-2xs"
            />
          </div>

          {/* Resource Requirements Section */}
          <div className="p-3.5 bg-[#FAF6F0] rounded-xl border border-[#EAE1D4] space-y-3">
            <span className="text-[11px] font-semibold text-[#874924] font-sans flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Resource Requirements & Hardware Leases</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="submit-job-cpu" className="block text-[10px] text-[#5D5044] mb-1">CPU Allocation:</label>
                <select
                  id="submit-job-cpu"
                  value={cpuCores}
                  onChange={(e) => setCpuCores(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#EAE1D4] text-[#241812] text-[11px] shadow-2xs"
                >
                  <option value="4 vCPU">4 vCPU</option>
                  <option value="8 vCPU">8 vCPU</option>
                  <option value="16 vCPU">16 vCPU</option>
                  <option value="32 vCPU">32 vCPU</option>
                </select>
              </div>

              <div>
                <label htmlFor="submit-job-gpu" className="block text-[10px] text-[#5D5044] mb-1">GPU Accelerator:</label>
                <select
                  id="submit-job-gpu"
                  value={gpuRequirement}
                  onChange={(e) => setGpuRequirement(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#EAE1D4] text-[#241812] text-[11px] shadow-2xs"
                >
                  <option value="None">None (CPU Only)</option>
                  <option value="NVIDIA T4 16GB">NVIDIA T4 16GB</option>
                  <option value="NVIDIA RTX 6000 Ada">NVIDIA RTX 6000 Ada</option>
                  <option value="NVIDIA A100-SXM4-80GB">NVIDIA A100 80GB</option>
                  <option value="2x NVIDIA H100 80GB">2x NVIDIA H100 80GB</option>
                </select>
              </div>

              <div>
                <label htmlFor="submit-job-ram" className="block text-[10px] text-[#5D5044] mb-1">RAM Capacity:</label>
                <select
                  id="submit-job-ram"
                  value={memoryRequirement}
                  onChange={(e) => setMemoryRequirement(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-[#EAE1D4] text-[#241812] text-[11px] shadow-2xs"
                >
                  <option value="16 GiB">16 GiB</option>
                  <option value="32 GiB">32 GiB</option>
                  <option value="64 GiB">64 GiB</option>
                  <option value="128 GiB">128 GiB</option>
                </select>
              </div>
            </div>
          </div>

          {/* Worker Constraints & Retry Policy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="submit-job-constraint" className="block text-[11px] text-[#5D5044] mb-1 font-sans font-medium">
                Worker Constraints:
              </label>
              <select
                id="submit-job-constraint"
                value={workerConstraint}
                onChange={(e) => setWorkerConstraint(e.target.value)}
                className="w-full px-2.5 py-2 rounded-md bg-white border border-[#EAE1D4] text-[#241812] text-xs shadow-2xs"
              >
                <option value="Any Specialist Worker">Auto-Schedule (Smart Routing)</option>
                <option value="Worker-01 (Text / LLM)">Worker-01 (Text / LLM)</option>
                <option value="Worker-02 (Documents / OCR)">Worker-02 (Documents / OCR)</option>
                <option value="Worker-03 (Data / Vision)">Worker-03 (Data / Vision)</option>
                <option value="Worker-04 (GPU Vision Cluster)">Worker-04 (GPU Vision Cluster)</option>
                <option value="Worker-07 (High-Memory Node)">Worker-07 (High-Memory Node)</option>
              </select>
            </div>

            <div>
              <label htmlFor="submit-job-retry" className="block text-[11px] text-[#5D5044] mb-1 font-sans font-medium">
                Retry Policy:
              </label>
              <select
                id="submit-job-retry"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-md bg-white border border-[#EAE1D4] text-[#241812] text-xs shadow-2xs"
              >
                <option value={0}>0 (No Retries)</option>
                <option value={1}>1 Retry (Fast Fail)</option>
                <option value={3}>3 Retries (Standard Backoff)</option>
                <option value={5}>5 Retries (Aggressive)</option>
              </select>
            </div>

            <div>
              <label htmlFor="submit-job-timeout" className="block text-[11px] text-[#5D5044] mb-1 font-sans font-medium">
                Timeout SLA:
              </label>
              <select
                id="submit-job-timeout"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                className="w-full px-2.5 py-2 rounded-md bg-white border border-[#EAE1D4] text-[#241812] text-xs shadow-2xs"
              >
                <option value="15m 00s">15 minutes</option>
                <option value="30m 00s">30 minutes</option>
                <option value="1h 00m">1 hour</option>
                <option value="4h 00m">4 hours</option>
                <option value="24h 00m">24 hours</option>
              </select>
            </div>
          </div>

          {/* Schedule Mode */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#FAF6F0] border border-[#EAE1D4]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-[#241812] font-sans font-medium">Execution Dispatch:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[#5D5044] hover:text-[#241812]">
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === 'immediate'}
                  onChange={() => setScheduleMode('immediate')}
                  className="accent-[#874924]"
                />
                <span>Immediate FIFO</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[#5D5044] hover:text-[#241812]">
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === 'cron'}
                  onChange={() => setScheduleMode('cron')}
                  className="accent-[#874924]"
                />
                <span>Cron Interval</span>
              </label>
            </div>

            {scheduleMode === 'cron' && (
              <input
                type="text"
                aria-label="Cron schedule expression"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="*/30 * * * *"
                className="w-28 px-2 py-1 rounded-md bg-white border border-[#EAE1D4] text-[#241812] text-[11px]"
              />
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-[#EAE1D4] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-white hover:bg-[#FAF6F0] text-[#5D5044] hover:text-[#241812] text-xs font-sans transition-colors border border-[#EAE1D4] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-md bg-[#874924] hover:bg-[#9E572B] active:scale-[0.98] text-white text-xs font-sans font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Job</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
