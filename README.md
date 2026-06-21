# 🏏 Hand Cricket — Chrome Extension

A premium Hand Cricket game playable right from your Chrome browser toolbar. Play against a smart AI opponent with a slick dual-theme UI and satisfying animations.

## How to Play

- Both you and the computer simultaneously pick a number **1–6**
- If both pick the **same number** → you're **OUT!**
- Otherwise the **batter scores** the number they showed
- Two innings: innings-1 sets the target, innings-2 chases it
- Score more than the target to **WIN**

## Features

- Smart AI that analyses your pick patterns
- Toss mechanism to decide who bats first
- Premium animations: card flip, confetti on win, breathing arena glow
- Dual light / dark theme (persisted across sessions)
- Runs history chips, score bump, floating run counters

## Install Locally (Developer Mode)

1. Download or clone this repository
   ```
   git clone https://github.com/deena011197career-web/handcricket_chromeext.git
   ```
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **"Load unpacked"**
5. Select the `handcricket_chromeext` folder
6. The 🏏 icon appears in your toolbar — click it to play!

## Tech Stack

- Chrome Extension **Manifest V3**
- Pure JavaScript game engine (no frameworks)
- CSS custom properties for theming
- Zero external dependencies
