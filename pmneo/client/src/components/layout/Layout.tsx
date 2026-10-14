import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { classNames } from '@utils/helpers';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TaskModal } from '@components/tasks/TaskModal';
import { ProjectModal } from '@components/projects/ProjectModal';
import { useProject } from '@context/ProjectContext';
import { Button } from '@components/ui/Button';

const COLLAPSE_KEY = 'pmneo-sidebar-collapsed';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { error, clearError } = useProject();

  const toggleCollapse = () => {
    setCollapsed(c => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <div className="min-h-screen bg-dark-50 text-dark-900 dark:bg-dark-950 dark:text-dark-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className={classNames('min-h-screen flex flex-col transition-all duration-300', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[268px]')}>
        <Header onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="px-4 sm:px-6 pb-5 max-w-6xl mx-auto w-full">
          <p className="text-[11px] text-dark-400 dark:text-dark-500">
            PMNEO · shared local workspace — every change saves instantly for everyone using it.
          </p>
        </footer>
      </div>

      {error && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-elevated dark:bg-dark-900 dark:border-red-900/50">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="flex-1 text-sm text-dark-800 dark:text-dark-100">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError} className="px-2" aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <TaskModal />
      <ProjectModal />
    </div>
  );
}
