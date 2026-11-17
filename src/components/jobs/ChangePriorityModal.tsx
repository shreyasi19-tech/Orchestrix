import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { InfraJob } from '../../types/orchestration';
import { jobsStore } from '../../services/jobsStore';

interface ChangePriorityModalProps {
  job: InfraJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePriorityModal: React.FC<ChangePriorityModalProps> = ({ 
  job, 
  isOpen, 
  onClose 
}) => {
  const [selectedPriority, setSelectedPriority] = useState<InfraJob['priority']>(job?.priority || 'High');

  if (!isOpen || !job) return null;

  const handleSave = () => {
    jobsStore.changePriority(job.id, selectedPriority);
    onClose();
  };

  const options: { value: InfraJob['priority']; label: string; desc: string; score: number }[] = [
    { value: 'Critical', label: 'Critical (P0)', desc: 'Preempts lower priority jobs, immediate dispatch lease', score: 100 },
    { value: 'High', label: 'High (P1)', desc: 'Prioritized before normal batch queues', score: 75 },
    { value: 'Medium', label: 'Medium (P2)', desc: 'Standard production pipeline throughput', score: 50 },
    { value: 'Low', label: 'Low (P3)', desc: 'Background batch jobs, gains priority via aging (+1.5/s)', score: 25 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-priority-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#EAE1D4] rounded-2xl w-full max-w-md shadow-2xl p-5 font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE1D4] mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#874924]" />
            <h2 id="change-priority-modal-title" className="font-bold text-sm text-[#241812] font-sans">
              Adjust Queue Priority
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close priority modal"
            className="p-1.5 rounded-md text-[#5D5044] hover:text-[#241812] hover:bg-[#FAF6F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[#5D5044] font-sans mb-3">
          Updating priority for <span className="text-[#874924] font-mono font-semibold">{job.id}</span>:
        </p>

        <div className="space-y-2 mb-5">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selectedPriority === opt.value}
              onClick={() => setSelectedPriority(opt.value)}
              className={`w-full text-left p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                selectedPriority === opt.value
                  ? 'bg-[#FAF4ED] border-[#874924] text-[#241812] shadow-2xs ring-1 ring-[#874924]/20'
                  : 'bg-[#FAF6F0] border-[#EAE1D4] text-[#5D5044] hover:border-[#C8BCAC]'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-2 text-[#241812]">
                  <span>{opt.label}</span>
                  <span className="text-[10px] text-[#5D5044]">({opt.score} pts)</span>
                </div>
                <div className="text-[10px] text-[#5D5044] mt-0.5 font-sans">{opt.desc}</div>
              </div>

              {selectedPriority === opt.value && (
                <Check className="w-4 h-4 text-[#874924] shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE1D4]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-white border border-[#EAE1D4] text-[#5D5044] hover:text-[#241812] hover:bg-[#FAF6F0] cursor-pointer font-sans"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-md bg-[#874924] hover:bg-[#9E572B] active:scale-[0.98] text-white font-medium font-sans shadow-xs cursor-pointer"
          >
            Update Priority
          </button>
        </div>
      </div>
    </div>
  );
};
