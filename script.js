async function fetchAllButterflyObservations() {
  const currentYear = new Date().getFullYear();
  const baselineStart = currentYear - 25;

  let page = 1;
  let all = [];
  let done = false;

 while (!done) {
  const url = `https://api.inaturalist.org/v1/observations?taxon_id=47157&place_id=47&per_page=200&page=${page}&order=asc&order_by=observed_on`;
  const r = await fetch(url);

  if (!r.ok) {
    console.warn("Stopping pagination due to HTTP error:", r.status);
    break;
  }

  const data = await r.json();

  if (!data.results || data.results.length === 0) {
    done = true;
    break;
  }

  all = all.concat(data.results);

  page++;

  // safety limit so we never hit page 51 again
  if (page > 20) {
    console.warn("Stopping pagination at page limit");
    break;
  }
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function classify(anomaly) {
  if (anomaly < -5) return "early";
  if (anomaly > 5) return "late";
  return "normal";
}

async function computeSpeciesAnomalies() {
  const currentYear = new Date().getFullYear();
  const baselineStart = currentYear - 25;

  const obs = await fetchAllButterflyObservations();

  const speciesMap = {};

  obs.forEach(o => {
    if (!o.taxon || !o.observed_on_details?.date) return;

    const name = o.taxon.name;
    const date = new Date(o.observed_on_details.date);
    const doy = dayOfYear(date);

    if (!speciesMap[name]) {
      speciesMap[name] = { current: [], baseline: [] };
    }

    if (date.getFullYear() === currentYear) {
      speciesMap[name].current.push(doy);
    } else if (date.getFullYear() >= baselineStart && date.getFullYear() < currentYear) {
      speciesMap[name].baseline.push(doy);
    }
  });

  const results = [];

  for (const [name, data] of Object.entries(speciesMap)) {
    if (data.current.length === 0 || data.baseline.length === 0) continue;

    const currentMean = mean(data.current);
    const baselineMean = mean(data.baseline);
    const anomaly = currentMean - baselineMean;

    results.push({
      name,
      currentMean,
      baselineMean,
      anomaly,
      status: classify(anomaly),
      count: data.current.length
    });
  }

  return results.sort((a, b) => a.anomaly - b.anomaly);
}

document.getElementById("load").addEventListener("click", async () => {
  const summary = document.getElementById("summary");
  const tbody = document.querySelector("#species-table tbody");

  summary.innerHTML = "Loading…";

  const species = await computeSpeciesAnomalies();

  const overall = mean(species.map(s => s.anomaly));

  summary.innerHTML = `
    <h2>Summary</h2>
    <p><strong>Overall anomaly:</strong> ${overall.toFixed(2)} days (${overall < 0 ? "earlier" : "later"})</p>
    <p><strong>Species analyzed:</strong> ${species.length}</p>
  `;

  tbody.innerHTML = "";

  species.forEach(s => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${s.name}</td>
      <td class="${s.status}">${s.status}</td>
      <td>${s.anomaly.toFixed(1)}</td>
      <td>${s.baselineMean.toFixed(1)}</td>
      <td>${s.currentMean.toFixed(1)}</td>
      <td>${s.count}</td>
    `;
    tbody.appendChild(row);
  });
});
