/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'ipc-example'
  | 'store:get-state'
  | 'store:set-theme'
  | 'store:set-current-task-name'
  | 'store:get-goals'
  | 'store:add-goal'
  | 'store:update-goal'
  | 'store:delete-goal'
  | 'store:get-tasks'
  | 'store:add-task'
  | 'store:update-task'
  | 'store:delete-task'
  | 'store:get-sessions'
  | 'store:add-session'
  | 'store:set-user-prefs'
  | 'app:notify'
  | 'app:set-auto-launch'
  | 'app:get-auto-launch'
  | 'timer:state-update'
  | 'timer:command'
  | 'system:idle-state'
  | 'system:power-event'
  | 'window:set-state'
  | 'window:open-secondary'
  | 'window:close-secondary'
  | 'window:get-state'
  | 'app-tracking:start'
  | 'app-tracking:stop'
  | 'app-tracking:get-data'
  | 'navigate-to';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    invoke(channel: Channels, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
