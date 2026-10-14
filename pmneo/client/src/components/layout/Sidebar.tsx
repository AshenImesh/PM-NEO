import { BarChart3, CalendarDays, FolderKanban, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus, Settings, Users } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { classNames } from '@utils/helpers';
import { useProject } from '@context/ProjectContext';
import { useTheme } from '@context/ThemeContext';
import { projectProgress } from '@utils/helpers';
import { Button } from '@components/ui/Button';
import { Moon, Sun } from 'lucide-react';

const NAV = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/people', label: 'People', icon: Users },
];

function navClasses(isActive: boolean) {
  return classNames(
    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-100/80 text-primary-800 dark:bg-primary-400/15 dark:text-primary-100 dark:ring-1 dark:ring-inset dark:ring-primary-300/25'
      : 'text-dark-600 hover:bg-dark-100/80 hover:text-dark-900 dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white'
  );
}

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const navigate = useNavigate();
  const { projects, allTasks, columnsByProject, setCurrentProject, openCreateProject } = useProject();
  const { theme, toggleTheme } = useTheme();

  const goProject = (id: string) => {
    const p = projects.find(x => x.id === id);
    if (p) setCurrentProject(p);
    navigate(`/project/${id}`);
    onClose();
  };

  return (
    <>
      {/* mobile scrim */}
      <div
        onClick={onClose}
        className={classNames(
          'fixed inset-0 z-30 bg-dark-950/40 backdrop-blur-sm lg:hidden transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden="true"
      />
      <aside
        className={classNames(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-dark-200 bg-white transition-all duration-300',
          'dark:bg-dark-900 dark:border-dark-800',
          collapsed ? 'w-[76px]' : 'w-[268px]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Workspace navigation"
      >
        {/* brand — clicking goes home */}
        <div className={classNames('flex items-center gap-2.5 px-4 pt-5 pb-4', collapsed && 'justify-center px-2')}>
          <Link
            to="/"
            onClick={onClose}
            aria-label="Go to overview"
            className="flex items-center gap-2.5 min-w-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 via-primary-500 to-violet-500 flex items-center justify-center shadow-sm shrink-0">
              <FolderKanban className="w-5 h-5 text-white" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block font-bold text-[17px] leading-tight text-dark-900 dark:text-white">PMNEO</span>
                <span className="block text-[11px] text-dark-400 dark:text-dark-500 leading-tight">Shared workspace · no sign-in</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="ml-auto px-2"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-[18px] w-[18px]" />
            </Button>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center pb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="px-2"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </Button>
          </div>
        )}

        {/* primary nav */}
        <nav className={classNames('space-y-0.5', collapsed ? 'px-2.5' : 'px-3')} aria-label="Primary">
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => classNames(navClasses(isActive), collapsed && 'justify-center px-2')}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* projects */}
        <div className={classNames('mt-5 flex-1 min-h-0 flex flex-col', collapsed ? 'px-2.5' : 'px-3')}>
          {!collapsed ? (
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="section-title">Projects · {projects.length}</span>
              <Button variant="ghost" size="sm" onClick={openCreateProject} className="px-2" aria-label="New project">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center pb-2">
              <Button variant="ghost" size="sm" onClick={openCreateProject} className="px-2" aria-label="New project" title="New project">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pb-2">
            {!collapsed && projects.length === 0 && (
              <p className="px-2 py-3 text-[13px] text-dark-400 dark:text-dark-500">
                No projects yet — create one to get going.
              </p>
            )}
            {projects.map(p => {
              const list = allTasks.filter(t => t.projectId === p.id);
              const pct = projectProgress(list, columnsByProject[p.id] ?? []);
              if (collapsed) {
                return (
                  <button
                    key={p.id}
                    onClick={() => goProject(p.id)}
                    title={`${p.name} · ${list.length} tasks · ${pct}% done`}
                    aria-label={`Open ${p.name}`}
                    className="w-full flex justify-center py-2 rounded-xl hover:bg-dark-100/80 dark:hover:bg-dark-800 transition-colors"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  </button>
                );
              }
              return (
                <NavLink
                  key={p.id}
                  to={`/project/${p.id}`}
                  onClick={() => {
                    const proj = projects.find(x => x.id === p.id);
                    if (proj) setCurrentProject(proj);
                    onClose();
                  }}
                  title={`${p.name} · ${pct}% done`}
                  className={({ isActive }) =>
                    classNames(
                      'block w-full text-left rounded-xl px-3 py-2.5 transition-colors',
                      isActive
                        ? 'bg-dark-100 dark:bg-dark-800 dark:ring-1 dark:ring-inset dark:ring-dark-700'
                        : 'hover:bg-dark-100/70 dark:hover:bg-dark-800/70'
                    )
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-dark-800 dark:text-dark-100">
                        {p.name}
                      </span>
                      <span className="block text-[11px] text-dark-400 dark:text-dark-500">
                        {list.length} task{list.length === 1 ? '' : 's'} · {pct}% done
                      </span>
                    </span>
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* footer */}
        <div className={classNames('p-3 hairline-t', collapsed && 'flex flex-col items-center gap-1')}>
          {collapsed ? (
            <>
              <NavLink
                to="/settings"
                onClick={onClose}
                title="Settings"
                aria-label="Settings"
                className="p-2.5 rounded-xl text-dark-600 hover:bg-dark-100/80 dark:text-dark-300 dark:hover:bg-dark-800"
              >
                <Settings className="h-[18px] w-[18px]" />
              </NavLink>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="px-2.5"
              >
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/settings"
                onClick={onClose}
                className="flex flex-1 items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-dark-600 hover:bg-dark-100/80 dark:text-dark-300 dark:hover:bg-dark-800"
              >
                <Settings className="h-[18px] w-[18px]" />
                Settings
              </NavLink>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="px-2.5"
              >
                {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
