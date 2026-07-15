import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { FileSpreadsheet, Calendar, Search, User, Info } from 'lucide-react';

interface HistoryItem {
  created_at: string;
  date: string;
  subject: string | null;
  present: number;
  absent: number;
  total: number;
}

interface Student {
  id: number;
  name: string;
  reg_no: string;
  roll_no: string;
}

interface StudentStats {
  student: Student;
  stats: {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  };
  logs: Array<{
    date: string;
    status: 'Present' | 'Absent';
  }>;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'history' | 'students'>('history');
  
  // History tab states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  // Student list & single student stats states
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else {
      fetchStudentList();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentStats(selectedStudentId);
    } else {
      setStudentStats(null);
    }
  }, [selectedStudentId]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get<HistoryItem[]>('/attendance/history');
      setHistory(res);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchStudentList = async () => {
    try {
      const res = await api.get<Student[]>('/students');
      setStudentList(res);
    } catch (err) {
      console.error('Fetch student list error:', err);
    }
  };

  const fetchStudentStats = async (id: number) => {
    try {
      setStatsLoading(true);
      const res = await api.get<StudentStats>(`/attendance/student/${id}`);
      setStudentStats(res);
    } catch (err) {
      console.error('Fetch student stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDownloadExcel = async (timestamp: string) => {
    try {
      const cleanTimestamp = timestamp.replace(/[: ]/g, '_');
      await api.downloadExcel(timestamp, `Attendance_${cleanTimestamp}.xlsx`);
    } catch (err) {
      alert('Failed to generate Excel report.');
    }
  };



  const formatTimeOnly = (dtStr: string) => {
    try {
      // Normalize 'T' in ISO formats to a space to split consistently
      const cleanStr = dtStr.replace('T', ' ');
      const [datePart, timePart] = cleanStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      
      // Get the HH:MM:SS part, removing any timezone/fractional suffixes
      const timePartClean = timePart.split('.')[0].split('+')[0].split('Z')[0];
      const [hours, minutes, seconds] = timePartClean.split(':').map(Number);
      
      const dateObj = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '';
    }
  };

  const toggleDateExpand = (groupDate: string) => {
    setExpandedDates((prev) =>
      prev.includes(groupDate)
        ? prev.filter((d) => d !== groupDate)
        : [...prev, groupDate]
    );
  };

  const formatSubjectName = (sub: string | null) => {
    if (!sub) return 'General';
    const trimmed = sub.trim();
    if (!trimmed) return 'General';
    return trimmed
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const filteredStudents = studentList.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.reg_no.includes(studentSearch) ||
      s.roll_no.includes(studentSearch)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Sub tabs header */}
      <div className="flex border-b border-slate-200 dark-theme:border-slate-800">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3.5 px-4 font-bold text-sm border-b-2 transition-colors focus:outline-none ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark-theme:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Attendance Logs History
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3.5 px-4 font-bold text-sm border-b-2 transition-colors focus:outline-none ${
            activeTab === 'students'
              ? 'border-blue-600 text-blue-600 dark-theme:text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Individual Student Stats
        </button>
      </div>

      {/* VIEW: History logs */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyLoading ? (
            <div className="glass-panel rounded-3xl flex flex-col items-center justify-center py-20 space-y-3 border border-white/60 dark-theme:border-slate-800/80 shadow-sm animate-fade-in">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm">Loading attendance logs...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-white/60 dark-theme:border-slate-800/80 shadow-sm animate-fade-in">
              <Calendar size={32} className="mx-auto text-slate-300 dark-theme:text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-500">No attendance data logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {(() => {
                const groupedHistory = history.reduce<Record<string, HistoryItem[]>>((acc, item) => {
                  if (!acc[item.date]) {
                    acc[item.date] = [];
                  }
                  acc[item.date].push(item);
                  return acc;
                }, {});

                return Object.entries(groupedHistory).map(([groupDate, sessions]) => {
                  const isExpanded = expandedDates.includes(groupDate);
                  const [year, month, day] = groupDate.split('-').map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  const formattedGroupDate = dateObj.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short'
                  });

                  return (
                    <div 
                      key={groupDate} 
                      className="glass-panel rounded-2xl border border-white/60 dark-theme:border-slate-800/80 shadow-sm overflow-hidden transition-all"
                    >
                      {/* Date Row Header */}
                      <button
                        onClick={() => toggleDateExpand(groupDate)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/40 dark-theme:hover:bg-slate-900/10 transition-colors focus:outline-none"
                      >
                        <div className="flex items-center space-x-3 text-left">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark-theme:text-blue-400 flex items-center justify-center shrink-0">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark-theme:text-slate-100">
                              {formattedGroupDate}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">
                              {sessions.length} {sessions.length === 1 ? 'Period' : 'Periods'} Recorded
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-lg border border-slate-200 dark-theme:border-slate-800 flex items-center justify-center text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {/* Expandable Session Area */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark-theme:border-slate-800/60 bg-slate-50/30 dark-theme:bg-slate-950/10 px-5 py-3 space-y-3 divide-y divide-slate-100 dark-theme:divide-slate-800/60">
                          {sessions.map((session, idx) => {
                            const rate = Math.round((session.present / session.total) * 100);
                            const sessionTime = formatTimeOnly(session.created_at);
                            return (
                              <div key={session.created_at} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${idx > 0 ? 'pt-3' : ''}`}>
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-800 dark-theme:text-slate-200 text-sm">
                                      {formatSubjectName(session.subject)}
                                    </span>
                                    <span className="text-slate-300 dark-theme:text-slate-700">•</span>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      {sessionTime}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 font-semibold text-[10px]">
                                    <span>Total: {session.total}</span>
                                    <span className="text-emerald-600 dark-theme:text-emerald-400">Present: {session.present}</span>
                                    <span className="text-rose-600 dark-theme:text-rose-400">Absent: {session.absent}</span>
                                    <span className="text-slate-700 dark-theme:text-slate-300 bg-slate-100 dark-theme:bg-slate-800/60 px-1.5 py-0.5 rounded">Rate: {rate}%</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end sm:justify-start">
                                  <button
                                    onClick={() => handleDownloadExcel(session.created_at)}
                                    className="inline-flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark-theme:text-emerald-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                  >
                                    <FileSpreadsheet size={13} />
                                    <span>Excel Report</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Student stats */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Student Selector Sidebar */}
          <div className="glass-card rounded-3xl p-5 border border-white/60 dark-theme:border-slate-800/80 flex flex-col h-[500px]">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Select Student</h3>
            
            {/* Search */}
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search name or reg no..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-white/50 dark-theme:bg-slate-900/50 text-slate-900 dark-theme:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all text-xs flex justify-between items-center ${
                    selectedStudentId === s.id
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-500/10'
                      : 'border-transparent text-slate-700 dark-theme:text-slate-300 hover:bg-slate-50 dark-theme:hover:bg-slate-900/40'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className={`block text-[10px] ${selectedStudentId === s.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      Roll {s.roll_no} • Reg {s.reg_no}
                    </span>
                  </div>
                  <User size={14} className={selectedStudentId === s.id ? 'text-blue-100' : 'text-slate-400'} />
                </button>
              ))}
            </div>
          </div>

          {/* Stats Display Panel */}
          <div className="md:col-span-2 space-y-4">
            {statsLoading ? (
              <div className="glass-card rounded-3xl p-12 border border-white/60 dark-theme:border-slate-800/80 flex flex-col items-center justify-center h-full">
                <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 text-xs mt-2">Computing student metrics...</p>
              </div>
            ) : !studentStats ? (
              <div className="glass-card rounded-3xl p-12 border border-white/60 dark-theme:border-slate-800/80 text-center flex flex-col items-center justify-center h-[500px]">
                <Info size={32} className="text-slate-300 dark-theme:text-slate-700 mb-2" />
                <h4 className="font-bold text-slate-700 dark-theme:text-slate-300 text-sm">No Student Selected</h4>
                <p className="text-xs text-slate-400 mt-1">Select a student from the panel to inspect their history.</p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                
                {/* Profile Banner */}
                <div className="glass-panel rounded-3xl p-6 border border-white/60 dark-theme:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark-theme:text-white">
                      {studentStats.student.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Roll Number: <strong className="font-semibold text-slate-600 dark-theme:text-slate-200">{studentStats.student.roll_no}</strong>  |  Registration: <strong className="font-semibold text-slate-600 dark-theme:text-slate-200">{studentStats.student.reg_no}</strong>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark-theme:bg-blue-950/40 text-blue-600 dark-theme:text-blue-400 flex items-center justify-center">
                    <User size={24} />
                  </div>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark-theme:bg-slate-900 border border-slate-200/50 dark-theme:border-slate-800/50 rounded-2xl p-4 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Total Working Days</span>
                    <strong className="text-xl font-bold text-slate-800 dark-theme:text-white mt-1 block">
                      {studentStats.stats.total}
                    </strong>
                  </div>
                  <div className="bg-white dark-theme:bg-slate-900 border border-slate-200/50 dark-theme:border-slate-800/50 rounded-2xl p-4 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 text-emerald-600 dark-theme:text-emerald-400">Days Present</span>
                    <strong className="text-xl font-bold text-emerald-600 dark-theme:text-emerald-500 mt-1 block">
                      {studentStats.stats.present}
                    </strong>
                  </div>
                  <div className="bg-white dark-theme:bg-slate-900 border border-slate-200/50 dark-theme:border-slate-800/50 rounded-2xl p-4 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 text-rose-500 dark-theme:text-rose-400">Days Absent</span>
                    <strong className="text-xl font-bold text-rose-500 dark-theme:text-rose-400 mt-1 block">
                      {studentStats.stats.absent}
                    </strong>
                  </div>
                  <div className="bg-blue-600 text-white rounded-2xl p-4 text-center">
                    <span className="block text-[10px] uppercase font-bold text-blue-100">Attendance Rate</span>
                    <strong className="text-xl font-extrabold mt-1 block">
                      {studentStats.stats.percentage}%
                    </strong>
                  </div>
                </div>

                {/* Individual Logs List */}
                <div className="glass-panel rounded-3xl p-5 border border-white/60 dark-theme:border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                    Daily Roll Call Logs
                  </h4>
                  {studentStats.logs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No days recorded for this student yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {studentStats.logs.map((log) => {
                        const isPresent = log.status === 'Present';
                        return (
                          <div
                            key={log.date}
                            className={`flex justify-between items-center p-3 rounded-xl border text-xs font-semibold ${
                              isPresent
                                ? 'bg-emerald-50/20 border-emerald-100/50 text-slate-700 dark-theme:text-slate-300'
                                : 'bg-rose-50/20 border-rose-100/50 text-slate-700 dark-theme:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Calendar size={14} className="text-slate-400" />
                              <span>{log.date}</span>
                            </div>
                            <span
                              className={`uppercase tracking-wider text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                isPresent
                                  ? 'bg-emerald-100 dark-theme:bg-emerald-950/40 text-emerald-700 dark-theme:text-emerald-400'
                                  : 'bg-rose-100 dark-theme:bg-rose-950/40 text-rose-700 dark-theme:text-rose-400'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
