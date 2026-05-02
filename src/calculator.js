"use strict";

/**
 * Exact conversion factor defined by international agreement since 1959.
 * All internal calculations use decimal inches as the canonical unit.
 */
export const MM_PER_INCH = 25.4;

// ============================================================
// Preprocessing: convert measurement tokens to decimal inches
// ============================================================

/**
 * Replaces every measurement token in the raw expression with its decimal-inch
 * equivalent wrapped in parentheses, leaving arithmetic operators and parens
 * untouched so the token stream can be fed directly into the evaluator.
 *
 * Patterns are ordered most-specific-first so compound tokens like
 * `5' 1-3/4"` are consumed before their sub-components.
 *
 * @param {string} input - Raw expression string from the user.
 * @param {string} defaultUnit - Unit to apply to bare numbers: `"`, `'`, `mm`, `cm`, or `""` for none.
 * @returns {string} Expression containing only numbers, operators, and parens.
 */
export function preprocessExpression(input, defaultUnit) {
    let s = input.trim();

    // 1. Feet + whole-dash-fraction inches: 5' 1-3/4"  or  5'1-3/4"
    s = s.replace(/(\d+(?:\.\d+)?)\s*'\s*(\d+)-(\d+)\/(\d+)"/g,
        (_, ft, whole, num, den) => `(${+ft * 12 + +whole + +num / +den})`);

    // 2. Feet + whole-space-fraction inches: 5' 1 3/4"
    s = s.replace(/(\d+(?:\.\d+)?)\s*'\s*(\d+)\s+(\d+)\/(\d+)"/g,
        (_, ft, whole, num, den) => `(${+ft * 12 + +whole + +num / +den})`);

    // 3. Feet + decimal or whole inches: 5' 6"  or  5'6"
    s = s.replace(/(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)"/g,
        (_, ft, inches) => `(${+ft * 12 + +inches})`);

    // 4. Feet only (apostrophe): 5'
    s = s.replace(/(\d+(?:\.\d+)?)\s*'/g,
        (_, ft) => `(${+ft * 12})`);

    // 5. Feet only (text): 5ft
    s = s.replace(/(\d+(?:\.\d+)?)\s*ft\b/gi,
        (_, ft) => `(${+ft * 12})`);

    // 6. Whole-dash-fraction inches: 1-3/4"
    //    No spaces around dash = separator (not subtraction operator)
    s = s.replace(/(\d+)-(\d+)\/(\d+)"/g,
        (_, whole, num, den) => `(${+whole + +num / +den})`);

    // 7. Whole-space-fraction inches: 1 3/4"  (must precede plain digit+")
    s = s.replace(/(\d+)\s+(\d+)\/(\d+)"/g,
        (_, whole, num, den) => `(${+whole + +num / +den})`);

    // 8. Fraction inches only: 3/4"
    s = s.replace(/(\d+)\/(\d+)"/g,
        (_, num, den) => `(${+num / +den})`);

    // 9. Decimal or whole inches: 5"  5.25"  5in
    s = s.replace(/(\d+(?:\.\d+)?)\s*(?:"|in\b)/gi,
        (_, val) => `(${+val})`);

    // 10. Millimetres: 12mm  12.5mm
    s = s.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi,
        (_, val) => `(${+val / MM_PER_INCH})`);

    // 11. Centimetres: 2.5cm
    s = s.replace(/(\d+(?:\.\d+)?)\s*cm\b/gi,
        (_, val) => `(${+val / 2.54})`);

    // 12. Metres: 1.2m  (negative lookahead prevents matching the 'm' in mm/cm)
    s = s.replace(/(\d+(?:\.\d+)?)\s*m(?!m)\b/gi,
        (_, val) => `(${+val * (1000 / MM_PER_INCH)})`);

    // 13. Space-as-addition: whitespace between adjacent value tokens implies +.
    //     All compound tokens (5' 1-3/4", 1 3/4", etc.) are already consumed
    //     above, so any remaining inter-token space is a genuine implicit addition.
    s = s.replace(/([)\d])\s+([(\d])/g, '$1 + $2');

    // 14. Default unit: wrap remaining bare numbers using the caller-supplied unit.
    //     Split on already-processed (number) groups so we only transform gaps
    //     between converted values, not the values themselves.
    if (defaultUnit) {
        const segments = s.split(/(\([\d.]+\))/);
        for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 2) {
            segments[segmentIndex] = segments[segmentIndex].replace(/\d+(?:\.\d+)?/g, bareNumber => {
                const value = +bareNumber;
                switch (defaultUnit) {
                    case '"':  return `(${value})`;
                    case "'":  return `(${value * 12})`;
                    case 'mm': return `(${value / MM_PER_INCH})`;
                    case 'cm': return `(${value / 2.54})`;
                    default:   return bareNumber;
                }
            });
        }
        s = segments.join('');
    }

    return s;
}

// ============================================================
// Arithmetic evaluator (no eval())
// ============================================================

/**
 * Tokenizes a plain arithmetic expression into numbers and operators.
 * Input must already be preprocessed - only digits, decimal points, and
 * the operators `+ - * / ( )` are expected.
 *
 * @param {string} expr - Pre-processed expression string.
 * @returns {Array<number|string>} Flat array: numbers as Number, operators/parens as strings.
 * @throws {Error} If an unrecognised character is encountered.
 */
export function tokenize(expr) {
    const tokens = [];
    let cursor = 0;

    while (cursor < expr.length) {
        const character = expr[cursor];

        if (/\s/.test(character)) { cursor++; continue; }

        if ('+-*/()'.includes(character)) { tokens.push(character); cursor++; continue; }

        if (/[\d.]/.test(character)) {
            let raw = '';
            while (cursor < expr.length && /[\d.]/.test(expr[cursor])) raw += expr[cursor++];
            const value = parseFloat(raw);
            if (isNaN(value)) throw new Error(`Invalid number: "${raw}"`);
            tokens.push(value);
            continue;
        }

        throw new Error(`Unrecognised input near: "${character}"`);
    }

    return tokens;
}

/**
 * Evaluates a token array using recursive-descent parsing.
 *
 * Precedence (lowest to highest):
 *   addition/subtraction > multiplication/division > unary minus > parentheses
 *
 * @param {Array<number|string>} tokens - Output of tokenize().
 * @returns {number} Result in decimal inches.
 * @throws {Error} On syntax errors or division by zero.
 */
export function evaluateTokens(tokens) {
    let position = 0;

    const peek    = () => tokens[position];
    const consume = () => tokens[position++];

    function parseAddSub() {
        let value = parseMulDiv();
        while (position < tokens.length && (peek() === '+' || peek() === '-')) {
            const operator = consume();
            const right = parseMulDiv();
            value = operator === '+' ? value + right : value - right;
        }
        return value;
    }

    function parseMulDiv() {
        let value = parseUnary();
        while (position < tokens.length && (peek() === '*' || peek() === '/')) {
            const operator = consume();
            const right = parseUnary();
            if (operator === '/' && right === 0) throw new Error('Division by zero');
            value = operator === '*' ? value * right : value / right;
        }
        return value;
    }

    function parseUnary() {
        if (peek() === '-') { consume(); return -parsePrimary(); }
        if (peek() === '+') { consume(); return  parsePrimary(); }
        return parsePrimary();
    }

    function parsePrimary() {
        if (peek() === '(') {
            consume();
            const value = parseAddSub();
            if (peek() !== ')') throw new Error('Missing closing parenthesis');
            consume();
            return value;
        }
        if (typeof peek() === 'number') return consume();
        throw new Error(`Unexpected token: "${peek()}"`);
    }

    const result = parseAddSub();
    if (position !== tokens.length) throw new Error('Unexpected content in expression');
    return result;
}

/**
 * Convenience wrapper: preprocesses, tokenizes, and evaluates a measurement
 * expression in one call. Returns the result in decimal inches.
 *
 * @param {string} input - Raw user expression.
 * @param {string} defaultUnit - Default unit for bare numbers (passed to preprocessExpression).
 * @returns {number} Result in decimal inches.
 * @throws {Error} If the expression cannot be parsed or evaluated.
 */
export function evaluate(input, defaultUnit = '') {
    return evaluateTokens(tokenize(preprocessExpression(input, defaultUnit)));
}

// ============================================================
// Formatting utilities
// ============================================================

/**
 * Greatest common divisor of two non-negative integers, used to reduce fractions.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

/**
 * Strips trailing decimal zeros and the decimal point if nothing follows.
 * Examples: "5.5000" -> "5.5",  "6.0000" -> "6"
 *
 * @param {string} str - Numeric string from toFixed().
 * @returns {string}
 */
export function trimZeros(str) {
    return str.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/**
 * Formats a decimal inch value as a fractional inch string at the given precision,
 * converting to feet + inches when the result is >= 12 inches.
 *
 * Examples at 1/16": 5.5 -> "5-1/2\""    13.75 -> "1' 1-3/4\""    0.0625 -> "1/16\""
 *
 * @param {number} decimalInches - Value to format.
 * @param {number} denominator - Precision denominator: 2, 4, 8, 16, 32, or 64.
 * @returns {string} Formatted string including unit marks.
 */
export function toFractionalInches(decimalInches, denominator) {
    const isNegative  = decimalInches < 0;
    const absInches   = Math.abs(decimalInches);

    const feet             = Math.floor(absInches / 12);
    const remainingInches  = absInches - feet * 12;

    // Round remaining inches to the nearest 1/denominator fraction
    const totalUnits  = Math.round(remainingInches * denominator);
    let wholeInches   = Math.floor(totalUnits / denominator);
    let numerator     = totalUnits % denominator;

    // Rounding can push wholeInches to 12; carry into feet
    let displayFeet = feet;
    if (wholeInches >= 12) { displayFeet++; wholeInches -= 12; }

    const parts = [];
    if (displayFeet > 0) parts.push(displayFeet + "'");

    if (numerator === 0) {
        if (wholeInches > 0 || displayFeet === 0) parts.push(wholeInches + '"');
    } else {
        const divisor  = gcd(numerator, denominator);
        const simpNum  = numerator   / divisor;
        const simpDen  = denominator / divisor;
        const fracStr  = simpNum + '/' + simpDen;
        parts.push(wholeInches > 0 ? wholeInches + '-' + fracStr + '"' : fracStr + '"');
    }

    const formatted = parts.join(' ');
    return isNegative ? '-' + formatted : formatted;
}

/**
 * Formats a decimal inch value as a metric string.
 * Values below 1000 mm are shown as mm; 1000 mm and above are shown as metres.
 *
 * @param {number} decimalInches
 * @returns {string}
 */
export function toMetric(decimalInches) {
    const millimetres = decimalInches * MM_PER_INCH;
    if (Math.abs(millimetres) < 1000) {
        return Math.round(millimetres) + ' mm';
    }
    return trimZeros((millimetres / 1000).toFixed(3)) + ' m';
}

/**
 * Formats a decimal inch value to 4 decimal places, trimming trailing zeros.
 *
 * @param {number} decimalInches
 * @returns {string}
 */
export function toDecimalInches(decimalInches) {
    return trimZeros(decimalInches.toFixed(4)) + '"';
}
