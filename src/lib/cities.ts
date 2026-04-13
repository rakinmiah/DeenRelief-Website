export interface City {
  name: string;
  slug: string;
  priority: boolean; // Shown prominently in the "Popular Cities" section
}

export const cities: City[] = [
  // Top 10 — highest Muslim population / search volume
  { name: "London", slug: "london", priority: true },
  { name: "Birmingham", slug: "birmingham", priority: true },
  { name: "Manchester", slug: "manchester", priority: true },
  { name: "Bradford", slug: "bradford", priority: true },
  { name: "Leeds", slug: "leeds", priority: true },
  { name: "Leicester", slug: "leicester", priority: true },
  { name: "Luton", slug: "luton", priority: true },
  { name: "Blackburn", slug: "blackburn", priority: true },
  { name: "Sheffield", slug: "sheffield", priority: true },
  { name: "Brighton", slug: "brighton", priority: true },

  // Major cities
  { name: "Aberdeen", slug: "aberdeen", priority: false },
  { name: "Bath", slug: "bath", priority: false },
  { name: "Belfast", slug: "belfast", priority: false },
  { name: "Bolton", slug: "bolton", priority: false },
  { name: "Bristol", slug: "bristol", priority: false },
  { name: "Cambridge", slug: "cambridge", priority: false },
  { name: "Cardiff", slug: "cardiff", priority: false },
  { name: "Coventry", slug: "coventry", priority: false },
  { name: "Derby", slug: "derby", priority: false },
  { name: "Derry", slug: "derry", priority: false },
  { name: "Dundee", slug: "dundee", priority: false },
  { name: "Edinburgh", slug: "edinburgh", priority: false },
  { name: "Glasgow", slug: "glasgow", priority: false },
  { name: "Liverpool", slug: "liverpool", priority: false },
  { name: "Milton Keynes", slug: "milton-keynes", priority: false },
  { name: "Newcastle", slug: "newcastle", priority: false },
  { name: "Newport", slug: "newport", priority: false },
  { name: "Northampton", slug: "northampton", priority: false },
  { name: "Norwich", slug: "norwich", priority: false },
  { name: "Nottingham", slug: "nottingham", priority: false },
  { name: "Oxford", slug: "oxford", priority: false },
  { name: "Plymouth", slug: "plymouth", priority: false },
  { name: "Portsmouth", slug: "portsmouth", priority: false },
  { name: "Preston", slug: "preston", priority: false },
  { name: "Reading", slug: "reading", priority: false },
  { name: "Southampton", slug: "southampton", priority: false },
  { name: "Stoke-on-Trent", slug: "stoke-on-trent", priority: false },
  { name: "Sunderland", slug: "sunderland", priority: false },
  { name: "Swansea", slug: "swansea", priority: false },
  { name: "Wolverhampton", slug: "wolverhampton", priority: false },
  { name: "York", slug: "york", priority: false },

  // Towns with significant Muslim populations (2021 Census)
  { name: "Accrington", slug: "accrington", priority: false },
  { name: "Aylesbury", slug: "aylesbury", priority: false },
  { name: "Banbury", slug: "banbury", priority: false },
  { name: "Barking", slug: "barking", priority: false },
  { name: "Barnsley", slug: "barnsley", priority: false },
  { name: "Batley", slug: "batley", priority: false },
  { name: "Bedford", slug: "bedford", priority: false },
  { name: "Blackpool", slug: "blackpool", priority: false },
  { name: "Bournemouth", slug: "bournemouth", priority: false },
  { name: "Burnley", slug: "burnley", priority: false },
  { name: "Burton upon Trent", slug: "burton-upon-trent", priority: false },
  { name: "Bury", slug: "bury", priority: false },
  { name: "Chatham", slug: "chatham", priority: false },
  { name: "Cheltenham", slug: "cheltenham", priority: false },
  { name: "Colchester", slug: "colchester", priority: false },
  { name: "Crawley", slug: "crawley", priority: false },
  { name: "Croydon", slug: "croydon", priority: false },
  { name: "Dagenham", slug: "dagenham", priority: false },
  { name: "Dewsbury", slug: "dewsbury", priority: false },
  { name: "Doncaster", slug: "doncaster", priority: false },
  { name: "Dudley", slug: "dudley", priority: false },
  { name: "Ealing", slug: "ealing", priority: false },
  { name: "Exeter", slug: "exeter", priority: false },
  { name: "Gloucester", slug: "gloucester", priority: false },
  { name: "Halifax", slug: "halifax", priority: false },
  { name: "Harrow", slug: "harrow", priority: false },
  { name: "High Wycombe", slug: "high-wycombe", priority: false },
  { name: "Hounslow", slug: "hounslow", priority: false },
  { name: "Huddersfield", slug: "huddersfield", priority: false },
  { name: "Ilford", slug: "ilford", priority: false },
  { name: "Ipswich", slug: "ipswich", priority: false },
  { name: "Keighley", slug: "keighley", priority: false },
  { name: "Kettering", slug: "kettering", priority: false },
  { name: "Kingston upon Thames", slug: "kingston-upon-thames", priority: false },
  { name: "Lancaster", slug: "lancaster", priority: false },
  { name: "Lincoln", slug: "lincoln", priority: false },
  { name: "Loughborough", slug: "loughborough", priority: false },
  { name: "Maidstone", slug: "maidstone", priority: false },
  { name: "Middlesbrough", slug: "middlesbrough", priority: false },
  { name: "Nelson", slug: "nelson", priority: false },
  { name: "Oldham", slug: "oldham", priority: false },
  { name: "Peterborough", slug: "peterborough", priority: false },
  { name: "Rochdale", slug: "rochdale", priority: false },
  { name: "Rotherham", slug: "rotherham", priority: false },
  { name: "Slough", slug: "slough", priority: false },
  { name: "Southall", slug: "southall", priority: false },
  { name: "Stratford", slug: "stratford", priority: false },
  { name: "Swindon", slug: "swindon", priority: false },
  { name: "Tooting", slug: "tooting", priority: false },
  { name: "Walsall", slug: "walsall", priority: false },
  { name: "Watford", slug: "watford", priority: false },
  { name: "West Bromwich", slug: "west-bromwich", priority: false },
  { name: "Wigan", slug: "wigan", priority: false },
  { name: "Woking", slug: "woking", priority: false },
  { name: "Worcester", slug: "worcester", priority: false },
];

export const priorityCities = cities.filter((c) => c.priority);
export const cityNames = cities.map((c) => c.name).sort();

export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

export function getCityByName(name: string): City | undefined {
  return cities.find((c) => c.name === name);
}
