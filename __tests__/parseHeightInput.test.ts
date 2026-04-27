import { parseFeetInchesStringToInches, parseHeightCmString } from '../src/lib/parseHeightInput';

describe('parseHeightCmString', () => {
  it('converts 170cm to total inches in valid range', () => {
    const t = parseHeightCmString('170');
    expect(t).not.toBeNull();
    expect(t!).toBeCloseTo(170 / 2.54, 1);
  });
});

describe('parseFeetInchesStringToInches', () => {
  it('parses 5\'7', () => {
    expect(parseFeetInchesStringToInches("5'7")).toBe(5 * 12 + 7);
  });
  it('parses 5 ft 7', () => {
    expect(parseFeetInchesStringToInches('5 ft 7')).toBe(5 * 12 + 7);
  });
  it('parses 5-7', () => {
    expect(parseFeetInchesStringToInches('5-7')).toBe(5 * 12 + 7);
  });
  it('parses 5 7', () => {
    expect(parseFeetInchesStringToInches('5 7')).toBe(5 * 12 + 7);
  });
  it('parses 5ft7', () => {
    expect(parseFeetInchesStringToInches('5ft7')).toBe(5 * 12 + 7);
  });
  it('parses 5\'10', () => {
    expect(parseFeetInchesStringToInches("5'10")).toBe(5 * 12 + 10);
  });
});
