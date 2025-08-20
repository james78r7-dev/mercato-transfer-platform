/*
 * 🎯 Direct Transfermarkt Fetch Module (for OBS CEF)
 * - Fetches real clubs data directly from Transfermarkt (via proxies)
 * - Parses HTML and builds clubs array
 * - Enriches with logos using same logic as transfermarkt-real-data.html
 * - NO localStorage used; returns data to caller
 */

(function(global){
  async function fetchTransfermarktHTML() {
    const TRANSFERMARKT_URL = 'https://www.transfermarkt.com/transfers/einnahmenausgaben/statistik/plus/0?ids=a&sa=&saison_id=2025&saison_id_bis=2025&land_id=&nat=&kontinent_id=&pos=&altersklasse=&w_s=&leihe=&intern=0&plus=0';

    const proxies = [
      { url: 'https://api.allorigins.win/get?url=', type: 'allorigins', name: 'AllOrigins' },
      { url: 'https://corsproxy.io/?', type: 'direct', name: 'CorsProxy.io' },
      { url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'direct', name: 'CodeTabs' },
      { url: 'https://cors-anywhere.herokuapp.com/', type: 'direct', name: 'CORS Anywhere' }
    ];

    console.log('🔄 Direct TM fetch start');

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];
      try {
        let requestUrl;
        const options = {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Requested-With': 'XMLHttpRequest'
          }
        };

        if (proxy.type === 'allorigins') {
          requestUrl = proxy.url + encodeURIComponent(TRANSFERMARKT_URL + '&_=' + Date.now());
        } else {
          requestUrl = proxy.url + TRANSFERMARKT_URL + '&_=' + Date.now();
        }

        console.log(`📡 Proxy ${i+1}/${proxies.length}: ${proxy.name}`);
        const res = await fetch(requestUrl, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let html;
        if (proxy.type === 'allorigins') {
          const data = await res.json();
          html = data.contents;
        } else {
          html = await res.text();
        }

        if (!html || html.length < 1000) throw new Error('Empty HTML');
        console.log(`✅ Got HTML via ${proxy.name}, length=${html.length}`);
        return html;
      } catch (err) {
        console.warn(`❌ Proxy ${proxy.name} failed:`, err.message);
      }
    }

    throw new Error('All proxies failed');
  }

  async function parseTransfermarktData(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const tableSelectors = [
      'table.items',
      '.responsive-table table',
      'table[class*="items"]',
      'table tbody',
      'table',
      '.tm-table table',
      '[data-table] table'
    ];

    let table = null;
    for (const s of tableSelectors) { table = doc.querySelector(s); if (table) break; }
    if (!table) {
      const all = doc.querySelectorAll('table');
      for (const t of all) {
        if (t.textContent.includes('€') && t.textContent.includes('m')) { table = t; break; }
      }
    }
    if (!table) throw new Error('No table found');

    const rows = table.querySelectorAll('tbody tr, tr');
    const clubs = [];
    let count = 0;

    rows.forEach((row) => {
      if (count >= 10) return;
      const cells = row.querySelectorAll('td, th');
      if (cells.length < 4) return;
      try {
        const c = extractAdvancedClubData(cells, count + 1);
        if (c) { clubs.push(c); count++; }
      } catch(e) {}
    });

    if (clubs.length === 0) throw new Error('No valid clubs parsed');
    return clubs;
  }

  function extractAdvancedClubData(cells, rank) {
    try {
      // Robust extraction adapted from transfermarkt-real-data.html
      let clubName = '';

      // Check first few cells for anchor or img alt
      for (let i = 0; i < Math.min(3, cells.length); i++) {
        const cell = cells[i];
        const nameLink = cell.querySelector('a[href*="/verein/"]') ||
                         cell.querySelector('a[title]') ||
                         cell.querySelector('a');
        if (nameLink && nameLink.textContent.trim().length > 2) {
          clubName = nameLink.textContent.trim();
          break;
        }
        const logoImg = cell.querySelector('img[alt]');
        if (logoImg && logoImg.alt.trim().length > 2) {
          if (!clubName) clubName = logoImg.alt.trim();
        }
        const cellText = (cell.textContent || '').trim();
        if (!clubName && cellText.length > 2 && !cellText.includes('€') && !/^\d+$/.test(cellText)) {
          clubName = cellText;
        }
      }

      // Clean club name (remove leading rank numbers like "1. ")
      clubName = clubName.replace(/^\d+\.?\s*/, '').trim();
      if (!clubName || clubName.length < 2) {
        return null;
      }

      // Financials
      let expenditure = '€0.00m';
      let arrivals = '0';
      let income = '€0.00m';
      let departures = '0';
      let balance = '€0.00m';

      for (let i = 1; i < cells.length; i++) {
        const cellText = (cells[i].textContent || '').trim();
        if (cellText.includes('€') && cellText.includes('m')) {
          if (expenditure === '€0.00m') {
            expenditure = cellText;
          } else if (income === '€0.00m') {
            income = cellText;
          } else if (balance === '€0.00m') {
            balance = cellText;
          }
        } else if (/^\d+$/.test(cellText)) {
          if (arrivals === '0') arrivals = cellText; else if (departures === '0') departures = cellText;
        }
      }

      // Validate at least expenditure looks like money
      if (!expenditure.includes('€')) {
        return null;
      }

      const englishName = clubName;
      const arabicName = translateClubName(englishName);

      return {
        rank: rank,
        englishName,
        arabicName,
        name: arabicName || englishName,
        expenditure,
        arrivals: parseInt(arrivals.replace(/\D/g, '')) || 0,
        income,
        departures: parseInt(departures.replace(/\D/g, '')) || 0,
        balance,
        league: getClubLeague(englishName),
        logoUrl: null,
        lastUpdated: new Date().toISOString(),
        dataSource: 'transfermarkt-direct'
      };
    } catch (e) {
      return null;
    }
  }

  async function loadLogoDatabase() {
    const arr = [];
    // 1) Try server-side database (most reliable across OBS)
    try {
      const resp = await fetch('/api/clubs-database?_=' + Date.now());
      if (resp.ok) {
        const json = await resp.json();
        const serverClubs = json?.data?.clubs || [];
        if (Array.isArray(serverClubs) && serverClubs.length) {
          arr.push(...serverClubs);
        }
      }
    } catch {}

    // 2) Fallback to local storages (may be empty in OBS)
    try {
      const ls1 = localStorage.getItem('clubManagerData');
      if (ls1) arr.push(...JSON.parse(ls1));
    } catch {}
    try {
      const ls2 = localStorage.getItem('verifiedClubs');
      if (ls2) arr.push(...JSON.parse(ls2));
    } catch {}
    try {
      const ls3 = localStorage.getItem('transfermarktData');
      if (ls3) {
        const data = JSON.parse(ls3);
        if (Array.isArray(data)) arr.push(...data.filter(c => c.logoUrl));
      }
    } catch {}

    // de-duplicate by normalized English/Arabic names
    const uniq = [];
    const seen = new Set();
    for (const c of arr) {
      const key = (c.englishName||c.arabicName||c.name||'').toLowerCase().replace(/\s*(fc|cf|ac|sc)\s*$/i,'').trim();
      if (!seen.has(key)) { seen.add(key); uniq.push(c); }
    }
    return uniq;
  }

  function findClubLogo(name, db){
    if (!name) return null;
    const n = name.toLowerCase();
    const exact = db.find(c => (c.englishName||'').toLowerCase() === n || (c.arabicName||'').toLowerCase() === n || (c.name||'').toLowerCase() === n);
    if (exact && exact.logoUrl) return exact.logoUrl;
    return null;
  }

  function smartLogoSearch(name, db){
    if (!name) return null;
    const n = name.toLowerCase();
    // loose contains
    const hit = db.find(c => (c.englishName||'').toLowerCase().includes(n) || (c.name||'').toLowerCase().includes(n));
    return hit?.logoUrl || null;
  }

  function keywordLogoSearch(name, db){
    if (!name) return null;
    const keywords = name.toLowerCase().split(/\s|-/).filter(Boolean);
    for (const kw of keywords){
      const hit = db.find(c => (c.englishName||'').toLowerCase().includes(kw) || (c.name||'').toLowerCase().includes(kw));
      if (hit?.logoUrl) return hit.logoUrl;
    }
    return null;
  }

  async function enrichWithLogos(clubs){
    const db = await loadLogoDatabase();
    const out = [];
    for (const club of clubs){
      let logo = findClubLogo(club.englishName, db) || findClubLogo(club.name, db) || smartLogoSearch(club.englishName, db) || keywordLogoSearch(club.englishName, db);
      out.push({ ...club, logoUrl: logo || null });
    }
    return out;
  }

  async function fetchRealClubsDirect(){
    const html = await fetchTransfermarktHTML();
    const clubs = await parseTransfermarktData(html);
    const enriched = await enrichWithLogos(clubs);
    return enriched;
  }

  global.TransfermarktDirect = { fetchRealClubsDirect };
})(window);

