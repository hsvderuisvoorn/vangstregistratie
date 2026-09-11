/* Vangstregister - kernlogica */

var SETTINGS_KEY = "vangst_settings";
var ENTRIES_KEY = "vangst_entries";
var MAP_IMAGE = "vijverkaart.jpg";

var state = {
  settings: loadSettings(),
  entries: loadEntries(),
  markerPos: null,
  gps: null,
  kalibratieModus: false
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
var els = {
  datum: document.getElementById("datum"),
  soort: document.getElementById("soort"),
  soortOverig: document.getElementById("soortOverig"),
  aantal: document.getElementById("aantal"),
  visser: document.getElementById("visser"),
  opmerking: document.getElementById("opmerking"),
  verstuurBtn: document.getElementById("verstuurBtn"),
  uploadStatus: document.getElementById("uploadStatus"),
  kaartContainer: document.getElementById("kaartContainer"),
  marker: document.getElementById("marker"),
  kaartHint: document.getElementById("kaartHint"),
  gpsStatus: document.getElementById("gpsStatus"),
  locatieInfo: document.getElementById("locatieInfo"),
  gpsBtn: document.getElementById("gpsBtn"),
  gpsResetBtn: document.getElementById("gpsResetBtn"),
  lijstSectie: document.getElementById("lijstSectie"),
  registratieLijst: document.getElementById("registratieLijst"),
  exportBtn: document.getElementById("exportBtn"),
  syncBtn: document.getElementById("syncBtn"),
  syncStatus: document.getElementById("syncStatus"),
  backendUrl: document.getElementById("backendUrl"),
  opslaanSettingsBtn: document.getElementById("opslaanSettingsBtn")
};

function initDatum() {
  var vandaag = new Date();
  var dd = String(vandaag.getDate()).padStart(2, "0");
  var mm = String(vandaag.getMonth() + 1).padStart(2, "0");
  var yyyy = vandaag.getFullYear();
  els.datum.value = yyyy + "-" + mm + "-" + dd;
}

/* -------- Vijverkaart: tik om locatie te markeren -------- */

function muisOpKaart(e) {
  e.preventDefault();
  var rect = els.kaartContainer.getBoundingClientRect();
  var x = ((e.clientX - rect.left) / rect.width) * 100;
  var y = ((e.clientY - rect.top) / rect.height) * 100;
  plaatsMarker(x, y);
  if (state.kalibratieModus) {
    vraagKalibratiePunt(x, y);
  }
}

function plaatsMarker(x, y) {
  state.markerPos = { x: x, y: y };
  els.marker.classList.remove("hidden");
  els.marker.style.left = x + "%";
  els.marker.style.top = y + "%";
  updateLocatieInfo();
}

function updateLocatieInfo() {
  var delen = [];
  if (state.markerPos) {
    delen.push("Kaart: " + Math.round(state.markerPos.x) + "%, " + Math.round(state.markerPos.y) + "%");
  }
  if (state.gps) {
    delen.push("GPS: " + state.gps.lat.toFixed(5) + ", " + state.gps.lon.toFixed(5));
  }
  els.locatieInfo.textContent = delen.join("  •  ");
}

/* -------- GPS: automatische locatie + koppeling aan kaart -------- */

function haalGpsOp() {
  if (!navigator.geolocation) {
    toonGpsStatus("GPS wordt niet ondersteund door dit apparaat. Tik zelf op de kaart.", true);
    return;
  }
  toonGpsStatus("Locatie ophalen...");
  navigator.geolocation.getCurrentPosition(function (pos) {
    state.gps = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
    toonGpsStatus("GPS-locatie vastgelegd (nauwkeurigheid ±" + Math.round(pos.coords.accuracy) + " m). Tik op de kaart om bij te stellen.", false);
    var kaartPos = gpsNaarKaart(state.gps);
    if (kaartPos) {
      plaatsMarker(kaartPos.x, kaartPos.y);
      toonGpsStatus("GPS-locatie vastgelegd én op de kaart gezet (nauwkeurigheid ±" + Math.round(pos.coords.accuracy) + " m).", false);
    } else {
      updateLocatieInfo();
    }
  }, function (fout) {
    var bericht = "GPS niet beschikbaar (";
    if (fout.code === 1) bericht += "toestemming geweigerd";
    else if (fout.code === 2) bericht += "geen signaal";
    else bericht += "fout";
    bericht += "). Tik zelf op de kaart voor je locatie.";
    toonGpsStatus(bericht, true);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

function toonGpsStatus(tekst, isFout) {
  els.gpsStatus.textContent = tekst;
  els.gpsStatus.classList.toggle("hidden", !tekst);
  els.gpsStatus.classList.toggle("waarschuwing", !!isFout);
}

/* -------- GPS <-> kaart kalibratie (minimaal 3 punten) -------- */

function gpsNaarKaart(gps) {
  var punten = (state.settings.kalibratie || []).filter(function (p) {
    return p.x != null && p.y != null && p.lat != null && p.lon != null;
  });
  if (punten.length < 3) return null;

  var A = [], bx = [], by = [];
  for (var i = 0; i < punten.length; i++) {
    var p = punten[i];
    A.push([1, p.lat, p.lon]);
    bx.push(p.x);
    by.push(p.y);
  }
  var solx = leastSquares(A, bx);
  var soly = leastSquares(A, by);
  if (!solx || !soly) return null;

  var x = solx[0] + solx[1] * gps.lat + solx[2] * gps.lon;
  var y = soly[0] + soly[1] * gps.lat + soly[2] * gps.lon;
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

/* Kalibratiemodus */
function vraagKalibratiePunt(x, y) {
  var lat = prompt("GPS-breedtegraad (lat) van dit kaartpunt? Bijv. 52.1234");
  if (lat === null) return;
  var lon = prompt("GPS-lengtegraad (lon) van dit kaartpunt? Bijv. 5.6789");
  if (lon === null) return;
  lat = parseFloat(lat.replace(",", "."));
  lon = parseFloat(lon.replace(",", "."));
  if (isNaN(lat) || isNaN(lon)) {
    alert("Ongeldige coördinaten. Punt niet toegevoegd.");
    return;
  }
  if (!state.settings.kalibratie) state.settings.kalibratie = [];
  state.settings.kalibratie.push({ x: x, y: y, lat: lat, lon: lon });
  saveSettings();
  alert("Kalibratiepunt opgeslagen (" + state.settings.kalibratie.length + " punten). Minimaal 3 nodig voor automatische koppeling.");
}

/* -------- Formulier -------- */

els.soort.addEventListener("change", function () {
  els.soortOverig.classList.toggle("hidden", els.soort.value !== "Overig...");
});

els.verstuurBtn.addEventListener("click", function () {
  var entry = bouwEntry();
  if (!entry) return;
  state.entries.push(entry);
  saveEntries();
  verstuur(entry);
  toonLijst();
  resetForm();
});

function bouwEntry() {
  var datum = els.datum.value;
  var soort = els.soort.value === "Overig..." ? els.soortOverig.value.trim() : els.soort.value;
  var aantal = parseInt(els.aantal.value, 10);
  if (!datum) { foutMelding("Kies een datum."); return null; }
  if (!soort) { foutMelding("Kies een vissoort."); return null; }
  if (!aantal || aantal < 1) { foutMelding("Vul een geldig aantal in."); return null; }

  var entry = {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    datum: datum,
    soort: soort,
    aantal: aantal,
    gps_lat: state.gps ? state.gps.lat : "",
    gps_lon: state.gps ? state.gps.lon : "",
    kaart_x: state.markerPos ? Math.round(state.markerPos.x * 10) / 10 : "",
    kaart_y: state.markerPos ? Math.round(state.markerPos.y * 10) / 10 : "",
    visser: els.visser.value.trim(),
    opmerking: els.opmerking.value.trim(),
    synced: false
  };
  return entry;
}

function resetForm() {
  els.soort.value = "";
  els.soortOverig.value = "";
  els.soortOverig.classList.add("hidden");
  els.aantal.value = "";
  els.visser.value = "";
  els.opmerking.value = "";
  state.markerPos = null;
  state.gps = null;
  els.marker.classList.add("hidden");
  els.gpsStatus.classList.add("hidden");
  els.gpsStatus.textContent = "";
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
  var url = (state.settings.backendUrl || "").trim();
  return url ? url.replace(/\/+$/, "") : "";
}

function verstuur(entry) {
  var url = backendUrl();
  if (!url) {
    markeerEntry(entry, "lokaal");
    return;
  }
  markeerEntry(entry, "versturen");
  fetch(url, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      datum: entry.datum,
      soort: entry.soort,
      aantal: entry.aantal,
      gps_lat: entry.gps_lat,
      gps_lon: entry.gps_lon,
      kaart_x: entry.kaart_x,
      kaart_y: entry.kaart_y,
      visser: entry.visser,
      opmerking: entry.opmerking
    })
  }).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    entry.synced = true;
    saveEntries();
    markeerEntry(entry, "gesynct");
    if (state.entries.indexOf(entry) === state.entries.length - 1) okMelding("Vangst geregistreerd en verstuurd.");
  }).catch(function () {
    markeerEntry(entry, "lokaal");
    if (state.entries.indexOf(entry) === state.entries.length - 1) {
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
    var loc = [];
    if (entry.kaart_x !== "") loc.push("kaart " + entry.kaart_x + "%, " + entry.kaart_y + "%");
    if (entry.gps_lat !== "" && entry.gps_lat !== null) {
      loc.push("GPS " + Number(entry.gps_lat).toFixed(5) + ", " + Number(entry.gps_lon).toFixed(5));
    }
    info.innerHTML = "<b>" + soortenIcon(entry.soort) + " " + esc(entry.soort) + " × " + entry.aantal + "</b><br>" +
      "<span class='klein'>" + esc(datumNl(entry.datum)) + " • " + (loc.length ? esc(loc.join(" • ")) : "geen locatie") + "</span>";
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
  var map = { Snoek: "🐊", Karper: "🐟", Baars: "🐟", Paling: "🐍", Meerval: "🐋", Brasem: "🐟", Zeelt: "🐟" };
  return map[soort] ? map[soort] : "🐠";
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

els.syncBtn.addEventListener("click", function () {
  if (!backendUrl()) { els.syncStatus.textContent = "Geen backend-URL ingesteld. Vul die in bij Instellingen, of exporteer het bestand."; return; }
  var teDoen = state.entries.filter(function (e) { return !e.synced; });
  if (teDoen.length === 0) { els.syncStatus.textContent = "Alles is al gesynchroniseerd."; return; }
  els.syncStatus.textContent = "Opnieuw versturen van " + teDoen.length + " registratie(s)...";
  teDoen.forEach(function (e) { verstuur(e); });
  setTimeout(function () {
    var rest = state.entries.filter(function (x) { return !x.synced; }).length;
    els.syncStatus.textContent = rest === 0 ? "Klaar: alles is gesynchroniseerd." : (rest + " registratie(s) nog altijd alleen lokaal opgeslagen.");
  }, teDoen.length * 400 + 3000);
});

/* -------- GPS & kaart events -------- */

els.gpsBtn.addEventListener("click", haalGpsOp);
els.gpsResetBtn.addEventListener("click", function () {
  state.gps = null;
  state.markerPos = null;
  els.marker.classList.add("hidden");
  els.gpsStatus.classList.add("hidden");
  els.gpsStatus.textContent = "";
  updateLocatieInfo();
});
els.kaartContainer.addEventListener("click", muisOpKaart);
els.kaartContainer.addEventListener("touchend", function (e) {
  var touch = e.changedTouches[0];
  if (!touch) return;
  var rect = els.kaartContainer.getBoundingClientRect();
  plaatsMarker(((touch.clientX - rect.left) / rect.width) * 100, ((touch.clientY - rect.top) / rect.height) * 100);
  if (state.kalibratieModus) vraagKalibratiePunt(state.markerPos.x, state.markerPos.y);
});

/* -------- Instellingen -------- */

els.backendUrl.value = (state.settings.backendUrl || "");
els.opslaanSettingsBtn.addEventListener("click", function () {
  state.settings.backendUrl = els.backendUrl.value.trim();
  saveSettings();
  okMelding("Instellingen opgeslagen.");
  setTimeout(function () { els.uploadStatus.classList.add("hidden"); }, 2500);
});

/* -------- Start -------- */

initDatum();
toonLijst();