// Ghana-first seed data. Coordinates are approximate (WGS84) and intended
// for demo/bootstrap use — refine with surveyed data over time.

export const CATEGORIES = [
  { id: 'nightlife',  label: 'Clubs',      icon: '🎉' },
  { id: 'bar',        label: 'Bars',       icon: '🍹' },
  { id: 'restaurant', label: 'Food',       icon: '🍽️' },
  { id: 'cafe',       label: 'Cafes',      icon: '☕' },
  { id: 'mall',       label: 'Malls',      icon: '🛍️' },
  { id: 'market',     label: 'Markets',    icon: '🛒' },
  { id: 'hotel',      label: 'Hotels',     icon: '🏨' },
  { id: 'beach',      label: 'Beaches',    icon: '🏖️' },
  { id: 'fuel',       label: 'Fuel',       icon: '⛽' },
  { id: 'atm',        label: 'ATMs',       icon: '🏧' },
  { id: 'hospital',   label: 'Medical',    icon: '🏥' },
  { id: 'landmark',   label: 'Landmarks',  icon: '🏛️' },
  { id: 'transport',  label: 'Transport',  icon: '🚌' },
  { id: 'education',  label: 'Education',  icon: '🎓' },
  { id: 'attraction', label: 'Attractions', icon: '🌍' },
];

// tags: comma-separated flags — 'hot' (What's Hot), 'quick' (Quick Access)
export const PLACES = [
  // ── Landmarks & civic ──────────────────────────────────────────────
  { name: 'Kotoka International Airport', category: 'transport', icon: '✈️', area: 'Airport City', lat: 5.6052, lng: -0.1719, tags: 'quick', description: 'KIA — Terminal 3, international and domestic flights.' },
  { name: 'Kwame Nkrumah Circle', category: 'landmark', icon: '🔵', area: 'Circle', lat: 5.5569, lng: -0.2168, tags: 'quick', description: 'Central interchange and transport hub.' },
  { name: 'Kwame Nkrumah Mausoleum', category: 'landmark', icon: '🏛️', area: 'High Street', lat: 5.5459, lng: -0.2059, description: 'Memorial park honouring Ghana’s first president.' },
  { name: 'Independence Square (Black Star Square)', category: 'landmark', icon: '⭐', area: 'Osu', lat: 5.5478, lng: -0.1918, description: 'Iconic parade grounds by the sea.' },
  { name: 'Jamestown Lighthouse', category: 'landmark', icon: '🗼', area: 'Jamestown', lat: 5.5300, lng: -0.2130, description: 'Historic lighthouse in old Accra.' },
  { name: 'National Theatre of Ghana', category: 'landmark', icon: '🎭', area: 'Victoriaborg', lat: 5.5525, lng: -0.2011, description: 'Distinctive ship-shaped performing arts centre.' },
  { name: 'W.E.B. Du Bois Centre', category: 'landmark', icon: '🏛️', area: 'Cantonments', lat: 5.5794, lng: -0.1743, description: 'Memorial centre for Pan-African culture.' },

  // ── Quick access / hot spots ───────────────────────────────────────
  { name: 'Accra Mall', category: 'mall', icon: '🛍️', area: 'Spintex Road', lat: 5.6314, lng: -0.1686, tags: 'quick', description: 'Major shopping mall at Tetteh Quarshie interchange.' },
  { name: 'Oxford Street, Osu', category: 'nightlife', icon: '🌴', area: 'Osu', lat: 5.5543, lng: -0.1759, tags: 'quick', description: 'Nightlife and food strip — Cantonments Road.' },
  { name: 'Labadi Beach', category: 'beach', icon: '🏖️', area: 'La', lat: 5.5601, lng: -0.1760, tags: 'hot', rating: 4.3, description: 'Accra’s most popular beach — live music on weekends.' },
  { name: 'Front/Back', category: 'nightlife', icon: '🎧', area: 'Osu', lat: 5.5698, lng: -0.1888, tags: 'hot', rating: 4.5, description: 'Courtyard bar and club with live DJs.' },
  { name: 'Republic Bar & Grill', category: 'bar', icon: '🍹', area: 'Osu', lat: 5.5644, lng: -0.1878, tags: 'hot', rating: 4.6, description: 'Legendary local bar — try the kokroko.' },
  { name: '+233 Jazz Bar & Grill', category: 'bar', icon: '🎷', area: 'North Ridge', lat: 5.5570, lng: -0.1820, tags: 'hot', rating: 4.4, description: 'Live jazz and highlife most nights.' },
  { name: 'Café Kwae', category: 'cafe', icon: '☕', area: 'Airport City', lat: 5.5506, lng: -0.1998, tags: 'hot', rating: 4.5, description: 'Speciality coffee at One Airport Square.' },
  { name: 'Bloom Bar', category: 'nightlife', icon: '🍸', area: 'Osu', lat: 5.5660, lng: -0.1830, rating: 4.2, description: 'Open-air lounge, busy on weekends.' },
  { name: 'Skybar 25', category: 'bar', icon: '🌃', area: 'Airport City', lat: 5.6010, lng: -0.1780, rating: 4.3, description: 'Rooftop bar at Alto Tower, Villaggio.' },

  // ── Markets ────────────────────────────────────────────────────────
  { name: 'Makola Market', category: 'market', icon: '🛒', area: 'Accra Central', lat: 5.5460, lng: -0.2110, description: 'The heart of Accra trading — everything under the sun.' },
  { name: 'Kaneshie Market', category: 'market', icon: '🛒', area: 'Kaneshie', lat: 5.5678, lng: -0.2358, description: 'Major market and transport hub on the Winneba road.' },
  { name: 'Madina Market', category: 'market', icon: '🛒', area: 'Madina', lat: 5.6830, lng: -0.1660, description: 'Sprawling market serving north-east Accra.' },
  { name: 'Osu Night Market', category: 'market', icon: '🌙', area: 'Osu', lat: 5.5520, lng: -0.1750, description: 'Evening street food and produce.' },
  { name: 'Art Centre (Centre for National Culture)', category: 'market', icon: '🎨', area: 'Accra Central', lat: 5.5440, lng: -0.2030, description: 'Crafts, kente, beads and souvenirs.' },

  // ── Malls ──────────────────────────────────────────────────────────
  { name: 'West Hills Mall', category: 'mall', icon: '🛍️', area: 'Weija', lat: 5.5480, lng: -0.3520, description: 'Large mall on the Cape Coast road.' },
  { name: 'Junction Mall', category: 'mall', icon: '🛍️', area: 'Nungua', lat: 5.6010, lng: -0.0670, description: 'Shopping mall serving Nungua and Teshie.' },
  { name: 'A&C Mall', category: 'mall', icon: '🛍️', area: 'East Legon', lat: 5.6350, lng: -0.1610, description: 'Neighbourhood mall in East Legon.' },
  { name: 'Marina Mall', category: 'mall', icon: '🛍️', area: 'Airport City', lat: 5.6040, lng: -0.1780, description: 'Mall near Kotoka Airport.' },

  // ── Food & cafes ───────────────────────────────────────────────────
  { name: 'Buka Restaurant', category: 'restaurant', icon: '🍽️', area: 'Osu', lat: 5.5580, lng: -0.1770, rating: 4.4, description: 'West African classics — jollof, banku, tilapia.' },
  { name: 'Azmera Restaurant', category: 'restaurant', icon: '🍲', area: 'Labone', lat: 5.5610, lng: -0.1690, rating: 4.3, description: 'Ghanaian buffet favourite.' },
  { name: 'Chez Clarisse', category: 'restaurant', icon: '🐟', area: 'Osu', lat: 5.5555, lng: -0.1745, rating: 4.5, description: 'Ivorian grilled fish and attiéké.' },
  { name: 'Katawodieso (Auntie Muni Waakye)', category: 'restaurant', icon: '🍛', area: 'Labone', lat: 5.5590, lng: -0.1710, rating: 4.6, description: 'Famous waakye spot.' },
  { name: 'Vine Café', category: 'cafe', icon: '☕', area: 'East Legon', lat: 5.6360, lng: -0.1580, rating: 4.2, description: 'Coffee and brunch in East Legon.' },

  // ── Hotels ─────────────────────────────────────────────────────────
  { name: 'Kempinski Hotel Gold Coast City', category: 'hotel', icon: '🏨', area: 'Ridge', lat: 5.5583, lng: -0.1958, rating: 4.7, description: 'Five-star hotel by the State House.' },
  { name: 'Mövenpick Ambassador Hotel', category: 'hotel', icon: '🏨', area: 'Ridge', lat: 5.5528, lng: -0.2022, rating: 4.6, description: 'Landmark hotel with gardens and pool.' },
  { name: 'Labadi Beach Hotel', category: 'hotel', icon: '🏨', area: 'La', lat: 5.5606, lng: -0.1728, rating: 4.6, description: 'Beachfront five-star hotel.' },
  { name: 'Alisa Hotel North Ridge', category: 'hotel', icon: '🏨', area: 'North Ridge', lat: 5.5650, lng: -0.1990, rating: 4.2, description: 'Business hotel in North Ridge.' },

  // ── Beaches ────────────────────────────────────────────────────────
  { name: 'Bojo Beach', category: 'beach', icon: '🏖️', area: 'Bortianor', lat: 5.5090, lng: -0.3480, rating: 4.2, description: 'Clean island beach reached by canoe.' },
  { name: 'Kokrobite Beach', category: 'beach', icon: '🏄', area: 'Kokrobite', lat: 5.4930, lng: -0.3690, rating: 4.1, description: 'Surf, reggae nights and beach bars.' },
  { name: 'Sandbox Beach Club', category: 'beach', icon: '🏖️', area: 'La', lat: 5.5560, lng: -0.1560, rating: 4.3, description: 'Beach club with volleyball and events.' },

  // ── Medical ────────────────────────────────────────────────────────
  { name: 'Korle Bu Teaching Hospital', category: 'hospital', icon: '🏥', area: 'Korle Bu', lat: 5.5365, lng: -0.2260, description: 'Ghana’s largest teaching hospital.' },
  { name: '37 Military Hospital', category: 'hospital', icon: '🏥', area: '37', lat: 5.5851, lng: -0.1809, description: 'Major hospital at 37 station — 24hr emergency.' },
  { name: 'Ridge Hospital (GARH)', category: 'hospital', icon: '🏥', area: 'Ridge', lat: 5.5620, lng: -0.1990, description: 'Greater Accra Regional Hospital.' },
  { name: 'University of Ghana Medical Centre', category: 'hospital', icon: '🏥', area: 'Legon', lat: 5.6400, lng: -0.1730, description: 'Modern referral hospital at Legon.' },

  // ── Fuel ───────────────────────────────────────────────────────────
  { name: 'Goil — Liberation Road', category: 'fuel', icon: '⛽', area: 'Airport', lat: 5.5990, lng: -0.1790, description: 'Fuel station on Liberation Road.' },
  { name: 'Shell — Ring Road Central', category: 'fuel', icon: '⛽', area: 'Circle', lat: 5.5640, lng: -0.2100, description: 'Fuel station near Circle.' },
  { name: 'TotalEnergies — Osu', category: 'fuel', icon: '⛽', area: 'Osu', lat: 5.5560, lng: -0.1800, description: 'Fuel station on Cantonments Road.' },

  // ── Education ──────────────────────────────────────────────────────
  { name: 'University of Ghana, Legon', category: 'education', icon: '🎓', area: 'Legon', lat: 5.6506, lng: -0.1868, description: 'Ghana’s premier university.' },
  { name: 'Ashesi University', category: 'education', icon: '🎓', area: 'Berekuso', lat: 5.7590, lng: -0.2200, description: 'Liberal arts and engineering university.' },
  { name: 'GIMPA', category: 'education', icon: '🎓', area: 'Achimota', lat: 5.6480, lng: -0.2180, description: 'Ghana Institute of Management and Public Administration.' },

  // ── Transport hubs ─────────────────────────────────────────────────
  { name: 'Neoplan Station (Circle)', category: 'transport', icon: '🚌', area: 'Circle', lat: 5.5710, lng: -0.2140, description: 'Long-distance trotro and bus station.' },
  { name: 'Tema Station (Accra Central)', category: 'transport', icon: '🚌', area: 'Accra Central', lat: 5.5480, lng: -0.2050, description: 'Trotro station for Tema-bound cars.' },
  { name: 'Kaneshie Lorry Station', category: 'transport', icon: '🚌', area: 'Kaneshie', lat: 5.5670, lng: -0.2370, description: 'Major station for Winneba/Kasoa routes.' },
  { name: 'Madina Lorry Station', category: 'transport', icon: '🚌', area: 'Madina', lat: 5.6900, lng: -0.1660, description: 'Hub for Adenta, Aburi and central Accra routes.' },
  { name: 'Achimota (ABC) Station', category: 'transport', icon: '🚌', area: 'Achimota', lat: 5.6140, lng: -0.2266, description: 'Trotro interchange on the Nsawam road.' },
  { name: 'Tudu Station', category: 'transport', icon: '🚌', area: 'Accra Central', lat: 5.5510, lng: -0.2070, description: 'Station for Ho, Aflao and Volta routes.' },

  // ── Beyond Accra (Ghana-first) ─────────────────────────────────────
  { name: 'Kejetia Market', category: 'market', icon: '🛒', area: 'Kumasi', city: 'Kumasi', lat: 6.6960, lng: -1.6220, description: 'West Africa’s largest market.' },
  { name: 'Manhyia Palace', category: 'landmark', icon: '🏰', area: 'Kumasi', city: 'Kumasi', lat: 6.7080, lng: -1.6130, description: 'Seat of the Asantehene.' },
  { name: 'Cape Coast Castle', category: 'attraction', icon: '🏰', area: 'Cape Coast', city: 'Cape Coast', lat: 5.1053, lng: -1.2466, description: 'UNESCO World Heritage slave castle and museum.' },
  { name: 'Elmina Castle', category: 'attraction', icon: '🏰', area: 'Elmina', city: 'Elmina', lat: 5.0847, lng: -1.3509, description: 'St George’s Castle, built 1482.' },
  { name: 'Kakum National Park', category: 'attraction', icon: '🌳', area: 'Central Region', city: 'Kakum', lat: 5.3500, lng: -1.3830, description: 'Rainforest canopy walkway.' },
  { name: 'Aburi Botanical Gardens', category: 'attraction', icon: '🌺', area: 'Aburi', city: 'Aburi', lat: 5.8480, lng: -0.1740, description: 'Historic hillside gardens with cool air.' },
  { name: 'Shai Hills Resource Reserve', category: 'attraction', icon: '🦌', area: 'Shai Hills', city: 'Doryumu', lat: 5.9160, lng: 0.0570, description: 'Savannah reserve with baboons and caves.' },
  { name: 'Wli Waterfalls', category: 'attraction', icon: '💦', area: 'Volta Region', city: 'Wli', lat: 7.1180, lng: 0.5780, description: 'West Africa’s tallest waterfall.' },
  { name: 'Lake Bosomtwe', category: 'attraction', icon: '🌊', area: 'Ashanti Region', city: 'Abono', lat: 6.5050, lng: -1.4180, description: 'Crater lake sacred to the Ashanti.' },
  { name: 'Mole National Park', category: 'attraction', icon: '🐘', area: 'Savannah Region', city: 'Larabanga', lat: 9.2610, lng: -1.8560, description: 'Elephants and safaris in the north.' },
  { name: 'Larabanga Mosque', category: 'landmark', icon: '🕌', area: 'Savannah Region', city: 'Larabanga', lat: 9.2190, lng: -1.8590, description: 'Ancient Sudanese-style mud mosque.' },
  { name: 'Takoradi Market Circle', category: 'market', icon: '🛒', area: 'Takoradi', city: 'Takoradi', lat: 4.8990, lng: -1.7570, description: 'The commercial heart of the Western Region.' },
];

export const TROTRO_ROUTES = [
  // ── Greater Accra core ────────────────────────────────────────────────────
  { slug: 'circle-kaneshie', title: '🚌 Circle → Kaneshie', route: 'Kwame Nkrumah Circle to Kaneshie Market', fare: 'GH₵2.00', duration: '~25 min', frequency: 'Every 5–10 min', board_at: 'Circle Interchange, shout "Kaneshie!"', callout: 'Kaneshie! Kaneshie!', traffic_note: 'Heavy 7–9am', station_name: 'Kwame Nkrumah Circle Station', station_lat: 5.5569, station_lng: -0.2168 },
  { slug: 'madina-central', title: '🚌 Madina → Central', route: 'Madina Station to Accra Central / Tudu', fare: 'GH₵3.00', duration: '~40 min', frequency: 'Every 15–20 min', board_at: 'Madina Station, end of line', callout: 'Accra! Central!', traffic_note: 'Heavy rush hours', station_name: 'Madina Lorry Station', station_lat: 5.6900, station_lng: -0.1660 },
  { slug: 'tema-central', title: '🚌 Tema → Central', route: 'Tema to Accra Central via Motorway', fare: 'GH₵5.00', duration: '~55 min', frequency: 'Every 20–30 min', board_at: 'Tema Station near Meridian Port', callout: 'Accra! Accra!', traffic_note: 'Motorway busy afternoons', station_name: 'Tema Lorry Station', station_lat: 5.6694, station_lng: -0.0168 },
  { slug: 'spintex-osu', title: '🚌 Spintex → Osu', route: 'Spintex Road to Osu via La Beach Road', fare: 'GH₵2.50', duration: '~30 min', frequency: 'Every 10–15 min', board_at: 'Spintex Roundabout', callout: 'Osu! Osu!', traffic_note: 'La Beach slow on weekends', station_name: 'Spintex Roundabout', station_lat: 5.6258, station_lng: -0.1545 },
  { slug: 'achimota-central', title: '🚌 Achimota → Central', route: 'Achimota to Accra Central via Ring Road', fare: 'GH₵2.00', duration: '~35 min', frequency: 'Every 5–10 min', board_at: 'Achimota Station near Achimota School', callout: 'Accra! Circle!', traffic_note: 'Ring Road 5–7pm', station_name: 'Achimota Lorry Station', station_lat: 5.6140, station_lng: -0.2266 },
  // ── North / Northwest Accra ───────────────────────────────────────────────
  { slug: 'lapaz-circle', title: '🚌 Lapaz → Circle', route: 'Lapaz to Kwame Nkrumah Circle via N1 Highway', fare: 'GH₵2.00', duration: '~20 min', frequency: 'Every 5 min', board_at: 'Lapaz Market junction', callout: 'Circle! Circle!', traffic_note: 'Heavy 7–9am on N1', station_name: 'Lapaz Bus Terminal', station_lat: 5.6117, station_lng: -0.2393 },
  { slug: 'lapaz-kaneshie', title: '🚌 Lapaz → Kaneshie', route: 'Lapaz to Kaneshie Market', fare: 'GH₵2.00', duration: '~20 min', frequency: 'Every 10 min', board_at: 'Lapaz Market junction', callout: 'Kaneshie! Kaneshie!', traffic_note: 'Moderately busy', station_name: 'Lapaz Market Junction', station_lat: 5.6117, station_lng: -0.2393 },
  { slug: 'dome-circle', title: '🚌 Dome → Circle', route: 'Dome Market to Kwame Nkrumah Circle', fare: 'GH₵2.50', duration: '~25 min', frequency: 'Every 10 min', board_at: 'Dome Market lorry station', callout: 'Circle! Accra!', traffic_note: 'Peak hours slow through Darkuman', station_name: 'Dome Market Station', station_lat: 5.6421, station_lng: -0.2395 },
  { slug: 'haatso-circle', title: '🚌 Haatso → Circle', route: 'Haatso to Kwame Nkrumah Circle via Achimota', fare: 'GH₵3.00', duration: '~30 min', frequency: 'Every 15 min', board_at: 'Haatso Junction near traffic light', callout: 'Circle! Circle!', traffic_note: 'Merges with Achimota traffic', station_name: 'Haatso Junction', station_lat: 5.6545, station_lng: -0.2089 },
  { slug: 'pokuase-achimota', title: '🚌 Pokuase → Achimota', route: 'Pokuase to Achimota Station via Ofankor', fare: 'GH₵3.00', duration: '~35 min', frequency: 'Every 15 min', board_at: 'Pokuase Barrier Station', callout: 'Achimota! Station!', traffic_note: 'Ofankor junction slow 7–9am', station_name: 'Pokuase Barrier', station_lat: 5.6820, station_lng: -0.2718 },
  { slug: 'amasaman-achimota', title: '🚌 Amasaman → Achimota', route: 'Amasaman to Achimota Station via Pokuase', fare: 'GH₵4.00', duration: '~45 min', frequency: 'Every 20 min', board_at: 'Amasaman Station', callout: 'Achimota! Achimota!', traffic_note: 'Long corridor, heavily loaded mornings', station_name: 'Amasaman Station', station_lat: 5.7300, station_lng: -0.2800 },
  { slug: 'tesano-circle', title: '🚌 Tesano → Circle', route: 'Tesano to Kwame Nkrumah Circle', fare: 'GH₵1.50', duration: '~15 min', frequency: 'Every 10 min', board_at: 'Tesano junction near Peponi Hotel', callout: 'Circle! Circle!', traffic_note: 'Short route, moderate traffic', station_name: 'Tesano Junction', station_lat: 5.5826, station_lng: -0.2226 },
  { slug: 'circle-nima', title: '🚌 Circle → Nima', route: 'Kwame Nkrumah Circle to Nima Market', fare: 'GH₵1.50', duration: '~10 min', frequency: 'Every 5 min', board_at: 'Circle, Nima side', callout: 'Nima! Nima!', traffic_note: 'Short but dense route', station_name: 'Nima Market Station', station_lat: 5.5741, station_lng: -0.2076 },
  // ── Northeast / Legon / Madina corridor ───────────────────────────────────
  { slug: 'legon-circle', title: '🚌 Legon → Circle', route: 'University of Ghana to Kwame Nkrumah Circle', fare: 'GH₵3.00', duration: '~30 min', frequency: 'Every 15 min', board_at: 'Legon Gate / University main entrance', callout: 'Circle! Accra!', traffic_note: 'Very busy on academic calendar', station_name: 'University of Ghana Main Gate', station_lat: 5.6502, station_lng: -0.1868 },
  { slug: 'east-legon-circle', title: '🚌 East Legon → Circle', route: 'East Legon to Circle via Shiashie/Nima', fare: 'GH₵3.50', duration: '~35 min', frequency: 'Every 15–20 min', board_at: 'East Legon American House junction', callout: 'Circle! Nima!', traffic_note: 'Shiashie–Nima corridor slow 7–9am', station_name: 'East Legon (American House)', station_lat: 5.6369, station_lng: -0.1569 },
  { slug: 'adenta-madina', title: '🚌 Adenta → Madina', route: 'Adenta Housing to Madina Market', fare: 'GH₵1.50', duration: '~15 min', frequency: 'Every 5 min', board_at: 'Adenta Housing roundabout', callout: 'Madina! Madina!', traffic_note: 'Light traffic most of day', station_name: 'Adenta Housing Roundabout', station_lat: 5.7195, station_lng: -0.1553 },
  { slug: 'adenta-circle', title: '🚌 Adenta → Circle', route: 'Adenta to Kwame Nkrumah Circle via Madina', fare: 'GH₵4.00', duration: '~45 min', frequency: 'Every 20 min', board_at: 'Adenta Housing roundabout', callout: 'Circle! Accra!', traffic_note: 'Long route, heavy rush hours', station_name: 'Adenta Housing Roundabout', station_lat: 5.7195, station_lng: -0.1553 },
  { slug: 'abokobi-madina', title: '🚌 Abokobi → Madina', route: 'Abokobi to Madina Market', fare: 'GH₵2.00', duration: '~20 min', frequency: 'Every 20–25 min', board_at: 'Abokobi Market junction', callout: 'Madina! Madina!', traffic_note: 'Light traffic, scenic route', station_name: 'Abokobi Market', station_lat: 5.7482, station_lng: -0.1561 },
  // ── West Accra ────────────────────────────────────────────────────────────
  { slug: 'dansoman-kaneshie', title: '🚌 Dansoman → Kaneshie', route: 'Dansoman to Kaneshie Market via Abeka La', fare: 'GH₵2.00', duration: '~25 min', frequency: 'Every 10 min', board_at: 'Dansoman Last Stop', callout: 'Kaneshie! Kaneshie!', traffic_note: 'Busy weekday mornings', station_name: 'Dansoman Terminal', station_lat: 5.5512, station_lng: -0.2530 },
  { slug: 'dansoman-circle', title: '🚌 Dansoman → Circle', route: 'Dansoman to Circle via Abeka / Darkuman', fare: 'GH₵2.50', duration: '~30 min', frequency: 'Every 10–15 min', board_at: 'Dansoman Last Stop', callout: 'Circle! Accra!', traffic_note: 'Abeka Lapaz junction slow AM', station_name: 'Dansoman Terminal', station_lat: 5.5512, station_lng: -0.2530 },
  { slug: 'anyaa-kaneshie', title: '🚌 Anyaa → Kaneshie', route: 'Anyaa Market to Kaneshie via Lapaz', fare: 'GH₵2.50', duration: '~25 min', frequency: 'Every 10 min', board_at: 'Anyaa Market Station', callout: 'Kaneshie! Kaneshie!', traffic_note: 'Moderate traffic', station_name: 'Anyaa Market', station_lat: 5.6022, station_lng: -0.2585 },
  { slug: 'kasoa-kaneshie', title: '🚌 Kasoa → Kaneshie', route: 'Kasoa to Kaneshie Market (cross-regional)', fare: 'GH₵5.00', duration: '~60 min', frequency: 'Every 20 min', board_at: 'Kasoa Station near Kasoa Roundabout', callout: 'Kaneshie! Accra!', traffic_note: 'Weija bridge extremely busy', station_name: 'Kasoa Lorry Station', station_lat: 5.5347, station_lng: -0.4177 },
  { slug: 'weija-kaneshie', title: '🚌 Weija → Kaneshie', route: 'Weija to Kaneshie Market', fare: 'GH₵3.00', duration: '~40 min', frequency: 'Every 15–20 min', board_at: 'Weija Junction', callout: 'Kaneshie! Kaneshie!', traffic_note: 'Weija–McCarthy Hill crawls 7–9am', station_name: 'Weija Junction', station_lat: 5.5456, station_lng: -0.3235 },
  // ── East / Tema corridor ─────────────────────────────────────────────────
  { slug: 'ashaiman-tema', title: '🚌 Ashaiman → Tema', route: 'Ashaiman to Tema Station', fare: 'GH₵1.50', duration: '~20 min', frequency: 'Every 5 min', board_at: 'Ashaiman Market junction', callout: 'Tema! Tema!', traffic_note: 'Very frequent route', station_name: 'Ashaiman Market Junction', station_lat: 5.7002, station_lng: -0.0274 },
  { slug: 'ashaiman-central', title: '🚌 Ashaiman → Central', route: 'Ashaiman to Accra Central via Motorway', fare: 'GH₵5.00', duration: '~55 min', frequency: 'Every 25 min', board_at: 'Ashaiman Station', callout: 'Accra! Central!', traffic_note: 'Motorway busy afternoons', station_name: 'Ashaiman Station', station_lat: 5.6975, station_lng: -0.0277 },
  { slug: 'sakumono-tema', title: '🚌 Sakumono → Tema', route: 'Sakumono Estates to Tema Station', fare: 'GH₵2.00', duration: '~20 min', frequency: 'Every 15 min', board_at: 'Sakumono Estates main road', callout: 'Tema! Station!', traffic_note: 'Moderate most times', station_name: 'Sakumono Estates Station', station_lat: 5.6460, station_lng: -0.0358 },
  { slug: 'kpone-tema', title: '🚌 Kpone → Tema', route: 'Kpone to Tema Station', fare: 'GH₵2.00', duration: '~25 min', frequency: 'Every 15 min', board_at: 'Kpone Barrier', callout: 'Tema! Tema!', traffic_note: 'Kpone–Tema industrial traffic', station_name: 'Kpone Barrier Station', station_lat: 5.6938, station_lng: -0.0458 },
  // ── South / coastal corridor ─────────────────────────────────────────────
  { slug: 'teshie-osu', title: '🚌 Teshie → Osu', route: 'Teshie to Osu Oxford Street via La Beach Road', fare: 'GH₵2.00', duration: '~20 min', frequency: 'Every 10–15 min', board_at: 'Teshie New Market', callout: 'Osu! Oxford!', traffic_note: 'La Beach Road slow on weekends', station_name: 'Teshie New Market', station_lat: 5.5829, station_lng: -0.0839 },
  { slug: 'nungua-osu', title: '🚌 Nungua → Osu', route: 'Nungua to Osu via La Beach Road', fare: 'GH₵2.50', duration: '~30 min', frequency: 'Every 15 min', board_at: 'Nungua Barrier', callout: 'Osu! Oxford!', traffic_note: 'La Beach corridor busy weekends', station_name: 'Nungua Barrier Station', station_lat: 5.5972, station_lng: -0.0636 },
  { slug: 'labadi-osu', title: '🚌 Labadi → Osu', route: 'La/Labadi to Osu Oxford Street', fare: 'GH₵1.50', duration: '~15 min', frequency: 'Every 10 min', board_at: 'Labadi Police Station stop', callout: 'Osu! Oxford!', traffic_note: 'Quick route, mostly light', station_name: 'Labadi Junction', station_lat: 5.5567, station_lng: -0.1558 },
  { slug: 'tema-osu', title: '🚌 Tema → Osu', route: 'Tema to Osu Oxford Street via La Beach Road', fare: 'GH₵6.00', duration: '~60 min', frequency: 'Every 30 min', board_at: 'Tema Lorry Station coastal side', callout: 'Osu! La!', traffic_note: 'Long coastal route, pleasant', station_name: 'Tema Station Coastal', station_lat: 5.6694, station_lng: -0.0168 },
  // ── Central / hospital ───────────────────────────────────────────────────
  { slug: 'korle-bu-central', title: '🚌 Korle Bu → Central', route: 'Korle Bu Hospital to Accra Central (Tudu/Makola)', fare: 'GH₵1.50', duration: '~15 min', frequency: 'Every 10 min', board_at: 'Korle Bu Hospital main gate', callout: 'Central! Tudu!', traffic_note: 'Busy throughout the day', station_name: 'Korle Bu Teaching Hospital Gate', station_lat: 5.5492, station_lng: -0.2265 },
  { slug: 'airport-circle', title: '🚌 Airport → Circle', route: 'Kotoka International Airport to Circle', fare: 'GH₵3.00', duration: '~25 min', frequency: 'Every 20 min', board_at: 'Airport main road junction opposite Terminal 3', callout: 'Circle! Circle!', traffic_note: 'Airport Rd very busy 4–7pm', station_name: 'Airport Junction Bus Stop', station_lat: 5.6049, station_lng: -0.1718 },
  // ── Kumasi (Ashanti Region) ───────────────────────────────────────────────
  { slug: 'kumasi-kejetia-suame', title: '🚌 Kejetia → Suame (Kumasi)', route: 'Kejetia Market to Suame Magazine, Kumasi', fare: 'GH₵2.00', duration: '~20 min', frequency: 'Every 5–10 min', board_at: 'Kejetia Bus Terminal, Suame side', callout: 'Suame! Magazine!', traffic_note: 'Kumasi Suame Road always busy', station_name: 'Kejetia Terminal Kumasi', station_lat: 6.6972, station_lng: -1.6238 },
  { slug: 'kumasi-knust', title: '🚌 KNUST → Kejetia (Kumasi)', route: 'KNUST Main Gate to Kejetia Market, Kumasi', fare: 'GH₵2.00', duration: '~20 min', frequency: 'Every 10 min', board_at: 'KNUST Main Gate', callout: 'Kejetia! Kejetia!', traffic_note: 'Busy on academic weekdays', station_name: 'KNUST Main Gate', station_lat: 6.6751, station_lng: -1.5713 },
  // ── Intercity ────────────────────────────────────────────────────────────
  { slug: 'accra-kumasi-stc', title: '🚌 Accra → Kumasi (STC)', route: 'Accra STC Terminal to Kumasi Kejetia (intercity)', fare: 'GH₵60.00', duration: '~4 hrs', frequency: 'Hourly 5am–5pm', board_at: 'Accra STC Terminal, Kaneshie', callout: 'Kumasi! Kumasi!', traffic_note: 'Book early — very popular route', station_name: 'Accra STC Terminal', station_lat: 5.5580, station_lng: -0.2340 },
];
