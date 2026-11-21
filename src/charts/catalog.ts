// The gallery's list of charts, in display order, with the title each card shows. Every entry
// has a chart in the registry (tests fail if one is missing).

import type { Family, Kind } from '../core/types';

export interface CatalogEntry {
  id: string;
  name: string;
  family: Family;
  title: string;
  kinds: Kind[];
}

const e = (id: string, name: string, family: Family, title: string, kinds: Kind[]): CatalogEntry => ({ id, name, family, title, kinds });

export const CATALOG: CatalogEntry[] = [
  // Editorial
  e('L01', 'Launch Fan', 'editorial', 'Twelve features, fanned out', ['time', 'comparison']),
  e('L02', 'Dot Cascade', 'editorial', 'What breaks, stacked and ranked', ['bars', 'ranking']),
  e('L03', 'Barcode Lollipop', 'editorial', 'Ninety days as a barcode', ['lines', 'time']),
  e('L04', 'Arc Matrix', 'editorial', 'Eight products land in twelve cities', ['heatmap', 'comparison']),
  e('L05', 'Radial Convergence', 'editorial', '48 requests pull toward five themes', ['flow', 'network']),
  e('L06', 'Cluster Field', 'editorial', 'The contributor field', ['network']),
  e('L07', 'Brand Spectrum', 'editorial', 'Where the brand sits', ['comparison']),
  e('L08', 'Dotty Matrix', 'editorial', 'Four squads, stacked in space', ['heatmap']),
  e('L09', 'Bubble Almanac', 'editorial', 'Eight years of tickets, one almanac', ['heatmap', 'time']),
  e('L10', 'Radial Patchwork', 'editorial', 'A quarter of deploys, overlaid', ['distribution', 'time']),
  e('L11', 'Trend Lineage', 'editorial', 'Features rise, fall, come back', ['time']),
  e('L12', 'Type Colonnade', 'editorial', 'Forty-four repos, ten owners', ['flow']),
  e('L13', 'Hourglass Stream', 'editorial', 'The funnel, poured', ['flow', 'part-to-whole']),
  e('L14', 'Hundred Field', 'editorial', 'A hundred of us, four minds', ['part-to-whole']),
  e('L15', 'Ballot Tally', 'editorial', 'What they fear, tick by tick', ['bars', 'part-to-whole']),
  e('L16', 'Matrix Heat', 'editorial', 'Which features get used together', ['heatmap']),
  e('L17', 'Calendar Heat', 'editorial', 'A year of deploys, day by day', ['calendar', 'heatmap']),
  e('L18', 'Ridgeline', 'editorial', 'Five pipelines, five tempos', ['distribution']),
  e('L19', 'Parallel Coordinates', 'editorial', 'Twelve products, four dimensions', ['comparison', 'lines']),
  // Glance
  e('G01', 'Chunky Bars', 'glance', 'Revenue by plan', ['bars', 'ranking']),
  e('G02', 'Donut, Redesigned', 'glance', 'Where sign-ups come from', ['part-to-whole']),
  e('G03', 'Pictorial Bar', 'glance', 'Trees planted, year by year', ['bars', 'time']),
  e('G04', 'Circular Graph', 'glance', 'Who works with whom', ['network']),
  e('G05', 'Tree', 'glance', 'Everything the platform ships', ['hierarchy']),
  e('G06', 'Dual Area', 'glance', 'Campaigns rain down, sign-ups flow', ['lines', 'bars', 'time']),
  e('G07', 'Scatter Morph', 'glance', 'One dataset, three views', ['scatter', 'bars', 'part-to-whole']),
  e('G08', 'Diverging Bar', 'glance', 'Where we gained, where we bled', ['bars', 'comparison']),
  e('G09', 'Force Graph', 'glance', 'Integrations, pulled into orbit', ['network']),
  e('G10', 'Stagger Delay', 'glance', 'Fifty markets, one wave', ['bars']),
  e('G11', 'Custom Pie', 'glance', 'Big slice, deep engagement', ['part-to-whole']),
  e('G12', 'Single Axis', 'glance', 'Support load, day by day', ['distribution', 'time']),
  e('G13', 'Jitter Strip', 'glance', 'Response times, spread out', ['distribution']),
  e('G14', 'Bar Race', 'glance', 'Eight products race for revenue', ['bars', 'ranking', 'time']),
  e('G15', 'Dynamic Data', 'glance', 'Concurrent users, streaming', ['lines', 'time']),
  e('G16', 'Draw-in + Counter', 'glance', 'H1 revenue, drawn in one stroke', ['lines', 'time']),
  e('G17', 'Violin', 'glance', 'How fast each plan gets an answer', ['distribution']),
  e('G18', 'Matrix Heat (Glance)', 'glance', 'Adoption runs hot on the new versions', ['heatmap']),
  e('G19', 'Rank Strip', 'glance', 'Flows climbs to the top', ['ranking', 'heatmap']),
  e('G20', 'Aggregate Sankey', 'glance', 'Channels pour into plans', ['flow']),
  // Basics
  e('B01', 'Rung Bars', 'basics', 'Revenue by plan, rung by rung', ['bars', 'comparison']),
  e('B02', 'Hairline Line', 'basics', 'Thirty days of sign-ups', ['lines', 'time']),
  e('B03', 'Hairline Area', 'basics', 'Concurrent users, filled with days', ['lines', 'time']),
  e('B04', 'Tick Donut', 'basics', 'Where the traffic comes from', ['part-to-whole']),
  e('B05', 'Tick Rows', 'basics', 'Six teams, shipped and counted', ['bars']),
  e('B06', 'Paired Rungs', 'basics', 'This year against last, plan by plan', ['bars', 'comparison']),
  e('B07', 'Stacked Rungs', 'basics', "Where each region's revenue sits", ['bars', 'part-to-whole']),
  e('B08', 'Plumb Scatter', 'basics', 'Price against satisfaction, twelve products', ['scatter']),
  e('B09', 'Rung Waterfall', 'basics', 'From gross to net, step by step', ['bars', 'flow']),
  e('B10', 'Dot Heat', 'basics', 'When support gets loud', ['heatmap', 'calendar']),
  e('B11', 'Tick Gauge', 'basics', "How far to the quarter's goal", ['part-to-whole']),
  e('B12', 'Dumbbell Queue', 'basics', 'Onboarding, before and after the redesign', ['comparison']),
  e('B13', 'Nested Treemap', 'basics', 'Where the work went', ['hierarchy', 'part-to-whole']),
  e('B14', 'Rung Histogram', 'basics', 'Most tickets resolve within six hours', ['distribution', 'bars']),
  e('B15', 'Tick Box', 'basics', 'Reply times, boxed by plan', ['distribution']),
  e('B16', 'Stream Ribbon', 'basics', 'Three products trade the same river', ['lines', 'time', 'part-to-whole']),
  e('B17', 'Candlestick', 'basics', 'Six weeks of the token, candle by candle', ['time']),
  // Maps
  e('M01', 'US State Choropleth', 'maps', 'Sign-ups across the states', ['map']),
  e('M02', 'World Choropleth', 'maps', 'Where the users are', ['map']),
  // Large interactive views
  e('N01', 'Force Graph, dense', 'networks', 'A galaxy of one hundred eighty services', ['network']),
  e('N02', 'Circular Graph, dense', 'networks', 'Six hundred collaborations, one ring', ['network']),
  e('N03', 'Thread Triptych', 'networks', 'Where the data actually goes', ['flow', 'network']),
  // Extras
  e('X01', 'Tick Strip', 'extras', '1,204 questions asked between Aug 2025 and Jul 2026', ['part-to-whole']),
  e('X02', 'Category Lollipop', 'extras', '12 things people most want AI to take over', ['bars', 'ranking']),
  e('X03', 'Hundred Faces', 'extras', 'How worried is the room', ['part-to-whole']),
  e('X04', 'Ballot Rings', 'extras', 'Is AI actually making them better?', ['part-to-whole']),
];

export const FAMILY_LABEL: Record<Family, string> = {
  editorial: 'Editorial',
  glance: 'Glance',
  basics: 'Basics',
  maps: 'Maps',
  networks: 'Networks',
  extras: 'Extras',
};

export const KIND_LABEL: Partial<Record<Kind, string>> = {
  bars: 'Bars',
  lines: 'Lines',
  'part-to-whole': 'Part-to-whole',
  distribution: 'Distribution',
  network: 'Network',
  flow: 'Flow',
  map: 'Map',
  calendar: 'Calendar',
  heatmap: 'Heatmap',
};
