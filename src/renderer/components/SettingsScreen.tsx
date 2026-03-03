import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '../store/useStore';

const isMac = navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { label: 'Toggle focus / pause', keys: `${mod}+Shift+F` },
  { label: 'Start break', keys: `${mod}+Shift+B` },
  { label: 'Stop timer', keys: `${mod}+Shift+X` },
];

export default function SettingsScreen() {
  const {
    state,
    setTheme,
    setUserPrefs,
    setAutoLaunch,
    getAutoLaunch,
    updateShortcuts,
  } = useStore();
  const [autoLaunchState, setAutoLaunchState] = useState(false);

  const prefs = state?.userPrefs;
  const theme = state?.theme ?? 'dark';

  useEffect(() => {
    getAutoLaunch().then((val) => {
      if (typeof val === 'boolean') setAutoLaunchState(val);
    });
  }, [getAutoLaunch]);

  const handleAutoLaunchToggle = async (checked: boolean) => {
    setAutoLaunchState(checked);
    await setAutoLaunch(checked);
  };

  const handleGlobalShortcutsToggle = async (checked: boolean) => {
    await setUserPrefs({ globalShortcutsEnabled: checked });
    await updateShortcuts();
  };

  const handleShowTrayTimerToggle = async (checked: boolean) => {
    await setUserPrefs({ showTrayTimer: checked });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base font-semibold tracking-tight m-0">Settings</h2>
        <p className="text-xs text-muted-foreground m-0 mt-0.5">
          Configure how Focusbo works on your desktop.
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Appearance</CardTitle>
          <CardDescription className="text-xs">
            Choose how Focusbo looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="btn-pill h-8 px-4 text-xs flex-1"
            >
              🌙 Dark
            </Button>
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
              className="btn-pill h-8 px-4 text-xs flex-1"
            >
              ☀️ Light
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Focus Goal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Focus Goal</CardTitle>
          <CardDescription className="text-xs">
            Set a target for how long you want to focus each day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={String(prefs?.dailyFocusGoalMinutes ?? 120)}
            onValueChange={(v) =>
              setUserPrefs({ dailyFocusGoalMinutes: Number(v) })
            }
          >
            <SelectTrigger
              className="h-9 text-sm rounded-lg"
              aria-label="Daily focus goal"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[30, 60, 90, 120, 150, 180, 240, 300, 360].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m >= 60
                    ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`
                    : `${m}m`}{' '}
                  per day{m === 120 ? ' (default)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Desktop Integration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Desktop Integration</CardTitle>
          <CardDescription className="text-xs">
            Native features that make Focusbo feel at home on your desktop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={autoLaunchState}
              onCheckedChange={(c) => handleAutoLaunchToggle(c === true)}
              className="mt-0.5"
            />
            <div>
              <p className="m-0 text-sm font-medium leading-tight group-hover:text-foreground transition-colors">
                Launch at login
              </p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Automatically start Focusbo when you log in
              </p>
            </div>
          </label>

          <div className="separator-subtle" />

          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={prefs?.showTrayTimer ?? true}
              onCheckedChange={(c) => handleShowTrayTimerToggle(c === true)}
              className="mt-0.5"
            />
            <div>
              <p className="m-0 text-sm font-medium leading-tight group-hover:text-foreground transition-colors">
                Show timer in menu bar
              </p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Display countdown next to the tray icon while a session is
                active
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* App Usage Tracking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">App Usage Tracking</CardTitle>
          <CardDescription className="text-xs">
            Monitor which apps you use during focus sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={prefs?.trackAppUsage ?? true}
              onCheckedChange={(c) =>
                setUserPrefs({ trackAppUsage: c === true })
              }
              className="mt-0.5"
            />
            <div>
              <p className="m-0 text-sm font-medium leading-tight group-hover:text-foreground transition-colors">
                Track app usage during focus
              </p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Records which applications are in the foreground during focus
                sessions. Data stays local on your machine.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Global Shortcuts</CardTitle>
          <CardDescription className="text-xs">
            Control Focusbo from any app without switching windows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={prefs?.globalShortcutsEnabled ?? true}
              onCheckedChange={(c) => handleGlobalShortcutsToggle(c === true)}
              className="mt-0.5"
            />
            <div>
              <p className="m-0 text-sm font-medium leading-tight group-hover:text-foreground transition-colors">
                Enable global keyboard shortcuts
              </p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Register system-wide hotkeys for timer controls
              </p>
            </div>
          </label>

          {(prefs?.globalShortcutsEnabled ?? true) && (
            <div className="rounded-lg glass-surface p-3 space-y-2">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{s.label}</span>
                  <Badge
                    variant="secondary"
                    className="font-mono text-[11px] px-2 py-0.5"
                  >
                    {s.keys}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications & Sound */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notifications</CardTitle>
          <CardDescription className="text-xs">
            How Focusbo alerts you when sessions complete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={prefs?.notifyOnComplete ?? true}
              onCheckedChange={(c) =>
                setUserPrefs({ notifyOnComplete: c === true })
              }
              className="mt-0.5"
            />
            <div>
              <p className="m-0 text-sm font-medium leading-tight group-hover:text-foreground transition-colors">
                Desktop notifications
              </p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Show a system notification when focus or break ends
              </p>
            </div>
          </label>

          <div className="separator-subtle" />

          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={prefs?.soundOnComplete ?? false}
              onCheckedChange={(c) =>
                setUserPrefs({ soundOnComplete: c === true })
              }
              className="mt-0.5"
            />
            <div>
              <p className="m-0 text-sm font-medium leading-tight group-hover:text-foreground transition-colors">
                Completion sound
              </p>
              <p className="m-0 text-xs text-muted-foreground mt-0.5">
                Play a short tone when a session finishes
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* System info */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Idle auto-pause</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                5 min
              </Badge>
            </div>
            <p className="m-0">
              Timer automatically pauses when your system is idle for 5 minutes,
              goes to sleep, or the screen locks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
