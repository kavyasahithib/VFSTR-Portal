import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Search, UserPlus, FileSpreadsheet, Trash2, Edit, X, ArrowUpDown, UploadCloud, CheckCircle, Users } from 'lucide-react';

interface Student {
  id: number;
  reg_no: string;
  name: string;
  department: string;
  section: string;
  roll_no: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Sort state
  const [sortBy, setSortBy] = useState<'roll_no' | 'name' | 'reg_no'>('roll_no');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Modal forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form states
  const [formRegNo, setFormRegNo] = useState('');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('Computer Science');
  const [formSec, setFormSec] = useState('A');
  const [formRollNo, setFormRollNo] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // CSV parsing states
  const [csvPreview, setCsvPreview] = useState<Omit<Student, 'id'>[]>([]);
  const [csvError, setCsvError] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [sortBy, sortOrder]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get<Student[]>(`/students?search=${search}&sortBy=${sortBy}&order=${sortOrder}`);
      setStudents(res);
    } catch (err) {
      console.error('Fetch students error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchStudents();
    }
  };

  const handleToggleSort = (field: 'roll_no' | 'name' | 'reg_no') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const resetForm = () => {
    setFormRegNo('');
    setFormName('');
    setFormRollNo('');
    setFormDept('Computer Science');
    setFormSec('A');
    setSelectedStudentId(null);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRegNo || !formName || !formDept || !formSec || !formRollNo) return;

    try {
      await api.post('/students', {
        reg_no: formRegNo,
        name: formName,
        department: formDept,
        section: formSec,
        roll_no: formRollNo
      });
      setShowAddModal(false);
      resetForm();
      fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Error adding student.');
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !formRegNo || !formName || !formDept || !formSec || !formRollNo) return;

    try {
      await api.put(`/students/${selectedStudentId}`, {
        reg_no: formRegNo,
        name: formName,
        department: formDept,
        section: formSec,
        roll_no: formRollNo
      });
      setShowEditModal(false);
      resetForm();
      fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Error updating student.');
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Are you sure you want to remove this student? All their historical attendance logs will be permanently deleted.')) {
      return;
    }

    try {
      await api.delete(`/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert('Error deleting student.');
    }
  };

  const triggerEdit = (student: Student) => {
    setSelectedStudentId(student.id);
    setFormRegNo(student.reg_no);
    setFormName(student.name);
    setFormDept(student.department);
    setFormSec(student.section);
    setFormRollNo(student.roll_no);
    setShowEditModal(true);
  };

  // CSV Drag and Drop / Parse File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      setCsvError('Failed to read CSV file.');
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    setCsvError('');
    setCsvPreview([]);
    
    // Split by line
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
      setCsvError('CSV file appears to be empty or has no header.');
      return;
    }

    // Header extraction (expecting columns: Reg No, Name, Dept, Section, Roll No)
    // Basic CSV splitting
    const parsedStudents: Omit<Student, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quotes in name columns (e.g. "Sharma, Rahul")
      const cols = line.split(',').map(s => s.replace(/(^"|"$)/g, '').trim());
      
      // Minimum fields: reg_no, name, roll_no
      if (cols.length >= 3) {
        parsedStudents.push({
          reg_no: cols[0],
          name: cols[1],
          department: cols[2] || 'Computer Science',
          section: cols[3] || 'A',
          roll_no: cols[4] || String(parsedStudents.length + 1).padStart(2, '0')
        });
      }
    }

    if (parsedStudents.length === 0) {
      setCsvError('Could not parse any valid student records. Ensure format is: Reg No,Name,Department,Section,Roll No');
    } else {
      setCsvPreview(parsedStudents);
    }
  };

  const handleBulkImportSubmit = async () => {
    if (csvPreview.length === 0) return;

    try {
      const res = await api.post<{ message: string }>('/students/bulk', { students: csvPreview });
      alert(res.message);
      setShowImportModal(false);
      setCsvPreview([]);
      fetchStudents();
    } catch (err) {
      alert('Error bulk uploading student data.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search & Actions Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-white/60 dark-theme:border-slate-800/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search name, reg no, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark-theme:border-slate-800 bg-white/50 dark-theme:bg-slate-900/50 text-slate-900 dark-theme:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]"
          >
            <UserPlus size={15} />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => {
              setCsvPreview([]);
              setCsvError('');
              setShowImportModal(true);
            }}
            className="flex-1 md:flex-none border border-slate-200 dark-theme:border-slate-800 hover:bg-slate-50 dark-theme:hover:bg-slate-900 text-slate-700 dark-theme:text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98]"
          >
            <FileSpreadsheet size={15} />
            <span>Bulk Import CSV</span>
          </button>
        </div>

      </div>

      {/* Student List Grid */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/60 dark-theme:border-slate-800/80 shadow-sm">
        
        {loading && students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm">Loading student database...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto text-slate-300 dark-theme:text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-500">No students recorded yet.</p>
          </div>
        ) : (
          /* Desktop Table / Mobile List Layout */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50/50 dark-theme:bg-slate-900/50 border-b border-slate-200/50 dark-theme:border-slate-800/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-4 px-6">
                    <button
                      onClick={() => handleToggleSort('roll_no')}
                      className="flex items-center space-x-1.5 hover:text-slate-700 dark-theme:hover:text-slate-300 focus:outline-none"
                    >
                      <span>Roll No</span>
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="py-4 px-6">
                    <button
                      onClick={() => handleToggleSort('reg_no')}
                      className="flex items-center space-x-1.5 hover:text-slate-700 dark-theme:hover:text-slate-300 focus:outline-none"
                    >
                      <span>Reg No</span>
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="py-4 px-6">
                    <button
                      onClick={() => handleToggleSort('name')}
                      className="flex items-center space-x-1.5 hover:text-slate-700 dark-theme:hover:text-slate-300 focus:outline-none"
                    >
                      <span>Student Name</span>
                      <ArrowUpDown size={10} />
                    </button>
                  </th>
                  <th className="py-4 px-6 hidden sm:table-cell">Department</th>
                  <th className="py-4 px-6 hidden sm:table-cell">Section</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark-theme:divide-slate-800/50 text-slate-700 dark-theme:text-slate-300">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/40 dark-theme:hover:bg-slate-900/10 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-slate-900 dark-theme:text-white">
                      {student.roll_no}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-slate-500 text-xs">
                      {student.reg_no}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-800 dark-theme:text-slate-200">
                      {student.name}
                    </td>
                    <td className="py-3.5 px-6 hidden sm:table-cell font-medium text-xs text-slate-500">
                      {student.department}
                    </td>
                    <td className="py-3.5 px-6 hidden sm:table-cell font-bold text-xs text-slate-500">
                      {student.section}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <button
                        onClick={() => triggerEdit(student)}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 text-slate-500 hover:bg-slate-50 dark-theme:hover:bg-slate-900 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-rose-100 dark-theme:border-rose-950 text-rose-500 hover:bg-rose-50 dark-theme:hover:bg-rose-950/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ADD Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark-theme:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark-theme:border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 dark-theme:text-white">Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Roll No</label>
                <input
                  type="text"
                  placeholder="e.g. 01"
                  value={formRollNo}
                  onChange={(e) => setFormRollNo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Reg No</label>
                <input
                  type="text"
                  placeholder="e.g. 231001"
                  value={formRegNo}
                  onChange={(e) => setFormRegNo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Dept</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Section</label>
                  <input
                    type="text"
                    value={formSec}
                    onChange={(e) => setFormSec(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-500/15 mt-2"
              >
                Add Student
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark-theme:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark-theme:border-slate-800 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900 dark-theme:text-white">Edit Student Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditStudent} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Roll No</label>
                <input
                  type="text"
                  value={formRollNo}
                  onChange={(e) => setFormRollNo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Reg No</label>
                <input
                  type="text"
                  value={formRegNo}
                  onChange={(e) => setFormRegNo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Student Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Dept</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Section</label>
                  <input
                    type="text"
                    value={formSec}
                    onChange={(e) => setFormSec(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark-theme:border-slate-800 bg-transparent text-slate-900 dark-theme:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-500/15 mt-2"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark-theme:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 dark-theme:border-slate-800 animate-fade-in flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-bold text-slate-900 dark-theme:text-white">Bulk Import Student Roster</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
              Upload a comma-separated `.csv` file. 
              <br />
              Expected headers (first row): <strong className="text-slate-700 dark-theme:text-slate-300">Reg No,Name,Department,Section,Roll No</strong>
            </p>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-slate-200 dark-theme:border-slate-800 rounded-2xl p-6 text-center bg-slate-50/50 dark-theme:bg-slate-950/20 hover:border-blue-500 transition-colors relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-600 dark-theme:text-slate-300 block">
                Drag and drop your roster CSV file here
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Or click to browse files
              </span>
            </div>

            {csvError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark-theme:bg-rose-950/30 text-rose-600 dark-theme:text-rose-400 text-xs font-medium">
                {csvError}
              </div>
            )}

            {/* Preview Area */}
            {csvPreview.length > 0 && (
              <div className="mt-4 flex-1 overflow-y-auto border border-slate-100 dark-theme:border-slate-800 rounded-xl">
                <div className="bg-slate-50 dark-theme:bg-slate-950/40 p-2.5 border-b border-slate-100 dark-theme:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  Roster Preview ({csvPreview.length} records parsed)
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/50 dark-theme:bg-slate-900/50 text-[10px] text-slate-400 font-bold uppercase">
                    <tr>
                      <th className="py-2 px-4">Roll</th>
                      <th className="py-2 px-4">Reg No</th>
                      <th className="py-2 px-4">Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark-theme:divide-slate-800/80 text-slate-700 dark-theme:text-slate-300">
                    {csvPreview.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-4 font-bold">{row.roll_no}</td>
                        <td className="py-2 px-4">{row.reg_no}</td>
                        <td className="py-2 px-4 font-semibold">{row.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvPreview.length > 10 && (
                  <div className="p-2.5 text-center text-[10px] text-slate-400 border-t border-slate-100 dark-theme:border-slate-850">
                    ...and {csvPreview.length - 10} more rows
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  setCsvPreview([]);
                  setShowImportModal(false);
                }}
                className="flex-1 border border-slate-200 dark-theme:border-slate-800 hover:bg-slate-50 dark-theme:hover:bg-slate-900 text-slate-600 dark-theme:text-slate-400 font-semibold py-2.5 rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImportSubmit}
                disabled={csvPreview.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-500/15"
              >
                <CheckCircle size={14} />
                <span>Upload & Import</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
