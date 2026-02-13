export type VegSpeciesItem = {
  commonName: string;
  scientificName: string;
  typicalUseOrNotes: string;
};

export const VEG_SPECIES_CATALOG: VegSpeciesItem[] = [
  {
    commonName: "Eucalipto",
    scientificName: "Eucalyptus spp.",
    typicalUseOrNotes: "Plantios comerciais; crescimento rápido; atenção a galhos e risco de queda em ventos fortes.",
  },
  {
    commonName: "Pinus",
    scientificName: "Pinus spp.",
    typicalUseOrNotes: "Reflorestamento; pode gerar acúmulo de material seco; atenção a tombamentos e cones.",
  },
  {
    commonName: "Acácia-negra",
    scientificName: "Acacia mearnsii",
    typicalUseOrNotes: "Comum no RS; espécie exótica; pode invadir áreas e formar maciços densos.",
  },
  {
    commonName: "Acácia",
    scientificName: "Acacia spp.",
    typicalUseOrNotes: "Grupo amplo; árvores e arbustos; pode exigir poda frequente em áreas urbanas.",
  },
  {
    commonName: "Cinamomo",
    scientificName: "Melia azedarach",
    typicalUseOrNotes: "Muito usado em arborização; frutos podem ser tóxicos; galhos quebradiços.",
  },
  {
    commonName: "Tipuana",
    scientificName: "Tipuana tipu",
    typicalUseOrNotes: "Arborização urbana; raízes agressivas; copa ampla pode interferir em rede aérea.",
  },
  {
    commonName: "Sibipiruna",
    scientificName: "Poincianella pluviosa (sin. Caesalpinia pluviosa)",
    typicalUseOrNotes: "Arborização; copa densa; atenção a podas em época de floração e conflitos com fiação.",
  },
  {
    commonName: "Ipê-amarelo",
    scientificName: "Handroanthus albus",
    typicalUseOrNotes: "Nativa; muito usada em arborização; floração marcante; podas moderadas.",
  },
  {
    commonName: "Ipê-roxo",
    scientificName: "Handroanthus impetiginosus",
    typicalUseOrNotes: "Nativa; floração roxa; atenção a galhos em áreas de tráfego e proximidade de rede.",
  },
  {
    commonName: "Jacarandá-mimoso",
    scientificName: "Jacaranda mimosifolia",
    typicalUseOrNotes: "Arborização; floração violeta; pode soltar flores/frutos; podas de formação são comuns.",
  },
  {
    commonName: "Flamboyant",
    scientificName: "Delonix regia",
    typicalUseOrNotes: "Ornamental; copa muito ampla; pode interferir em rede; exige manejo em calçadas estreitas.",
  },
  {
    commonName: "Oiti",
    scientificName: "Licania tomentosa",
    typicalUseOrNotes: "Muito comum em SP; copa densa; poda de levantamento/limpeza frequente.",
  },
  {
    commonName: "Ficus/Benjamim",
    scientificName: "Ficus benjamina",
    typicalUseOrNotes: "Raízes agressivas; pode causar danos a calçadas; manejo cuidadoso recomendado.",
  },
  {
    commonName: "Mangueira",
    scientificName: "Mangifera indica",
    typicalUseOrNotes: "Frutífera; frutos pesados; risco em vias/áreas públicas; podas de segurança.",
  },
  {
    commonName: "Goiabeira",
    scientificName: "Psidium guajava",
    typicalUseOrNotes: "Frutífera; comum em áreas rurais/urbanas; pode exigir poda de limpeza e condução.",
  },
  {
    commonName: "Pitangueira",
    scientificName: "Eugenia uniflora",
    typicalUseOrNotes: "Nativa; frutífera; porte menor; adequada para calçadas; manejo leve.",
  },
  {
    commonName: "Araucária",
    scientificName: "Araucaria angustifolia",
    typicalUseOrNotes: "Símbolo do Sul; espécie protegida em várias situações; manejo exige atenção normativa.",
  },
  {
    commonName: "Bracatinga",
    scientificName: "Mimosa scabrella",
    typicalUseOrNotes: "Nativa do Sul; crescimento rápido; pode ocorrer em capoeiras e bordas de faixa.",
  },
  {
    commonName: "Erva-mate",
    scientificName: "Ilex paraguariensis",
    typicalUseOrNotes: "Comum no RS; cultivo extrativista; porte médio; manejo em bordas e áreas rurais.",
  },
  {
    commonName: "Plátano",
    scientificName: "Platanus × acerifolia",
    typicalUseOrNotes: "Muito usado no RS; folhas grandes; pode causar alergias; poda de limpeza frequente.",
  },
  {
    commonName: "Salgueiro",
    scientificName: "Salix humboldtiana",
    typicalUseOrNotes: "Áreas úmidas; crescimento rápido; galhos quebradiços; risco em temporais.",
  },
  {
    commonName: "Ligustro/Alfeneiro",
    scientificName: "Ligustrum lucidum",
    typicalUseOrNotes: "Exótica invasora em algumas regiões; frutos atraem aves; manejo para contenção.",
  },
  {
    commonName: "Grevílea",
    scientificName: "Grevillea robusta",
    typicalUseOrNotes: "Arborização e sombra; pode alcançar grande porte; atenção a conflitos com rede.",
  },
  {
    commonName: "Aroeira-pimenteira",
    scientificName: "Schinus terebinthifolia",
    typicalUseOrNotes: "Nativa; frutificação intensa; pode atrair fauna; manejo em áreas urbanas e bordas.",
  },
];

export const findVegSpeciesByCommonName = (commonName: string): VegSpeciesItem | null => {
  const key = commonName.trim().toLowerCase();
  if (!key) return null;
  return VEG_SPECIES_CATALOG.find((s) => s.commonName.toLowerCase() === key) ?? null;
};

