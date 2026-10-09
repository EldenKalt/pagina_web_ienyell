import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { csvCell, csvRow, toCsv } = require('./csv.js');

describe('CSV serialization', () => {
  it.each(['=SUM(A1)', '+1', '-2', '@x', '\tx', ' =1', '\uFF1D1'])('CSV1 neutralizes %j', (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
  it('CSV1 covers full-width signs and leading Unicode spaces', () => {
    for (const value of ['\uFF0B1', '\uFF0D1', '\uFF20x', '\u00A0=1', '\u3000@x', ' \tx']) {
      expect(csvCell(value)).toBe(`"'${value}"`);
    }
  });
  it('CSV1b preserves numeric negatives and zero without a prefix', () => {
    expect(csvCell(-5)).toBe('"-5"');
    expect(csvCell(0)).toBe('"0"');
  });
  it('CSV1c removes controls, flattens line breaks and truncates strings', () => {
    expect(csvCell('a\nb')).toBe('"a b"');
    expect(csvCell('a\r\nb')).toBe('"a b"');
    expect(csvCell('a\rb')).toBe('"a b"');
    expect(csvCell('a\u0007b')).toBe('"ab"');
    expect(csvCell('a\u0000\u0008\u000B\u000C\u000E\u001F\u007Fb')).toBe('"ab"');
    expect(csvCell('x'.repeat(40000))).toBe(`"${'x'.repeat(32000)}"`);
    expect(csvCell('x'.repeat(40000))).toHaveLength(32002);
  });
  it('CSV2 quotes, escapes and preserves text', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell(12.5)).toBe('"12.5"');
    expect(csvCell('Ilustraci\u00F3n, \u201Cx\u201D')).toBe('"Ilustraci\u00F3n, \u201Cx\u201D"');
    expect(csvRow(['a"b', null, 12.5])).toBe('"a""b","","12.5"');
  });
  it('CSV3 emits a BOM and CRLF including the final line', () => {
    expect(toCsv(['a'], [['1'], ['2']])).toBe('\uFEFF"a"\r\n"1"\r\n"2"\r\n');
  });
});
