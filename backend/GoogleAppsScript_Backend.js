/**
 * ============================================================
 *  HENGELVANGST REGISTRATIE - GOOGLE APPS SCRIPT BACKEND
 * ============================================================
 *
 *  AANPASSEN: als je deze code aanpast, moet je OPNIEUW
 *  implementeren: Implementeren > Nieuwe implementatie (of
 *  bij bestaande uitvoering een nieuwe versie aanmaken en
 *  "Web-app-URL" bekijken). De /exec-link blijft gelijk.
 *
 *  INSTALLATIE (eenmalig, door de vereniging):
 *  1. Ga naar https://sheets.new  (maakt een nieuwe Google spreadsheet)
 *  2. Geef de spreadsheet een naam, bijv. "Hengelvangst registratie"
 *  3. Klik in het menu: Extensies > Apps Script
 *  4. Wis de eventuele bestaande code en plak dit hele bestand erin
 *  5. Klik op Opslaan (diskette-icoon) en geef een naam, bijv. "VangstBackend"
 *  6. Klik op "Implementeren" > "Nieuwe implementatie"
 *     - Type: Web-app
 *     - Uitvoeren als: "Ik" (je eigen Google-account)
 *     - Toegang: "Iedereen"  (iedereen met de link, ook anoniem)
 *  7. Klik op Implementeren en vul daarna (eerstvolgende keer) de
 *     Google-bevestiging "Deze app is niet geverifieerd" in door
 *     te kiezen: Geavanceerd > Ga naar VangstBackend (onveilig)
 *     + Toestemming geven. Alléén schrijven; er wordt nooit data
 *     uitgelezen.
 *  8. Kopieer de "Web-app-URL" (eindigt op /exec) en zet hem in
 *     app.js bij var BACKEND_URL.
 *
 *  De spreadsheet krijgt automatisch een tabblad "Vangsten" met
 *  een kolom per veld. Naast "GPS_latitude/longitude" wordt ook
 *  "Plaats_op_gps" gevuld: het plaatsnummer dat automatisch wordt
 *  afgeleid uit de GPS-coördinaten (via de kalibratiepunten en de
 *  plaatsenlijst hieronder).
 * ============================================================
 */

function doGet() {
  return ContentService
    .createTextOutput("Hengelvangst backend actief")
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ---------- wekelijkse herinnering (1x per week) ---------- */

function stuurWeekHerinnering() {
  var ontvanger = "jpgpthijssen@gmail.com";
  var body = "Vergeet niet de gegevens van de hengelvangstregistratie te verversen.\n\n" +
    "App: https://hsvderuisvoorn.github.io/vangstregistratie/";
  MailApp.sendEmail(ontvanger, "Hengelvangstregistratie - wekelijkse herinnering", body);
}

function zetWeekHerinneringAan() {
  // bestaande triggers vooraf opruimen om geen dubbelen te krijgen
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "stuurWeekHerinnering") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("stuurWeekHerinnering")
    .timeBased()
    .atHour(9)
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .create();
}

function zetWeekHerinneringUit() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "stuurWeekHerinnering") ScriptApp.deleteTrigger(t);
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Vangsten");

    if (!sheet) {
      sheet = ss.insertSheet("Vangsten");
    }

    // nieuw formaat: { datum, visser, opmerking, plaats, gps..., soorten: [{soort, aantal}] }
    // oud formaat (per rij): { ... soort, aantal }
    var soorten = [];
    if (data.soorten && data.soorten.length) {
      soorten = data.soorten;
    } else if (data.soort) {
      soorten = [{ soort: data.soort, aantal: data.aantal }];
    }

    if (!data.datum || soorten.length === 0) {
      return json({ status: "fout", melding: "Vul minimaal datum en een vissoort met aantal in." });
    }

    // Plaatsnummer afleiden uit GPS-coördinaten (indien aanwezig)
    var plaatsOpGps = "";
    if (data.gps_lat && data.gps_lon) {
      plaatsOpGps = gpsNaarPlaats(Number(data.gps_lat), Number(data.gps_lon));
    }

    for (var i = 0; i < soorten.length; i++) {
      var s = soorten[i];
      var soort = String(s.soort || "").trim();
      var aantal = Number(s.aantal);
      if (!soort || !aantal) continue;
      voegRijToe(sheet, {
        datum: data.datum,
        soort: soort,
        aantal: aantal,
        gps_lat: data.gps_lat,
        gps_lon: data.gps_lon,
        kaart_x: data.kaart_x,
        kaart_y: data.kaart_y,
        plaats: data.plaats,
        visser: data.visser,
        opmerking: data.opmerking
      }, plaatsOpGps);
    }

    werkGrafiekenBij();

    return json({ status: "ok" });
  } catch (err) {
    return json({ status: "fout", melding: "Serverprobleem: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================
 *  KALIBRATIEPUNTEN EN PLAATSENLIJST
 *  Zelfde waarden als in app.js. Aanpassen = beide bijwerken.
 * ============================================================ */

var KALIBRATIE = [
  { lat: 51.334588, lon: 6.031775, x: 1.3, y: 28.8 },   // plek 3
  { lat: 51.334653, lon: 6.033626, x: 50.4, y: 26.9 },  // plek 21
  { lat: 51.334187, lon: 6.032008, x: 8.1, y: 52.8 },   // plek 1
  { lat: 51.333471, lon: 6.034874, x: 83.8, y: 90.2 }   // ~plek 35
];

var PLAATSEN = [
  { nr: 1, x: 8.1, y: 52.8 },   { nr: 2, x: 2.6, y: 35.1 },
  { nr: 3, x: 1.3, y: 28.8 },   { nr: 1, x: 8.1, y: 52.5 },
  { nr: 1, x: 7.6, y: 52.8 },   { nr: 1, x: 8.4, y: 51.8 },
  { nr: 2, x: 3.7, y: 34.4 },   { nr: 3, x: 2.8, y: 28.8 },
  { nr: 4, x: 9.5, y: 12.2 },   { nr: 5, x: 13.2, y: 11.9 },
  { nr: 6, x: 18, y: 12.2 },    { nr: 7, x: 21.3, y: 14.3 },
  { nr: 8, x: 23.7, y: 18.9 },  { nr: 9, x: 24.9, y: 23.8 },
  { nr: 10, x: 25.2, y: 29.8 }, { nr: 11, x: 24.9, y: 36.1 },
  { nr: 12, x: 24.5, y: 42.8 }, { nr: 13, x: 25.7, y: 48.9 },
  { nr: 14, x: 28.3, y: 55.2 }, { nr: 15, x: 35.2, y: 54.4 },
  { nr: 16, x: 37.9, y: 49.4 }, { nr: 16, x: 37.6, y: 50.3 },
  { nr: 17, x: 39.3, y: 45.7 }, { nr: 18, x: 40.3, y: 37.5 },
  { nr: 19, x: 40.6, y: 31.5 }, { nr: 20, x: 41.3, y: 27.1 },
  { nr: 21, x: 50.4, y: 26.9 }, { nr: 22, x: 52.6, y: 29.8 },
  { nr: 23, x: 55.7, y: 30.8 }, { nr: 24, x: 58.4, y: 33.7 },
  { nr: 25, x: 63.1, y: 35.1 }, { nr: 26, x: 66, y: 36.3 },
  { nr: 27, x: 69.7, y: 38.3 }, { nr: 28, x: 73, y: 42.4 },
  { nr: 29, x: 75.9, y: 46.2 }, { nr: 30, x: 78, y: 51.1 },
  { nr: 31, x: 81.4, y: 54.4 }, { nr: 32, x: 83.8, y: 59.3 },
  { nr: 33, x: 86.7, y: 63.4 }, { nr: 34, x: 89.3, y: 67.7 },
  { nr: 35, x: 83.8, y: 90.2 }, { nr: 35, x: 85.2, y: 92.1 },
  { nr: 36, x: 79, y: 87.5 },   { nr: 36, x: 80, y: 89 },
  { nr: 36, x: 80.5, y: 89 },   { nr: 37, x: 75.4, y: 85.8 },
  { nr: 38, x: 71.1, y: 82.9 }, { nr: 39, x: 66.7, y: 79.3 },
  { nr: 39, x: 67, y: 82 },     { nr: 40, x: 61.9, y: 78.6 },
  { nr: 41, x: 59.3, y: 73.5 }, { nr: 42, x: 57.1, y: 68.5 },
  { nr: 42, x: 57.8, y: 69.4 }, { nr: 43, x: 54.3, y: 65.6 },
  { nr: 44, x: 50.6, y: 61.9 }, { nr: 44, x: 51.6, y: 63.1 },
  { nr: 45, x: 48.9, y: 60.2 }, { nr: 46, x: 43, y: 63.9 },
  { nr: 46, x: 43.9, y: 62.9 }, { nr: 47, x: 40.3, y: 68.2 },
  { nr: 47, x: 40.6, y: 67.5 }, { nr: 48, x: 37.6, y: 71.1 },
  { nr: 49, x: 32.8, y: 72.8 }, { nr: 49, x: 34.1, y: 70.6 },
  { nr: 50, x: 28.8, y: 70.4 }, { nr: 50, x: 29.7, y: 71.4 },
  { nr: 51, x: 24.2, y: 71.6 }, { nr: 52, x: 19.7, y: 68 },
  { nr: 52, x: 20.3, y: 68.7 }, { nr: 53, x: 16.7, y: 65.6 },
  { nr: 54, x: 13.2, y: 62.2 }, { nr: 55, x: 11.4, y: 57.3 }
];

/* Afstandsdrempel (in % van de kaart) voor koppelen aan een plaats
   Zelfde waarde als vindPlaats() in app.js. */
var PLAATS_DREMPEL = 2.5;

/* ============================================================
 *  GPS -> plaatsnummer
 * ============================================================ */

function gpsNaarPlaats(lat, lon) {
  var pos = gpsNaarKaart(lat, lon);
  if (!pos) return "";
  var dichtste = "";
  var beste = PLAATS_DREMPEL;
  for (var i = 0; i < PLAATSEN.length; i++) {
    var p = PLAATSEN[i];
    var afstand = Math.sqrt((p.x - pos.x) * (p.x - pos.x) + (p.y - pos.y) * (p.y - pos.y));
    if (afstand < beste) { beste = afstand; dichtste = p.nr; }
  }
  return dichtste;
}

function gpsNaarKaart(lat, lon) {
  if (KALIBRATIE.length < 3) return null;
  var A = [], bx = [], by = [];
  for (var i = 0; i < KALIBRATIE.length; i++) {
    var p = KALIBRATIE[i];
    A.push([1, p.lat, p.lon]);
    bx.push(p.x);
    by.push(p.y);
  }
  var solx = leastSquares(A, bx);
  var soly = leastSquares(A, by);
  if (!solx || !soly) return null;
  var x = solx[0] + solx[1] * lat + solx[2] * lon;
  var y = soly[0] + soly[1] * lat + soly[2] * lon;
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));
  return { x: x, y: y };
}

function leastSquares(M, b) {
  var n = M.length, d = M[0].length;
  var ATA = [], ATb = [];
  for (var i = 0; i < d; i++) {
    ATA.push(new Array(d).fill(0));
    ATb.push(0);
  }
  for (var i = 0; i < n; i++) {
    for (var r = 0; r < d; r++) {
      ATb[r] += M[i][r] * b[i];
      for (var c = 0; c < d; c++) ATA[r][c] += M[i][r] * M[i][c];
    }
  }
  try { return gauss(ATA, ATb); } catch (e) { return null; }
}

function gauss(A, b) {
  var n = A.length;
  for (var i = 0; i < n; i++) {
    var max = i;
    for (var r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
    if (Math.abs(A[max][i]) < 1e-12) throw new Error("singulier");
    var tmp = A[i]; A[i] = A[max]; A[max] = tmp;
    var tb = b[i]; b[i] = b[max]; b[max] = tb;
    var div = A[i][i];
    for (var c = 0; c < n; c++) A[i][c] /= div;
    b[i] /= div;
    for (var r = 0; r < n; r++) {
      if (r === i) continue;
      var f = A[r][i];
      for (var c = 0; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  return b;
}

/* ============================================================
 *  Spreadsheet: kolommen verzekeren + rij toevoegen
 * ============================================================ */

var VERWACHTE_KOPPEN = [
  "Datum", "Maand", "Soort", "Aantal",
  "GPS_latitude", "GPS_longitude",
  "Kaart_X_%", "Kaart_Y_%",
  "Visser", "Opmerking",
  "Plaats", "Plaats_op_gps", "Ingestuurd_op"
];

function verzekerKoppen(sheet) {
  var cols = sheet.getLastColumn();
  var koppen = cols > 0 ? sheet.getRange(1, 1, 1, cols).getValues()[0] : [];
  if (typeof koppen[0] === "string" && koppen[0].indexOf("Datum") !== -1) {
    // bestaande header: ontbrekende kolommen invoegen vóór "Ingestuurd_op"
    var poi = koppen.indexOf("Ingestuurd_op");
    for (var i = 0; i < VERWACHTE_KOPPEN.length; i++) {
      if (koppen.indexOf(VERWACHTE_KOPPEN[i]) === -1) {
        var insertAt = poi > 0 ? poi + 1 : koppen.length + 1;
        sheet.insertColumnBefore(insertAt);
        sheet.getRange(1, insertAt).setValue(VERWACHTE_KOPPEN[i]);
        koppen.splice(insertAt - 1, 0, VERWACHTE_KOPPEN[i]);
        if (poi >= insertAt - 1) poi++;
      }
    }
    return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }
  // lege sheet: volledige kopregel maken
  sheet.getRange(1, 1, 1, VERWACHTE_KOPPEN.length).setValues([VERWACHTE_KOPPEN]);
  sheet.setFrozenRows(1);
  return VERWACHTE_KOPPEN.slice();
}

function voegRijToe(sheet, data, plaatsOpGps) {
  var koppen = verzekerKoppen(sheet);
  var rij = [];
  for (var i = 0; i < koppen.length; i++) {
    rij.push(waardeVoorKol(koppen[i], data, plaatsOpGps));
  }
  sheet.appendRow(rij);
}

function waardeVoorKol(kop, data, plaatsOpGps) {
  if (kop === "Datum") return data.datum || "";
  if (kop === "Maand") return (data.datum && data.datum.length >= 7) ? data.datum.substring(0, 7) : "";
  if (kop === "Soort") return (data.soort || "").trim();
  if (kop === "Aantal") return Number(data.aantal) || 0;
  if (kop === "GPS_latitude") return data.gps_lat || "";
  if (kop === "GPS_longitude") return data.gps_lon || "";
  if (kop === "Kaart_X_%") return data.kaart_x || "";
  if (kop === "Kaart_Y_%") return data.kaart_y || "";
  if (kop === "Visser") return data.visser || "";
  if (kop === "Opmerking") return data.opmerking || "";
  if (kop === "Plaats") return data.plaats || "";
  if (kop === "Plaats_op_gps") return plaatsOpGps || "";
  if (kop === "Ingestuurd_op") return new Date();
  return "";
}

/* ============================================================
 *  GRAFIEKEN
 *  - "Grafiek - Jaar"   : totaal per jaar per vissoort (ALV)   *
 *  - "Grafiek - Plaats" : totaal per plaats per vissoort (bestuur)
 * ============================================================
 *  Wordt automatisch ververst bij elke nieuwe registratie.
 *  Handmatig: menu Vangsten > Grafieken verversen.
 * ============================================================ */

var KLEUR_PER_SOORT = {
  "Voorn": "#F9A825",
  "Brasem": "#1565C0",
  "Spiegelkarper": "#2E7D32",
  "Schubkarper": "#795548",
  "Graskarper": "#7CB342",
  "F1 (kruis-kroeskarper)": "#00897B",
  "Bliek": "#90A4AE",
  "Zeelt": "#9E9D24",
  "Posje": "#BCAAA4",
  "Grondel": "#5D4037",
  "Zonnebaars": "#29B6F6",
  "Snoek": "#C62828",
  "Meerval": "#4E342E",
  "Paling": "#33691E",
  "Baars": "#FB8C00",
  "Overig...": "#BDBDBD"
};

function kleurenVoor(soorten) {
  return soorten.map(function (s) { return KLEUR_PER_SOORT[s] || "#BDBDBD"; });
}

function isDonker(hex) {
  var c = String(hex || "#FFFFFF").replace("#", "");
  if (c.length !== 6) return false;
  var r = parseInt(c.substr(0, 2), 16);
  var g = parseInt(c.substr(2, 2), 16);
  var b = parseInt(c.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}

function werkGrafiekenBij() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bron = ss.getSheetByName("Vangsten");
  if (!bron) return;
  var data = bron.getDataRange().getValues();

  // oud tabblad "Grafieken" (van oudere versie) opruimen
  var oud = ss.getSheetByName("Grafieken");
  if (oud) ss.deleteSheet(oud);

  bouwGrafiekJaar(data);
  bouwGrafiekPlaats(data);
}

/* helpertje: kolomindexen uit de kopregel */
function kolomIndexen(data) {
  var koppen = data[0];
  return {
    datum: koppen.indexOf("Datum"),
    maand: koppen.indexOf("Maand"),
    soort: koppen.indexOf("Soort"),
    aantal: koppen.indexOf("Aantal"),
    plaats: koppen.indexOf("Plaats"),
    plaatsGps: koppen.indexOf("Plaats_op_gps")
  };
}

function jaarVanRij(rij, k) {
  // Google Sheets slaat datums op als Date-object; wees dus op beide voorbereid
  var maand = rij[k.maand];
  if (maand instanceof Date) return String(maand.getFullYear());
  var m = String(maand || "").match(/^\s*(\d{4})/);
  if (m) return m[1];
  var dag = rij[k.datum];
  if (dag instanceof Date) return String(dag.getFullYear());
  var d = String(dag || "").match(/^\s*(\d{4})/);
  if (d) return d[1];
  return "";
}

/* ---------- grafiek 1: totaal per jaar per vissoort (ALV) ---------- */

function bouwGrafiekJaar(data) {
  var k = kolomIndexen(data);
  if (k.soort < 0 || k.aantal < 0) return;

  var perJaar = {};       // jaar -> { soort -> totaal }
  var alleSoorten = {};
  for (var r = 1; r < data.length; r++) {
    var jaar = jaarVanRij(data[r], k);
    if (!jaar) continue;
    var soort = String(data[r][k.soort] || "").trim();
    var aantal = Number(data[r][k.aantal]);
    if (!soort || !aantal) continue;
    if (!perJaar[jaar]) perJaar[jaar] = {};
    perJaar[jaar][soort] = (perJaar[jaar][soort] || 0) + aantal;
    alleSoorten[soort] = 1;
  }
  var jaren = Object.keys(perJaar).sort();
  var soorten = Object.keys(alleSoorten).sort();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var blad = ss.getSheetByName("Grafiek - Jaar");
  if (!blad) blad = ss.insertSheet("Grafiek - Jaar");
  var bestaandeCharts = blad.getCharts();
  for (var c = 0; c < bestaandeCharts.length; c++) blad.removeChart(bestaandeCharts[c]);
  blad.clear();

  blad.getRange(1, 1).setValue("Totaal gevangen per jaar per vissoort");
  blad.getRange(1, 1).setFontWeight("bold");

  if (jaren.length === 0) {
    blad.getRange(3, 1).setValue("Nog geen vangsten geregistreerd.");
    return;
  }

  var nRijen = 1 + jaren.length;
  var nKol = 1 + soorten.length;
  var inhoud = [["Jaar"].concat(soorten)];
  for (var j2 = 0; j2 < jaren.length; j2++) {
    var rij2 = [jaren[j2]];
    for (var s2 = 0; s2 < soorten.length; s2++) {
      rij2.push(perJaar[jaren[j2]][soorten[s2]] || 0);
    }
    inhoud.push(rij2);
  }
  blad.getRange(3, 1, nRijen, nKol).setValues(inhoud);

  var bereik = blad.getRange(3, 1, nRijen, nKol);
  var chart = blad.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(bereik)
    .setNumHeaders(1)
    .setOption("title", "Vangsten per jaar per vissoort")
    .setOption("hAxis.title", "Jaar")
    .setOption("vAxis.title", "Aantal")
    .setOption("isStacked", false)
    .setOption("colors", kleurenVoor(soorten))
    .setOption("legend", { position: "top", maxLines: 5, textStyle: { fontSize: 12, bold: true } })
    .setOption("width", 900)
    .setOption("height", 460)
    .setPosition(3, nKol + 3, 0, 0)
    .build();
  blad.insertChart(chart);

  // kleurensleutel: elke vissoort op een cel met zijn eigen kleur
  var legStart = 3 + nRijen + 2;
  blad.getRange(legStart, 1).setValue("Kleuren per vissoort");
  blad.getRange(legStart, 1).setFontWeight("bold");
  for (var i2 = 0; i2 < soorten.length; i2++) {
    var kleur = KLEUR_PER_SOORT[soorten[i2]] || "#BDBDBD";
    blad.getRange(legStart + 1 + i2, 1).setValue(soorten[i2]);
    var gekleurd = blad.getRange(legStart + 1 + i2, 1, 1, 2);
    gekleurd.setBackground(kleur);
    gekleurd.setFontColor(isDonker(kleur) ? "#FFFFFF" : "#000000");
    gekleurd.setFontWeight("bold");
  }

  blad.getRange(1, nKol + 3).setValue("BESTEMD VOOR DE ALV");
  blad.getRange(1, nKol + 3).setFontWeight("bold");
}

/* ---------- grafiek 2: per plaats per vissoort (bestuur) ---------- */

function bouwGrafiekPlaats(data) {
  var k = kolomIndexen(data);
  if (k.soort < 0 || k.aantal < 0 || (k.plaats < 0 && k.plaatsGps < 0)) return;

  // per plaats: totaal aantal per vissoort (Plaats_op_gps heeft voorrang)
  var perPlaats = {};
  for (var r = 1; r < data.length; r++) {
    var soort = String(data[r][k.soort] || "").trim();
    var aantal = Number(data[r][k.aantal]);
    if (!soort || !aantal) continue;
    // plaats: handmatig gekozen of via de kaart heeft voorrang, anders afgeleid uit GPS
    var plaats = data[r][k.plaats] || data[r][k.plaatsGps] || "";
    if (plaats === "" || plaats === null) continue;
    var nr = String(plaats);
    if (!perPlaats[nr]) perPlaats[nr] = {};
    perPlaats[nr][soort] = (perPlaats[nr][soort] || 0) + aantal;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var graf = ss.getSheetByName("Grafiek - Plaats");
  if (!graf) graf = ss.insertSheet("Grafiek - Plaats");
  var bestaandeCharts = graf.getCharts();
  for (var c = 0; c < bestaandeCharts.length; c++) graf.removeChart(bestaandeCharts[c]);
  graf.clear();

  var plaatsNrs = Object.keys(perPlaats).sort(function (a, b) { return Number(a) - Number(b); });

  graf.getRange(1, 1).setValue("Vangsten per plaats (handmatig/kaart heeft voorrang, anders via GPS)");
  graf.getRange(1, 1).setFontWeight("bold");
  graf.getRange(1, 1).setNote("Automatisch bijgewerkt bij elke nieuwe registratie. Handmatig verversen: menu Vangsten > Grafieken verversen.");
  graf.getRange(1, 8).setValue("BESTEMD VOOR HET BESTUUR");
  graf.getRange(1, 8).setFontWeight("bold");

  // 3 diagrammen per rij om het compacter te houden
  var kolomBlok = 6;   // kolommen breed per diagram
  var diagramW = 560;  // pixels breed
  var diagramH = 300;  // pixels hoog (ruimte voor de legenda)
  var startRij = 3;
  var dataKolom = 20;  // plek (rechts, uit het zicht) voor de data per diagram

  for (var i = 0; i < plaatsNrs.length; i++) {
    var nr2 = plaatsNrs[i];
    var soorten = perPlaats[nr2];
    var soortNamen = Object.keys(soorten).sort();

    var rij = startRij + Math.floor(i / 3) * 40;
    var kolom = 1 + (i % 3) * kolomBlok;

    var titel = graf.getRange(rij, kolom);
    titel.setValue("Plaats " + nr2);
    titel.setFontWeight("bold");

    // data van dit diagram: elke soort is een eigen reeks (net als in Grafiek - Jaar)
    // 3 rijen per blok zodat de data van elk diagram elkaar niet overschrijft
    var dataRij = 3 + i * 3;
    var kop = ["Plaats"].concat(soortNamen);
    var waarden = ["Plaats " + nr2];
    for (var s = 0; s < soortNamen.length; s++) waarden.push(soorten[soortNamen[s]]);
    graf.getRange(dataRij, dataKolom, 1, 1 + soortNamen.length).setValues([kop]);
    graf.getRange(dataRij + 1, dataKolom, 1, 1 + soortNamen.length).setValues([waarden]);

    var bereik = graf.getRange(dataRij, dataKolom, 2, 1 + soortNamen.length);
    var chart = graf.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(bereik)
      .setNumHeaders(1)
      .setOption("title", "Plaats " + nr2)
      .setOption("vAxis.title", "Aantal")
      .setOption("isStacked", false)
      .setOption("colors", kleurenVoor(soortNamen))
      .setOption("legend", { position: "top", maxLines: 3, textStyle: { fontSize: 11 } })
      .setOption("width", diagramW)
      .setOption("height", diagramH)
      .setPosition(rij + 1, kolom, 0, 0)
      .build();
    graf.insertChart(chart);
  }
}

function verversGrafieken() {
  werkGrafiekenBij();
  SpreadsheetApp.getUi().alert("Grafieken zijn bijgewerkt.");
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Vangsten")
    .addItem("Grafieken verversen", "verversGrafieken")
    .addToUi();
  // grafieken automatisch bijwerken bij het openen van de spreadsheet
  try {
    werkGrafiekenBij();
  } catch (e) {
    // stil negeren; kan mislukken als bij het openen nog geen edit-rechten zijn verleend
  }
}

function json(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  return out.setMimeType(ContentService.MimeType.JSON);
}