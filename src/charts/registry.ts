// Every chart in the app. Add a chart by creating src/charts/<family>/<ID>.ts with defineChart()
// and adding it here.

import type { ChartDef } from '../core/chart';
import B01 from './basics/B01';
import B02 from './basics/B02';
import B03 from './basics/B03';
import B04 from './basics/B04';
import B05 from './basics/B05';
import B06 from './basics/B06';
import B07 from './basics/B07';
import B08 from './basics/B08';
import B09 from './basics/B09';
import B10 from './basics/B10';
import B11 from './basics/B11';
import B12 from './basics/B12';
import B13 from './basics/B13';
import B14 from './basics/B14';
import B15 from './basics/B15';
import B16 from './basics/B16';
import B17 from './basics/B17';
import G01 from './glance/G01';
import G02 from './glance/G02';
import G03 from './glance/G03';
import G04 from './glance/G04';
import G05 from './glance/G05';
import G06 from './glance/G06';
import G07 from './glance/G07';
import G08 from './glance/G08';
import G09 from './glance/G09';
import G10 from './glance/G10';
import G11 from './glance/G11';
import G12 from './glance/G12';
import G13 from './glance/G13';
import G14 from './glance/G14';
import G15 from './glance/G15';
import G16 from './glance/G16';
import G17 from './glance/G17';
import G18 from './glance/G18';
import G19 from './glance/G19';
import G20 from './glance/G20';
import L01 from './editorial/L01';
import L02 from './editorial/L02';
import L03 from './editorial/L03';
import L04 from './editorial/L04';
import L05 from './editorial/L05';
import L06 from './editorial/L06';
import L07 from './editorial/L07';
import L08 from './editorial/L08';
import L09 from './editorial/L09';
import L10 from './editorial/L10';
import L11 from './editorial/L11';
import L12 from './editorial/L12';
import L13 from './editorial/L13';
import L14 from './editorial/L14';
import L15 from './editorial/L15';
import L16 from './editorial/L16';
import L17 from './editorial/L17';
import L18 from './editorial/L18';
import L19 from './editorial/L19';
import M01 from './maps/M01';
import M02 from './maps/M02';
import N01 from './networks/N01';
import N02 from './networks/N02';
import N03 from './networks/N03';
import X01 from './extras/X01';
import X02 from './extras/X02';
import X03 from './extras/X03';
import X04 from './extras/X04';

export const CHARTS: ChartDef[] = [B01, B02, B03, B04, B05, B06, B07, B08, B09, B10, B11, B12, B13, B14, B15, B16, B17, G01, G02, G03, G04, G05, G06, G07, G08, G09, G10, G11, G12, G13, G14, G15, G16, G17, G18, G19, G20, L01, L02, L03, L04, L05, L06, L07, L08, L09, L10, L11, L12, L13, L14, L15, L16, L17, L18, L19, M01, M02, N01, N02, N03, X01, X02, X03, X04];

const byId = new Map(CHARTS.map((c) => [c.id.toUpperCase(), c]));

export function getChart(id: string | undefined): ChartDef | undefined {
  return id ? byId.get(id.toUpperCase()) : undefined;
}
