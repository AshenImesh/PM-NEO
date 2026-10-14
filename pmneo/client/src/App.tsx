import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProjectView } from './pages/ProjectView';
import { CalendarPage } from './pages/Calendar';
import { PeoplePage } from './pages/People';
import { AnalyticsPage } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="project/:projectId" element={<ProjectView />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="team" element={<Navigate to="/people" replace />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
