const { spotsDb } = require('./services/db');

const spots = [
  { name: 'Jezioro Śniardwy', lat: 53.756, lng: 21.720, type: 'jezioro', description: 'Największe jezioro w Polsce. Doskonałe łowisko na szczupaka, sandacza i okonia. Głębokość do 23m.' },
  { name: 'Jezioro Mamry', lat: 54.105, lng: 21.765, type: 'jezioro', description: 'Drugie co do wielkości jezioro w Polsce. Liczne zatoki i wyspy. Świetne na sandacza i węgorza.' },
  { name: 'Jezioro Niegocin', lat: 54.017, lng: 21.750, type: 'jezioro', description: 'Popularne jezioro Mazur. Bogate w szczupaka, okonia i lina.' },
  { name: 'Wisła - Warszawa', lat: 52.235, lng: 21.005, type: 'rzeka', description: 'Odcinek Wisły w Warszawie. Sandacz, boleń, sum. Najlepsze miejsca pod mostami i przy ostrogach.' },
  { name: 'Wisła - Kraków', lat: 50.055, lng: 19.935, type: 'rzeka', description: 'Wisła w okolicy Krakowa. Pstrąg, lipień, kleń. Regulowane koryto z ciekawymi nurami.' },
  { name: 'Odra - Wrocław', lat: 51.110, lng: 17.040, type: 'rzeka', description: 'Odra w centrum Wrocławia. Sum, sandacz, boleń. Dużo stanowisk pod mostami.' },
  { name: 'Zbiornik Solina', lat: 49.380, lng: 22.450, type: 'zbiornik', description: 'Największy zbiornik retencyjny w Polsce (Bieszczady). Troć jeziorowa, pstrąg, sandacz. Głębokość do 60m.' },
  { name: 'Zalew Zegrzyński', lat: 52.470, lng: 20.980, type: 'zbiornik', description: 'Popularny zbiornik pod Warszawą. Sandacz, szczupak, leszcz. Łatwy dojazd, dużo stanowisk.' },
  { name: 'Jezioro Drawsko', lat: 53.570, lng: 15.870, type: 'jezioro', description: 'Drugie najgłębsze jezioro w Polsce (79m). Sieja, troć, sandacz. Krystalicznie czysta woda.' },
  { name: 'Jezioro Wigry', lat: 54.060, lng: 23.080, type: 'jezioro', description: 'Jezioro w Suwalskim Parku Krajobrazowym. Sielawa, sieja, szczupak, lin. Piękna sceneria.' },
  { name: 'Bug - Drohiczyn', lat: 52.400, lng: 22.660, type: 'rzeka', description: 'Dzika, nieuregulowana rzeka. Brzana, boleń, jaź, kleń. Jedna z najczystszych rzek w Polsce.' },
  { name: 'Dunajec - Sromowce', lat: 49.395, lng: 20.420, type: 'rzeka', description: 'Przełom Dunajca w Pieninach. Pstrąg potokowy, lipień. Przepiękna sceneria, wędkowanie spławikowe.' },
  { name: 'Zbiornik Goczałkowicki', lat: 49.880, lng: 18.920, type: 'zbiornik', description: 'Duży zbiornik na Wiśle (Śląsk). Karp, amur, sandacz, szczupak. Popularne łowisko karpiowe.' },
  { name: 'Jezioro Łebsko', lat: 54.720, lng: 17.350, type: 'jezioro', description: 'Jezioro przybrzeżne w Słowińskim PN. Szczupak, okoń, węgorz, troć wędrowna. Płytkie, bogate w ryby.' },
  { name: 'Kanał Żerański', lat: 52.340, lng: 20.980, type: 'rzeka', description: 'Kanał łączący Wisłę z Zalewem Zegrzyńskim. Sandacz, szczupak, sum. Popularne łowisko warszawiaków.' },
  { name: 'Jezioro Jeziorak', lat: 53.720, lng: 19.570, type: 'jezioro', description: 'Najdłuższe jezioro w Polsce (27km). Sandacz, szczupak, okoń, lin. Liczne zatoki i wyspy.' },
  { name: 'Zbiornik Dobczycki', lat: 49.875, lng: 20.090, type: 'zbiornik', description: 'Zbiornik na Rabie koło Krakowa. Troć jeziorowa, pstrąg, sandacz. Czysta woda, duże ryby.' },
  { name: 'San - Przemyśl', lat: 49.785, lng: 22.770, type: 'rzeka', description: 'Rzeka San w okolicy Przemyśla. Brzana, świnka, kleń, boleń. Piękna podgórska rzeka.' },
];

let added = 0;
for (const spot of spots) {
  try {
    spotsDb.create({ ...spot, isPublic: true });
    added++;
    console.log(`✓ ${spot.name}`);
  } catch (e) {
    console.log(`✗ ${spot.name}: ${e.message}`);
  }
}

console.log(`\nDodano ${added}/${spots.length} łowisk.`);
