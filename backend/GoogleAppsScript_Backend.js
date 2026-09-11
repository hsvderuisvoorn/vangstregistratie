/**
 * ============================================================
 *  HENGELVANGST REGISTRATIE - GOOGLE APPS SCRIPT BACKEND
 * ============================================================
 *
 *  INSTALLATIE (eenmalig, door de vereniging):
 *  1. Ga naar https://sheets.new  (maakt een nieuwe Google spreadsheet)
 *  2. Geef de spreadsheet een naam, bijv. "Hengelvangst registratie"
 *  3. Klik in het menu: Extensies > Apps Script
 *  4. Wis de eventuele bestaande code en plak dit hele bestand erin
 *  5. Klik op Opslaan (diskette-icoon) en geef een naam, bijv. "VangstBackend"
 *  6. Klik op "Implementeren" (of "Deployen") > Nieuwe implementatie
 *     - Type: Web-app
 *     - Uitvoeren als: "Ik" (je eigen Google-account)
 *     - Toegang: "Iedereen"  (iedereen met de link, ook anoniem)
 *  7. Klik op Implementeren, keer terug en Vul de "Web-app-URL" in
 *     (dat is de link die eindigt op /exec)
 *  8. Kopieer die URL en zet hem in app.js bij BACKEND_URL
 *
 *  Let op: bij de eerste implementatie moet je Google's bevestiging
 *  "Deze app is niet geverifieerd" overslaan (Geavanceerd > Ga verder).
 *  De app mag geanonimiseerde vangstgegevens ontvangen.
 *
 *  De spreadsheet krijgt automatisch een tabblad "Vangsten" met een
 *  kolom per veld. Analyse (grafieken) doe je via tabs > Invoegen >
 *  Grafiek / draaitabel. Zie het stappenplan in de chat/uitleg.
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

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Vangsten");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Vangsten");
      sheet.appendRow([
        "Datum", "Maand", "Soort", "Aantal", "GPS_latitude", "GPS_longitude",
        "Kaart_X_%", "Kaart_Y_%", "Visser", "Opmerking", "Ingestuurd_op"
      ]);
      sheet.setFrozenRows(1);
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