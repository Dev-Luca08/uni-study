# Uni Study

Studieplanner en flashcards in één app. Made by Luca Cicarelli.

- **Planning** (`planner.html`): vakken, hoofdstukken, examendata, slimme dagplanning, samenvattingen, herhalingen, timers, statistieken en thema's.
- **Flashcards** (`index.html`): sets uit Excel, Word, PDF of CSV, met slim herhalen, vrienden en delen.

Beide delen gebruiken hetzelfde account (Supabase) en hetzelfde thema (`theme.js`).
Geüploade samenvattingen en PowerPoints worden alleen op het toestel gelezen om pagina's te tellen; ze worden nergens opgeslagen.

## Bestanden

| Bestand | Inhoud |
|---|---|
| `planner-core.js` | data, synchronisatie, koppeling met flashcards, pagina's tellen |
| `planner-plan.js` | het planningsalgoritme |
| `planner-ui.js` | schermen Vandaag, Kalender, Vakken |
| `planner-extra.js` | timer, statistieken, personalisatie, instellingen |
| `sw.js` | offline werken |

Database: tabellen `planner_data` (eigen planning) en `planner_days` (minuten per dag, zichtbaar voor vrienden).
