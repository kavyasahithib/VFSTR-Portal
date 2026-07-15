import React, { useState } from 'react';
import { api } from '../utils/api';
import { Lock, Eye, EyeOff, CheckCircle, Database, Moon, Sun, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Settings({ isDark, onToggleTheme }: SettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      
      {/* Theme Settings Card */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 dark-theme:border-slate-800/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 dark-theme:text-white mb-4">Display & Aesthetics</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark-theme:text-slate-200">
              System Theme Toggle
            </span>
            <span className="text-[11px] text-slate-400">
              Toggle between modern White and Premium Dark mode UI designs
            </span>
          </div>
          <button
            onClick={onToggleTheme}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark-theme:bg-slate-800 dark-theme:hover:bg-slate-700 text-slate-800 dark-theme:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            {isDark ? (
              <>
                <Sun size={15} className="text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={15} className="text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 dark-theme:border-slate-800/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 dark-theme:text-white mb-4">Update CR Password</h3>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark-theme:bg-rose-950/30 text-rose-600 dark-theme:text-rose-400 text-xs font-medium border border-rose-100 dark-theme:border-rose-900/50">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark-theme:bg-emerald-950/30 text-emerald-600 dark-theme:text-emerald-400 text-xs font-medium border border-emerald-100 dark-theme:border-emerald-900/50 flex items-center space-x-1.5">
            <CheckCircle size={14} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          
          {/* Current Password */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retype new password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all shadow-md shadow-blue-500/15 flex items-center justify-center space-x-1.5"
          >
            <Lock size={13} />
            <span>Update Password</span>
          </button>

        </form>
      </div>

      {/* Database & Environment Info */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 dark-theme:border-slate-800/80 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-800 dark-theme:text-white flex items-center space-x-1.5">
          <Database size={18} className="text-blue-500" />
          <span>Database & Environment Details</span>
        </h3>
        
        <div className="text-xs text-slate-500 dark-theme:text-slate-400 space-y-2">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark-theme:border-slate-850">
            <span>Database Engine</span>
            <strong className="font-semibold text-slate-700 dark-theme:text-slate-200">SQLite3 (local file)</strong>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-slate-200/50 dark-theme:border-slate-850">
            <span>Active Server Port</span>
            <strong className="font-semibold text-slate-700 dark-theme:text-slate-200">5000</strong>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span>Connection Status</span>
            <span className="flex items-center text-emerald-600 dark-theme:text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
              Online
            </span>
          </div>
        </div>

        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start space-x-3 mt-4">
          <AlertTriangle className="text-amber-500 shrink-0" size={16} />
          <div className="text-[11px] text-slate-500 dark-theme:text-slate-400 leading-relaxed">
            <strong>System Backups Note:</strong> The local development database is backed up in a `database.sqlite` file in the parent folder. For cloud deployments, configure your Supabase variables to swap to PostgreSQL.
          </div>
        </div>
      </div>

    </div>
  );
}
