// Preload paska adresu: tylko te funkcje, których pasek potrzebuje.
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pasek', {
  idz: (tekst) => ipcRenderer.send('pasek:idz', String(tekst)),
  akcja: (nazwa) => ipcRenderer.send('pasek:akcja', String(nazwa)),
  wysokosc: (h) => ipcRenderer.send('pasek:wysokosc', Number(h)),
  aktywny: () => ipcRenderer.send('pasek:aktywny'),
  naStan: (f) => ipcRenderer.on('pasek:stan', (_e, s) => f(s)),
  naFokus: (f) => ipcRenderer.on('pasek:fokus', () => f()),
});
