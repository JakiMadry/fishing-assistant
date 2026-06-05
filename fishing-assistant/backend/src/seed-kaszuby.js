const { spotsDb } = require('./services/db');

const spots = [
  { name: 'Jezioro Kamień', lat: 54.295, lng: 17.985, type: 'jezioro', description: 'Jezioro na Kaszubach. Czysta woda, szczupak, okoń, lin. Spokojne, mało uczęszczane.' },
  { name: 'Jezioro Żarnowieckie', lat: 54.765, lng: 18.100, type: 'jezioro', description: 'Duże jezioro rynnowe na Kaszubach. Troć jeziorowa, sieja, sandacz, szczupak. Głębokość do 19m.' },
  { name: 'Jezioro Kozy', lat: 54.310, lng: 17.950, type: 'jezioro', description: 'Malownicze jezioro kaszubskie. Karp, lin, szczupak, okoń. Otoczone lasami.' },
  { name: 'Jezioro Raduńskie Górne', lat: 54.250, lng: 18.020, type: 'jezioro', description: 'Jedno z największych jezior kaszubskich. Sandacz, szczupak, sieja, węgorz. Część Szlaku Raduńskiego.' },
  { name: 'Jezioro Raduńskie Dolne', lat: 54.270, lng: 18.000, type: 'jezioro', description: 'Głębokie jezioro rynnowe. Troć, sieja, sandacz. Piękna okolica, czysta woda.' },
  { name: 'Jezioro Ostrzyckie', lat: 54.245, lng: 18.085, type: 'jezioro', description: 'Popularne jezioro rekreacyjne na Kaszubach. Szczupak, okoń, leszcz, lin. Łatwy dostęp.' },
  { name: 'Jezioro Brodno Wielkie', lat: 54.280, lng: 18.050, type: 'jezioro', description: 'Spokojne jezioro otoczone lasami. Szczupak, okoń, płoć. Idealne na spławik.' },
  { name: 'Jezioro Kłodno', lat: 54.300, lng: 18.060, type: 'jezioro', description: 'Jezioro w sercu Kaszub. Lin, karp, szczupak. Malownicze otoczenie.' },
  { name: 'Jezioro Łapalickie', lat: 54.275, lng: 18.110, type: 'jezioro', description: 'Jezioro koło Kartuz. Sandacz, szczupak, okoń, leszcz. Popularny wśród lokalnych wędkarzy.' },
  { name: 'Jezioro Gowidlińskie', lat: 54.300, lng: 18.120, type: 'jezioro', description: 'Duże jezioro kaszubskie. Węgorz, sandacz, szczupak, sieja. Dobre warunki do spinningowania.' },
  { name: 'Jezioro Wdzydze', lat: 53.970, lng: 17.930, type: 'jezioro', description: 'Piąte co do wielkości jezioro w Polsce. Sieja, sandacz, szczupak, węgorz. Wdzydzki Park Krajobrazowy.' },
  { name: 'Jezioro Charzykowskie', lat: 53.770, lng: 17.500, type: 'jezioro', description: 'Jezioro w Borach Tucholskich. Sandacz, szczupak, okoń, sieja. Idealne na trolling.' },
  { name: 'Jezioro Karsińskie', lat: 53.800, lng: 17.530, type: 'jezioro', description: 'Sąsiad Charzykowskiego. Sum, sandacz, szczupak. Spokojne łowisko, mniej ludzi.' },
  { name: 'Jezioro Patulskie', lat: 54.320, lng: 18.030, type: 'jezioro', description: 'Małe jezioro na Kaszubach. Karp, lin, karaś. Dobre na gruntówkę i methodę.' },
  { name: 'Jezioro Lubygość', lat: 54.340, lng: 17.960, type: 'jezioro', description: 'Ciche jezioro otoczone polami. Szczupak, okoń, płoć. Idealne dla początkujących.' },
  { name: 'Jezioro Białe (Kościerzyna)', lat: 54.120, lng: 17.970, type: 'jezioro', description: 'Jezioro koło Kościerzyny. Czysta woda, szczupak, okoń, lin. Popularne wśród spławikowców.' },
  { name: 'Jezioro Dobrzyckie', lat: 54.180, lng: 18.000, type: 'jezioro', description: 'Ciche kaszubskie jezioro. Karaś, lin, płoć, szczupak. Otoczone lasem.' },
  { name: 'Jezioro Długie (Łapalice)', lat: 54.270, lng: 18.130, type: 'jezioro', description: 'Wąskie, rynnowe jezioro. Okoń, szczupak, leszcz. Ciekawe stanowiska pod trzciną.' },
  { name: 'Jezioro Rekowo', lat: 54.360, lng: 18.040, type: 'jezioro', description: 'Małe, malownicze jezioro. Karp, lin, karaś. Spokój i cisza gwarantowane.' },
  { name: 'Jezioro Przywidzkie', lat: 54.210, lng: 18.160, type: 'jezioro', description: 'Jezioro koło Przywidza. Sandacz, szczupak, okoń. Dobre na spinning z łódki.' },
  { name: 'Rzeka Radunia', lat: 54.250, lng: 18.200, type: 'rzeka', description: 'Najdłuższa rzeka Kaszub. Pstrąg potokowy, troć wędrowna, lipień. Regulacje wędkarskie PZW.' },
  { name: 'Rzeka Wda', lat: 53.900, lng: 18.000, type: 'rzeka', description: 'Rzeka szlak kajakowy. Pstrąg, troć, brzana. Piękna dzika dolina.' },
  { name: 'Jezioro Wielewskie', lat: 54.150, lng: 18.050, type: 'jezioro', description: 'Jezioro w gminie Stężyca. Szczupak, sandacz, okoń. Piękne widoki na Wzgórza Szymbarskie.' },
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

console.log(`\nDodano ${added}/${spots.length} łowisk kaszubskich.`);
