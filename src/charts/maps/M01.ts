// M01 US Choropleth — fifty states plus DC and Puerto Rico (U.S. Census outlines). Alaska, Hawaii
// and Puerto Rico are tucked in lower left as insets; five shades with a stepped legend
// underneath, no-data states in the quiet grey, California labelled.

import { mapChart } from './choropleth';
import { USA_REGIONS, USA_SCALE } from './geo-usa';
import { US_NAMES } from './names';

export default mapChart({
  id: 'M01',
  name: 'US State Choropleth',
  description: 'US states shaded in five steps, Alaska and Hawaii tucked lower left; switch to bubbles to size values instead.',
  regionWord: 'State',
  raw: USA_REGIONS,
  scale: USA_SCALE,
  special: {
    Alaska: { left: -131, top: 25, width: 15 },
    Hawaii: { left: -110, top: 28, width: 5 },
    'Puerto Rico': { left: -76, top: 26, width: 2 },
  },
  names: US_NAMES,
  card: { width: 689, chartHeight: 340 },
  size: { w: 633, h: 340 },
  text: {
    title: 'Sign-ups across the states',
    subtitle: 'real outlines · Alaska and Hawaii tucked lower-left · shade = sign-ups, five steps',
    source: 'CHOROPLETH · MONO-MAP · GROWTH GEO',
  },
  rows: [
    ['California', 96], ['New York', 78], ['Texas', 72], ['Washington', 68], ['Massachusetts', 66],
    ['Florida', 54], ['Illinois', 49], ['Colorado', 44], ['Georgia', 41], ['Virginia', 33], ['Pennsylvania', 31],
    ['North Carolina', 30], ['New Jersey', 28], ['Oregon', 22], ['Ohio', 21], ['Michigan', 19], ['Arizona', 18],
    ['Minnesota', 16], ['Utah', 15], ['Maryland', 14], ['Tennessee', 13], ['Wisconsin', 12], ['Missouri', 11],
    ['Indiana', 9], ['Nevada', 8], ['Connecticut', 7], ['South Carolina', 6], ['Alabama', 5], ['Kentucky', 5],
    ['Oklahoma', 4], ['Iowa', 4], ['Kansas', 3], ['Arkansas', 3], ['Louisiana', 3], ['New Hampshire', 2],
    ['Idaho', 2], ['New Mexico', 2], ['Hawaii', 2], ['Maine', 1], ['Nebraska', 1], ['Alaska', 1],
  ],
  d: {
    top: 10,
    bottom: 48,
    border: 1,
    hoverBorder: 1.2,
    hoverBoost: false,
    legendBottom: 21,
    labelTop: 1,
    labelSize: 9,
    labelHalo: 2,
    labelStyle: 'light',
    bubbleMax: 20,
    tipWording: '{v} sign-ups',
    noData: 'no data',
  },
});
