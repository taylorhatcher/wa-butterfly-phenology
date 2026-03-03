async function fetchAllButterflyObservations() {
  const currentYear = new Date().getFullYear();
  const baselineStart = currentYear - 25;

  let page = 1;
  let all = [];

  while (true) {
    const url = `https://api.inaturalist.org/v1/observations?taxon_id=47157&place_id=47&per_page=200&page=${page}&order=asc&order_by=observed_on`;
    const r = await fetch(url);

    // Stop if API blocks paging
    if (!r.ok) {
      console.warn("Stopping pagination due to HTTP error:", r.status);
      break;
    }

    const data = await r.json();

    // Stop if no results returned
    if (!data.results || data.results.length === 0) {
      break;
    }

    all = all.concat(data.results);

    page++;

    // Hard stop to prevent page 51 problem
    if (page > 20) {
      console.warn("Stopping pagination at page limit");
      break;
    }
  }

  return all;
}

