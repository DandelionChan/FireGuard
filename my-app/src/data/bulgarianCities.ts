export interface City {
  name: string;
  lat: number;
  lon: number;
}

export interface CityRisk extends City {
  risk: number;
}

export const bulgarianCities: City[] = [
  { name: 'Sofia', lat: 42.6977, lon: 23.3219 },
  { name: 'Plovdiv', lat: 42.1354, lon: 24.7453 },
  { name: 'Varna', lat: 43.2141, lon: 27.9147 },
  { name: 'Burgas', lat: 42.5048, lon: 27.4626 },
  { name: 'Ruse', lat: 43.8356, lon: 25.9657 },
  { name: 'Stara Zagora', lat: 42.4247, lon: 25.6345 },
  { name: 'Pleven', lat: 43.4170, lon: 24.6060 },
  { name: 'Sliven', lat: 42.6810, lon: 26.3220 },
  { name: 'Dobrich', lat: 43.5700, lon: 27.8300 },
  { name: 'Shumen', lat: 43.2700, lon: 26.9200 },
  { name: 'Pernik', lat: 42.6100, lon: 23.0400 },
  { name: 'Haskovo', lat: 41.9400, lon: 25.5600 },
  { name: 'Yambol', lat: 42.4800, lon: 26.5100 },
  { name: 'Pazardzhik', lat: 42.1900, lon: 24.3300 },
  { name: 'Blagoevgrad', lat: 42.0200, lon: 23.1000 },
  { name: 'Veliko Tarnovo', lat: 43.0800, lon: 25.6300 },
  { name: 'Vratsa', lat: 43.2100, lon: 23.5500 },
  { name: 'Gabrovo', lat: 42.8740, lon: 25.3172 },
  { name: 'Asenovgrad', lat: 42.0167, lon: 24.8667 },
  { name: 'Vidin', lat: 43.9900, lon: 22.8800 },
  { name: 'Kazanlak', lat: 42.6200, lon: 25.3900 },
  { name: 'Kardzhali', lat: 41.6500, lon: 25.3700 },
  { name: 'Kyustendil', lat: 42.2800, lon: 22.6900 },
  { name: 'Montana', lat: 43.4100, lon: 23.2300 },
  { name: 'Dimitrovgrad', lat: 42.0500, lon: 25.5900 },
  { name: 'Targovishte', lat: 43.2500, lon: 26.5700 },
  { name: 'Lovech', lat: 43.1300, lon: 24.7200 },
  { name: 'Dupnitsa', lat: 42.2700, lon: 23.1100 },
  { name: 'Silistra', lat: 44.1200, lon: 27.2600 },
  { name: 'Razgrad', lat: 43.5300, lon: 26.5200 },
  { name: 'Gorna Oryahovitsa', lat: 43.1300, lon: 25.6600 },
  { name: 'Svishtov', lat: 43.6200, lon: 25.3400 },
  { name: 'Petrich', lat: 41.4000, lon: 23.2100 },
  { name: 'Smolyan', lat: 41.5800, lon: 24.7100 },
  { name: 'Sandanski', lat: 41.5700, lon: 23.2800 },
  { name: 'Samokov', lat: 42.3400, lon: 23.5500 },
  { name: 'Lom', lat: 43.8100, lon: 23.2400 },
  { name: 'Sevlievo', lat: 43.0250, lon: 25.1000 },
  { name: 'Karlovo', lat: 42.6400, lon: 24.8100 },
  { name: 'Velingrad', lat: 42.0300, lon: 23.9900 },
  { name: 'Nova Zagora', lat: 42.4900, lon: 26.0100 },
  { name: 'Aytos', lat: 42.7000, lon: 27.2500 },
  { name: 'Gotse Delchev', lat: 41.5700, lon: 23.7300 },
  { name: 'Kavarna', lat: 43.4300, lon: 28.3400 },
  { name: 'Botevgrad', lat: 42.9000, lon: 23.7900 },
  { name: 'Peshtera', lat: 42.0300, lon: 24.3000 },
  { name: 'Harmanli', lat: 41.9400, lon: 25.9000 },
  { name: 'Popovo', lat: 43.3500, lon: 26.2300 },
  { name: 'Chirpan', lat: 42.2000, lon: 25.3300 },
  { name: 'Provadia', lat: 43.1800, lon: 27.4400 },
  { name: 'Devin', lat: 41.7431, lon: 24.4000 }
];
