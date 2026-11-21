// Minimal types for opentype.js 2 (the package ships none). Only what the outline export uses.
declare module 'opentype.js' {
  export interface Path {
    toPathData(decimalPlaces?: number): string;
  }
  export interface RenderOptions {
    kerning?: boolean;
    /** in em */
    letterSpacing?: number;
  }
  export interface Glyph {
    /** 0 is the font's "missing character" glyph */
    index: number;
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }
  export interface Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    charToGlyph(ch: string): Glyph;
    getKerningValue(left: Glyph, right: Glyph): number;
    getPath(text: string, x: number, y: number, fontSize: number, options?: RenderOptions): Path;
    getAdvanceWidth(text: string, fontSize: number, options?: RenderOptions): number;
  }
  export function parse(buffer: ArrayBuffer, opt?: Record<string, unknown>): Font;
}
