# Wood Shop Calc

A woodworking calculator desktop app built with Tauri + vanilla JS.

[![AI Assisted](https://img.shields.io/badge/AI-Claude%20Code-AAAAAA.svg?style=for-the-badge)](https://claude.ai/code)

## Features

**Calculator** - Multi-unit expression evaluator. Mix inches, feet, fractions, and metric in a single expression. Results shown as decimal inches, fractional inches (configurable precision), and metric.

Supported syntax:

| Input | Meaning |
|---|---|
| `5"` or `5in` | Inches |
| `5'` or `5ft` | Feet |
| `3/4"` | Fractional inches |
| `1-3/4"` | Mixed number inches |
| `5' 1-3/4"` | Feet and inches |
| `12mm`, `2.5cm`, `1.2m` | Metric |
| `5' 6" + 12mm` | Mixed units |

**Cut List** - Given a board length, number of pieces, and kerf width, calculates the length of each piece and total kerf waste. All inputs accept the same multi-unit syntax as the calculator.

**Angle** - Right triangle solver. Enter any two of: angle, run (adjacent), rise (opposite), hypotenuse - and it calculates the remaining two. Useful for miter angles, rafter pitches, and any angled cuts.

## Development

Requires [Node.js](https://nodejs.org) and [Rust](https://www.rust-lang.org).

```sh
npm install
npm run tauri dev
```

## Build

```sh
npm run tauri build
```

Icons in `src-tauri/icons/` are placeholders. Replace with a real 1024x1024 source image before releasing:

```sh
npm run tauri icon path/to/icon.png
```
