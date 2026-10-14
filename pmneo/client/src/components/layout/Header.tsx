import { Menu, Moon, Plus, Search, Sun, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useProject } from '@context/ProjectContext';
import { useTheme } from '@context/ThemeContext';
import { Button } from '@components/ui/Button';

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/people': 'People',
  '/settings': 'Settings',
};

export function Header({ onMenu }: { onMenu: () => void }) {
  const location = useLocation();
  const { currentProject, query, setQuery, openCreateTask, openCreateProject, projects } = useProject();
  const { theme, toggleTheme } = useTheme();

  const onProjectRoute = location.pathname.startsWith('/project/');
  const title = onProjectRoute ? currentProject?.name ?? 'Project' : TITLES[location.pathname] ?? 'PMNEO';

  return (
    <header className="sticky top-0 z-20 border-b border-dark-200 bg-white/85 backdrop-blur-md dark:bg-dark-950/85 dark:border-dark-800">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={onMenu} className="lg:hidden px-2" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>

        {/* breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-sm min-w-0">
          <Link to="/" className="font-medium text-dark-400 hover:text-dark-700 dark:text-dark-500 dark:hover:text-dark-200">
            Workspace
          </Link>
          <span className="text-dark-300 dark:text-dark-600">/</span>
          <span className="font-semibold text-dark-900 dark:text-white truncate max-w-[220px]">{title}</span>
        </div>

        {/* search */}
        <div className="relative flex-1 max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 dark:text-dark-500 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects & tasks…"
            className="input pl-9 pr-8 !rounded-full"
            aria-label="Search projects and tasks"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700 dark:hover:text-dark-200"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="px-2.5 hidden sm:inline-flex"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={openCreateProject} className="hidden md:inline-flex">
          New project
        </Button>
        <Button
          size="sm"
          onClick={() => openCreateTask({ projectId: currentProject?.id ?? projects[0]?.id })}
        >
          <Plus className="h-4 w-4" />
          New task
        </Button>
      </div>
    </header>
  );
}
