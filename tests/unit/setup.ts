// Runs before every unit test file: make every font's letter widths available, as the app does.
import { registerAllTextFonts } from '../../src/core/text/all-metrics';

registerAllTextFonts();
