// Region names the map charts accept. Rows can name a region the way the map data does
// ("Dem. Rep. Congo"), by its everyday or official name ("Czechia", "Czech Republic") or by its code
// (US postal code; ISO 3166 two- and three-letter codes for countries). Each region also has a
// short code for map labels ("CA 96k", "UK 48k").

/** Fold case, accents and punctuation: "Côte d’Ivoire" → "cote divoire". */
export function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.'’`,()]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// name in the map data | short label code | other names and codes, separated by |
const US = `Alabama|AL
Alaska|AK
Arizona|AZ
Arkansas|AR
California|CA
Colorado|CO
Connecticut|CT
Delaware|DE
District of Columbia|DC|Washington DC|Washington D.C.|D.C.
Florida|FL
Georgia|GA
Hawaii|HI
Idaho|ID
Illinois|IL
Indiana|IN
Iowa|IA
Kansas|KS
Kentucky|KY
Louisiana|LA
Maine|ME
Maryland|MD
Massachusetts|MA
Michigan|MI
Minnesota|MN
Mississippi|MS
Missouri|MO
Montana|MT
Nebraska|NE
Nevada|NV
New Hampshire|NH
New Jersey|NJ
New Mexico|NM
New York|NY|New York State
North Carolina|NC
North Dakota|ND
Ohio|OH
Oklahoma|OK
Oregon|OR
Pennsylvania|PA
Puerto Rico|PR
Rhode Island|RI
South Carolina|SC
South Dakota|SD
Tennessee|TN
Texas|TX
Utah|UT
Vermont|VT
Virginia|VA
Washington|WA|Washington State
West Virginia|WV
Wisconsin|WI
Wyoming|WY`;

const WORLD = `Afghanistan|AF|AFG
Åland|AX|ALA|Aland Islands|Aland
Albania|AL|ALB
Algeria|DZ|DZA
American Samoa|AS|ASM
Andorra|AD|AND
Angola|AO|AGO
Anguilla|AI|AIA
Antigua and Barb.|AG|ATG|Antigua and Barbuda|Antigua
Argentina|AR|ARG
Armenia|AM|ARM
Aruba|AW|ABW
Ashmore and Cartier Is.||Ashmore and Cartier Islands
Australia|AU|AUS
Austria|AT|AUT
Azerbaijan|AZ|AZE
Bahamas|BS|BHS|The Bahamas
Bahrain|BH|BHR
Bangladesh|BD|BGD
Barbados|BB|BRB
Belarus|BY|BLR
Belgium|BE|BEL
Belize|BZ|BLZ
Benin|BJ|BEN
Bermuda|BM|BMU
Bhutan|BT|BTN
Bolivia|BO|BOL
Bosnia and Herz.|BA|BIH|Bosnia and Herzegovina|Bosnia
Botswana|BW|BWA
Br. Indian Ocean Ter.|IO|IOT|British Indian Ocean Territory
Brazil|BR|BRA
British Virgin Is.|VG|VGB|British Virgin Islands
Brunei|BN|BRN|Brunei Darussalam
Bulgaria|BG|BGR
Burkina Faso|BF|BFA
Burundi|BI|BDI
Cabo Verde|CV|CPV|Cape Verde
Cambodia|KH|KHM
Cameroon|CM|CMR
Canada|CA|CAN
Cayman Is.|KY|CYM|Cayman Islands
Central African Rep.|CF|CAF|Central African Republic|CAR
Chad|TD|TCD
Chile|CL|CHL
China|CN|CHN|People's Republic of China|PRC
Colombia|CO|COL
Comoros|KM|COM
Congo|CG|COG|Republic of the Congo|Congo-Brazzaville|Congo Republic
Cook Is.|CK|COK|Cook Islands
Costa Rica|CR|CRI
Côte d'Ivoire|CI|CIV|Ivory Coast
Croatia|HR|HRV
Cuba|CU|CUB
Curaçao|CW|CUW
Cyprus|CY|CYP
Czechia|CZ|CZE|Czech Republic|Czech Rep.
Dem. Rep. Congo|CD|COD|Democratic Republic of the Congo|DR Congo|DRC|Congo-Kinshasa
Denmark|DK|DNK
Djibouti|DJ|DJI
Dominica|DM|DMA
Dominican Rep.|DO|DOM|Dominican Republic
Ecuador|EC|ECU
Egypt|EG|EGY
El Salvador|SV|SLV
Eq. Guinea|GQ|GNQ|Equatorial Guinea
Eritrea|ER|ERI
Estonia|EE|EST
eSwatini|SZ|SWZ|Swaziland
Ethiopia|ET|ETH
Faeroe Is.|FO|FRO|Faroe Islands|Faroes
Falkland Is.|FK|FLK|Falkland Islands
Fiji|FJ|FJI
Finland|FI|FIN
Fr. Polynesia|PF|PYF|French Polynesia
Fr. S. Antarctic Lands|TF|ATF|French Southern Territories|French Southern and Antarctic Lands
France|FR|FRA
Gabon|GA|GAB
Gambia|GM|GMB|The Gambia
Georgia|GE|GEO
Germany|DE|DEU
Ghana|GH|GHA
Greece|GR|GRC
Greenland|GL|GRL
Grenada|GD|GRD
Guam|GU|GUM
Guatemala|GT|GTM
Guernsey|GG|GGY
Guinea|GN|GIN
Guinea-Bissau|GW|GNB
Guyana|GY|GUY
Haiti|HT|HTI
Heard I. and McDonald Is.|HM|HMD|Heard Island and McDonald Islands
Honduras|HN|HND
Hong Kong|HK|HKG
Hungary|HU|HUN
Iceland|IS|ISL
India|IN|IND
Indian Ocean Ter.|CX|CXR|Australian Indian Ocean Territories|Christmas Island|Cocos Islands
Indonesia|ID|IDN
Iran|IR|IRN
Iraq|IQ|IRQ
Ireland|IE|IRL
Isle of Man|IM|IMN
Israel|IL|ISR
Italy|IT|ITA
Jamaica|JM|JAM
Japan|JP|JPN
Jersey|JE|JEY
Jordan|JO|JOR
Kazakhstan|KZ|KAZ
Kenya|KE|KEN
Kiribati|KI|KIR
Kosovo|XK|XKX
Kuwait|KW|KWT
Kyrgyzstan|KG|KGZ
Laos|LA|LAO|Lao PDR
Latvia|LV|LVA
Lebanon|LB|LBN
Lesotho|LS|LSO
Liberia|LR|LBR
Libya|LY|LBY
Liechtenstein|LI|LIE
Lithuania|LT|LTU
Luxembourg|LU|LUX
Macao|MO|MAC|Macau
Macedonia|MK|MKD|North Macedonia
Madagascar|MG|MDG
Malawi|MW|MWI
Malaysia|MY|MYS
Maldives|MV|MDV
Mali|ML|MLI
Malta|MT|MLT
Marshall Is.|MH|MHL|Marshall Islands
Mauritania|MR|MRT
Mauritius|MU|MUS
Mexico|MX|MEX
Micronesia|FM|FSM|Federated States of Micronesia
Moldova|MD|MDA
Monaco|MC|MCO
Mongolia|MN|MNG
Montenegro|ME|MNE
Montserrat|MS|MSR
Morocco|MA|MAR
Mozambique|MZ|MOZ
Myanmar|MM|MMR|Burma
N. Cyprus||Northern Cyprus
N. Mariana Is.|MP|MNP|Northern Mariana Islands
Namibia|NA|NAM
Nauru|NR|NRU
Nepal|NP|NPL
Netherlands|NL|NLD|Holland|The Netherlands
New Caledonia|NC|NCL
New Zealand|NZ|NZL
Nicaragua|NI|NIC
Niger|NE|NER
Nigeria|NG|NGA
Niue|NU|NIU
Norfolk Island|NF|NFK
North Korea|KP|PRK|Democratic People's Republic of Korea|DPRK|Dem. Rep. Korea
Norway|NO|NOR
Oman|OM|OMN
Pakistan|PK|PAK
Palau|PW|PLW
Palestine|PS|PSE
Panama|PA|PAN
Papua New Guinea|PG|PNG
Paraguay|PY|PRY
Peru|PE|PER
Philippines|PH|PHL
Pitcairn Is.|PN|PCN|Pitcairn Islands
Poland|PL|POL
Portugal|PT|PRT
Puerto Rico|PR|PRI
Qatar|QA|QAT
Romania|RO|ROU
Russia|RU|RUS|Russian Federation
Rwanda|RW|RWA
S. Geo. and the Is.|GS|SGS|South Georgia and the South Sandwich Islands|South Georgia|S. Geo. and S. Sandw. Is.
S. Sudan|SS|SSD|South Sudan
Saint Helena|SH|SHN|St Helena
Saint Lucia|LC|LCA|St Lucia
Samoa|WS|WSM
San Marino|SM|SMR
São Tomé and Principe|ST|STP|Sao Tome and Principe
Saudi Arabia|SA|SAU
Senegal|SN|SEN
Serbia|RS|SRB
Seychelles|SC|SYC
Siachen Glacier
Sierra Leone|SL|SLE
Singapore|SG|SGP
Sint Maarten|SX|SXM
Slovakia|SK|SVK|Slovak Republic
Slovenia|SI|SVN
Solomon Is.|SB|SLB|Solomon Islands
Somalia|SO|SOM
Somaliland||Republic of Somaliland
South Africa|ZA|ZAF
South Korea|KR|KOR|Republic of Korea|Korea
Spain|ES|ESP
Sri Lanka|LK|LKA
St-Barthélemy|BL|BLM|Saint Barthélemy|St. Barthélemy
St-Martin|MF|MAF|Saint Martin|St. Martin
St. Kitts and Nevis|KN|KNA|Saint Kitts and Nevis
St. Pierre and Miquelon|PM|SPM|Saint Pierre and Miquelon
St. Vin. and Gren.|VC|VCT|Saint Vincent and the Grenadines|St Vincent and the Grenadines
Sudan|SD|SDN
Suriname|SR|SUR
Sweden|SE|SWE
Switzerland|CH|CHE
Syria|SY|SYR
Taiwan|TW|TWN
Tajikistan|TJ|TJK
Tanzania|TZ|TZA
Thailand|TH|THA
Timor-Leste|TL|TLS|East Timor
Togo|TG|TGO
Tonga|TO|TON
Trinidad and Tobago|TT|TTO|Trinidad
Tunisia|TN|TUN
Turkey|TR|TUR|Türkiye|Turkiye
Turkmenistan|TM|TKM
Turks and Caicos Is.|TC|TCA|Turks and Caicos Islands
U.S. Virgin Is.|VI|VIR|US Virgin Islands|United States Virgin Islands
Uganda|UG|UGA
Ukraine|UA|UKR
United Arab Emirates|AE|ARE|UAE|Emirates
United Kingdom|UK|GB|GBR|Great Britain|Britain
United States of America|US|USA|America|U.S.|U.S.A.|United States
Uruguay|UY|URY
Uzbekistan|UZ|UZB
Vanuatu|VU|VUT
Vatican|VA|VAT|Vatican City|Holy See
Venezuela|VE|VEN
Vietnam|VN|VNM|Viet Nam
W. Sahara|EH|ESH|Western Sahara
Wallis and Futuna Is.|WF|WLF|Wallis and Futuna
Yemen|YE|YEM
Zambia|ZM|ZMB
Zimbabwe|ZW|ZWE`;

export interface NameBook {
  /** map-data name for a row's region text, or undefined */
  find(text: string): string | undefined;
  /** short label code ("CA", "UK"); falls back to the name */
  code(mapName: string): string;
}

function book(table: string): NameBook {
  const lookup = new Map<string, string>();
  const codes = new Map<string, string>();
  for (const line of table.split('\n')) {
    const [name, code, ...others] = line.split('|');
    if (code) codes.set(name, code);
    for (const alias of [name, code, ...others]) if (alias) lookup.set(normName(alias), name);
  }
  return {
    find: (text) => lookup.get(normName(text)),
    code: (mapName) => codes.get(mapName) ?? mapName,
  };
}

export const US_NAMES = book(US);
export const WORLD_NAMES = book(WORLD);
