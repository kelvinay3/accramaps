-- AccraMaps migration 002: reviews, credits, report confirmations,
-- business details on places, trust/community fields on users,
-- and upsert of expanded trotro route set.
-- Run in the Supabase SQL editor.

-- ── Extend existing tables ────────────────────────────────────────────────────

alter table places
  add column if not exists phone        text,
  add column if not exists website      text,
  add column if not exists opening_hours jsonb;

alter table users
  add column if not exists trust_score          integer not null default 50,
  add column if not exists community_unlocked   boolean not null default false,
  add column if not exists credits_balance      integer not null default 0;

-- ── New tables ────────────────────────────────────────────────────────────────

create table if not exists reviews (
  id          bigint generated always as identity primary key,
  user_id     bigint not null references users(id) on delete cascade,
  place_id    bigint not null references places(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  helpful     integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, place_id)
);
create index if not exists idx_reviews_place on reviews(place_id);

create table if not exists credits_ledger (
  id          bigint generated always as identity primary key,
  user_id     bigint not null references users(id) on delete cascade,
  amount      integer not null,
  reason      text not null,
  ref_id      bigint,
  created_at  timestamptz not null default now()
);
create index if not exists idx_credits_user on credits_ledger(user_id);

create table if not exists report_confirmations (
  id          bigint generated always as identity primary key,
  report_id   bigint not null references reports(id) on delete cascade,
  user_id     bigint not null references users(id) on delete cascade,
  vote        text not null check (vote in ('confirm','gone')),
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now(),
  unique (report_id, user_id)
);
create index if not exists idx_rc_report on report_confirmations(report_id);

create table if not exists saved_places (
  id             bigint generated always as identity primary key,
  user_id        bigint not null references users(id) on delete cascade,
  label          text not null,
  name           text not null,
  lat            double precision not null,
  lng            double precision not null,
  place_type     text not null default 'custom',
  ghana_post_gps text,
  created_at     timestamptz not null default now(),
  unique (user_id, label)
);
create index if not exists idx_saved_user on saved_places(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table reviews              enable row level security;
alter table credits_ledger       enable row level security;
alter table report_confirmations enable row level security;
alter table saved_places         enable row level security;

-- ── Expanded trotro routes (insert new, keep existing) ───────────────────────

insert into trotro_routes (slug,title,route,fare,duration,frequency,board_at,callout,traffic_note,station_name,station_lat,station_lng) values
('lapaz-circle','🚌 Lapaz → Circle','Lapaz to Kwame Nkrumah Circle via N1 Highway','GH₵2.00','~20 min','Every 5 min','Lapaz Market junction, shout "Circle!"','Circle! Circle!','Heavy 7–9am on N1','Lapaz Bus Terminal',5.6117,-0.2393),
('dansoman-kaneshie','🚌 Dansoman → Kaneshie','Dansoman to Kaneshie Market via Abeka La','GH₵2.00','~25 min','Every 10 min','Dansoman Last Stop','Kaneshie! Kaneshie!','Busy weekday mornings','Dansoman Terminal',5.5512,-0.2530),
('dome-circle','🚌 Dome → Circle','Dome Market to Kwame Nkrumah Circle','GH₵2.50','~25 min','Every 10 min','Dome Market lorry station','Circle! Accra!','Peak hours slow through Darkuman','Dome Market Station',5.6421,-0.2395),
('haatso-circle','🚌 Haatso → Circle','Haatso to Kwame Nkrumah Circle via Achimota','GH₵3.00','~30 min','Every 15 min','Haatso Junction near traffic light','Circle! Circle!','Merges with Achimota traffic','Haatso Junction',5.6545,-0.2089),
('east-legon-circle','🚌 East Legon → Circle','East Legon to Circle via Shiashie/Nima','GH₵3.50','~35 min','Every 15–20 min','East Legon American House junction','Circle! Nima!','Shiashie–Nima corridor slow 7–9am','East Legon (American House)',5.6369,-0.1569),
('legon-circle','🚌 Legon → Circle','University of Ghana to Kwame Nkrumah Circle','GH₵3.00','~30 min','Every 15 min','Legon Gate / University main entrance','Circle! Accra!','Very busy on academic calendar','University of Ghana Main Gate',5.6502,-0.1868),
('adenta-madina','🚌 Adenta → Madina','Adenta Housing to Madina Market','GH₵1.50','~15 min','Every 5 min','Adenta Housing roundabout','Madina! Madina!','Light traffic most of day','Adenta Housing Roundabout',5.7195,-0.1553),
('adenta-circle','🚌 Adenta → Circle','Adenta to Kwame Nkrumah Circle via Madina','GH₵4.00','~45 min','Every 20 min','Adenta Housing roundabout','Circle! Accra!','Long route, heavy rush hours','Adenta Housing Roundabout',5.7195,-0.1553),
('pokuase-achimota','🚌 Pokuase → Achimota','Pokuase to Achimota Station via Ofankor','GH₵3.00','~35 min','Every 15 min','Pokuase Barrier Station','Achimota! Station!','Ofankor junction slow 7–9am','Pokuase Barrier',5.6820,-0.2718),
('kasoa-kaneshie','🚌 Kasoa → Kaneshie','Kasoa to Kaneshie Market (cross-regional)','GH₵5.00','~60 min','Every 20 min','Kasoa Station near Kasoa Roundabout','Kaneshie! Accra!','Weija bridge extremely busy','Kasoa Lorry Station',5.5347,-0.4177),
('weija-kaneshie','🚌 Weija → Kaneshie','Weija to Kaneshie Market','GH₵3.00','~40 min','Every 15–20 min','Weija Junction','Kaneshie! Kaneshie!','Weija–McCarthy Hill crawls 7–9am','Weija Junction',5.5456,-0.3235),
('anyaa-kaneshie','🚌 Anyaa → Kaneshie','Anyaa Market to Kaneshie via Lapaz','GH₵2.50','~25 min','Every 10 min','Anyaa Market Station','Kaneshie! Kaneshie!','Moderate traffic','Anyaa Market',5.6022,-0.2585),
('ashaiman-tema','🚌 Ashaiman → Tema','Ashaiman to Tema Station','GH₵1.50','~20 min','Every 5 min','Ashaiman Market junction','Tema! Tema!','Very frequent route','Ashaiman Market Junction',5.7002,-0.0274),
('ashaiman-central','🚌 Ashaiman → Central','Ashaiman to Accra Central via Motorway','GH₵5.00','~55 min','Every 25 min','Ashaiman Station','Accra! Central!','Motorway busy afternoons','Ashaiman Station',5.6975,-0.0277),
('teshie-osu','🚌 Teshie → Osu','Teshie to Osu Oxford Street via La Beach Road','GH₵2.00','~20 min','Every 10–15 min','Teshie New Market','Osu! Oxford!','La Beach Road slow on weekends','Teshie New Market',5.5829,-0.0839),
('labadi-osu','🚌 Labadi → Osu','La/Labadi to Osu Oxford Street','GH₵1.50','~15 min','Every 10 min','Labadi Police Station stop','Osu! Oxford!','Quick route, mostly light','Labadi Junction',5.5567,-0.1558),
('airport-circle','🚌 Airport → Circle','Kotoka International Airport to Circle','GH₵3.00','~25 min','Every 20 min','Airport main road junction opposite Terminal 3','Circle! Circle!','Airport Rd very busy 4–7pm','Airport Junction Bus Stop',5.6049,-0.1718),
('tesano-circle','🚌 Tesano → Circle','Tesano to Kwame Nkrumah Circle','GH₵1.50','~15 min','Every 10 min','Tesano junction near Peponi Hotel','Circle! Circle!','Short route, moderate traffic','Tesano Junction',5.5826,-0.2226),
('kpone-tema','🚌 Kpone → Tema','Kpone to Tema Station','GH₵2.00','~25 min','Every 15 min','Kpone Barrier','Tema! Tema!','Kpone–Tema industrial traffic','Kpone Barrier Station',5.6938,-0.0458),
('sakumono-tema','🚌 Sakumono → Tema','Sakumono Estates to Tema Station','GH₵2.00','~20 min','Every 15 min','Sakumono Estates main road','Tema! Station!','Moderate most times','Sakumono Estates Station',5.6460,-0.0358),
('korle-bu-central','🚌 Korle Bu → Central','Korle Bu Hospital to Accra Central (Tudu/Makola)','GH₵1.50','~15 min','Every 10 min','Korle Bu Hospital main gate','Central! Tudu!','Busy throughout the day','Korle Bu Teaching Hospital Gate',5.5492,-0.2265),
('amasaman-achimota','🚌 Amasaman → Achimota','Amasaman to Achimota Station via Pokuase','GH₵4.00','~45 min','Every 20 min','Amasaman Station','Achimota! Achimota!','Long corridor, heavily loaded mornings','Amasaman Station',5.7300,-0.2800),
('abokobi-madina','🚌 Abokobi → Madina','Abokobi to Madina Market','GH₵2.00','~20 min','Every 20–25 min','Abokobi Market junction','Madina! Madina!','Light traffic, scenic route','Abokobi Market',5.7482,-0.1561),
('nungua-osu','🚌 Nungua → Osu','Nungua to Osu via La Beach Road','GH₵2.50','~30 min','Every 15 min','Nungua Barrier','Osu! Oxford!','La Beach corridor busy weekends','Nungua Barrier Station',5.5972,-0.0636),
('lapaz-kaneshie','🚌 Lapaz → Kaneshie','Lapaz to Kaneshie Market','GH₵2.00','~20 min','Every 10 min','Lapaz Market junction','Kaneshie! Kaneshie!','Moderately busy','Lapaz Market Junction',5.6117,-0.2393),
('tema-osu','🚌 Tema → Osu','Tema to Osu Oxford Street via La Beach Road','GH₵6.00','~60 min','Every 30 min','Tema Lorry Station coastal side','Osu! La!','Long coastal route, pleasant','Tema Station Coastal',5.6694,-0.0168),
('circle-nima','🚌 Circle → Nima','Kwame Nkrumah Circle to Nima Market','GH₵1.50','~10 min','Every 5 min','Circle, Nima side','Nima! Nima!','Short but dense route','Nima Market Station',5.5741,-0.2076),
('dansoman-circle','🚌 Dansoman → Circle','Dansoman to Circle via Abeka / Darkuman','GH₵2.50','~30 min','Every 10–15 min','Dansoman Last Stop','Circle! Accra!','Abeka Lapaz junction slow AM','Dansoman Terminal',5.5512,-0.2530),
('kumasi-kejetia-suame','🚌 Kejetia → Suame (Kumasi)','Kejetia Market to Suame Magazine, Kumasi','GH₵2.00','~20 min','Every 5–10 min','Kejetia Bus Terminal, Suame side','Suame! Magazine!','Kumasi Suame Road always busy','Kejetia Terminal Kumasi',6.6972,-1.6238),
('kumasi-knust','🚌 KNUST → Kejetia (Kumasi)','KNUST Main Gate to Kejetia Market, Kumasi','GH₵2.00','~20 min','Every 10 min','KNUST Main Gate','Kejetia! Kejetia!','Busy on academic weekdays','KNUST Main Gate',6.6751,-1.5713),
('accra-kumasi-stc','🚌 Accra → Kumasi (STC)','Accra STC Terminal to Kumasi Kejetia (intercity)','GH₵60.00','~4 hrs','Hourly 5am–5pm','Accra STC Terminal, Kaneshie','Kumasi! Kumasi!','Book early — very popular route','Accra STC Terminal',5.5580,-0.2340)
on conflict (slug) do nothing;
