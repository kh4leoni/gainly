import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, Header, PageNumber,
} from "docx";
import { writeFileSync } from "fs";

const PINK = "FF1D8C";
const DARK = "1A1A2E";
const GRAY = "6B7280";
const LIGHT_BG = "FFF0F7";
const TABLE_HEADER_BG = "FFE4F3";

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { color: PINK, size: 8, space: 4, style: BorderStyle.SINGLE } },
    run: { color: DARK, bold: true, size: 32 },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: PINK, size: 26 })],
    spacing: { before: 320, after: 120 },
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: DARK, size: 22 })],
    spacing: { before: 240, after: 80 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: opts.color ?? "374151", ...opts })],
    spacing: { after: 120 },
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: "374151" })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "1F2937" })],
    shading: { type: ShadingType.SOLID, color: "F3F4F6" },
    spacing: { after: 80 },
    indent: { left: 360 },
  });
}

function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h) =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: TABLE_HEADER_BG },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: DARK })] })],
          })
        ),
      }),
      ...rows.map((row) =>
        new TableRow({
          children: row.map((cell) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18, color: "374151" })] })],
            })
          ),
        })
      ),
    ],
  });
}

function sp(n = 1) {
  return new Paragraph({ text: "", spacing: { after: n * 80 } });
}

const doc = new Document({
  title: "Gainly – Offline-First Toteutusraportti",
  description: "Senior Full-stack Engineer toteutusraportti",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 20, color: "374151" },
      },
    },
  },
  sections: [
    {
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Gainly – Offline-First Toteutusraportti", color: GRAY, size: 16 }),
                new TextRun({ text: "   |   28.4.2026", color: GRAY, size: 16 }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      children: [
        // Title block
        new Paragraph({
          children: [new TextRun({ text: "Gainly", bold: true, size: 72, color: PINK })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Offline-First Toteutusraportti", size: 36, color: DARK })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Senior Full-stack Engineer  •  PWA Expert  •  Arkkitehtuurikonsultti", size: 20, color: GRAY, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // 1. Alkutilanne
        h1("1. Alkutilanne ja arkkitehtuurivalinnat"),
        p("Projektin alkuvaiheessa CLAUDE.md kuvasi offline-infrastruktuuria, jota ei vielä ollut olemassa. Konsultatiivisen lähestymistavan mukaisesti kartoitettiin kolme arkkitehtuurivaihtoehtoa ennen toteutuksen aloittamista."),
        sp(),
        makeTable(
          ["Pattern", "Kuvaus", "Valittu"],
          [
            ["A – Mirror-table", "Dexie peilaa kaikki 3 taulua, atominen RPC synkronointiin", "✓ Kyllä"],
            ["B – Queue-only", "Pelkkä toimintojono, ei paikallista dataa", "Ei"],
            ["C – CRDT", "Konfliktiton hajautettu tietorakenne", "Ei"],
          ]
        ),
        sp(),
        p("Valintaperusteet: Pattern A tarjoaa täydellisen offline-tuen, LWW-konfliktinratkaisun ja toimii iOS Safarilla ilman Background Sync API:a."),

        // 2. Tietokantamuutokset
        h1("2. Tietokantamuutokset (Supabase)"),
        h2("Migraatiot"),
        h3("20260427000002_offline_sync.sql"),
        bullet("Lisätty updated_at sarakkeet: scheduled_workouts, workout_logs, set_logs"),
        bullet("Automaattiset updated_at-triggerit kaikille tauluille"),
        bullet("RPC upsert_workout_with_sets(p_scheduled, p_workout, p_sets) – atominen upsert"),
        sp(),
        h3("20260427000003_offline_sync_rls_fix.sql"),
        bullet("Kriittinen korjaus: asiakkaalla ei INSERT-oikeutta scheduled_workouts-tauluun (RLS-rajoitus)"),
        bullet("RPC muutettu käyttämään UPDATE ... WHERE id = $1 pelkän INSERT ... ON CONFLICT sijaan"),
        bullet("SECURITY INVOKER säilytetty turvallisuussyistä"),
        sp(),
        h3("20260427000004_offline_sync_deletes.sql"),
        bullet("RPC laajennettu parametrilla p_deleted_set_ids uuid[]"),
        bullet("Poistettujen settirivien käsittely synkronoinnissa"),

        // 3. Dexie-skeema
        h1("3. Dexie-skeema ja tyypit"),
        p("lib/offline/db.ts – GainlyDB Dexie-luokka:"),
        code("scheduled_workouts:  id, client_id, synced"),
        code("workout_logs:        id, scheduled_workout_id, client_id, synced"),
        code("set_logs:            id, workout_log_id, exercise_id, synced, deleted"),
        sp(),
        bullet("v1→v2 upgrade: deleted-indeksi lisätty set_logs-tauluun"),
        bullet("lib/offline/types.ts: LocalScheduledWorkout, LocalWorkoutLog, LocalSetLog – kaikissa synced: 0|1, set_logs:ssä myös deleted?: 0|1"),
        bullet("lib/offline/uuid.ts: newUuid() – käyttää crypto.randomUUID() kun saatavilla, fallback uuid-pakettiin vanhemmille selaimille"),

        // 4. Offline-kirjoituslogiikka
        h1("4. Offline-kirjoituslogiikka"),
        p("lib/offline/writes.ts – kaikki kirjoitukset menevät ensin Dexieen:"),
        sp(),
        makeTable(
          ["Funktio", "Toiminta"],
          [
            ["logSet", "Luo/päivittää settirivin Dexiessä, synced:0"],
            ["deleteSet", "AINA tombstone – ei koskaan kova poisto, deleted:1 synced:0"],
            ["ensureWorkoutLog", "Idempotent workout_logs-rivi (scheduled_workout, client)-parille"],
            ["completeWorkout", "Asettaa status: completed Dexiessä"],
            ["uncompleteWorkout", "Palauttaa status: scheduled Dexiessä"],
          ]
        ),
        sp(),
        p("Kriittinen suunnittelupäätös: deleteSet käyttää aina tombstone-patternia (ei koskaan kova poisto). Jos poisto kovakoodataan ja synkronisointi on käynnissä samanaikaisesti, palvelimelta tuleva vastaus resurrektoisi poistetun rivin takaisin Dexieen. Tombstone estää tämän.", { italics: true }),

        // 5. Synkronointilogiikka
        h1("5. Synkronointilogiikka"),
        p("lib/offline/sync.ts:"),
        code("syncNow() → mutex → runSync()"),
        code("  → kerää synced:0 rivit kaikilta tauluilta"),
        code("  → ryhmittele workout_log_id:n mukaan"),
        code("  → syncGroup() per ryhmä"),
        code("     → tarkista: existing?.deleted === 1 → älä resurrektoi"),
        code("     → kutsu RPC upsert_workout_with_sets(...)"),
        code("     → merkitse tombstones {synced:1} (ei poisteta)"),
        code("     → hydrateSetLogs() prune myöhemmin"),
        sp(),
        h2("Synkronoinnin käynnistystapahtumat"),
        makeTable(
          ["Tapahtuma", "Alusta"],
          [
            ["online-event (selain menee verkkoon)", "Kaikki"],
            ["visibilitychange (tab tulee näkyviin)", "Kaikki"],
            ["focus-event", "Kaikki"],
            ["Sovelluksen käynnistys", "Kaikki"],
            ["Manuaalinen 'Synkronoi nyt' -nappi", "Kaikki"],
            ["Background Sync API (gainly-sync tag)", "Android Chrome"],
          ]
        ),

        // 6. Offline-luenta
        h1("6. Offline-luenta ja LWW-konfliktinratkaisu"),
        p("lib/offline/reads.ts:"),
        bullet("mergeById: Last-write-wins updated_at:n perusteella – paikallinen voittaa jos lAt >= rAt"),
        bullet("useLocalSetLogsAndDeleted: Kriittinen atominen hook – palauttaa sekä live-setit että deletedIds SAMASSA render-syklissä. Estää stale-closure-kilpatilanteen kahden erillisen useLiveQuery-hookin välillä"),
        sp(),
        h2("Tombstone-elinkaari"),
        makeTable(
          ["Tila", "Kentät", "Kuvaus"],
          [
            ["Pending", "deleted:1, synced:0", "Käyttäjä poisti, ei vielä synkronoitu"],
            ["Confirmed", "deleted:1, synced:1", "Palvelin vahvistanut poiston"],
            ["Pruned", "– (poistettu)", "hydrateSetLogs siivoo pois"],
          ]
        ),
        sp(),
        p("hydrateSetLogs: Siemenet Dexieen palvelimen vastauksesta. Prune: poistaa synced:1, deleted:1 tombstones joita palvelin ei enää palauta. Ei koskaan resurrektoi deleted:1 rivejä."),

        // 7. Service Worker
        h1("7. Service Worker (PWA)"),
        p("app/sw.ts → public/sw.js (rakennetaan npm run build:ssa, ei dev-tilassa):"),
        sp(),
        makeTable(
          ["Reitti", "Strategia"],
          [
            ["Navigointi", "NetworkFirst (3s timeout → /offline)"],
            ["Supabase REST **/rest/v1/**", "StaleWhileRevalidate"],
            ["Supabase Storage", "CacheFirst"],
            ["Staattiset resurssit", "serwist defaultCache"],
            ["Background Sync", "gainly-sync tag (Android)"],
          ]
        ),
        sp(),
        bullet("app/offline/page.tsx: Staattinen offline-fallback suomeksi"),
        bullet("next.config.ts: withSerwistInit({ swSrc: 'app/sw.ts', swDest: 'public/sw.js', disable: isDev })"),

        // 8. UX-komponentit
        h1("8. UX-komponentit"),
        h2("components/offline/sync-bar.tsx"),
        bullet("Sticky-palkki joka näkyy kun unsyncedCount > 0"),
        bullet("Osoittaa: online/offline tila, synkronoinnin käynnissä-tila, pulssi-animaatio"),
        bullet("Manuaalinen 'Synkronoi nyt' -nappi"),
        sp(),
        h2("components/offline/sync-badge.tsx"),
        bullet("Pill-variantti: vihreä 'Synkr.' / amber 'Odottaa'"),
        bullet("Icon-variantti: kellon/checkmark ikoni"),

        // 9. Integraatio
        h1("9. Integraatio näkymiin"),
        h2("components/client/history-view.tsx"),
        bullet("SyncBar lisätty sivun yläosaan"),
        bullet("Per-kortti SyncBadge via useUnsyncedForWorkout"),
        bullet("LocalOnlyCard: näyttää synkronoimattomat sessiot jotka eivät vielä ole palvelimella"),
        bullet("useLocalCompletedNotInServer: osio paikallisille sessioille"),
        sp(),
        h2("components/workout-logger/workout-logger.tsx"),
        bullet("Kaikki mutaatiot käyttävät offline-kirjoituksia"),
        bullet("useLocalSetLogsAndDeleted atominen hook"),
        bullet("cancelledRef-pattern: estää add.onSuccess:ia uudelleenvahvistamasta peruutettuja rivejä"),
        bullet("getDB() kutsutaan suoraan mutaatiofunktiossa (ei closuressa) – saa tuoreen datan"),
        bullet("inputsDisabled = false – settejä voi muokata tallennuksen jälkeen"),
        bullet("updateRow tunnistaa vahvistetun rivin ja automaattisesti kutsuu deleteSet + tyhjentää vahvistustilan"),

        // 10. Korjatut bugit
        h1("10. Korjatut bugit"),
        makeTable(
          ["Bugi", "Juurisyy", "Korjaus"],
          [
            ["RPC 404", "Migraatiot ei ajettu paikallisesti", "npx supabase db reset"],
            ["RLS estää synkronoinnin", "INSERT...ON CONFLICT tarkistaa INSERT-oikeuden", "RPC → UPDATE...WHERE id scheduled_workoutsille"],
            ["Unconfirm ei toimi 1. klikkauksella", "mutationFn luki setLogId closuresta – null kilpatilanteessa", "Query Dexie suoraan getDB().set_logs.where(...)"],
            ["Tombstone ei siivoudu", "result.deleted_set_ids tyhjä → tombstone ei merkitty", "Merkitään kaikki g.deletedIds → {synced:1}"],
            ["Re-confirmation synkronoinnin jälkeen", "Kaksi erillistä useLiveQuery eri render-sykleissä", "useLocalSetLogsAndDeleted atominen hook"],
            ["Settejä ei voi muokata tallennuksen jälkeen", "inputsDisabled = row.confirmed esti kaikki inputit", "inputsDisabled = false + auto-unconfirm"],
            ["Insert-sync resurrektio-kilpa", "deleteSet kovakoodasi kun synkronointi kesken", "deleteSet AINA tombstone"],
          ]
        ),

        // 11. Tuotantoon vienti
        h1("11. Tuotantoon vienti"),
        bullet("Branch feat/offline-capability → merge main"),
        bullet("npx supabase db push --include-all → 3 migraatiota viety tuotantoon (projekti xvhbwyxihcrugeditchm)"),
        bullet("Push origin/main → Vercel deployment automaattisesti"),

        // 12. Muut toteutukset
        h1("12. Muut aiemmat toteutukset"),
        makeTable(
          ["Ominaisuus", "Kuvaus"],
          [
            ["Auth & RLS", "JWT user_role claim custom hook:lla, middleware gating /coach/* ja /client/*"],
            ["PR-tunnistus", "set_logs-triggeri → recompute_pr_bucket() → personal_records upsert, Realtime toast"],
            ["Kutsuvirta", "Coach kutsuu clientin sähköpostilla, full_name kerätään hyväksynnässä"],
            ["Logo-invertointi", "Luotettava vaalea/tumma-tila kaikilla laitteilla"],
            ["Landing page", "Korvattu login-uudelleenohjauksella"],
            ["Offline prefetch", "useWorkoutPrefetch – prefetchaa tulevat treenit ja sivut kun online"],
          ]
        ),
        sp(2),

        // Footer note
        new Paragraph({
          children: [new TextRun({ text: "Raportti kattaa koko offline-first toteutuksen suunnittelupäätöksistä tuotantoon vientiin. Arkkitehtuuri kestää iOS:n Background Sync -rajoitukset, RLS-reunaehdot ja Dexie-React render-kilpatilanteet.", size: 18, color: GRAY, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          border: { top: { color: "E5E7EB", size: 4, space: 4, style: BorderStyle.SINGLE } },
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync("Gainly_Offline_Raportti.docx", buffer);
console.log("Luotu: Gainly_Offline_Raportti.docx");
