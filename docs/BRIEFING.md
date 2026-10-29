# LNG in 10 minutes

*A one-page explainer of the LNG market and the 2026 shock, built from the numbers in this repo's
data files (`data/lng.json`, `prices.json`, `fleet.json`, `flows.json`). Data as of 26 Oct 2026.
Each figure names its source in brackets. **≈** marks an estimate, and "computed here" marks
arithmetic done on published figures. Links open the matching view of the tool.*

---

## 1. The market in one paragraph

LNG is natural gas cooled to −162 °C, which shrinks it about 600-fold so it can cross oceans by ship.
The chain has four links: **liquefaction** at the export plant, **shipping**, **regasification**
at the import terminal, and then the pipeline grid. In 2025 the world traded a record **427.9 Mt**
(+5.4%) [GIIGNL Annual Report 2026]. LNG is a small market with three big sellers and
two big buying regions, so a single outage moves prices everywhere.

| | 2025 | Source |
|---|---|---|
| Top exporters | US **109.1 Mt**, Qatar **80.5**, Australia **78.8**. Together that is 63% of trade (computed here) | GIIGNL 2026 |
| Top importers | China **67.0 Mt** (−15%), Japan **65.9**, South Korea **48.7**, India **25.3**, Taiwan **23.5** | GIIGNL 2026 |
| By region | Asia **271 Mt**, Europe **126.3** (+29%), Middle East & Africa 18.2, Americas 12.3 | GIIGNL 2026 |
| Capacity, end-2025 | Liquefaction **524 Mtpa**, regas **1,247 Mtpa**, **200 Mtpa** under construction | GIIGNL 2026 |
| Fleet, end-2025 | **804** active carriers, **301** on order, **107** due for delivery in 2026 | IGU World LNG Report 2026 |

Two numbers explain most of the market's behaviour. First, export capacity is the bottleneck. Import
capacity is about 2.9× trade, and IGU puts average regas utilisation at **39.2%**. So when supply is lost,
buyers bid against each other for the remaining cargoes. Second, the biggest single flow is
**US Gulf Coast → Europe, 73.8 Mt** (58% of Europe's LNG) [GIIGNL 2026].
→ [Shipping legs](../lng.html#leg=us-europe)

## 2. How LNG is priced, and why cargoes move

There are three prices to know [World Bank Pink Sheet, monthly averages]:

- **Henry Hub (HH)** is the US gas price. It ran at $1.50–4.30/MMBtu through 2024–25 and stood at **$2.95** in Sep 2026.
- **TTF** is Europe's hub. It ran at $8–15 through 2024–25 and stood at **$25.42** in Sep 2026.
- **JKM** is the Asian spot price, a Platts benchmark, so the tool shows dated prints. It was **$25.43** on 5 Oct 2026 [Reuters].
  The Japan *import* price ($14.25 in Sep 2026, a World Bank estimate) is mostly oil-indexed contracts and lags the spot market.

US cargoes are mostly sold **FOB at about 115% of Henry Hub plus a fixed liquefaction fee**. The
buyer owns the cargo at the loading port and sends it wherever the **netback** is highest:
the destination price minus freight, canal fees and regas. On the 5 Oct snapshot, the
[arbitrage calculator](../lng.html) gives a margin of ≈$16.4/MMBtu to NW Europe and ≈$16.1 to Japan via Panama.
The JKM–TTF spread ($1.34) is smaller than Panama's extra freight plus toll (≈$1.60), so the cargo goes
to Europe. The freight, canal and regas inputs are illustrative defaults, not market prints. That
single comparison is what moves ships between the Atlantic and the Pacific each month.

## 3. The chokepoints

| Passage | Why it matters | Status, Oct 2026 |
|---|---|---|
| **Strait of Hormuz** | Every Qatari and UAE cargo, with no pipeline bypass: 85.6 Mt in 2025, or **20%** of world LNG (computed here from GIIGNL). It also carries 20.9 mb/d of oil, 26% of seaborne oil [EIA, H1 2025; share computed here] | Effectively closed since **28 Feb 2026** |
| **Bab-el-Mandeb / Suez** | ≈8% of LNG before 2024, mostly Qatar → Europe [EIA] | Avoided since the 2024 Houthi attacks; attacks resumed Feb 2026 |
| **Panama Canal** | The short way from the US Gulf to Japan and Korea. Toll $2.05/m³, or **$356,700** per 174,000 m³ transit [ACP tariff, 1 Jan 2025] | Drought caps of 34, then 32, then 33 transits/day (Sep–Oct 2026) [ACP; S&P Global] |
| **Cape of Good Hope** | The fallback for everything above | Open; the default Atlantic → Asia route |

→ [Hormuz in the tool](../lng.html#choke=hormuz)

## 4. The 2026 shock, in seven dates

1. **28 Feb.** The US–Iran war closes Hormuz.
2. **2 Mar.** Iranian strikes hit Ras Laffan and Mesaieed. QatarEnergy halts output and declares force majeure.
3. **18 Mar.** Missiles damage Ras Laffan Trains 4 and 6: **−12.8 Mtpa** for 3–5 years.
4. **22 Apr.** Golden Pass (Texas, 70% QatarEnergy) ships its first cargo. The EU's short-term ban on Russian LNG starts on 25 Apr.
5. **Jun–Jul.** The Islamabad MoU fails to hold. JKM front-month is **$21.45** at end-July.
6. **Sep.** Qatar ships only **1.6 Mt**, a third of it to Kuwait inside the Gulf [Kpler via Reuters]. North Field East slips to H1 2027 [Bloomberg].
   Asian and European spot prices reach ≈3× pre-war levels.
7. **Oct.** At least 18 ships are attacked around Hormuz. Kpler expects ≈0.6 Mt of Qatari exports for the month,
   against a 2025 average of ≈7.1 Mt/month for Qatar and the UAE (85.6 ÷ 12, computed here). Force majeure is extended into November.

→ [Timeline and event markers](../lng.html#scenario=2026)

**Who was exposed.** These are the shares of 2025 imports that came from Qatar and the UAE [computed from the
GIIGNL matrix]: Pakistan **99%**, India **59%**, Taiwan **34%**, Italy **33%**, China **31%**,
South Korea **15%**, Japan **6%**, and Europe as a whole **7%**. South Asia lost most of its supply. Europe lost little
directly, but it had to outbid Asia for the cargoes that were still sailing.

**Where the shock showed up:**

- **Prices.** TTF rose from **$11.24** (Feb) to **$17.91** (Mar) and **$25.42** (Sep). Henry Hub *fell*,
  from $3.61 to $2.95: the US is long gas and export plants were already running full [World Bank Pink Sheet].
  The TTF–HH spread is the profit pool that pays for new US plants.
- **Storage.** EU storage was ≈**30%** full on 20 Apr and **74.6%** on 21 Oct. The 2021–25 average for mid-Oct is
  **88.9%**, and the 1 Nov target was cut to **80%** [GIE AGSI+ via trackers; see `prices.json`].
  Europe enters winter short.
- **Freight.** Spot charter rates spiked in early March, as ships were stranded and rerouted, then collapsed.
  By 6 Oct they were **91% (Atlantic) and 83% (Pacific)** below their peaks. The latest prints are ≈**$21,750/day**
  in the Atlantic and **$30,750** in the Pacific (≈23 Oct) [Spark via Reuters]. With **107** newbuilds due
  in 2026 and fewer Qatari cargoes to carry, the fleet is long.
- **Tonne-miles.** Computed in the tool from its legs (2025 vs the Oct-2026 run-rate, so an estimate):
  volume **−10%**, average haul **+1%**, tonne-miles **−9%**. The haul barely moves, because losing the long
  Qatar → Europe routes offsets Atlantic cargoes going round the Cape.
- **Scenarios for 2026 output** [GIIGNL 2026]: **475 Mt** before the crisis, **435 Mt** if the strait reopens and the damaged
  trains stay out, and **410 Mt** with no Qatar/UAE supply through end-2026.

## 5. What happens next: the 2027 supply wave

The tool tracks **219 Mtpa** of projects due to start in 2026–2030 (computed here from `projects`). **100 Mtpa** of it
targets 2027, and **117 Mtpa** of the total is in the US [GIIGNL 2026; IEA Capacity Tracker; company releases]. In 2027:

- North Field East (32 Mtpa, H1 2027)
- Golden Pass T3
- Plaquemines Phase 2
- Rio Grande T1–3
- CP2
- Port Arthur T1

**58 Mtpa** of the pipeline (North Field East and South, and Ruwais) sits *behind Hormuz*, so the strait now
determines both current and future supply. From **1 Jan 2027** the EU bans all Russian LNG
(Yamal sent a record 9.97 Mt to the EU in H1 2026 [Kpler via Reuters]). Start dates often slip,
so treat the 2027 total as an upper bound. → [Under construction layer](../lng.html#project=north-field-east)

## 6. Five questions to be ready for

1. *Why did Henry Hub fall while TTF tripled?* US export capacity was already full, so higher prices abroad could not pull more US gas out of the country.
2. *Why did freight collapse during a supply crisis?* Fewer cargoes and a growing fleet. Shorter Atlantic → Europe voyages also need fewer ships.
3. *Who is most exposed to Hormuz?* South Asia (Pakistan, India), then Taiwan, Italy and China. Japan is the least exposed, thanks to Australian supply.
4. *What decides whether a US cargo goes to Asia?* JKM − TTF > extra freight + canal toll (+ Panama slot risk).
5. *What would end the shock?* Hormuz reopening, plus the 2027 wave. Even then, Ras Laffan Trains 4 and 6 stay out for 3–5 years.

---

*Limitations. Route volumes for 2026 are rough run-rates, Australia's per-plant split is estimated, and freight, canal and
regas inputs in the calculator are illustrative. Monthly JKM is licensed, so only spot prints are shown. Full sources and
caveats are in the data files and in `docs/BUILD_LOG.md`.*
