import { useEffect, useMemo, useState } from 'react';
import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import FocusScreen from './components/FocusScreen';
import GoalsScreen from './components/GoalsScreen';
import TodosScreen from './components/TodosScreen';
import ProgressScreen from './components/ProgressScreen';
import SettingsScreen from './components/SettingsScreen';
import OnboardingFlow from './components/OnboardingFlow';
import './App.css';
import DockWindow from './components/DockWindow';

function NavigateListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const unsub = window.electron?.ipcRenderer?.on?.(
      'navigate-to' as Parameters<typeof window.electron.ipcRenderer.on>[0],
      (route: unknown) =>
        navigate((typeof route === 'string' ? route : '') || '/'),
    );
    return unsub;
  }, [navigate]);
  return null;
}

function AppContent() {
  const { state } = useStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (state !== null && !state.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [state]);

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Router>
      <NavigateListener />
      <Layout>
        <Routes>
          <Route path="/" element={<FocusScreen />} />
          <Route path="/goals" element={<GoalsScreen />} />
          <Route path="/todos" element={<TodosScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  const isDock = useMemo(
    () => window.location.hash === '#dock' || window.location.hash === '',
    [],
  );

  if (isDock) {
    return <DockWindow />;
  }

  return <AppContent />;
}
