"use strict";

import "./style.css";
import {
    evaluate,
    preprocessExpression,
    tokenize,
    evaluateTokens,
    toFractionalInches,
    toMetric,
    toDecimalInches,
} from "./calculator.js";

/** Most recent valid result in decimal inches; null when expression is invalid or empty. */
let lastInchValue = null;

// ============================================================
// Main calculator
// ============================================================

/**
 * Reads the expression input, evaluates it, and updates all result fields.
 * Safe to call on every keystroke - errors are displayed inline, not thrown.
 */
function calculate() {
    const inputEl  = document.getElementById('expression');
    const errorEl  = document.getElementById('error');
    const rawInput = inputEl.value;

    if (!rawInput.trim()) {
        errorEl.textContent = '';
        clearResults();
        return;
    }

    try {
        const defaultUnit = document.getElementById('default-unit').value;
        const inches      = evaluate(rawInput, defaultUnit);

        lastInchValue       = inches;
        errorEl.textContent = '';
        displayResults(inches);

    } catch (err) {
        lastInchValue       = null;
        errorEl.textContent = err.message;
        clearResults();
    }
}

/**
 * Re-renders the fractional result when precision changes, and refreshes the
 * cut calculator since it uses the same precision dropdown.
 */
function recalculate() {
    if (lastInchValue !== null) displayResults(lastInchValue);
    calculateCuts();
}

/**
 * Writes all three formatted results into the DOM.
 *
 * @param {number} inches - Value in decimal inches.
 */
function displayResults(inches) {
    const precision = parseInt(document.getElementById('precision').value, 10);
    setResult('decimal-inches',    toDecimalInches(inches));
    setResult('fractional-inches', toFractionalInches(inches, precision));
    setResult('metric',            toMetric(inches));
}

/**
 * Updates a result element's text and removes the empty/dim styling.
 *
 * @param {string} elementId
 * @param {string} text
 */
function setResult(elementId, text) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.classList.remove('empty');
}

/**
 * Resets all result elements to the placeholder dash state.
 */
function clearResults() {
    lastInchValue = null;
    ['decimal-inches', 'fractional-inches', 'metric'].forEach(elementId => {
        const el = document.getElementById(elementId);
        el.textContent = '-';
        el.classList.add('empty');
    });
}

// ============================================================
// Keypad input helpers
// ============================================================

/**
 * Inserts text at the current cursor position in the expression input,
 * then fires an input event so the calculator updates in real time.
 *
 * @param {string} text - Characters to insert.
 */
function insertText(text) {
    const inputEl = document.getElementById('expression');
    const start   = inputEl.selectionStart ?? inputEl.value.length;
    const end     = inputEl.selectionEnd   ?? inputEl.value.length;
    inputEl.value = inputEl.value.slice(0, start) + text + inputEl.value.slice(end);
    const newPosition = start + text.length;
    inputEl.setSelectionRange(newPosition, newPosition);
    inputEl.dispatchEvent(new Event('input'));
    refocusInput();
}

/**
 * Deletes the character before the cursor, or clears the current selection.
 */
function deleteLast() {
    const inputEl = document.getElementById('expression');
    const start   = inputEl.selectionStart ?? inputEl.value.length;
    const end     = inputEl.selectionEnd   ?? inputEl.value.length;

    if (start !== end) {
        inputEl.value = inputEl.value.slice(0, start) + inputEl.value.slice(end);
        inputEl.setSelectionRange(start, start);
    } else if (start > 0) {
        inputEl.value = inputEl.value.slice(0, start - 1) + inputEl.value.slice(start);
        inputEl.setSelectionRange(start - 1, start - 1);
    }

    inputEl.dispatchEvent(new Event('input'));
    refocusInput();
}

/**
 * Inserts '(' if there are no unmatched open parens in the current expression,
 * otherwise inserts ')' to close the innermost open paren.
 */
function insertParen() {
    const expression = document.getElementById('expression').value;
    let depth = 0;
    for (const character of expression) {
        if (character === '(') depth++;
        else if (character === ')') depth--;
    }
    insertText(depth > 0 ? ')' : '(');
}

/**
 * Clears the expression input and all results.
 */
function clearAll() {
    const inputEl = document.getElementById('expression');
    inputEl.value = '';
    inputEl.dispatchEvent(new Event('input'));
    document.getElementById('error').textContent = '';
    refocusInput();
}

/**
 * Restores focus to the expression input on non-touch devices.
 * Skipped on touch devices to avoid reopening the soft keyboard unexpectedly.
 */
function refocusInput() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
        document.getElementById('expression').focus();
    }
}

// ============================================================
// Cut calculator
// ============================================================

/**
 * Reads the cut calculator inputs, computes the equal piece length after
 * subtracting kerf allowance for each cut, and updates the results panel.
 * Uses the same measurement parser as the main calculator for all inputs.
 */
function calculateCuts() {
    const boardInput  = document.getElementById('cut-board').value;
    const kerfInput   = document.getElementById('cut-kerf').value;
    const piecesValue = parseInt(document.getElementById('cut-pieces').value, 10);
    const errorEl     = document.getElementById('cut-error');
    const precision   = parseInt(document.getElementById('precision').value, 10);
    const defaultUnit = document.getElementById('default-unit').value;

    if (!boardInput.trim()) {
        clearCutResults();
        errorEl.textContent = '';
        return;
    }

    if (isNaN(piecesValue) || piecesValue < 2) {
        clearCutResults();
        errorEl.textContent = 'Pieces must be 2 or more';
        return;
    }

    try {
        const boardInches = evaluate(boardInput, defaultUnit);

        // Parse kerf using the same measurement parser - accepts any unit expression
        const kerfTrimmed = kerfInput.trim();
        if (!kerfTrimmed) {
            clearCutResults();
            errorEl.textContent = 'Enter a kerf value';
            return;
        }

        let kerfInches;
        try {
            kerfInches = evaluate(kerfTrimmed, defaultUnit);
        } catch (_) {
            clearCutResults();
            errorEl.textContent = 'Invalid kerf value';
            return;
        }

        if (kerfInches <= 0) {
            clearCutResults();
            errorEl.textContent = 'Kerf must be greater than zero';
            return;
        }

        const numberOfCuts = piecesValue - 1;
        const totalKerf    = numberOfCuts * kerfInches;
        const pieceLength  = (boardInches - totalKerf) / piecesValue;

        if (pieceLength <= 0) {
            clearCutResults();
            errorEl.textContent = 'Kerf waste exceeds board length';
            return;
        }

        errorEl.textContent = '';

        // Update the kerf label to show how many cuts were made
        document.getElementById('cut-kerf-label').textContent =
            'Kerf (' + numberOfCuts + ' cut' + (numberOfCuts !== 1 ? 's' : '') + ')';

        setCutResult('cut-piece-frac',   toFractionalInches(pieceLength, precision));
        setCutResult('cut-piece-metric', toMetric(pieceLength));
        setCutResult('cut-kerf-waste',   toFractionalInches(totalKerf, precision));

    } catch (err) {
        clearCutResults();
        errorEl.textContent = err.message;
    }
}

/**
 * Updates a cut result element's text and removes the empty/dim styling.
 *
 * @param {string} elementId
 * @param {string} text
 */
function setCutResult(elementId, text) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.classList.remove('empty');
}

/**
 * Resets all cut result elements to the placeholder dash state.
 */
function clearCutResults() {
    document.getElementById('cut-kerf-label').textContent = 'Kerf waste';
    ['cut-piece-frac', 'cut-piece-metric', 'cut-kerf-waste'].forEach(elementId => {
        const el = document.getElementById(elementId);
        el.textContent = '-';
        el.classList.add('empty');
    });
}

// ============================================================
// Theme
// ============================================================

/**
 * Applies a theme ('light' or 'dark'), updates the toggle button label,
 * and persists the choice to localStorage.
 *
 * @param {string} theme - 'light' or 'dark'.
 */
function applyTheme(theme) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme');
    btn.textContent = nextTheme;
    btn.setAttribute('aria-label', 'Switch to ' + nextTheme + ' mode');
    localStorage.setItem('woodcalc-theme', theme);
}

/**
 * Reads the saved theme from localStorage (defaults to dark) and applies it.
 */
function initTheme() {
    applyTheme(localStorage.getItem('woodcalc-theme') || 'dark');
}

// ============================================================
// Event wiring
// ============================================================

document.getElementById('expression').addEventListener('input', calculate);

document.getElementById('expression').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clearAll();
    if (event.key === 'Enter')  calculate();
});

document.getElementById('btn-theme').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

document.getElementById('precision').addEventListener('change', recalculate);

// Wire all keypad buttons via data attributes
document.querySelectorAll('.btn[data-insert]').forEach(button => {
    button.addEventListener('click', () => insertText(button.dataset.insert));
});

document.querySelectorAll('.btn[data-action]').forEach(button => {
    button.addEventListener('click', () => {
        switch (button.dataset.action) {
            case 'clear':  clearAll();    break;
            case 'paren':  insertParen(); break;
            case 'delete': deleteLast();  break;
            case 'equals': calculate();   break;
        }
    });
});

document.getElementById('cut-board').addEventListener('input', calculateCuts);
document.getElementById('cut-pieces').addEventListener('input', calculateCuts);
document.getElementById('cut-kerf').addEventListener('input', calculateCuts);

document.getElementById('default-unit').addEventListener('change', () => {
    localStorage.setItem('woodcalc-default-unit', document.getElementById('default-unit').value);
    calculate();
    calculateCuts();
});

// ============================================================
// Init
// ============================================================

initTheme();

const savedDefaultUnit = localStorage.getItem('woodcalc-default-unit');
if (savedDefaultUnit !== null) {
    document.getElementById('default-unit').value = savedDefaultUnit;
}

document.getElementById('expression').focus();
