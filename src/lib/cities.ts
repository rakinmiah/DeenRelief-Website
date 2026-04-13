export interface City {
  name: string;
  slug: string;
  priority: boolean; // Gets its own dedicated page
}

export const cities: City[] = [
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
  { name: "Aberdeen", slug: "aberdeen", priority: false },
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
  { name: "Newport", slug: "newport", priority: false },
  { name: "Northampton", slug: "northampton", priority: false },
  { name: "Nottingham", slug: "nottingham", priority: false },
  { name: "Oldham", slug: "oldham", priority: false },
  { name: "Oxford", slug: "oxford", priority: false },
  { name: "Plymouth", slug: "plymouth", priority: false },
  { name: "Portsmouth", slug: "portsmouth", priority: false },
  { name: "Reading", slug: "reading", priority: false },
  { name: "Rochdale", slug: "rochdale", priority: false },
  { name: "Slough", slug: "slough", priority: false },
  { name: "Southampton", slug: "southampton", priority: false },
  { name: "Stoke-on-Trent", slug: "stoke-on-trent", priority: false },
  { name: "Swansea", slug: "swansea", priority: false },
  { name: "Wolverhampton", slug: "wolverhampton", priority: false },
];

export const priorityCities = cities.filter((c) => c.priority);
export const cityNames = cities.map((c) => c.name).sort();

export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

export function getCityByName(name: string): City | undefined {
  return cities.find((c) => c.name === name);
}
