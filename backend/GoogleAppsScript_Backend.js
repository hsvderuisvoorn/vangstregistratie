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
 *  een kolom per veld, inclusief de kolom "Plaats" (het nummer
 *  van het visvak op de plattegrond).
 * ============================================================
 */

function doGet() {
  return ContentService
    .createTextOutput("Hengelvangst backend actief")
    .setMimeType(ContentService.MimeType.TEXT);
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

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Datum", "Maand", "Soort", "Aantal", "GPS_latitude", "GPS_longitude",
        "Kaart_X_%", "Kaart_Y_%", "Visser", "Opmerking", "Plaats", "Ingestuurd_op"
      ]);
      sheet.setFrozenRows(1);
    }

    // Zet de "Plaats"-kolom op de juiste plek als die nog ontbreekt
    var koppen = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var poi = koppen.indexOf("Ingestuurd_op");
    if (poi > 0 && koppen[poi - 1] !== "Plaats") {
      sheet.insertColumnBefore(poi + 1);
      sheet.getRange(1, poi + 1).setValue("Plaats");
    }

    var soort = (data.soort || "").trim();
    if (!soort || !data.datum || !data.aantal) {
      return json({ status: "fout", melding: "Vul minimaal datum, soort en aantal in." });
    }

    var maand = "";
    if (data.datum && data.datum.length >= 7) {
      maand = data.datum.substring(0, 7);
    }

    sheet.appendRow([
      data.datum,
      maand,
      soort,
      Number(data.aantal) || 0,
      data.gps_lat || "",
      data.gps_lon || "",
      data.kaart_x || "",
      data.kaart_y || "",
      data.visser || "",
      data.opmerking || "",
      data.plaats || "",
      new Date()
    ]);

    return json({ status: "ok" });
  } catch (err) {
    return json({ status: "fout", melding: "Serverprobleem: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  return out.setMimeType(ContentService.MimeType.JSON);
}