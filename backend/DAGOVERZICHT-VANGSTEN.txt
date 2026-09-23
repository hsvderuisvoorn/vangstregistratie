/* ============================================================
   DAGOVERZICHT-VANGSTEN - vangstregistratie HSV De Ruisvoorn
   ------------------------------------------------------------
   DIT BESTAND HOORT IN EEN EIGEN PROJECT VAN HET GMAIL-ACCOUNT
   "deruisvoornhelden@gmail.com" (net als de opgave-meldingen).

   WAT HET DOET
   - Staat als dag-klok (elke dag om 20:00 uur) in dat account.
   - Zoekt de spreadsheet "Vangstenregistratie" op naam op.
   - Verzamelt alle vangstregels die in de afgelopen 24 uur zijn
     ingezonden (kolom "Ingestuurd_op").
   - Alleen als er registraties zijn: een overzicht-mail naar
     paul@hsvderuisvoorn.nl met de sheetlink erbij.
   - Zet in kolom "Dagoverzicht gemeld" een "ja", zodat elke
     regel maar één keer in een dagoverzicht terechtkomt.

   INSTALLEREN (eenmalig)
   1. Deel de spreadsheet "Vangstenregistratie" (paul@) met
      deruisvoornhelden@gmail.com als BEWERKER.
   2. Log in als deruisvoornhelden@gmail.com.
   3. Ga naar https://script.google.com > Nieuw project >
      naam bijv. "VangstDagoverzicht".
   4. Vervang alle code door DIT bestand > Ctrl+S.
   5. Klok-icoon > + Add Trigger > functie
      verstuurDagoverzichtVangsten > Time-driven > Day timer
      > 8pm (20:00 uur) > Save (+ toestemmingen Toestaan).
   6. Klaar: elke dag om ~20:00 komt de samenvatting.
   ============================================================ */

var ONTVANGER = "paul@hsvderuisvoorn.nl";
var SHEETNAAM = "Vangstenregistratie";
var GEMELD_KOLOM = "Dagoverzicht gemeld";
var VENSTER_UREN = 24;

function verstuurDagoverzichtVangsten() {
  var gevonden = vindBlad();
  var blad = gevonden.blad;
  var sheetUrl = "https://docs.google.com/spreadsheets/d/" +
                 gevonden.bestandId + "/edit";

  var data = blad.getDataRange().getValues();
  var koppen = data[0];

  var k = {};
  for (var i = 0; i < koppen.length; i++) k[koppen[i]] = i;
  if (k["Datum"] == null || k["Soort"] == null ||
      k["Aantal"] == null || k["Ingestuurd_op"] == null) {
    return;                 /* tabel nog niet gevormd -> nog niets te melden */
  }

  /* markeer-kolom verzekeren (achteraan) */
  var kGemeld = k[GEMELD_KOLOM];
  if (kGemeld == null) {
    blad.getRange(1, koppen.length + 1).setValue(GEMELD_KOLOM);
    kGemeld = koppen.length;
  }

  var nu = new Date();
  var sinds = new Date(nu.getTime() - VENSTER_UREN * 60 * 60 * 1000);

  var regels = [];
  var aantallen = {};
  var totaalRegels = 0;
  var rijenTeMarkeren = [];

  for (var r = 1; r < data.length; r++) {
    var rij = data[r];
    if (String(rij[kGemeld]).length > 0) continue;          /* al gemeld */
    var instuurtijd = rij[k["Ingestuurd_op"]];
    if (!(instuurtijd instanceof Date)) continue;            /* geen tijdstempel */
    if (instuurtijd < sinds || instuurtijd > nu) continue;   /* buiten venster */

    rijenTeMarkeren.push(r);

    var plaats = String(rij[k["Plaats"]] || rij[k["Plaats_op_gps"]] || "").trim();
    var visser = String(rij[k["Visser"]] || "").trim() || "onbekend";
    var soort = String(rij[k["Soort"]] || "").trim();
    var aantal = Number(rij[k["Aantal"]]) || 0;

    regels.push((plaats ? "Plaats " + plaats + " | " : "") +
                visser + " | " + soort + ": " + aantal + "x");
    if (soort) aantallen[soort] = (aantallen[soort] || 0) + aantal;
    totaalRegels++;
  }

  if (regels.length === 0) return;   /* alleen mailen als er registraties zijn */

  var datumVandaag = Utilities.formatDate(nu, "GMT+0200", "dd-MM-yyyy");
  var body =
    "Vangstenregistratie van vandaag (" + datumVandaag + "):\n\n" +
    regels.join("\n") +
    "\n\nTotaal: " + totaalRegels + " vangstregels geregistreerd.\n" +
    perSoortTotaal(aantallen) +
    "\nDirect openen: " + sheetUrl + "\n";

  MailApp.sendEmail({
    to: ONTVANGER,
    subject: "Vangstenregistratie-overzicht " + datumVandaag,
    body: body
  });

  for (var m = 0; m < rijenTeMarkeren.length; m++) {
    blad.getRange(rijenTeMarkeren[m] + 1, kGemeld + 1).setValue("ja");
  }
}

/* ------------------------------------------------------------
   Tel de vangsten per vissoort voor een overzichtje onderaan.
   ------------------------------------------------------------ */
function perSoortTotaal(aantallen) {
  var soorten = Object.keys(aantallen).sort();
  if (soorten.length === 0) return "";
  var regels = soorten.map(function (s) {
    return s + ": " + aantallen[s] + "x";
  });
  return "Per soort:\n" + regels.join("\n") + "\n";
}

/* ------------------------------------------------------------
   Vindt de spreadsheet "Vangstenregistratie" en het tabblad
   "Vangsten" (maakt het tabblad indien nodig).
   ------------------------------------------------------------ */
function vindBlad() {
  var hit = null;
  var it = DriveApp.getFilesByName(SHEETNAAM);
  while (it.hasNext()) {
    var f = it.next();
    if (f.getMimeType() === MimeType.GOOGLE_SHEETS) {
      hit = f;
      break;
    }
  }
  if (!hit) {
    throw new Error("spreadsheet '" + SHEETNAAM + "' niet gevonden " +
                    "(is hij gedeeld met dit account?)");
  }
  var bestand = SpreadsheetApp.openById(hit.getId());
  var blad = bestand.getSheetByName("Vangsten");
  if (!blad) blad = bestand.insertSheet("Vangsten");
  return { blad: blad, bestandId: hit.getId() };
}