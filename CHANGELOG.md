# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

### Added
- Angle calculator tab: right triangle solver accepting any two of angle,
  run, rise, or hypotenuse; returns all four values plus the complementary angle
- Inline SVG reference diagram on the angle tab labelling the triangle sides
- Tab navigation bar; calculator and cut list are now separate panels
- Cut list moved to its own tab

### Changed
- Theme colours updated to macOS system palette (1c1c1e/2c2c2e dark,
  f2f2f7/ffffff light) with systemBlue focus rings
- Dim text contrast lifted in both themes for legibility at small sizes
- Font changed to ui-monospace (SF Mono on macOS) - replaces Courier New
- Default-unit and precision dropdowns now render as native OS controls
- SVG fill and stroke set via explicit CSS rules rather than currentColor
  (currentColor unreliable for SVG children in WebKit)

### Fixed
- Complementary angle result was overflowing its container due to appended
  label text; value now shows degrees only (label column already identifies it)

### Security
- Resolved all open Dependabot advisories:
  - tauri 2.11.0 -> 2.12.7 (GHSA-7gmj-67g7-phm9); @tauri-apps/api and
    @tauri-apps/cli moved to 2.12 to match
  - serde_with 3.18.0 -> 3.25.0 (GHSA-7gcf-g7xr-8hxj)
  - vite 6.4.6, postcss 8.5.33, source-map-js 1.2.4 and nanoid (development
    only): GHSA-698v-4r3x-3vcv, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff,
    GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp, GHSA-68fv-2mgg-jv7q

## [0.1.0] - 2026-05-01

### Added
- Tauri v2 + Vite v6 project scaffold
- Multi-unit expression calculator: inches (decimal and fractional), feet,
  mm, cm, m; mixed-unit expressions evaluated via recursive-descent parser
- Results displayed as decimal inches, fractional inches, and metric
- Fractional precision selector (1/2" through 1/64")
- Default unit selector applies a unit to bare numbers
- Cut list calculator with kerf allowance
- Dark and light theme toggle with localStorage persistence
- Keypad for touch/mouse input
- Pure math engine in src/calculator.js with no DOM dependencies
