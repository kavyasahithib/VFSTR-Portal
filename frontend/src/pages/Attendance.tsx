import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Search, Calendar, Check, X, FileSpreadsheet, Users } from 'lucide-react';

interface AttendanceRecord {
  student_id: number;
  reg_no: string;
  name: string;
  department: string;
  section: string;
  roll_no: string;
  status: 'Present' | 'Absent' | null;
}

interface AttendanceResponse {
  date: string;
  hasBeenTaken: boolean;
  records: AttendanceRecord[];
}

export default function Attendance() {
  const getTodayDateString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  const [date, setDate] = useState(getTodayDateString());
  const [subject, setSubject] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [hasBeenTaken, setHasBeenTaken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Submit Confirmation Drawer Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Post-submit success screen
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastSubmittedTimestamp, setLastSubmittedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendanceForDate();
  }, [date]);

  const fetchAttendanceForDate = async () => {
    try {
      setLoading(true);
      setSubmitSuccess(false);
      const res = await api.get<AttendanceResponse>(`/attendance/date?date=${date}`);
      
      // Default all statuses to 'Absent' on load for fresh attendance sheets
      const initializedRecords = res.records.map((rec) => ({
        ...rec,
        status: 'Absent' as const
      }));

      setRecords(initializedRecords);
      setHasBeenTaken(res.hasBeenTaken);
    } catch (err) {
      console.error('Fetch attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (studentId: number) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.student_id === studentId) {
          const nextStatus = rec.status === 'Present' ? 'Absent' : 'Present';
          return { ...rec, status: nextStatus };
        }
        return rec;
      })
    );
  };

  const markAll = (status: 'Present' | 'Absent') => {
    setRecords((prev) => prev.map((rec) => ({ ...rec, status })));
  };

  const filteredRecords = records.filter(
    (rec) =>
      rec.name.toLowerCase().includes(search.toLowerCase()) ||
      rec.reg_no.includes(search) ||
      rec.roll_no.includes(search)
  );

  const presentCount = records.filter((r) => r.status === 'Present').length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;
  const totalCount = records.length;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        date,
        subject: subject.trim(),
        records: records.map((r) => ({
          student_id: r.student_id,
          status: r.status
        }))
      };
      const res = await api.post<{ timestamp: string }>('/attendance', payload);
      setLastSubmittedTimestamp(res.timestamp);
      setHasBeenTaken(true);
      setShowConfirmModal(false);
      setSubmitSuccess(true);
    } catch (err) {
      alert('Error submitting attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const param = lastSubmittedTimestamp || date;
      const cleanParam = param.replace(/[: ]/g, '_');
      await api.downloadExcel(param, `Attendance_${cleanParam}.xlsx`);
    } catch (err) {
      alert('Failed to generate Excel report.');
    }
  };



  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      
      {/* Top Controller Panel */}
      <div className="glass-panel rounded-3xl p-5 border border-white/60 dark-theme:border-slate-800/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Date Selector */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark-theme:bg-blue-950/40 text-blue-600 dark-theme:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar size={18} />
          </div>
          <div className="flex-1 md:flex-none">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark-theme:text-white focus:outline-none text-sm md:text-base cursor-pointer"
            />
          </div>
        </div>

        {/* Subject Input */}
        <div className="relative w-full md:w-60">
          <input
            type="text"
            placeholder="Enter Subject Name (required)*"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-amber-500/40 dark-theme:border-amber-500/25 bg-amber-50/5 dark-theme:bg-amber-950/5 text-slate-900 dark-theme:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-xs font-semibold"
          />
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-60">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search student or roll no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark-theme:border-slate-800 bg-white/50 dark-theme:bg-slate-900/50 text-slate-900 dark-theme:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
          />
        </div>

      </div>

      {/* Roster Controls & Info Banner */}
      <div className="flex justify-between items-center px-2">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Student Roster ({filteredRecords.length} shown)
          </span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${hasBeenTaken ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span className="text-[11px] font-medium text-slate-500">
              {hasBeenTaken ? 'Attendance Marked for this date' : 'Not marked yet (Everyone defaults to Absent)'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => markAll('Present')}
            className="text-[11px] font-semibold text-blue-600 dark-theme:text-blue-400 hover:underline"
          >
            Mark All Present
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => markAll('Absent')}
            className="text-[11px] font-semibold text-rose-600 dark-theme:text-rose-400 hover:underline"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Loading student list...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 border border-white/60 dark-theme:border-slate-800/80 text-center">
          <Users size={32} className="mx-auto text-slate-300 dark-theme:text-slate-700 mb-2" />
          <p className="text-sm font-semibold text-slate-500">No students found matching filters.</p>
        </div>
      ) : (
        /* Roster Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredRecords.map((record) => {
            const isPresent = record.status === 'Present';
            return (
              <button
                key={record.student_id}
                onClick={() => toggleStatus(record.student_id)}
                className={`text-left w-full p-4 rounded-2xl border transition-all duration-200 select-none flex items-center justify-between group active:scale-[0.98] ${
                  isPresent
                    ? 'bg-emerald-50/40 dark-theme:bg-emerald-950/10 border-emerald-200/60 dark-theme:border-emerald-900/30 text-slate-800 dark-theme:text-slate-100 shadow-sm shadow-emerald-500/5'
                    : 'bg-rose-50/50 dark-theme:bg-rose-950/20 border-rose-200/60 dark-theme:border-rose-900/30 text-slate-800 dark-theme:text-slate-100 shadow-sm shadow-rose-500/5'
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Status Indicator */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 ${
                      isPresent
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {isPresent ? <Check size={20} /> : <X size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark-theme:text-slate-500 uppercase">
                        Roll {record.roll_no}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-semibold text-slate-400 dark-theme:text-slate-500">
                        {record.name}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm tracking-tight truncate mt-0.5">
                      {record.reg_no}
                    </h4>
                  </div>
                </div>

                {/* Status Pill */}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    isPresent
                      ? 'bg-emerald-100/60 dark-theme:bg-emerald-900/30 text-emerald-700 dark-theme:text-emerald-400'
                      : 'bg-rose-100/60 dark-theme:bg-rose-900/30 text-rose-700 dark-theme:text-rose-400'
                  }`}
                >
                  {record.status}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Drawer for Action */}
      {!loading && filteredRecords.length > 0 && !submitSuccess && (
        <div className="fixed bottom-4 left-4 right-4 md:left-64 md:right-8 z-30 animate-fade-in">
          <div className="glass-panel rounded-2xl p-4 border border-white/60 dark-theme:border-slate-800/80 shadow-2xl flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Today's Summary</span>
                <span className="text-xs text-slate-500 dark-theme:text-slate-300">
                  Date: <strong className="font-semibold text-slate-700 dark-theme:text-slate-200">{date}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="bg-emerald-100/60 dark-theme:bg-emerald-950/40 text-emerald-700 dark-theme:text-emerald-400 px-3 py-1 rounded-xl font-bold">
                  P: {presentCount}
                </span>
                <span className="bg-rose-100/60 dark-theme:bg-rose-950/40 text-rose-700 dark-theme:text-rose-400 px-3 py-1 rounded-xl font-bold">
                  A: {absentCount}
                </span>
              </div>
            </div>
            {subject.trim() === '' && (
              <span className="text-[10px] text-amber-600 dark-theme:text-amber-400 font-bold animate-pulse hidden lg:inline">
                * Please enter subject name at the top
              </span>
            )}
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={subject.trim() === ''}
              className={`font-bold px-6 py-2.5 rounded-xl transition-all shadow-md text-xs ${
                subject.trim() === ''
                  ? 'bg-slate-200 dark-theme:bg-slate-800 text-slate-500 dark-theme:text-slate-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-blue-500/20'
              }`}
            >
              Submit Attendance
            </button>
          </div>
        </div>
      )}


      {/* Confirm Drawer / Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark-theme:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark-theme:border-slate-800 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 dark-theme:text-white mb-2">Confirm Roll Call Entry</h3>
            <p className="text-xs text-slate-500 dark-theme:text-slate-400 mb-5 leading-relaxed">
              You are saving attendance for <strong className="text-slate-800 dark-theme:text-slate-200">{subject}</strong> on <strong className="text-slate-800 dark-theme:text-slate-200">{date}</strong>. Double check the counts before confirmation:
            </p>

            <div className="space-y-3 bg-slate-50 dark-theme:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark-theme:border-slate-900 mb-6">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">Present Count</span>
                <span className="text-emerald-600 dark-theme:text-emerald-400 text-sm font-bold">{presentCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">Absent Count</span>
                <span className="text-rose-600 dark-theme:text-rose-400 text-sm font-bold">{absentCount}</span>
              </div>
              <div className="border-t border-slate-200/50 dark-theme:border-slate-800/50 pt-2 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-700 dark-theme:text-slate-300">Total Students</span>
                <span className="text-slate-800 dark-theme:text-white">{totalCount}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 border border-slate-200 dark-theme:border-slate-800 hover:bg-slate-50 dark-theme:hover:bg-slate-900 text-slate-600 dark-theme:text-slate-400 font-semibold py-2.5 rounded-xl text-xs transition-all"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center shadow-lg shadow-blue-500/15"
                disabled={submitting}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Confirm & Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Submit Success Popup Modal (Centered Overlay) */}
      {submitSuccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark-theme:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark-theme:border-slate-800 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <Check size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark-theme:text-white">Attendance Saved!</h3>
            <p className="text-xs text-slate-500 dark-theme:text-slate-400 mt-2 leading-relaxed">
              Successfully logged {records.length} records.
              <br />
              Present: <strong className="text-emerald-600 font-semibold">{presentCount}</strong> | Absent: <strong className="text-rose-600 font-semibold">{absentCount}</strong>
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleDownloadExcel}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center space-x-2 text-xs shadow-md shadow-emerald-500/10"
              >
                <FileSpreadsheet size={16} />
                <span>Download Excel Report</span>
              </button>
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setSubject('');
                  fetchAttendanceForDate();
                }}
                className="border border-slate-200 dark-theme:border-slate-800 hover:bg-slate-50 dark-theme:hover:bg-slate-900 text-slate-600 dark-theme:text-slate-400 font-semibold py-3 rounded-xl transition-all text-xs"
              >
                Continue / Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
