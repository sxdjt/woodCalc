"use strict";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Solves a right triangle given exactly two of the four values:
 * angle (degrees), run (adjacent side), rise (opposite side), hypotenuse.
 *
 * Pass null for unknown values. Provide exactly 2 non-null values.
 * If fewer than 2 are provided, returns null (not enough to solve).
 * If 3 or 4 are provided, solves from the first valid pair found and
 * ignores the rest (clear a field to change which pair is used).
 *
 * @param {number|null} angle      - Degrees, must be 0 < angle < 90
 * @param {number|null} run        - Adjacent side in decimal inches
 * @param {number|null} rise       - Opposite side in decimal inches
 * @param {number|null} hypotenuse - Hypotenuse in decimal inches
 * @returns {{ angle, run, rise, hypotenuse }|null}
 * @throws {Error} On invalid values or degenerate geometry
 */
export function solveRightTriangle(angle, run, rise, hypotenuse) {
    const filled = [angle, run, rise, hypotenuse].filter(v => v !== null).length;
    if (filled < 2) return null;

    // Validate whatever is provided before attempting to solve
    if (angle      !== null && (angle <= 0 || angle >= 90))
        throw new Error('Angle must be between 0° and 90° (exclusive)');
    if (run        !== null && run <= 0)
        throw new Error('Run must be greater than zero');
    if (rise       !== null && rise <= 0)
        throw new Error('Rise must be greater than zero');
    if (hypotenuse !== null && hypotenuse <= 0)
        throw new Error('Hypotenuse must be greater than zero');
    if (run        !== null && hypotenuse !== null && run >= hypotenuse)
        throw new Error('Run must be less than the hypotenuse');
    if (rise       !== null && hypotenuse !== null && rise >= hypotenuse)
        throw new Error('Rise must be less than the hypotenuse');

    let a = angle, r = run, s = rise, h = hypotenuse;

    if (a !== null && r !== null) {
        // angle + run
        s = r * Math.tan(a * DEG_TO_RAD);
        h = r / Math.cos(a * DEG_TO_RAD);
    } else if (a !== null && s !== null) {
        // angle + rise
        r = s / Math.tan(a * DEG_TO_RAD);
        h = s / Math.sin(a * DEG_TO_RAD);
    } else if (a !== null && h !== null) {
        // angle + hypotenuse
        r = h * Math.cos(a * DEG_TO_RAD);
        s = h * Math.sin(a * DEG_TO_RAD);
    } else if (r !== null && s !== null) {
        // run + rise
        a = Math.atan2(s, r) * RAD_TO_DEG;
        h = Math.sqrt(r * r + s * s);
    } else if (r !== null && h !== null) {
        // run + hypotenuse
        a = Math.acos(r / h) * RAD_TO_DEG;
        s = Math.sqrt(h * h - r * r);
    } else if (s !== null && h !== null) {
        // rise + hypotenuse
        a = Math.asin(s / h) * RAD_TO_DEG;
        r = Math.sqrt(h * h - s * s);
    }

    return { angle: a, run: r, rise: s, hypotenuse: h };
}

/**
 * Formats a degree value to 2 decimal places, trimming trailing zeros.
 * Examples: 45.0 -> "45°",  33.69 -> "33.69°"
 *
 * @param {number} degrees
 * @returns {string}
 */
export function formatDegrees(degrees) {
    let str = degrees.toFixed(2);
    str = str.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return str + '°';
}

/**
 * Returns the complementary angle (90° - angle), formatted as a degree string.
 *
 * @param {number} degrees
 * @returns {string}
 */
export function formatComplementary(degrees) {
    return formatDegrees(90 - degrees);
}
