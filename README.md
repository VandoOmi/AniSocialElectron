# AniSocial Desktop

Desktop-App für [AniSocial.de](https://anisocial.de) – Die Anime-Community.

Gebaut mit Electron, um AniSocial als native Desktop-Anwendung mit System-Benachrichtigungen, Auto-Updates, System-Tray und konfigurierbaren Einstellungen bereitzustellen.

## Features

- **System-Tray** – Minimieren in den Tray statt Schließen
- **Native Benachrichtigungen** – Polling der AniSocial-API mit konfigurierbarem Intervall und Sound
- **Auto-Updater** – Automatische Updates (AppImage unter Linux, Installer unter Windows/macOS)
- **Einstellungen** – Umfangreiche Konfiguration (Tray, Autostart, Hardware-Beschleunigung, Benachrichtigungen, Zoom, Keybinds, Quick-Nav)
- **Quick-Nav** – Bis zu 5 belegbare Schnellzugriff-Slots für häufig besuchte Seiten
- **Konfigurierbare Tastenkürzel** – Alle Keybinds sind über die Einstellungen anpassbar
- **Kontextmenü** – Links öffnen, Bilder, Kopieren, Navigation
- **Externe Links** werden im Systembrowser geöffnet
- **Fenstergröße und -position** werden gespeichert
- **Single Instance** – Verhindert mehrere gleichzeitige Instanzen
- **Verfügbar für Linux, Windows und macOS**

## Installation

### Fertige Pakete

Vorgefertigte Pakete gibt es auf der [Releases-Seite](https://github.com/VandoOmi/AniSocialDesktop/releases).

| Plattform | Formate                            |
| --------- | ---------------------------------- |
| Linux     | AppImage, deb, rpm, pacman, tar.gz |
| Windows   | NSIS Installer                     |
| macOS     | DMG                                |

### Selber bauen

#### Voraussetzungen

- [Node.js](https://nodejs.org/) (>= 22.13)
- npm

#### Schritte

```bash
git clone https://github.com/VandoOmi/AniSocialDesktop.git
cd AniSocialDesktop
npm install
```

Entwicklungsmodus starten:

```bash
npm run dev
```

Pakete bauen:

```bash
# Für das aktuelle System
npm run build

# Plattform-spezifisch
npm run build:linux
npm run build:win
npm run build:mac
```

Die fertigen Pakete landen im `release/`-Verzeichnis.

## Einstellungen

Die Einstellungen werden als JSON in `userData/settings.json` gespeichert.

| Kategorie          | Einstellung             | Standard |
| ------------------ | ----------------------- | -------- |
| Allgemein          | In Tray minimieren      | An       |
| Allgemein          | Autostart               | Aus      |
| Allgemein          | Hardware-Beschleunigung | An       |
| Benachrichtigungen | Aktiviert               | An       |
| Benachrichtigungen | Sound                   | An       |
| Benachrichtigungen | Lautstärke              | 80 %     |
| Benachrichtigungen | Polling-Intervall       | 30 s     |
| Darstellung        | Zoom-Level              | 0        |

## Tastenkürzel

Alle Kürzel sind über die Einstellungen anpassbar. Hier die Standard-Belegung:

| Kürzel              | Aktion             |
| ------------------- | ------------------ |
| `Ctrl+R`            | Neu laden          |
| `Ctrl+Shift+R`      | Hard Reload        |
| `Alt+←`             | Zurück             |
| `Alt+→`             | Vor                |
| `Ctrl+H`            | Startseite         |
| `F11`               | Vollbild           |
| `F12`               | DevTools           |
| `Ctrl+=`            | Zoom +             |
| `Ctrl+-`            | Zoom -             |
| `Ctrl+0`            | Zoom zurücksetzen  |
| `Ctrl+1` – `Ctrl+5` | Quick-Nav Slot 1–5 |

## Projektstruktur

```
src/
├── main.ts              # Electron Main-Prozess
├── preload.ts           # Preload-Script (IPC-Bridge)
├── keybinds.ts          # Tastenkürzel-Definitionen
├── push.ts              # Benachrichtigungs-Polling
├── updater.ts           # Auto-Updater
├── settings-inject.ts   # Settings-Injection ins Webview
├── settings/
│   ├── ipc.ts           # IPC-Handler für Einstellungen
│   └── store.ts         # Einstellungs-Persistenz
└── types/
    ├── config.ts        # App-Konfiguration
    ├── ipc.ts           # IPC-Channel-Definitionen
    └── settings.ts      # Settings-Schema & Defaults
```

## Entwicklung

```bash
npm run lint        # ESLint
npm run format      # Prettier
npm run format:check
```

## Lizenz

MIT
