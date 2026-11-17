import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { User, UserRole, useAuth } from '../../context/AuthContext';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.users.list();
      setUsers(res.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load operator accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setUpdatingId(userId);
    setError(null);
    setNotice(null);
    try {
      const res = await api.users.updateRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      setNotice(res.message || 'Role updated.');
      if (currentUser?.id === userId) {
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-[#EAE1D4] rounded-2xl shadow-2xl overflow-hidden font-sans text-[#241812]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-4 border-b border-[#EAE1D4] bg-[#FAF6F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] text-[#C2410C] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] tracking-wider uppercase text-[#874924] block font-semibold">
                ADMIN RBAC CONSOLE
              </span>
              <h2 id="role-modal-title" className="font-bold text-sm text-[#241812]">
                Manage Operator Roles
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadUsers}
              disabled={isLoading}
              aria-label="Refresh operator directory"
              className="p-1.5 rounded-md text-[#5D5044] hover:text-[#241812] hover:bg-white transition-colors cursor-pointer"
              title="Refresh users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close role management modal"
              className="p-1.5 rounded-md text-[#5D5044] hover:text-[#241812] hover:bg-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-mono flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {isLoading && users.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#5D5044]">
              Loading operator directory...
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#5D5044]">
              No registered operators found.
            </div>
          ) : (
            <div className="divide-y divide-[#EAE1D4] border border-[#EAE1D4] rounded-xl overflow-hidden">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 bg-white hover:bg-[#FAF6F0]/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#241812] truncate flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {currentUser?.id === u.id && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FAF6F0] border border-[#EAE1D4] text-[#5D5044]">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[#5D5044] truncate">{u.email}</div>
                  </div>

                  <select
                    aria-label={`Role for ${u.name}`}
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="bg-[#FAF6F0] border border-[#EAE1D4] focus:border-[#874924] rounded-lg py-1.5 px-2.5 text-xs font-mono text-[#241812] outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="DevOps / SRE">DevOps / SRE</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
