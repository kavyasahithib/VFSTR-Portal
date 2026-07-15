import { useEffect, useState } from 'react';
import { api } from './utils/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Students from './pages/Students';
import Reports from './pages/Reports';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('cr_token'));
  const [user, setUser] = useState<any | null>(null);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Responsive sidebar toggles
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Theme management
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('cr_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Verify session on launch
  useEffect(() => {
    verifySession();
  }, [token]);

  // Sync theme class with body element
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('cr_theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('cr_theme', 'light');
    }
  }, [isDark]);

  const verifySession = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<{ user: any }>('/auth/me');
      setUser(data.user);
      localStorage.setItem('cr_user', JSON.stringify(data.user));
    } catch (err) {
      // Session invalid
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: any, userToken: string) => {
    localStorage.setItem('cr_token', userToken);
    localStorage.setItem('cr_user', JSON.stringify(loggedInUser));
    setToken(userToken);
    setUser(loggedInUser);
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('cr_token');
    localStorage.removeItem('cr_user');
    setToken(null);
    setUser(null);
    setActivePage('dashboard');
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark-theme:bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 font-bold tracking-wider text-xs uppercase">
            Securing Class Roster...
          </span>
        </div>
      </div>
    );
  }

  // If not logged in, show Login Screen
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar Menu Items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Take Attendance', icon: CalendarCheck },
    { id: 'students', label: 'Manage Students', icon: Users },
    { id: 'reports', label: 'Reports & Logs', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen flex bg-slate-50/50 dark-theme:bg-slate-950 transition-colors duration-300">
      
      {/* SIDEBAR - DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-200/60 dark-theme:border-slate-900/60 p-5 shrink-0 fixed top-0 bottom-0 left-0 z-40">
        
        {/* Title Logo */}
        <div className="flex items-center space-x-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-lg shadow-blue-500/20">
            A
          </div>
          <div>
            <h1 className="font-extrabold text-xs tracking-tight text-slate-800 dark-theme:text-white leading-none">
              VFSTR :: VADLAMUDI
            </h1>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
              CSE, 4th YEAR - Sec 17
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/15'
                    : 'text-slate-500 dark-theme:text-slate-400 hover:bg-slate-100/50 dark-theme:hover:bg-slate-900/40 hover:text-slate-800 dark-theme:hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Operations */}
        <div className="pt-4 border-t border-slate-200/50 dark-theme:border-slate-900/50 space-y-2">
          
          {/* Theme toggler */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[11px] font-semibold text-slate-500 dark-theme:text-slate-400 hover:bg-slate-100/50 dark-theme:hover:bg-slate-900/40 transition-all"
          >
            <span className="flex items-center space-x-2">
              {isDark ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-500" />}
              <span>Theme Preference</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Log Out */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark-theme:hover:bg-rose-950/20 transition-all"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 md:hidden animate-fade-in">
          <aside className="w-64 glass-panel border-r border-slate-200/60 dark-theme:border-slate-900/60 h-full p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center">
                    A
                  </div>
                  <div>
                    <h1 className="font-extrabold text-xs tracking-tight text-slate-800 dark-theme:text-white leading-none">
                      VFSTR :: VADLAMUDI
                    </h1>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                      CSE, 4th YEAR - Sec 17
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                          : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800 dark-theme:text-slate-400 dark-theme:hover:bg-slate-900/30'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200/50 dark-theme:border-slate-900/50">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs text-slate-500 dark-theme:text-slate-400"
              >
                {isDark ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-500" />}
                <span>Theme Preference</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark-theme:hover:bg-rose-950/20 transition-all"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        
        {/* HEADER */}
        <header className="sticky top-0 bg-slate-50/80 dark-theme:bg-slate-950/80 backdrop-blur-md z-30 border-b border-slate-200/40 dark-theme:border-slate-900/30 px-6 py-4 flex items-center justify-between">
          
          {/* Left Area (Mobile Menu Trigger / Title) */}
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700 dark-theme:hover:text-white focus:outline-none"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base font-extrabold tracking-tight text-slate-800 dark-theme:text-white capitalize">
              {activePage.replace('-', ' ')}
            </h2>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3">
            
            {/* Quick Session Indicator Removed */}

            {/* Theme trigger on mobile/desktop header */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200 dark-theme:bg-slate-900 dark-theme:hover:bg-slate-800 text-slate-600 dark-theme:text-slate-300 transition-colors"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

          </div>
        </header>

        {/* SCREEN CONTAINER */}
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
          {activePage === 'dashboard' && <Dashboard onNavigate={setActivePage} user={user} />}
          {activePage === 'attendance' && <Attendance />}
          {activePage === 'students' && <Students />}
          {activePage === 'reports' && <Reports />}
        </main>

      </div>

    </div>
  );
}
