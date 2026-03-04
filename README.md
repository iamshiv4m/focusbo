# Focusbo

A desktop focus-tracking app for employees. Timer-first, minimal friction — start a session, pick a task, work, see progress. Built with Electron, React, and Apple Liquid Glass design.

## Features

- **Timer** — Pomodoro-style (25 min focus, 5 min break) with start, pause, break
- **Task name** — Name what you're working on; pick from goals or add new
- **Goals** — Maintain focus goals (e.g. "Ship feature X", "Learn React")
- **Todos** — Add tasks, mark done, link to goals
- **Notes** — Attach notes to tasks
- **Progress graph** — Visualize focus time per day/week
- **Settings** — Theme, daily goal, notifications, sound, shortcuts, and desktop preferences
- **App usage tracking** — Optional local tracking of foreground apps during focus sessions
- **Desktop integration** — Menu bar timer, global shortcuts, and launch at login
- **Offline-first** — All data stored locally via electron-store
- **Dark & light mode** — Apple Liquid Glass UI with theme toggle

## Tech Stack

| Layer      | Tech                            |
| ---------- | ------------------------------- |
| Desktop    | Electron                        |
| UI         | React 19, TypeScript            |
| Styling    | Tailwind CSS, shadcn/ui (Radix) |
| Storage    | electron-store                  |
| Animations | Framer Motion                   |
| Charts     | Recharts                        |

## Architecture

### Two-Window Design

```
┌─────────────────────────────────────────────────────────┐
│  Dock Window (always-on-top, right-edge)                │
│  Collapsed: 56×56  →  Options: 140×180 (right-edge)    │
│  Click play → expand → click option → open app window   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  App Window (440×780, frameless)                         │
│  Focus | Goals | Todos | Progress | Settings             │
│  Full app with timer, nav, content                       │
└─────────────────────────────────────────────────────────┘
```

- **Dock window**: Frameless, always-on-top, right-edge. Collapsed shows play icon; click expands to options (Focus, Goals, Todos, Progress). Click option opens app window.
- **App window**: Frameless, full UI. Loads when user picks an option from dock.
- **Single bundle**: Both windows load the same `index.html`; `window.location.hash` (`#dock` or `#app`) selects DockWindow vs full app.

### Project Structure

```
src/
├── main/              # Electron main process
│   ├── main.ts        # Window creation, IPC, lifecycle
│   ├── store.ts       # electron-store persistence
│   ├── preload.ts     # contextBridge → window.electron
│   └── menu.ts
├── renderer/          # React app
│   ├── components/    # Layout, DockWindow, FocusScreen, etc.
│   ├── store/         # useStore hook (IPC wrapper)
│   ├── hooks/         # useTimer
│   └── App.css
├── components/ui/     # shadcn/ui (Button, Input, Card, Checkbox)
├── lib/               # cn() utility
└── types/             # Goal, Task, Session, AppState, WindowState
```

### Data Flow

```
Renderer (useStore)  →  invoke('store:get-state')  →  Main (ipcMain)
                                                           ↓
Main (store.ts)      ←  electron-store (JSON)      ←  getAppState()
```

- **Store**: Goals, tasks, sessions, theme, windowState in electron-store
- **IPC**: Renderer calls `invoke()` for mutations; main handles and persists
- **Navigation**: Main sends `navigate-to` to app window when opening from dock

### Current Routes

- `/` — Focus screen (timer and current session controls)
- `/goals` — Goals management
- `/todos` — Todos and notes
- `/progress` — Focus analytics and trends
- `/settings` — Theme and desktop preferences

## Theming

- **Storage**: `theme: 'dark' | 'light'` in electron-store
- **Application**: `html` classes (`dark` / `theme-light`) control theme
- **Layout.tsx**: Reads `state.theme`, syncs `html` in `useEffect`
- **DockWindow**: Always dark (no theme toggle)
- **CSS**: `App.css` defines `:root`, `.dark`, `.theme-light` vars; Apple-style primary (#0a84ff dark, #0071e3 light)
- **Tailwind**: `darkMode: 'class'` for `dark:` variants

## Icons

- **Library**: lucide-react
- **Usage**: Static mapping per component (e.g. `OPTIONS` in DockWindow)
- **Examples**: Play, Target, ListTodo, BarChart3, ChevronLeft, ChevronRight, X, Check

## Install

```bash
git clone <repo-url>
cd focusbo
npm install
```

## Development

```bash
npm start
```

## Build

```bash
npm run build
```

## Package

```bash
npm run package
```

## License

MIT
