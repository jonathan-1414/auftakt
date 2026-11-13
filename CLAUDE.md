# Auftakt – Projektbeschreibung für Claude Code

Auftakt ist ein kleines, modulares Notensatzprogramm als WebApp für den Musikunterricht
(Schwerpunkt iPad). Das Hauptziel: **Notentext und Klang verbinden.** Schüler.innen sollen
sehen, was sie hören, und hören, was sie schreiben. Wer eine Melodie notiert, kann sie sofort
abspielen und entscheiden, ob sie gefällt.

Auftakt ist kein Ersatz für MuseScore. Es ist absichtlich klein. Jedes Modul schaltet einen
etwas größeren Funktionsumfang frei. **Gebaut wird zuerst nur Modul 1 (Prototyp).** Die
Abschnitte zu Modul 2 und Vollversion beschreiben das Ziel, damit Datenmodell und Aufbau
von Anfang an dazu passen. Diese Funktionen werden noch **nicht** gebaut.

---

## 1. Arbeitsweise

- Ich (Jonathan, Musiklehrer) habe wenig Programmiererfahrung (etwas Python). Erkläre
  Entscheidungen kurz und verständlich, ohne Fachjargon vorauszusetzen.
- Arbeite in kleinen Schritten (siehe Abschnitt 7). Nach jedem Schritt muss die App
  lauffähig sein. Sag mir, wie ich das Ergebnis im Browser und auf dem iPad ansehe.
- Baue nichts, was nicht in Modul 1 steht, auch keine „kleinen Extras“. Wenn etwas fehlt oder
  unklar ist, frag nach.
- Neue Abhängigkeiten (npm-Pakete) nur nach Rückfrage, außer den in Abschnitt 2 genannten.
- Ein Commit pro abgeschlossenem Schritt, Commit-Nachrichten auf Deutsch.
- Programmlogik (Datenmodell, Eingaberegeln, Takt-Prüfung, Dateinamen) bekommt Tests.

## 2. Technik

| Zweck | Wahl |
| --- | --- |
| Sprache / Build | TypeScript, Vite, kein UI-Framework (reines DOM) |
| Notendarstellung | VexFlow 5 (SVG-Ausgabe) |
| Wiedergabe | Tone.js mit `Tone.Sampler` |
| Klänge | Klavier-Samples aus *tonejs-instruments* (nbrosowsky), nur die benötigten MP3-Dateien nach `public/samples/piano/` kopieren. Lizenz CC BY 3.0 → Namensnennung auf einer Info-Seite |
| PDF | jsPDF + svg2pdf.js (das VexFlow-SVG wird übernommen) |
| ZIP | fflate |
| Teilen | Web Share API mit Dateien (`navigator.share({ files })`), Rückfall: Download |
| Tests | Vitest |
| Hosting | statisch über GitHub Pages, kein Server |

Weitere Vorgaben:

- **Kein Server, keine Konten, keine Anmeldung.** Alle Daten bleiben auf dem Gerät.
- Code, Bezeichner und Kommentare auf Englisch, alle Texte der Oberfläche auf Deutsch.
- Texte der Oberfläche: neutrale Formen bevorzugen, sonst Gendern mit Punkt
  (Schüler.innen, Lehrer.innen). Nur wenn das Wort vor dem Punkt allein existiert, also nie
  „Kolleg.innen“, sondern „Kolleginnen und Kollegen“.
- `localStorage` immer in `try/catch` kapseln, es kann fehlen oder leer sein.
- Audio darf erst nach einer Berührung starten (iOS). `Tone.start()` beim ersten Tippen
  aufrufen, nicht erst beim ersten Play.

### Gestaltung

Schlicht und ruhig, nichts darf vom Notenbild ablenken. Das Notensystem nimmt den größten
Teil des Bildschirms ein, alles andere tritt zurück.

- **Farbe:** ein warmes Gelb-Orange als einzige Akzentfarbe, sonst nur warme Neutraltöne.
  Alle Farben als CSS-Variablen an einer Stelle festlegen, damit sie leicht änderbar sind.
  Vorschlag:
  - `--accent: #F2A93B` (warmes Gelb-Orange): gewählter Notenwert, aktive Buttons, Cursor,
    mitlaufende Markierung bei der Wiedergabe
  - `--accent-soft: #FCE7C3`: Flächen, z. B. ausgewählte Note oder Takt
  - `--accent-text: #8A4B00`: Akzent als Text oder Symbol auf hellem Grund
  - `--bg: #FFFBF4`, `--surface: #FFFFFF`, `--text: #2B2520`, `--muted: #8C8178`
- **Kontrast:** Texte und Symbole erfüllen mindestens WCAG AA. Auf `--accent` steht immer
  dunkler Text (`--text`), nie weißer.
- **Notenbild:** Noten, Linien und Schlüssel bleiben schwarz bzw. `--text` auf hellem Grund.
  Farbe im Notenbild nur für Zustände: Cursor, Auswahl, Vorschau-Note (halbtransparent),
  klingende Note.
- **Schrift:** eine runde Schrift für die ganze Oberfläche, z. B. **Nunito** (SIL Open Font
  License). Die Schriftdateien liegen im Projekt (`public/fonts/`) und werden **nicht** von
  Google Fonts oder einem anderen fremden Server geladen (Datenschutz, später offline nutzbar).
  Die Notensymbole kommen weiter aus der VexFlow-Notenschrift.
- **Formen:** abgerundete Ecken, keine Schatten, keine Verläufe, keine Animationen außer der
  mitlaufenden Markierung und dem Zeitbalken im Button „Notennamen“. Symbole in Leisten
  immer mit kurzer Beschriftung („Halbe“, „Abspielen“), damit niemand raten muss.
- Kein dunkler Modus in Modul 1.

## 3. Architektur

Das Datenmodell ist die einzige Wahrheit. Darstellung, Eingabe und Wiedergabe lesen und
ändern nur das Modell und arbeiten nie direkt miteinander.

```
src/
  model/      Datenmodell, Typen, reine Funktionen (Note setzen, löschen, Takt prüfen)
  modules/    Modul-Konfigurationen (modul1.ts, später modul2.ts …)
  render/     Modell → VexFlow (zeichnet nur, enthält keine Logik)
  input/      Touch-/Maus-Ereignisse → Aufrufe der Modell-Funktionen
  playback/   Modell → Tone.js (Zeitplan, mitlaufende Markierung)
  export/     Auftakt-Datei, PDF, ZIP, Dateinamen, Teilen
  ui/         Leisten, Dialoge, Startdialog
  storage/    automatisches Speichern im Browser
```

Nach jeder Änderung am Modell wird neu gezeichnet. Die Rückgängig-Funktion speichert
Kopien des Modells (Verlauf von Zuständen).

### 3.1 Datenmodell

Es ist von Anfang an für mehrere Notenzeilen, Instrumente und Lautstärken ausgelegt, auch
wenn Modul 1 nur eine Notenzeile benutzt.

```ts
const TICKS_PER_QUARTER = 48; // Ganze 192, Halbe 96, Viertel 48, Achtel 24,
                              // Sechzehntel 12, Triolen-Achtel 16, punktierte Viertel 72

interface Pitch {
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'; // wissenschaftliche Notation
  alter: -1 | 0 | 1;                              // Be, ohne, Kreuz
  octave: number;                                 // c' = C4, f'' = F5
}

type Event =
  | { kind: 'note'; pitch: Pitch; ticks: number; dotted?: boolean; tieToNext?: boolean }
  | { kind: 'rest'; ticks: number; auto: boolean }; // auto = von der App aufgefüllte Lücke

interface Staff {
  id: string;
  instrument: string; // Modul 1: 'piano'
  clef: 'treble' | 'bass';
  volume: number;     // 0..1, Lautstärke pro Notenzeile (Vollversion: Mischpult)
  measures: Event[][];
}

interface Score {
  format: 'auftakt';
  version: 1;
  meta: { title: string; names: string[]; className: string };
  moduleId: string;
  timeSignature: { beats: number; beatValue: number }; // Modul 1: 4/4
  keySignature: number;                                // Vorzeichen: -4..4, Modul 1: 0
  tempo: number;                                       // Viertel pro Minute
  swing: boolean;                                      // nur Wiedergabe, Notenbild bleibt gerade
  staves: Staff[];
}
```

Regeln:

- **Jeder Takt ist im Modell immer vollständig gefüllt.** Was keine Note ist, ist eine Pause
  mit `auto: true` (eine Lücke). Lücken werden **nicht gezeichnet**, der Platz im Takt bleibt
  leer. Die Takt-Prüfung kennt nur „voll“ (keine Lücke) und „nicht voll“.
- Notiert wird **immer klingend**, transponierende Instrumente gibt es im Notenbild nicht.
- Notennamen in der Oberfläche sind **deutsch**: c d e f g a h, B = H, Be-Vorzeichen auf h
  heißt b. Oktaven: c' … h' = 4. Oktave, c'' … = 5. Oktave.
- Gespeichert wird das Modell als JSON. Die Auftakt-Datei hat die Endung `.auftakt`
  (JSON-Inhalt mit `format` und `version`, damit spätere Versionen alte Dateien lesen können).

### 3.2 Modul-Konfiguration

Ein Modul ist eine Konfiguration. Die App blendet aus, was das Modul nicht erlaubt, und das
Modell lehnt unerlaubte Eingaben ab. Das Modul wird per Link gewählt
(`…/?modul=1`). Ohne Angabe gilt Modul 1.

```ts
const modul1: ModuleConfig = {
  id: '1',
  name: 'Modul 1',
  maxStaves: 1,
  measures: 4,
  timeSignatures: ['4/4'],
  keySignatures: [0],
  durations: [192, 96, 48, 24],   // Ganze, Halbe, Viertel, Achtel
  dotted: false,
  ties: false,
  manualRests: false,
  accidentals: [],
  range: { low: 'C4', high: 'F5' }, // c' bis f''
  tempoFixed: 90,
  exportFormats: ['auftakt', 'pdf'],
};
```

## 4. Modul 1 (Prototyp): Umfang

**Partitur**
- Beim Start ein Dialog mit Pflichtfeldern **Name(n)** (eine oder mehrere Personen) und
  **Klasse**, Titel optional. Gespeichert in `meta`, später über ein Info-Symbol änderbar.
- Eine Notenzeile, Violinschlüssel, C-Dur, 4/4-Takt, genau 4 Takte in einer Zeile,
  Schlussstrich automatisch, keine Taktnummern.
- Button „Neu“ (mit Rückfrage) beginnt eine leere Partitur.

**Noteneingabe** (immer Eingabemodus, kein Umschalten)
- Leiste mit den Notenwerten Ganze, Halbe, Viertel, Achtel. Ein Wert ist immer gewählt.
- Ein Eingabe-Cursor zeigt die Position, an der die nächste Note landet, und rückt nach jeder
  Note weiter. In einem leeren Takt steht er am Taktanfang.
- **Die Stelle wählt der Finger beim Aufsetzen:** über einer Note wird diese ersetzt, über
  einer Lücke kommt die Note an den Anfang der Lücke. Danach ist die Stelle festgehalten, der
  Finger kann zur Seite gleiten (damit er die Note nicht verdeckt).
- Eine **Vorschau-Note** folgt der Höhe des Fingers (Linie oder Zwischenraum). Beim Loslassen
  wird die Note gesetzt.
- **Beim Eingeben erklingt kein Ton** (Setzen, Ziehen, Ändern des Notenwerts). Klang gibt es
  in Modul 1 nur über „Abspielen“. Schüler.innen sollen die Noten lesen, nicht nach Gehör
  probieren.
- **Überschreiben:** Eine neue Note ersetzt, was an dieser Stelle steht. Verkürzte Reste
  werden zu Lücken. Passt der gewählte Wert an der gewählten Stelle nicht mehr in
  den Takt, erscheint keine Vorschau und die Note wird nicht gesetzt (keine Haltebögen in
  Modul 1). Die Leiste graut nichts vorab aus.
- Tonumfang c'–f''. Außerhalb wird keine Vorschau angezeigt. Hilfslinie nur beim c'.
- Notenkopf antippen = auswählen (die Note erscheint in `--accent`). Eine ausgewählte Note
  kann nach oben und unten gezogen werden (Tonhöhe ändern, ohne Ton) und gelöscht
  werden (wird zur Lücke).
- Beim Auswählen springt die Notenwert-Leiste auf den Wert der Note. Ein anderer Wert in der
  Leiste ändert die ausgewählte Note (kürzer: Rest wird Lücke; länger: ersetzt, was folgt).
  Passt der längere Wert nicht in den Takt, ändert sich nichts.
- Achtel werden automatisch nach Zählzeiten mit Balken verbunden.
- **Takt-Prüfung** mit nur zwei Zuständen, damit Schüler.innen selbst überlegen, was noch
  passt: Unter einem vollen Takt steht ein Häkchen (ohne Text), unter einem nicht vollen Takt
  ein leerer, gestrichelter Kreis. Ein leerer Takt ist ganz leer (keine Ganztaktpause).
- **Rückgängig** (mehrere Schritte), kein Wiederholen.
- Button **Notennamen** zeigt deutsche Notennamen unter den Notenköpfen **nur kurz**: 5 Sekunden
  lang, dabei leert sich die orange Füllung des Buttons als Balken. Danach ist der Button
  30 Sekunden gesperrt, ein heller Balken füllt sich, bis er wieder geht. Grund: Schüler.innen
  sollen nachschauen können, aber nicht dauerhaft nach Buchstaben spielen.

**Wiedergabe**
- Play/Stop-Button, Tempo fest ♩ = 90, Klavierklang.
- Die klingende Note leuchtet auf (mitlaufende Markierung, `Tone.Draw`).
- Lücken klingen als Pausen (Stille).

**Ansicht**
- Groß und für Touch optimiert (Tippflächen mindestens 44 × 44 pt), Pinch-Zoom.
- Querformat auf dem iPad ist der Hauptfall, Hochformat muss benutzbar sein.

**Speichern und Abgabe**
- Automatisches Speichern im Browser nach jeder Änderung, beim Öffnen wird der letzte
  Stand geladen.
- Button **Abgeben**: Auswahl der Formate **Auftakt-Datei** und **PDF** (beide vorausgewählt).
  - Dateiname: `[klasse]_[name(n)]_[jjjj-mm-tt]`, z. B. `7a_Mia-Ben_2026-11-11.pdf`.
  - Klasse und Namen kommen aus `meta`, das Datum ist der Tag der Abgabe.
  - Mehrere Namen mit `-` verbinden. Leerzeichen innerhalb eines Namens entfallen
    („Anna Lena“ → „AnnaLena“). ä → ae, ö → oe, ü → ue, ß → ss, Großbuchstaben ebenso.
    Alle anderen Sonderzeichen entfallen.
  - Ein Format gewählt → diese Datei. Beide gewählt → eine ZIP-Datei mit gleichem
    Namensschema (`7a_Mia-Ben_2026-11-11.zip`).
  - Weitergabe über das Teilen-Menü des Geräts (AirDrop usw.), sonst Download.
- Das PDF enthält oben Titel, Name(n), Klasse und Datum, darunter das Notenbild (ohne
  Takt-Prüfung).

**Sonstiges**
- Info-Seite mit Lizenzhinweisen (Samples CC BY 3.0, verwendete Bibliotheken).
- Läuft als WebApp im Browser (Safari auf dem iPad, dazu Chrome und Firefox am Rechner).
  Eine PWA ist erst für Modul 2 vorgesehen, aber nichts verbauen, was das verhindert.

## 5. Ausblick (nicht bauen, aber im Aufbau berücksichtigen)

**Modul 2 (Entwurf):** 8 Takte, 4/4, 3/4, 2/4, Auftakt; C-, G- und F-Dur; zusätzlich
punktierte Noten, Haltebögen, Pausen gezielt setzen; Kreuz und Be; Tonumfang c'–a'';
Taktnummern; Bildschirmklaviatur; Takt auswählen und kopieren; Wiedergabe ab Takt, Tempo-
Regler, Metronom, Einzähler, Schleife, Mitscrollen; Zeilen untereinander; Speichern und
Öffnen als Datei; Teilen per Link; Abgabe zusätzlich als Audio; PWA.

**Vollversion (Entwurf):**
- Bis zu 5 Instrumente, jedes mit eigener Notenzeile, das Klavier mit zwei Zeilen
  (höchstens 6 Zeilen). Kurzer Assistent beim Anlegen: Instrumente wählen, Klavier nur einmal.
- Instrumente: Flöte, Klarinette, Fagott, Saxofon, Trompete, Horn, Posaune, Tuba, Violine,
  Viola, Violoncello, Kontrabass, Klavier. Samples aus *tonejs-instruments*. Viola ohne eigene
  Samples: tief aus Cello-, hoch aus Violinen-Samples. Nur die verwendeten Instrumente laden.
- Schlüssel automatisch nach Instrument: Violin- oder Bassschlüssel. Die Viola wird im
  Violinschlüssel notiert, weitere Schlüssel gibt es nicht.
- Tonumfang pro Instrument, Noten außerhalb farbig markiert.
- Eine Stimme pro Notenzeile, Akkorde nur beim Klavier.
- **Lautstärke pro Notenzeile** (Kernfunktion), Stumm/Solo.
- **Swing-Achtel:** Gerade notierte Achtel klingen lang–kurz (etwa 2:1).
- Dur und Moll bis 4 Vorzeichen, 6/8 und 2/2, Sechzehntel, Triolen, Auflösungszeichen,
  Transponieren, Liedtext, Akkordsymbole mit Begleitung, Tempoangabe im Notentext.
- Export: Auftakt-Datei, PDF, Audio, MusicXML. Abgabe mit frei wählbaren Formaten.
- Aufgaben der Lehrkraft (Melodieanfang vorgeben, Noten sperren) und Hördiktat
  (Melodie hören ohne Notenbild, mitschreiben, vergleichen).
- PWA, offline nutzbar, Klänge zwischengespeichert.

## 6. Ausdrücklich ausgeschlossen (in keinem Modul)

Dynamik, Artikulation (auch Bindebögen), Verzierungen, Agogik (Ritardando, Fermate),
Generalbass, Panorama/Hall/Effekte, mehrere Stimmen in einer Notenzeile,
Schlüssel-/Tonart-/Taktartwechsel im Stück, Wiederholungszeichen, weitere Schlüssel
(Alt, Tenor), transponierte Notation, MIDI-Keyboard (Safari auf iOS hat kein Web MIDI),
Echtzeit-Einspielen, MIDI-Export, Konten, Server, Mailversand.

## 7. Arbeitsschritte für Modul 1

1. **Gerüst:** Vite + TypeScript, Ordnerstruktur, Vitest, Deployment auf GitHub Pages.
   Eine leere Seite ist online erreichbar.
2. **Datenmodell:** Typen, Modul-1-Konfiguration, reine Funktionen (Note setzen mit
   Überschreiben, löschen, Tonhöhe ändern, Takt-Prüfung, automatische Pausen) mit Tests.
3. **Darstellung:** Modell → VexFlow, 4 Takte, automatische Balken, Takt-Prüfung, Notennamen.
4. **Eingabe:** Notenwert-Leiste, Cursor, Vorschau-Note, Setzen, Auswählen, Ziehen, Löschen,
   Rückgängig. Zuerst mit Maus testen, dann auf dem iPad.
5. **Wiedergabe:** Klavier-Sampler, Play/Stop, mitlaufende Markierung (kein Ton beim Setzen).
6. **Startdialog und Speichern:** Pflichtfelder, automatisches Speichern, „Neu“.
7. **Abgabe:** Dateinamen (mit Tests), Auftakt-Datei, PDF, ZIP, Teilen.
8. **Feinschliff auf dem iPad:** Tippflächen, Zoom, Querformat und Hochformat, Info-Seite.

Nach Schritt 8 wird Modul 1 im Unterricht getestet. Danach geht es mit Modul 2 weiter.
