# Bouwplan pocketprinter voor kabellabels

Stand 20 november 2026. Hoort bij de conceptschets in `ontwerp/pocketprinter-concept.html` en het rapport in `reports/`.

Het plan is in fasen opgezet, omdat elke aankoop afhangt van wat de vorige proef oplevert. Koop dus niet alles tegelijk. Alle prijzen zijn ramingen; alleen waar een bron staat, is het gegeven nagezocht.

## Wat je nu koopt (fase 0 en 1, circa € 90–130)

| Wat | Waarom | Raming |
|---|---|---|
| Supvan G15M Mini (donorprinter) | Thermotransfer met inktlint, 203 dpi, accu, en gemaakt voor krimpkous van 3,5–9 mm en labels van 6–15 mm breed. Krimpkous is dik, niet-klevend polyolefine: dat lijkt veel meer op een stug kabellabel dan een plaklabel. | € 60–80 |
| 2 extra cassettes voor de G15M: 1× krimpkous 9 mm, 1× doorlopend label 12 mm | Eén om open te maken en op te offeren, één als drager. | € 15–25 |
| Digitale schuifmaat (als je die niet hebt) | Labeldikte en sleufposities opmeten. | € 15–25 |
| Isopropanol en een lap | Veeg- en oplosmiddeltest van de opdruk. | € 5 |

Niet kopen, wel regelen: 30 gele Altec-labels van de rol, het artikelnummer van die rol, en een meter inktlint van jullie eigen Altec-printer.

De EU-prijs van de G15M Mini is niet nagezocht; in de VS kost hij $ 60–76. Controleer bij bestellen dat het de versie met inktlint ("thermal transfer") is en dat er krimpkous bij zit.

## Fase 0 — Meten (een uur)

1. Meet één label op: lengte, hoogte, dikte, positie en maat van de tiewrap-sleuven.
2. Noteer het artikelnummer en vraag bij Altec het materiaaldatablad op.
3. Turf een week hoe vaak monteurs teruglopen naar de printer.

Door als: het label maximaal ongeveer 12 mm hoog en 1 mm dik is. Is het hoger dan 12 mm, dan past het niet onder een printkop van 12 mm en is een bredere kop nodig.

## Fase 1 — Hecht het lint, en gaat een stug label erdoor? (een middag)

1. Print eerst gewoon op de meegeleverde krimpkous, om te zien dat de printer werkt.
2. Plak een Altec-label met dun dubbelzijdig tape op het begin van de krimpkous of het doorlopende label, zodat de printer het meetrekt. Print een regel tekst.
3. Lukt dat niet door de dikte: maak een cassette open, haal het eigen materiaal eruit, laat het lint zitten en voer het Altec-label er los doorheen terwijl de printer print.
4. Test de opdruk: wrijven met de duim, krassen met een nagel, tien keer vegen met isopropanol.
5. Herhaal stap 2 tot en met 4 met een strook van jullie eigen Altec-lint in plaats van het lint uit de cassette, als dat mechanisch te doen is.

Door als: de tekst leesbaar is en de veegtest overleeft, met minstens één van de twee linten.

Stoppen of omdenken als: geen enkel lint hecht, ook niet met de kop op de hoogste stand. Dan is thermotransfer in dit formaat op dit materiaal twijfelachtig en komt inkjet in beeld.

Let op: een mislukte doorvoer in deze stap zegt weinig. De printer is niet voor losse stugge plaatjes gebouwd. Het gaat hier om de hechting.

## Fase 2 — Donor openmaken en opmeten (een dag, circa € 30–45)

| Wat | Waarom | Raming |
|---|---|---|
| Logic analyzer, 8 kanalen 24 MHz | Meekijken op de kabel naar de printkop om de aansluitingen te achterhalen. | € 10–15 |
| Precisie-schroevendraaiers en openers | Behuizing open zonder schade. | € 10–15 |
| Digitale unster of krachtmeter tot 1–2 kg | Aandrukkracht van de kop meten. | € 10–15 |

Een multimeter heb je vermoedelijk al.

1. Maak de G15M open en fotografeer alles voordat je iets losmaakt.
2. Meet op: breedte van de printkop, diameter van de aandrukrol, het lintpad, de motor en de tandwielverhouding.
3. Meet de aandrukkracht van de kop en de spanning op de kop tijdens het printen.
4. Sluit de logic analyzer aan op de flexkabel van de kop en print een bekend patroon. Een thermische kop heeft normaal een datalijn, een klok, een latch, een of meer strobe-lijnen en een temperatuursensor; welke pen wat is, moet je zelf uitmeten. Voor deze kleine koppen heb ik geen gepubliceerde pinbezetting gevonden.

Door als: je de aansluitingen van de kop kent en weet welke kracht en spanning de fabrikant gebruikt.

## Fase 3 — Proefopstelling op tafel met eigen aansturing (1–2 weken, circa € 70–100)

Nog niet in zakformaat. Het doel is de doorvoer van een los label bewijzen.

| Wat | Aantal | Raming |
|---|---|---|
| ESP32-C3 ontwikkelbordje | 2 | € 10 |
| N20-motortje met vertraging, 6 V, circa 100 toeren, met encoder | 2 | € 10–14 |
| Motordriver DRV8833 op printje | 2 | € 4 |
| Instelbare spanningsomzetter (step-up naar 7–9 V) | 2 | € 4 |
| Buffercondensator 1000–2200 µF, 16 V | 3 | € 3 |
| Reflectiesensor of gaffelsensor voor labeldetectie | 3 | € 4 |
| Li-ion cel 14500 met houder en laadprintje met beveiliging | 2 | € 12–15 |
| OLED-schermpje 0,91 inch | 1 | € 4 |
| Breadboard, draadjes, krimpkous, soldeertin | – | € 10 |
| Asjes 3 mm, kogellagertjes, verenassortiment, M2/M3-boutjes | – | € 12–20 |
| 3D-printfilament (PETG) of printservice | – | € 10–20 |

De printkop, de aandrukrol en het lint komen uit de donor.

1. Print een rechte geleiding waarin het label op zijn kant staat, met de aandrukrol aan één kant en de verende kop aan de andere.
2. Stuur de kop aan vanaf de ESP32 en de rol met de motor; begin op 5–10 mm/s.
3. Voer honderd labels door en tel: scheef, geslipt, slecht bedrukt.
4. Varieer aandrukkracht, snelheid en energie per punt. Doe één ronde in de vriezer.

Door als: minstens 95 van de 100 labels recht en leesbaar zijn.

Als het scheeftrekt: voeg een tweede rolletje toe of maak de geleiding nauwer voordat je verder gaat.

## Fase 4 — Eerste exemplaar in zakformaat (3–6 weken, circa € 150–300)

| Wat | Raming |
|---|---|
| Tweede donorprinter voor een reservekop en -rol | € 60–80 |
| Eigen printplaatje, 5 stuks, deels bestukt | € 40–100 |
| Behuizing en mechaniek, 2–3 printrondes (nylon via printservice of eigen printer) | € 30–80 |
| Lint op eigen spoeltjes: Altec-lint in stroken van 13 mm, of cassettes van de donor | € 10–20 |
| Klein spul en verzending | € 20–40 |

1. Zet de bewezen opstelling in CAD in de indeling van de conceptschets: 125 × 38 × 30 mm.
2. Bouw één exemplaar en laat één monteur er een week mee werken.

## Totaal

| Fase | Raming |
|---|---|
| 0 en 1 | € 90–130 |
| 2 | € 30–45 |
| 3 | € 70–100 |
| 4 | € 150–300 |
| Totaal tot eerste zakexemplaar | circa € 350–600 |

## Waarom niet de Niimbot B18 als donor

De B18 is kleiner en er bestaat open software voor, maar hij is gebouwd voor dunne plaklabels, de labelrol heeft een chip waar de printer op controleert en de lintcassette ook. Voor de hechtingsproef is een krimpkousprinter dichter bij het doel. De B18 blijft een optie als bron van compacte onderdelen in fase 4.

## Wat nog niet zeker is

- Of de G15M Mini een label van ongeveer een halve millimeter met of zonder drager accepteert. Dat is juist de proef.
- Of de cassettes van de G15M een chip hebben die printen zonder origineel materiaal blokkeert. Niet gevonden; controleer bij de eerste proef.
- De aansluitingen van de printkop. Die moet je uitmeten.
- Alle prijzen. Het zijn ramingen op basis van gangbare webwinkelprijzen, geen offertes.

## Bronnen

- [Supvan G15M Mini, specificaties](https://manuals.plus/asin/B0FT2FNW8H)
- [Supvan G15M, Amerikaanse prijs](https://www.dealnews.com/c83/Computers/Peripherals/Printers-Scanners/f1912/Smart-Home/)
- [NiimBlue: labelrollen met RFID-tag](https://printers.niim.blue/other/label-types/)
- [Niimbot B18-lint met chip](https://www.jbhifi.com.au/products/niimbot-compatible-labeling-ribbon-16m-for-b18-blue)
- [Signalen van een thermische printkop](https://circuitdigest.com/microcontroller-projects/how-to-interface-thermal-printer-with-esp32)
