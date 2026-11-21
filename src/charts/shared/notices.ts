// Notices for open-source code that a chart's exports bundle. Code exports print a chart's
// notices at the top of the file (see creditLines in src/export/code.ts): d3's terms ask that
// copies keep its copyright line and permission notice.

/** d3 modules bundled as they are. */
export const d3Isc = (modules: string) =>
  `${modules}: Copyright 2010-2026 Mike Bostock.\nPermission to use, copy, modify, and/or distribute this software for any purpose with or\nwithout fee is hereby granted, provided that the above copyright notice and this permission\nnotice appear in all copies.`;
