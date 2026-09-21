/* Vangstregister - kernlogica */

var SETTINGS_KEY = "vangst_settings";
var ENTRIES_KEY = "vangst_entries";

/* ===== BACKEND-URL VAN DE VERENIGING =====
 * Plak hier de web-app-URL uit de Google Apps Script-handleiding
 * (eindigt op /exec). Ledigs gelaten = alleen lokaal opslaan.
 * Zet de URL tussen de aanhalingstekens, bijv.:
 *   var BACKEND_URL = "https://script.google.com/macros/s/AKfyc.../exec";
 */
var BACKEND_URL = "https://script.google.com/macros/s/AKfycbx2-1yCY2MvQcPG7R6XDkeMrK7IwcY3LfRCbHu5hMQ9xuR1nmUNy5Cvg-a8p24vJbg/exec";

/* ===== PLAATSEN OP DE VIJVERKAART =====
 * Genummerde visvakken zoals op de plattegrond.
 */

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

function kaartPosUitPlaats(nr) {
  for (var i = 0; i < PLAATSEN.length; i++) {
    if (PLAATSEN[i].nr === nr) return { x: PLAATSEN[i].x, y: PLAATSEN[i].y };
  }
  return null;
}

function plaatsBestaat(nr) {
  return kaartPosUitPlaats(nr) !== null;
}

var state = {
  settings: loadSettings(),
  entries: loadEntries(),
  gps: null
};

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}
function loadEntries() {
  try { return JSON.parse(localStorage.getItem(ENTRIES_KEY)) || []; }
  catch (e) { return []; }
}
function saveEntries() {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(state.entries));
}

/* Verschillende benoemde elementen */
var SOORTEN = ["Voorn","Brasem","Spiegelkarper","Schubkarper","Graskarper","F1 (kruis-kroeskarper)","Bliek","Zeelt","Posje","Grondel","Zonnebaars","Snoek","Overig..."];
var els = {
  datum: document.getElementById("datum"),
  soortRegels: document.getElementById("soortRegels"),
  voegSoortBtn: document.getElementById("voegSoortBtn"),
  visser: document.getElementById("visser"),
  opmerking: document.getElementById("opmerking"),
  verstuurBtn: document.getElementById("verstuurBtn"),
  uploadStatus: document.getElementById("uploadStatus"),
  gpsStatus: document.getElementById("gpsStatus"),
  locatieInfo: document.getElementById("locatieInfo"),
  gpsBtn: document.getElementById("gpsBtn"),
  gpsResetBtn: document.getElementById("gpsResetBtn"),
  plaatsHandmatig: document.getElementById("plaatsHandmatig"),
  lijstSectie: document.getElementById("lijstSectie"),
  registratieLijst: document.getElementById("registratieLijst"),
  exportBtn: document.getElementById("exportBtn"),
  syncBtn: document.getElementById("syncBtn"),
  syncStatus: document.getElementById("syncStatus")
};

function initDatum() {
  var vandaag = new Date();
  var dd = String(vandaag.getDate()).padStart(2, "0");
  var mm = String(vandaag.getMonth() + 1).padStart(2, "0");
  var yyyy = vandaag.getFullYear();
  els.datum.value = yyyy + "-" + mm + "-" + dd;
}

/* -------- Locatie: automatisch via GPS of handmatig plaatsnummer -------- */

function updateLocatieInfo() {
  var delen = [];
  if (els.plaatsHandmatig && els.plaatsHandmatig.value.trim() !== "") {
    delen.push("Plaats " + els.plaatsHandmatig.value.trim() + " (handmatig)");
  }
  if (state.gps) {
    delen.push("GPS: " + state.gps.lat.toFixed(5) + ", " + state.gps.lon.toFixed(5));
  }
  els.locatieInfo.textContent = delen.join("  •  ");
}

function toonGpsStatus(tekst, isFout) {
  els.gpsStatus.textContent = tekst;
  els.gpsStatus.classList.toggle("hidden", !tekst);
  els.gpsStatus.classList.toggle("waarschuwing", !!isFout);
}

function toonLocatieMelding(tekst) {
  var el = document.getElementById("locatieMelding");
  if (!el) return;
  el.textContent = tekst;
  el.classList.toggle("hidden", !tekst);
}

function haalGpsOp() {
  if (!navigator.geolocation) {
    toonGpsStatus("GPS wordt niet ondersteund door dit apparaat. Vul het plaatsnummer handmatig in.", true);
    return;
  }
  toonGpsStatus("Locatie ophalen...");
  navigator.geolocation.getCurrentPosition(function (pos) {
    state.gps = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
    if (els.plaatsHandmatig) els.plaatsHandmatig.value = "";
    toonGpsStatus("GPS-locatie vastgelegd (nauwkeurigheid ±" + Math.round(pos.coords.accuracy) + " m).", false);
    toonLocatieMelding("");
    updateLocatieInfo();
  }, function (fout) {
    var bericht = "GPS niet beschikbaar (";
    if (fout.code === 1) bericht += "toestemming geweigerd";
    else if (fout.code === 2) bericht += "geen signaal";
    else bericht += "fout";
    bericht += "). Vul het plaatsnummer handmatig in.";
    toonGpsStatus(bericht, true);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

/* -------- Formulier -------- */

function maakSoortRegel(soort, overig, aantal) {
  var rij = document.createElement("div");
  rij.className = "soort-regel";

  var sel = document.createElement("select");
  sel.className = "regel-soort";
  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Kies een soort...";
  sel.appendChild(placeholder);
  SOORTEN.forEach(function (s) {
    var o = document.createElement("option");
    o.textContent = s;
    if (s === soort) o.selected = true;
    sel.appendChild(o);
  });
  sel.value = soort || "";

  var txt = document.createElement("input");
  txt.type = "text";
  txt.className = "regel-soort-overig hidden";
  txt.placeholder = "Welke soort?";
  txt.value = overig || "";

  var aantalIn = document.createElement("input");
  aantalIn.type = "number";
  aantalIn.className = "regel-aantal";
  aantalIn.min = "1";
  aantalIn.step = "1";
  aantalIn.inputMode = "numeric";
  aantalIn.placeholder = "Aantal";
  if (aantal) aantalIn.value = aantal;

  var verwijder = document.createElement("button");
  verwijder.type = "button";
  verwijder.className = "btn-secondary regel-verwijder";
  verwijder.textContent = "\u2715";
  verwijder.title = "Deze soort verwijderen";
  verwijder.addEventListener("click", function () {
    rij.remove();
    updateVerwijderKnoppen();
  });

  sel.addEventListener("change", function () {
    txt.classList.toggle("hidden", sel.value !== "Overig...");
  });

  rij.appendChild(sel);
  rij.appendChild(txt);
  rij.appendChild(aantalIn);
  rij.appendChild(verwijder);
  els.soortRegels.appendChild(rij);
  updateVerwijderKnoppen();
  return rij;
}

function updateVerwijderKnoppen() {
  var knoppen = els.soortRegels.querySelectorAll(".regel-verwijder");
  [].forEach.call(knoppen, function (k, i) {
    k.classList.toggle("hidden", i === 0 && knoppen.length === 1);
  });
}

function leesSoortRegels() {
  return [].map.call(els.soortRegels.querySelectorAll(".soort-regel"), function (rij) {
    var sel = rij.querySelector(".regel-soort");
    var overig = rij.querySelector(".regel-soort-overig");
    var aantal = rij.querySelector(".regel-aantal");
    var soort = sel.value === "Overig..." ? overig.value.trim() : sel.value;
    var a = parseInt(aantal.value, 10);
    return { soort: soort, aantal: (a > 0) ? a : 0 };
  });
}

els.voegSoortBtn.addEventListener("click", function () {
  maakSoortRegel();
});

els.verstuurBtn.addEventListener("click", function () {
  var entries = bouwEntries();
  if (!entries) return;
  entries.forEach(function (entry) {
    state.entries.push(entry);
    saveEntries();
  });
  toonLijst();
  verstuurEntries(entries);
  resetForm();
});

function bouwEntries() {
  var datum = els.datum.value;
  var visser = els.visser.value.trim();
  var opmerking = els.opmerking.value.trim();
  var regels = leesSoortRegels().filter(function (r) { return r.soort && r.aantal; });

  if (!datum) { foutMelding("Kies een datum."); return null; }
  if (regels.length === 0) { foutMelding("Vul minstens een vissoort met aantal in."); return null; }

  var handmatig = els.plaatsHandmatig ? els.plaatsHandmatig.value.trim() : "";
  var heeftGps = !!state.gps;
  if (handmatig === "" && !heeftGps) {
    foutMelding("Kies eerst je locatie: druk op de GPS-knop of vul een plaatsnummer in.");
    toonLocatieMelding("Geen locatie gekozen. Kies de GPS-knop of vul een plaatsnummer in.");
    return null;
  }
  var plaats = "";
  if (handmatig !== "") {
    var nrHand = Number(handmatig);
    if (!plaatsBestaat(nrHand)) {
      foutMelding("Plaatsnummer " + nrHand + " bestaat niet (kies een geldig nummer).");
      toonLocatieMelding("Plaatsnummer " + nrHand + " bestaat niet.");
      return null;
    }
    plaats = nrHand;
  }
  toonLocatieMelding("");

  var sessieId = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  return regels.map(function (r, i) {
    return {
      id: sessieId + "-" + i,
      sessieId: sessieId,
      datum: datum,
      soort: r.soort,
      aantal: r.aantal,
      gps_lat: state.gps ? state.gps.lat : "",
      gps_lon: state.gps ? state.gps.lon : "",
      kaart_x: "",
      kaart_y: "",
      plaats: plaats,
      visser: visser,
      opmerking: opmerking,
      synced: false
    };
  });
}

function resetForm() {
  var regels = els.soortRegels.querySelectorAll(".soort-regel");
  [].forEach.call(regels, function (rij, i) {
    if (i === 0) {
      var sel = rij.querySelector(".regel-soort");
      var overig = rij.querySelector(".regel-soort-overig");
      var aantal = rij.querySelector(".regel-aantal");
      sel.value = "";
      overig.value = "";
      overig.classList.add("hidden");
      aantal.value = "";
    } else {
      rij.remove();
    }
  });
  updateVerwijderKnoppen();
  els.visser.value = "";
  els.opmerking.value = "";
  state.gps = null;
  els.gpsStatus.classList.add("hidden");
  els.gpsStatus.textContent = "";
  if (els.plaatsHandmatig) els.plaatsHandmatig.value = "";
  toonLocatieMelding("");
  updateLocatieInfo();
}

function foutMelding(tekst) {
  els.uploadStatus.classList.remove("hidden", "ok");
  els.uploadStatus.classList.add("fout");
  els.uploadStatus.textContent = "⚠ " + tekst;
}

function okMelding(tekst) {
  els.uploadStatus.classList.remove("hidden", "fout");
  els.uploadStatus.classList.add("ok");
  els.uploadStatus.textContent = "✓ " + tekst;
}

/* -------- Verzenden naar Google Sheet-backend -------- */

function backendUrl() {
  return BACKEND_URL ? BACKEND_URL.replace(/\/+$/, "") : "";
}

function groepeerOpSessie(entries) {
  var groepen = [];
  var index = {};
  entries.forEach(function (e) {
    var sleutel = e.sessieId || e.id || "los";
    if (!index[sleutel]) { index[sleutel] = []; groepen.push(index[sleutel]); }
    index[sleutel].push(e);
  });
  return groepen;
}

function verstuurEntries(entries) {
  if (entries.length === 0) return;
  var url = backendUrl();
  if (!url) {
    entries.forEach(function (e) { markeerEntry(e, "lokaal"); });
    return;
  }
  entries.forEach(function (e) { markeerEntry(e, "versturen"); });
  var eerste = entries[0];
  var sessie = {
    datum: eerste.datum,
    gps_lat: eerste.gps_lat,
    gps_lon: eerste.gps_lon,
    kaart_x: eerste.kaart_x,
    kaart_y: eerste.kaart_y,
    plaats: eerste.plaats || "",
    visser: eerste.visser,
    opmerking: eerste.opmerking,
    soorten: entries.map(function (e) { return { soort: e.soort, aantal: e.aantal }; })
  };
  fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(sessie)
  }).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    entries.forEach(function (e) { e.synced = true; saveEntries(); markeerEntry(e, "gesynct"); });
    var laatste = entries[entries.length - 1];
    if (state.entries.indexOf(laatste) === state.entries.length - 1) okMelding("Vangst geregistreerd en verstuurd.");
  }).catch(function () {
    entries.forEach(function (e) { markeerEntry(e, "lokaal"); });
    var laatste = entries[entries.length - 1];
    if (state.entries.indexOf(laatste) === state.entries.length - 1) {
      okMelding("Vangst lokaal opgeslagen. Wordt opnieuw verstuurd zodra de server bereikbaar is.");
    }
  });
}

function markeerEntry(entry, status) {
  var li = document.getElementById("entry-" + entry.id);
  if (!li) return;
  var s = li.querySelector(".status-sync");
  if (!s) {
    s = document.createElement("div");
    s.className = "status-sync";
    li.querySelector(".info").appendChild(s);
  }
  s.className = "status-sync";
  if (status === "gesynct") { s.classList.add("synced"); s.textContent = "gesynchroniseerd"; }
  else if (status === "versturen") { s.textContent = "versturen..."; }
  else { s.textContent = "alleen lokaal opgeslagen"; }
}

/* -------- Lijst van registraties -------- */

function toonLijst() {
  if (state.entries.length === 0) { els.lijstSectie.classList.add("hidden"); return; }
  els.lijstSectie.classList.remove("hidden");
  els.registratieLijst.innerHTML = "";
  state.entries.slice().reverse().forEach(function (entry) {
    var li = document.createElement("li");
    li.id = "entry-" + entry.id;
    var info = document.createElement("div");
    info.className = "info";
    var regels = [];
    if (entry.plaats !== "" && entry.plaats !== null && entry.plaats !== undefined) regels.push("Plaats " + entry.plaats);
    if (entry.gps_lat !== "" && entry.gps_lat !== null) {
      regels.push("GPS " + Number(entry.gps_lat).toFixed(5) + ", " + Number(entry.gps_lon).toFixed(5));
    }
    if (regels.length === 0) regels.push("geen locatie");
    info.innerHTML = "<b>" + soortenIcon(entry.soort) + " " + esc(entry.soort) + " × " + entry.aantal + "</b><br>" +
      "<span class='klein'>" + esc(datumNl(entry.datum)) + " • " + esc(regels.join(" • ")) + "</span>";
    var verwijder = document.createElement("button");
    verwijder.className = "verwijder";
    verwijder.textContent = "✕";
    verwijder.title = "Verwijderen";
    verwijder.addEventListener("click", function () {
      var idx = state.entries.indexOf(entry);
      if (idx > -1) state.entries.splice(idx, 1);
      saveEntries();
      toonLijst();
    });
    var status = document.createElement("div");
    status.className = "status-sync" + (entry.synced ? " synced" : "");
    status.textContent = entry.synced ? "gesynchroniseerd" : "alleen lokaal opgeslagen";
    info.appendChild(status);
    li.appendChild(info);
    li.appendChild(verwijder);
    els.registratieLijst.appendChild(li);
  });
}

function datumNl(iso) {
  var d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

function soortenIcon(soort) {
  var s = String(soort || "").toLowerCase();
  if (s.indexOf("snoek") !== -1) return "🐊";
  if (s.indexOf("paling") !== -1) return "🐍";
  if (s.indexOf("meerval") !== -1) return "🐋";
  if (s.indexOf("brasem") !== -1) return "🐟";
  if (s.indexOf("baars") !== -1 || s.indexOf("zonnebaars") !== -1) return "🐟";
  if (s.indexOf("karper") !== -1) return "🐠";
  if (s.indexOf("zeelt") !== -1) return "🐟";
  return "🐠";
}

function esc(tekst) {
  return String(tekst).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* -------- Exporteer & synchroniseer -------- */

els.exportBtn.addEventListener("click", function () {
  var blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vangstregistraties-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
});

function automatischeSync() {
  if (!backendUrl()) return;
  var teDoen = state.entries.filter(function (e) { return !e.synced; });
  if (teDoen.length === 0) return;
  var melding = "Bezig met automatisch versturen van " + teDoen.length + " registratie(s)...";
  if (state.entries.length > 0) els.syncStatus.textContent = melding;
  groepeerOpSessie(teDoen).forEach(verstuurEntries);
  setTimeout(function () {
    var rest = state.entries.filter(function (x) { return !x.synced; }).length;
    if (rest === 0 && teDoen.length > 0 && state.entries.length > 0) {
      els.syncStatus.textContent = "Klaar: alles is automatisch gesynchroniseerd.";
    }
  }, teDoen.length * 400 + 3000);
}

window.addEventListener("online", automatischeSync);

els.syncBtn.addEventListener("click", function () {
  if (!backendUrl()) { els.syncStatus.textContent = "De vereniging heeft nog geen centrale opslag ingesteld. Registraties blijven op dit toestel. Gebruik Exporteren om de gegevens door te sturen."; return; }
  var teDoen = state.entries.filter(function (e) { return !e.synced; });
  if (teDoen.length === 0) { els.syncStatus.textContent = "Alles is al gesynchroniseerd."; return; }
  els.syncStatus.textContent = "Opnieuw versturen van " + teDoen.length + " registratie(s)...";
  groepeerOpSessie(teDoen).forEach(verstuurEntries);
  setTimeout(function () {
    var rest = state.entries.filter(function (x) { return !x.synced; }).length;
    els.syncStatus.textContent = rest === 0 ? "Klaar: alles is gesynchroniseerd." : (rest + " registratie(s) nog altijd alleen lokaal opgeslagen.");
  }, teDoen.length * 400 + 3000);
});

/* -------- GPS & locatie-events -------- */

els.gpsBtn.addEventListener("click", haalGpsOp);
els.plaatsHandmatig.addEventListener("input", function () {
  var v = els.plaatsHandmatig.value.trim();
  if (v === "") {
    toonGpsStatus("", false);
    updateLocatieInfo();
    return;
  }
  var nr = Number(v);
  if (plaatsBestaat(nr)) {
    toonGpsStatus("Plaats " + nr + " handmatig gekozen.", false);
    toonLocatieMelding("");
  } else {
    toonGpsStatus("Plaatsnummer " + v + " bestaat niet (kies een geldig nummer).", true);
    toonLocatieMelding("Plaatsnummer " + v + " bestaat niet.");
  }
  updateLocatieInfo();
});
els.gpsResetBtn.addEventListener("click", function () {
  state.gps = null;
  if (els.plaatsHandmatig) els.plaatsHandmatig.value = "";
  els.gpsStatus.classList.add("hidden");
  els.gpsStatus.textContent = "";
  updateLocatieInfo();
});

/* -------- Start -------- */

initDatum();
maakSoortRegel();
toonLijst();
automatischeSync();