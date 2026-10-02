# Cybits

Cybits is a mobile-first progressive web app (PWA) digital pet game inspired by the *style of play* of classic 1990s virtual pet toys: feeding, training, cleaning, illness, sleep, care mistakes, branching evolution, and simple link battles.

Everything is original and self-contained: no frameworks, servers, external APIs, or copyrighted game assets are required.

## Play features

- Persistent pet saved in `localStorage`
- 30-second first hatch in the launch build
- Real-time/offline need decay
- Feeding and weight
- Timing-based training minigame
- Waste, hygiene, illness, medicine
- Sleep/energy system
- Simple battle encounters with cooldowns
- Care-mistake tracking
- Branching evolution paths
- Event log and stats
- Classic A/B/C controls *and* direct touch controls
- Installable iPhone PWA
- Offline play after first load

## Publish on GitHub Pages

1. Create a **public GitHub repository** named `cybits` (or any name you prefer).
2. Upload every file and folder in this project to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch **main** and folder **/(root)**, then click **Save**.
6. GitHub will provide a Pages URL such as `https://YOUR-USERNAME.github.io/cybits/`.

## Install on iPhone

1. Open the GitHub Pages URL in **Safari**.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Launch **Cybits** from the new icon; it opens like a standalone app.

## Development notes

This is a static app. For local testing, use a small web server rather than opening `index.html` as a `file://` URL, because service workers require HTTP/HTTPS.

For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
