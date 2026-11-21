// M02 World Choropleth — countries (Natural Earth outlines) shaded in five steps with a stepped
// legend underneath; the map box stops at 58° S; the five biggest markets carry their numbers,
// nudged apart in crowded Europe.

import { mapChart } from './choropleth';
import { WORLD_REGIONS, WORLD_SCALE } from './geo-world';
import { WORLD_NAMES } from './names';

export default mapChart({
  id: 'M02',
  name: 'World Choropleth',
  description: 'Countries shaded in five steps, the biggest markets labelled; switch to bubbles to size values instead.',
  regionWord: 'Country',
  raw: WORLD_REGIONS,
  scale: WORLD_SCALE,
  names: WORLD_NAMES,
  card: { width: 1400, chartHeight: 400 },
  size: { w: 1344, h: 400 },
  text: {
    title: 'Where the users are',
    subtitle: 'real outlines · shade = monthly active accounts · gray = markets we haven\'t opened',
    source: 'CHOROPLETH · MONO-MAP · GLOBAL OPS',
  },
  rows: [
    ['United States', 95], ['India', 62, 0, 4], ['United Kingdom', 48, -26, -12], ['Germany', 41, 26, 14], ['Brazil', 39], ['Canada', 34],
    ['France', 30], ['Australia', 28], ['China', 26], ['Japan', 26], ['Korea', 21], ['Spain', 19], ['Italy', 17], ['Singapore', 16],
    ['Indonesia', 15], ['Mexico', 14], ['Netherlands', 13], ['Poland', 13], ['Sweden', 12], ['Ireland', 12], ['Philippines', 11],
    ['Turkey', 10], ['Vietnam', 9], ['South Africa', 9], ['Denmark', 9], ['Norway', 8], ['Thailand', 8], ['Malaysia', 8],
    ['United Arab Emirates', 8], ['Argentina', 7], ['Finland', 7], ['Nigeria', 7], ['Chile', 6], ['Colombia', 6],
    ['Saudi Arabia', 6], ['Ukraine', 6], ['New Zealand', 6], ['Egypt', 5], ['Pakistan', 5], ['Russia', 5], ['Portugal', 5],
    ['Greece', 4], ['Kenya', 4], ['Peru', 4], ['Morocco', 3], ['Iceland', 2], ['Iran', 2], ['Kazakhstan', 2], ['Ethiopia', 2],
    ['Ghana', 2], ['Ecuador', 2], ['Algeria', 2], ['Mongolia', 1], ['Libya', 1],
  ],
  d: {
    top: 4,
    bottom: 36,
    border: 0.7,
    hoverBorder: 1.1,
    hoverBoost: true,
    legendBottom: 17,
    labelTop: 5,
    labelSize: 8.5,
    labelHalo: 3,
    labelStyle: 'dark',
    bubbleMax: 18,
    tipWording: '{v} MAU',
    noData: 'not opened yet',
    bounds: [-170, 76, 190, -58],
  },
});
