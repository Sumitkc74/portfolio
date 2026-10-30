// Portfolio Quest v7 — classic top-down pixel-art style, built from scratch.
// The character is the pixel robot from Sumit's own portfolio hero
// (dark navy body, pale face screen, blue eyes, burnt-orange antenna bulb
// and hand), redrawn as a small game sprite. All buildings sit close to
// the spawn crossroads, each building type looks different, the player
// can never walk through a building, and the camera can be dragged to
// look around without moving the character. Dialogs show a short
// overview first and the full description only on "See details".
(function () {
  "use strict";

  var TILE = 16, COLS = 44, ROWS = 28, SCALE = 3;
  var WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
  var GRASS = 0, PATH = 1, TREE = 2, WATER = 3, FLOWER = 4, ROCK = 5;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var CATS = [
    { id: "school", label: "School" },
    { id: "work", label: "Work" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "certs", label: "Certs" },
    { id: "home", label: "Home" },
    { id: "contact", label: "Contact" }
  ];
  function svgIcon(cat, color) {
    var inner = {
      school: '<path d="M12 4 L22 9 L12 14 L2 9 Z"/><path d="M6 11.5 V16 c0 1.5 2.7 3 6 3 s6-1.5 6-3 v-4.5"/><path d="M22 9 v5"/>',
      work: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7 V5 a2 2 0 0 1 2-2 h2 a2 2 0 0 1 2 2 v2"/><path d="M3 13 h18"/>',
      projects: '<path d="M10 3 h4 v5 l4.5 9 a2 2 0 0 1-1.8 3 H7.3 a2 2 0 0 1-1.8-3 L10 8 Z"/><circle cx="11" cy="15" r="1" fill="' + color + '" stroke="none"/><circle cx="14" cy="17" r="1" fill="' + color + '" stroke="none"/>',
      skills: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5 v3 M12 18.5 v3 M2.5 12 h3 M18.5 12 h3 M5.3 5.3 l2.1 2.1 M16.6 16.6 l2.1 2.1 M18.7 5.3 l-2.1 2.1 M7.4 16.6 l-2.1 2.1"/>',
      certs: '<path d="M8 3 L12 9 L16 3"/><circle cx="12" cy="15" r="5"/><path d="M12 12.5 l0.9 1.8 2-0.3 -1.5 1.4 0.4 2 -1.8-0.9 -1.8 0.9 0.4-2 -1.5-1.4 2 0.3 Z" fill="' + color + '" stroke="none"/>',
      home: '<path d="M3 11 L12 3 L21 11"/><path d="M5.5 9.5 V20 a1 1 0 0 0 1 1 h11 a1 1 0 0 0 1-1 V9.5"/><path d="M10 20 v-5 h4 v5"/>',
      contact: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 7 l9 6 9-6"/>'
    }[cat];
    return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + "</svg>";
  }

  var ROOF = { school: "#b8543f", office: "#4a5a78", hall: "#c9a86a", house: "#8a5a3a", post: "#5a7a9a", workshop: "#6b4a2f" };
  var BLDG_H = { school: 56, office: 72, hall: 56, house: 48, post: 52, workshop: 56 };
  var BLDGS = [
    { bid: "cityu", cat: "school", shape: "school", label: "City University", x: 18, y: 9 },
    { bid: "bs", cat: "school", shape: "school", label: "Informatics College", x: 26, y: 9 },
    { bid: "aank", cat: "work", shape: "office", label: "Aankhijhyal Technologies", x: 19, y: 22 },
    { bid: "skills", cat: "skills", shape: "workshop", label: "Skills Center", x: 13, y: 17 },
    { bid: "certs", cat: "certs", shape: "hall", label: "Cert Hall", x: 12, y: 10 },
    { bid: "house", cat: "home", shape: "house", label: "My House", x: 19, y: 16 },
    { bid: "post", cat: "contact", shape: "post", label: "Contact", x: 25, y: 17 }
  ];
  function bldgH(b) { return BLDG_H[b.shape]; }
  var MS_BODY = "• Master of Science in Computer Science, City University of Seattle\n• GPA 4.0 out of 4.0\n• Dean's List, Winter 2025 through Spring 2026\n• Graduating in December 2026";
  var TA_BODY = "• Teaching Assistant, October 2025 to present\n• Maintained cloud and application environments for 6 to 7 graduate courses per quarter (AWS EC2, S3, Lambda; Python, React, machine learning) for 500+ students\n• Rebuilt five graduate-course lab environments on AWS, reducing setup failures to nearly zero\n• Fixed a grade-sync defect that re-synced grades for 250+ students within 24 hours";
  var PLACES = [
    { id: "ms", cat: "school", kind: "building", bid: "cityu", label: "City University · M.S.", x: 18, y: 9 },
    { id: "ta", cat: "work", kind: "building", bid: "cityu", label: "City University · TA", x: 18, y: 9 },
    { id: "bs", cat: "school", kind: "building", bid: "bs", label: "Informatics College", title: "B.S. Computing — Informatics College Pokhara", x: 26, y: 9,
      body: "• Bachelor of Science in Computing, Informatics College Pokhara\n• Graduated top of the cohort\n• Letter of Commendation and AAA Excellence Scholarship" },
    { id: "aank", cat: "work", kind: "building", bid: "aank", label: "Aankhijhyal Technologies", title: "Aankhijhyal Technologies — Software Engineer and Intern", x: 19, y: 22,
      body: "• Software Engineer, June 2023 to November 2024\n• Integrated three payment and booking REST APIs (eSewa, Khalti, reservations) into client PHP and Laravel platforms with server-side verification, saving about 5 hours per week\n• Cut page load times by approximately 40% across 5+ client sites\n• Delivered 15+ client platforms with Nepali and English content and owner-editable admin panels\n• Software Engineer Intern, September to November 2022\n• Deployed three client websites to production (live server, domain, SSL) with zero reported post-launch issues\n• Built a local development setup with a sample database and guide, cutting project setup from about 3 hours to under 1 hour\n• Inquiry and booking forms that validated input and emailed owners.",
      link: "index.html", linkLabel: "See experience" },
    { id: "skills", cat: "skills", kind: "building", bid: "skills", label: "Skills Center", title: "Skills", x: 13, y: 17,
      body: "• Languages: Python, Java, C#, PHP, JavaScript, TypeScript, R, Dart, SQL, HTML, CSS\n• Frameworks: FastAPI, React, Next.js, Flutter, Node.js, Express, Laravel, Flask\n• AI and ML: RAG architecture, LangGraph multi-agent systems, TensorFlow, scikit-learn, LLM evaluation, Gemini API\n• Cloud and DevOps: AWS (EC2, S3, Lambda), Azure, Docker, GitHub Actions, REST APIs\n• Databases: MySQL, PostgreSQL, MongoDB, SQLite",
      link: "index.html", linkLabel: "See skills" },
    { id: "certs", cat: "certs", kind: "building", bid: "certs", label: "Cert Hall", title: "Certifications", x: 12, y: 10,
      body: "• Microsoft Certified: Fabric Data Engineer Associate\n• Microsoft Certified: Azure Administrator Associate\n• Microsoft Certified: Azure AI Fundamentals\n• Microsoft Certified: Azure Data Fundamentals\n• Each badge on the main portfolio links to its verification page",
      link: "index.html#certifications", linkLabel: "See certifications" },
    { id: "house", cat: "home", kind: "building", bid: "house", label: "My House", title: "About Sumit", x: 19, y: 16,
      body: "• Software Engineer based in Seattle, WA, open to relocation and remote work\n• Builds production web platforms, payment and booking integrations, AWS cloud environments, and AI-powered systems\n• Focused on reliable, well-tested software that cuts manual work and improves performance" },
    { id: "post", cat: "contact", kind: "building", bid: "post", label: "Contact", title: "Contact", x: 25, y: 17,
      body: "• Email: sumitkc74@gmail.com\n• LinkedIn: https://www.linkedin.com/in/sumitkc74\n• GitHub: https://github.com/Sumitkc74\n• Open to opportunities, relocation, and remote work" },
    { id: "care", cat: "projects", kind: "file", label: "CarePolicyGuard", title: "CarePolicyGuard", x: 4, y: 7,
      body: "• Solo project\n• FastAPI multi-agent system checking EHR patient records against CMS Medicare coverage determinations (NCD and LCD) for prior-authorization reviews\n• 100% decision concordance and 100% evidence faithfulness across 10 clinical benchmark cases\n• 20% safe deferrals to human review" },
    { id: "parallax", cat: "projects", kind: "file", label: "Parallax-Eval", title: "Parallax-Eval", x: 40, y: 7,
      body: "• Solo project\n• End-to-end Flutter and FastAPI platform comparing model safety responses to equivalent English and Nepali prompts\n• Policy retrieval, Judge, Critic and Arbiter evaluation workflow\n• Statistical analysis of safety differences across languages" },
    { id: "mealmate", cat: "projects", kind: "file", label: "MealMate.ai", title: "MealMate.ai", x: 4, y: 24,
      body: "• Team project\n• React, Node.js, and FastAPI meal planning platform with a hybrid recipe recommender, backed by 128 passing tests\n• Gemini cooking assistance, pantry parsing, and ingredient capture, with deterministic offline fallbacks\n• Sumit's contribution: the RAG service, API connections, React pantry interface, and assistant integration" },
    { id: "drive", cat: "projects", kind: "file", label: "Learn to Drive", title: "Learn to Drive", x: 40, y: 24,
      body: "• Solo project\n• Laravel and Flutter platform connecting learners, driving schools, and admins\n• English and Nepali exam practice and progress tracking\n• School scheduling, student records, and lesson bookings\n• Server-verified Khalti and eSewa payments" },
    { id: "ecovate", cat: "projects", kind: "file", label: "EcoVate", title: "EcoVate", x: 12, y: 24,
      body: "• Team hackathon project\n• AI-powered circular-economy platform turning an item photo into a verified reuse plan through coordinated AI agents\n• Vision analysis, sustainability research, and DIY recommendations, checked by a verification agent\n• Sumit's contribution: the multi-agent coordination layer" },
    { id: "linguo", cat: "projects", kind: "file", label: "LinguoAI", title: "LinguoAI", x: 32, y: 6,
      body: "• Team project\n• AI-powered language learning mobile app built with React Native (Expo) and Node.js and Express\n• Interactive speaking, listening, and reading curriculum\n• Real-time streaming voice conversations with Google Gemini and local Ollama (Gemma2)" },
    { id: "spam", cat: "projects", kind: "file", label: "Spam Detection", title: "AI-Powered Spam Detection", x: 24, y: 20,
      body: "• Team project\n• SMS spam classification system comparing six classifiers using Bag-of-Words and TF-IDF text features\n• Linear SVM selected at 98.1% accuracy with the best precision and recall balance in the project evaluation" }
  ];
  // Quest order for the guide arrow and the quest log: home first, then
  // education and jobs by date (B.S., Aankhijhyal intern and engineer,
  // M.S., teaching assistant), then certificates and skills, then the
  // projects, then contact last. Visiting itself stays free: the order
  // only steers the arrow.
  var QUEST_ORDER = ["house", "bs", "aank", "ms", "ta", "certs", "skills", "care", "parallax", "mealmate", "drive", "ecovate", "linguo", "spam", "post"];
  function placeById(id) {
    for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i];
    return null;
  }
  // Short overviews shown first; the full description only on "See details".
  var OVERVIEWS = {
    ms: "M.S. in Computer Science at City University of Seattle — 4.0 GPA, Dean's List, graduating December 2026.",
    ta: "Teaching Assistant at City University of Seattle since October 2025 — cloud environments for 500+ students.",
    bs: "B.S. in Computing at Informatics College Pokhara — top of the cohort, Letter of Commendation, AAA Excellence Scholarship.",
    aank: "Software Engineer and Intern at Aankhijhyal Technologies — payment integrations, 15+ client platforms, about 40% faster pages.",
    skills: "Languages, frameworks, AI and ML, cloud, and databases — RAG, LangGraph multi-agent systems, AWS, and more.",
    certs: "Four Microsoft certifications: Fabric Data Engineer, Azure Administrator, Azure AI Fundamentals, Azure Data Fundamentals.",
    house: "Software Engineer in Seattle, open to relocation and remote work.",
    post: "Contact — sumitkc74@gmail.com, https://www.linkedin.com/in/sumitkc74, https://github.com/Sumitkc74.",
    care: "Multi-agent system checking patient records against Medicare coverage rules — 100% decision concordance.",
    parallax: "Platform comparing model safety in English vs Nepali with a Judge, Critic and Arbiter workflow.",
    mealmate: "Meal planning platform with a hybrid recipe recommender and Gemini cooking assistance — 128 tests passing.",
    drive: "Platform connecting learners, driving schools, and admins, with server-verified Khalti and eSewa payments.",
    ecovate: "Hackathon platform turning an item photo into a verified reuse plan via coordinated AI agents.",
    linguo: "Language learning app with streaming voice conversations via Gemini and local Ollama (Gemma2).",
    spam: "SMS spam classifier — Linear SVM selected at 98.1% accuracy across six classifiers."
  };
  function dialogFor(entry) {
    if (entry.bid === "cityu") {
      return { title: "City University of Seattle — M.S. and Teaching Assistant",
        overview: "City University of Seattle — M.S. in Computer Science (4.0 GPA, graduating December 2026) and Teaching Assistant since October 2025.",
        body: "Degree\n" + MS_BODY + "\n\nTeaching Assistant\n" + TA_BODY,
        link: "index.html", linkLabel: "See experience" };
    }
    return { title: entry.title, overview: OVERVIEWS[entry.id] || entry.body,
      body: entry.body, link: entry.link, linkLabel: entry.linkLabel };
  }

  // ---- Map ----
  var grid = [];
  for (var y = 0; y < ROWS; y++) { grid[y] = []; for (var x = 0; x < COLS; x++) grid[y][x] = GRASS; }
  // Full sprite footprint of a building: 5 tiles wide, from its roof top
  // row down to its centre row. Scatter keeps clear of it plus the front
  // row, and the player can never walk through it.
  function topTile(b) { return Math.floor((b.y * TILE + 16 - bldgH(b)) / TILE); }
  function inFootprint(b, tx, ty) {
    return tx >= b.x - 2 && tx <= b.x + 2 && ty >= topTile(b) && ty <= b.y;
  }
  // Scatter keeps a full tile of open ground around every building, so
  // no tree, rock, or flower ever sits right against a building surface
  // and pinches shut the way around it.
  function nearBuilding(x, y) {
    for (var i = 0; i < BLDGS.length; i++) {
      var b = BLDGS[i];
      if (x >= b.x - 3 && x <= b.x + 3 && y >= topTile(b) - 1 && y <= b.y + 2) return true;
    }
    return false;
  }
  function onFile(x, y) {
    for (var i = 0; i < PLACES.length; i++) {
      var p = PLACES[i];
      if (p.kind === "file" && p.x === x && p.y === y) return true;
    }
    return false;
  }
  for (var px = 0; px < COLS; px++) grid[13][px] = PATH;
  for (var py = 0; py < ROWS; py++) grid[py][22] = PATH;
  function pond(cx, cy, rx, ry) {
    for (var ty = 0; ty < ROWS; ty++) for (var tx = 0; tx < COLS; tx++) {
      if (grid[ty][tx] !== GRASS) continue;
      var dx = (tx - cx) / rx, dy = (ty - cy) / ry;
      if (dx * dx + dy * dy <= 1) grid[ty][tx] = WATER;
    }
  }
  pond(34, 9, 4, 2.5);
  pond(7, 19, 2.5, 2.0); // smaller left pond, so open space stays on both sides
  var rand = mulberry32(23);
  // Keep a clear ring of open grass around every lake, so the player can
  // always pass beside the water without squeezing through trees or rocks.
  function nearWater(tx, ty) {
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var nx = tx + dx, ny = ty + dy;
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && grid[ny][nx] === WATER) return true;
    }
    return false;
  }
  // Open lanes between the buildings: the front streets, the stubs from
  // each front to its street, the west passage, and the exit from
  // Aankhijhyal's front to the avenue. Scatter never blocks these, so the
  // way between any two buildings always stays open.
  function onLane(tx, ty) {
    if (ty === 11 && tx >= 10 && tx <= 30) return true; // north front street
    if (ty === 18 && ((tx >= 11 && tx <= 16) || (tx >= 22 && tx <= 27))) return true; // south front street
    if ((tx === 18 || tx === 26) && ty === 10) return true; // north fronts to their street
    if (tx === 16 && ty >= 14 && ty <= 17) return true; // west passage up to the road
    if (ty === 17 && tx >= 16 && tx <= 19) return true; // house front row to the west passage
    if (ty === 23 && tx >= 19 && tx <= 22) return true; // Aankhijhyal front to the avenue
    return false;
  }
  function scatter(tile, count) {
    var placed = 0, guard = 0;
    while (placed < count && guard++ < 8000) {
      var tx = Math.floor(rand() * COLS), ty = Math.floor(rand() * ROWS);
      if (grid[ty][tx] !== GRASS || nearBuilding(tx, ty) || onFile(tx, ty) || nearWater(tx, ty) || onLane(tx, ty)) continue;
      if (Math.max(Math.abs(tx - 22), Math.abs(ty - 13)) <= 2) continue;
      grid[ty][tx] = tile; placed++;
    }
  }
  scatter(TREE, 70); scatter(ROCK, 16); scatter(FLOWER, 60);
  function buildingAt(tx, ty) {
    for (var i = 0; i < BLDGS.length; i++) if (inFootprint(BLDGS[i], tx, ty)) return BLDGS[i];
    return null;
  }
  function isBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    var t = grid[ty][tx];
    if (t === TREE || t === WATER || t === ROCK) return true;
    if (buildingAt(tx, ty)) return true;
    return false;
  }
  function collides(px, py) {
    var hw = 5, vt = 6, vb = 6;
    return isBlocked(Math.floor((px - hw) / TILE), Math.floor((py - vt) / TILE)) ||
      isBlocked(Math.floor((px + hw) / TILE), Math.floor((py - vt) / TILE)) ||
      isBlocked(Math.floor((px - hw) / TILE), Math.floor((py + vb) / TILE)) ||
      isBlocked(Math.floor((px + hw) / TILE), Math.floor((py + vb) / TILE));
  }

  // ---- State ----
  var player = { x: 22 * TILE + 8, y: 13 * TILE + 8, facing: "up", dist: 0, moving: false };
  var keys = {};
  var joy = { x: 0, y: 0, active: false };
  var zoom = 1;
  var visited = {};
  try {
    JSON.parse(localStorage.getItem("portfolioQuestV6") || "[]").forEach(function (id) { visited[id] = true; });
  } catch (e) { /* progress just won't persist */ }
  function saveProgress() {
    try { localStorage.setItem("portfolioQuestV6", JSON.stringify(Object.keys(visited))); } catch (e) { /* ignore */ }
  }
  var dialog = null;
  var camX = 0, camY = 0;
  var pan = { x: 0, y: 0 }; // free camera offset, set by dragging the map
  var rewardPending = false, rewardShown = false;
  try { rewardShown = localStorage.getItem("portfolioQuestV6Reward") === "1"; } catch (e) {}
  function allFound() { return PLACES.every(function (p) { return visited[p.id]; }); }

  // ---- DOM ----
  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d");
  var counterLinesEl = document.getElementById("counterLines");
  var totalVisitedEl = document.getElementById("totalVisited");
  var totalBuildingsEl = document.getElementById("totalBuildings");
  var questList = document.getElementById("questList");
  var countersEl = document.getElementById("counters");
  var countersToggle = document.getElementById("countersToggle");
  var countersChev = document.getElementById("countersChev");
  var questPanel = document.getElementById("questPanel");
  var winNote = document.getElementById("winNote");
  var joystickEl = document.getElementById("joystick");
  var joyKnob = document.getElementById("joyKnob");
  var zoomLabel = document.getElementById("zoomLabel");
  var minimapWrap = document.getElementById("minimapWrap");
  var minimap = document.getElementById("minimap");
  var minimapCtx = minimap.getContext("2d");
  var minimapToggle = document.getElementById("minimapToggle");
  var howtoEl = document.getElementById("howto");
  var howtoOpen = false;
  function showHowto() { howtoOpen = true; howtoEl.hidden = false; }
  function hideHowto() {
    howtoOpen = false; howtoEl.hidden = true;
    try { localStorage.setItem("portfolioQuestHowTo", "1"); } catch (e) { /* ignore */ }
  }
  document.getElementById("howtoStart").addEventListener("click", hideHowto);
  document.getElementById("howtoBtn").addEventListener("click", showHowto);
  minimapToggle.addEventListener("click", function () {
    var collapsed = minimapWrap.classList.toggle("collapsed");
    minimapToggle.textContent = collapsed ? "+" : "−";
  });
  minimap.addEventListener("click", function (e) {
    // Clicking the mini-map moves the camera there.
    var r = minimap.getBoundingClientRect();
    var wx = (e.clientX - r.left) / r.width * WORLD_W;
    var wy = (e.clientY - r.top) / r.height * WORLD_H;
    pan.x = Math.max(-WORLD_W, Math.min(WORLD_W, wx - player.x));
    pan.y = Math.max(-WORLD_H, Math.min(WORLD_H, wy - player.y));
  });
  totalBuildingsEl.textContent = String(PLACES.length);
  var countSpans = {};
  CATS.forEach(function (cat) {
    var line = document.createElement("div");
    line.className = "counter-line";
    var name = document.createElement("span");
    name.innerHTML = '<span class="ci">' + svgIcon(cat.id, "#f6d743") + "</span>" + cat.label;
    var count = document.createElement("span");
    count.className = "count";
    countSpans[cat.id] = count;
    line.appendChild(name); line.appendChild(count);
    counterLinesEl.appendChild(line);
  });
  function catTotals() {
    var totals = {};
    CATS.forEach(function (c) { totals[c.id] = { found: 0, total: 0 }; });
    PLACES.forEach(function (p) {
      totals[p.cat].total++;
      if (visited[p.id]) totals[p.cat].found++;
    });
    return totals;
  }
  function renderCounters() {
    var totals = catTotals(), all = 0;
    CATS.forEach(function (c) {
      countSpans[c.id].textContent = totals[c.id].found + "/" + totals[c.id].total;
      all += totals[c.id].found;
    });
    totalVisitedEl.textContent = String(all);
    return all;
  }
  function buildingVisited(bid) {
    if (bid === "cityu") return !!visited.ms;
    return !!visited[bid];
  }
  function openDialog(entry) {
    dialog = { b: dialogFor(entry), mode: "overview", page: 0, lines: null, titleLines: null, pages: null, wrapWidth: -1, modeCache: null, btnRects: null, linkRect: null, closeRect: null, box: null };
    joyEnd();
  }
  function closeDialog() {
    dialog = null;
    // Visiting everything earns the Portfolio Master reward, shown once
    // the last detail panel closes.
    if (rewardPending && !rewardShown) {
      rewardPending = false; rewardShown = true;
      try { localStorage.setItem("portfolioQuestV6Reward", "1"); } catch (e) {}
      dialog = { b: { title: "Portfolio Master!", trophy: true,
        body: "You visited all 15 places — every school, workplace, project file, skill hall, certificate, and home. Your robot's antenna turned gold. See Sumit's resume, or reach out by email." },
        mode: "reward", page: 0, lines: null, titleLines: null, pages: null, wrapWidth: -1, modeCache: null, btnRects: null, linkRect: null, closeRect: null, box: null };
    }
  }
  function renderQuest() {
    var all = renderCounters();
    questList.innerHTML = "";
    QUEST_ORDER.forEach(function (id) {
      var p = placeById(id);
      var li = document.createElement("li");
      if (visited[p.id]) {
        li.className = "found";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = '<span class="ci">' + svgIcon(p.cat, "currentColor") + "</span><span>" + p.label + "</span>";
        btn.addEventListener("click", function () { openDialog(p); });
        li.appendChild(btn);
      } else {
        li.textContent = "??? — unvisited place";
      }
      questList.appendChild(li);
    });
    winNote.hidden = all !== PLACES.length;
    if (all === PLACES.length) {
      var strong = winNote.querySelector("strong");
      if (strong) strong.textContent = "Portfolio Master!";
    }
  }
  renderQuest();
  document.getElementById("resetBtn").addEventListener("click", function () {
    visited = {}; rewardPending = false; saveProgress(); closeDialog(); renderQuest();
  });
  // Visited (counters) and Quest log stay separate panels: the visited
  // panel collapses to its total, the quest log opens and closes on its own.
  function toggleCounters() {
    var collapsed = countersEl.classList.toggle("collapsed");
    countersToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    countersChev.textContent = collapsed ? "▾" : "▴";
  }
  countersToggle.addEventListener("click", toggleCounters);
  function toggleQuest() { questPanel.classList.toggle("hidden"); }
  document.getElementById("questToggle").addEventListener("click", toggleQuest);
  if (window.innerWidth <= 900) questPanel.classList.add("hidden");

  function setZoom(z) {
    zoom = Math.max(0.6, Math.min(2.5, z));
    zoomLabel.textContent = Math.round(zoom * 100) + "%";
  }
  document.getElementById("zoomIn").addEventListener("click", function () { setZoom(zoom * 1.25); });
  document.getElementById("zoomOut").addEventListener("click", function () { setZoom(zoom / 1.25); });
  document.getElementById("centerBtn").addEventListener("click", function () { pan.x = 0; pan.y = 0; });
  zoomLabel.addEventListener("click", function () { setZoom(1); });

  function nearestPlace(maxDist) {
    var best = null, bestDist = 1e9;
    PLACES.forEach(function (p) {
      var d = Math.hypot(p.x * TILE + 8 - player.x, p.y * TILE + 8 - player.y);
      if (d < bestDist) { bestDist = d; best = p; }
    });
    return bestDist <= maxDist ? best : null;
  }
  function enterPlace(entry) {
    if (entry.bid === "cityu") { visited.ms = true; visited.ta = true; }
    else visited[entry.id] = true;
    saveProgress(); renderQuest();
    if (allFound()) rewardPending = true;
    openDialog(entry);
  }
  function tryEnter() {
    var p = nearestPlace(48);
    if (p) enterPlace(p);
  }

  // ---- Input: keyboard ----
  var KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  document.addEventListener("keydown", function (e) {
    if (howtoOpen) {
      if (e.code === "Space" || e.code === "Enter" || e.code === "Escape" || e.code === "KeyH") { e.preventDefault(); hideHowto(); }
      return;
    }
    if (dialog) {
      if (e.code === "Escape") { e.preventDefault(); closeDialog(); }
      else if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); dialogAdvance(); }
      else if (e.code === "KeyB" && dialog.mode === "details") { dialog.mode = "overview"; dialog.pages = null; }
      else if (e.code === "KeyL" && dialog.b.link) { window.open(dialog.b.link, "_blank"); }
      return;
    }
    if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    else if (e.code === "Space" || e.code === "KeyE") { e.preventDefault(); tryEnter(); }
    else if (e.code === "KeyQ") { toggleQuest(); }
    else if (e.code === "KeyH") { showHowto(); }
    else if (e.code === "KeyC") { pan.x = 0; pan.y = 0; }
    else if (e.key === "+" || e.key === "=") { setZoom(zoom * 1.25); }
    else if (e.key === "-") { setZoom(zoom / 1.25); }
    else if (e.key === "0") { setZoom(1); }
  });
  document.addEventListener("keyup", function (e) { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  function dialogAdvance() {
    if (!dialog) return;
    if (dialog.mode === "overview") { dialog.mode = "details"; dialog.pages = null; }
    else if (dialog.mode === "details") {
      if (dialog.page < dialog.pages.length - 1) dialog.page++;
      else closeDialog();
    } else closeDialog();
  }
  function doDialogAction(act) {
    if (!dialog) return;
    if (act === "details") { dialog.mode = "details"; dialog.pages = null; }
    else if (act === "back") { dialog.mode = "overview"; dialog.pages = null; }
    else if (act === "link") { if (dialog.b.link) window.open(dialog.b.link, "_blank"); }
    else if (act === "resume") { window.open("index.html#resume", "_blank"); }
    else if (act === "email") { window.location.href = "mailto:sumitkc74@gmail.com"; }
    else if (act === "close") closeDialog();
  }

  // ---- Input: joystick (touch, bottom-left corner only) + taps + pinch ----
  var joyPointer = null, joyCenter = { x: 0, y: 0 }, joyStart = null;
  var panPointer = null, panLast = null, panning = false, panStart = null, panMoved = 0; // drag-to-look camera
  function joyShow(x, y) {
    // Bottom-left corner only: the base stays inside a 200px corner zone,
    // so it never blocks the middle of the screen.
    var cx = Math.max(54, Math.min(200, x));
    var cy = Math.max(window.innerHeight - 200, Math.min(window.innerHeight - 54, y));
    joyCenter = { x: cx, y: cy };
    joystickEl.style.left = (cx - 54) + "px";
    joystickEl.style.top = (cy - 54) + "px";
    joystickEl.style.display = "block";
  }
  function joyUpdate(clientX, clientY) {
    var dx = clientX - joyCenter.x, dy = clientY - joyCenter.y;
    var mag = Math.hypot(dx, dy), max = 42;
    if (mag > max) { dx = dx / mag * max; dy = dy / mag * max; mag = max; }
    joyKnob.style.transform = "translate(" + dx + "px," + dy + "px)";
    var vx = dx / max, vy = dy / max;
    if (Math.hypot(vx, vy) < 0.22) { joy.x = 0; joy.y = 0; }
    else { joy.x = vx; joy.y = vy; }
    joy.active = true;
  }
  function joyEnd() {
    joyPointer = null; joyStart = null; joy.x = 0; joy.y = 0; joy.active = false;
    joyKnob.style.transform = "translate(0px,0px)";
    joystickEl.style.display = "none";
  }
  var tapPointers = {};
  var pinch = null;
  var pinched = false; // a pinch-zoom happened: releases must not count as taps
  canvas.addEventListener("pointerdown", function (e) {
    tapPointers[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now() };
    var ids = Object.keys(tapPointers);
    if (ids.length === 2) {
      if (joyPointer !== null) joyEnd();
      panPointer = null; panning = false;
      pinched = true;
      var a = tapPointers[ids[0]], b2 = tapPointers[ids[1]];
      pinch = { dist: Math.hypot(a.x - b2.x, a.y - b2.y), zoom: zoom };
      return;
    }
    if (!dialog && e.pointerType !== "mouse" && e.clientX < 200 && e.clientY > window.innerHeight - 200) {
      joyPointer = e.pointerId;
      joyStart = { x: e.clientX, y: e.clientY };
      joyShow(e.clientX, e.clientY);
      joyUpdate(e.clientX, e.clientY);
    } else if (!dialog) {
      // Mouse anywhere, or touch outside the joystick corner: drag to
      // look around, tap to open. A drag becomes a camera pan, never a tap.
      panPointer = e.pointerId;
      panLast = { x: e.clientX, y: e.clientY };
      panStart = { x: e.clientX, y: e.clientY };
      panMoved = 0;
      panning = false;
    }
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!tapPointers[e.pointerId]) return;
    tapPointers[e.pointerId] = { x: e.clientX, y: e.clientY, t: tapPointers[e.pointerId].t };
    if (e.pointerId === joyPointer) { joyUpdate(e.clientX, e.clientY); return; }
    if (e.pointerId === panPointer && panLast) {
      var dx = e.clientX - panLast.x, dy = e.clientY - panLast.y;
      if (panStart) panMoved = Math.max(panMoved, Math.hypot(e.clientX - panStart.x, e.clientY - panStart.y));
      if (!panning && Math.hypot(dx, dy) > 10) panning = true;
      if (panning) {
        pan.x -= dx / (zoom * SCALE);
        pan.y -= dy / (zoom * SCALE);
        pan.x = Math.max(-WORLD_W, Math.min(WORLD_W, pan.x));
        pan.y = Math.max(-WORLD_H, Math.min(WORLD_H, pan.y));
      }
      panLast = { x: e.clientX, y: e.clientY };
      return;
    }
    var ids = Object.keys(tapPointers);
    if (pinch && ids.length === 2) {
      var a = tapPointers[ids[0]], b2 = tapPointers[ids[1]];
      var dist = Math.hypot(a.x - b2.x, a.y - b2.y);
      if (pinch.dist > 0) setZoom(pinch.zoom * dist / pinch.dist);
    }
  });
  function endPointer(e) {
    var start = tapPointers[e.pointerId];
    delete tapPointers[e.pointerId];
    if (Object.keys(tapPointers).length < 2) pinch = null;
    var wasJoy = e.pointerId === joyPointer;
    if (wasJoy) {
      var moved = start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : 999;
      joyEnd();
      if (start && moved <= 14 && performance.now() - start.t <= 800) handleTap(e.clientX, e.clientY);
      return;
    }
    var wasPanPointer = e.pointerId === panPointer;
    var wasPan = wasPanPointer && (panning || panMoved > 8);
    if (wasPanPointer) { panPointer = null; panning = false; }
    if (wasPan) return;
    // A release after scrolling or pinch-zooming is not a tap, so it
    // never opens (or visits) a building.
    if (pinched) { if (Object.keys(tapPointers).length === 0) pinched = false; return; }
    if (!start) return;
    var moved2 = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved2 <= 14 && performance.now() - start.t <= 800) handleTap(e.clientX, e.clientY);
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", function (e) {
    delete tapPointers[e.pointerId];
    if (Object.keys(tapPointers).length < 2) pinch = null;
    if (Object.keys(tapPointers).length === 0) pinched = false;
    if (e.pointerId === joyPointer) joyEnd();
    if (e.pointerId === panPointer) { panPointer = null; panning = false; }
  });
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9));
  }, { passive: false });
  function handleTap(sx, sy) {
    if (howtoOpen) return;
    if (dialog) {
      var d = dialog;
      var acts = d.btnRects || {};
      for (var act in acts) {
        var r = acts[act];
        if (sx >= r[0] && sx <= r[2] && sy >= r[1] && sy <= r[3]) { doDialogAction(act); return; }
      }
      if (d.box && sx >= d.box[0] && sx <= d.box[2] && sy >= d.box[1] && sy <= d.box[3]) {
        dialogAdvance(); return;
      }
      return;
    }
    var wx = camX + sx / (zoom * SCALE), wy = camY + sy / (zoom * SCALE);
    for (var i = 0; i < BLDGS.length; i++) {
      var b = BLDGS[i], cx = b.x * TILE + 8, cy = b.y * TILE + 8, H = bldgH(b);
      if (wx >= cx - 52 && wx <= cx + 44 && wy >= cy + 8 - H - 10 && wy <= cy + 12) {
        var entry = null;
        for (var j = 0; j < PLACES.length; j++) if (PLACES[j].bid === b.bid) { entry = PLACES[j]; break; }
        if (entry) enterPlace(entry);
        return;
      }
    }
    for (var k = 0; k < PLACES.length; k++) {
      var p = PLACES[k];
      if (p.kind !== "file") continue;
      var fx = p.x * TILE + 8, fy = p.y * TILE + 8;
      if (wx >= fx - 20 && wx <= fx + 20 && wy >= fy - 20 && wy <= fy + 16) { enterPlace(p); return; }
    }
  }

  // ---- Drawing helpers (low-res pixel coords; the frame scales by SCALE*zoom) ----
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  function wrapLines(text, font, maxWidth, maxLines) {
    ctx.font = font;
    var lines = [];
    String(text).split(/\n\s*\n/).forEach(function (para, pi, paras) {
      // A single newline is a hard break, so each bullet point starts on
      // its own line; a blank line still separates paragraphs.
      para.split(/\n/).forEach(function (seg) {
        var words = seg.split(/\s+/).filter(function (w) { return w.length > 0; });
        var line = "";
        words.forEach(function (word) {
          var test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
          else line = test;
        });
        if (line) lines.push(line);
      });
      if (pi < paras.length - 1) lines.push("");
    });
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\.?$/, "…");
    }
    return lines;
  }
  function drawCatIcon(cat, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#f2ead8";
    ctx.strokeStyle = "#f2ead8";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (cat === "school") {
      ctx.beginPath();
      ctx.moveTo(-s, -1); ctx.lineTo(0, -s * 0.6); ctx.lineTo(s, -1); ctx.lineTo(0, s * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillRect(-s * 0.55, s * 0.1, s * 1.1, s * 0.5);
      ctx.beginPath(); ctx.moveTo(s, -1); ctx.lineTo(s, s * 0.8); ctx.stroke();
    } else if (cat === "work") {
      ctx.fillRect(-s * 0.85, -s * 0.4, s * 1.7, s * 1.05);
      ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.4); ctx.lineTo(-s * 0.4, -s * 0.75); ctx.lineTo(s * 0.4, -s * 0.75); ctx.lineTo(s * 0.4, -s * 0.4); ctx.stroke();
    } else if (cat === "projects") {
      ctx.fillRect(-s * 0.25, -s, s * 0.5, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, -s * 0.5); ctx.lineTo(-s * 0.8, s * 0.8);
      ctx.quadraticCurveTo(0, s * 1.05, s * 0.8, s * 0.8); ctx.lineTo(s * 0.25, -s * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#16202f";
      ctx.beginPath(); ctx.arc(-s * 0.15, s * 0.45, s * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.3, s * 0.6, s * 0.11, 0, Math.PI * 2); ctx.fill();
    } else if (cat === "skills") {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill();
      for (var a = 0; a < 8; a++) {
        ctx.save(); ctx.rotate(a * Math.PI / 4);
        ctx.fillRect(-s * 0.14, -s, s * 0.28, s * 0.45);
        ctx.restore();
      }
    } else if (cat === "certs") {
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s); ctx.lineTo(0, s * 0.1); ctx.lineTo(s * 0.5, -s); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, s * 0.35, s * 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (cat === "contact") {
      ctx.strokeRect(-s, -s * 0.6, s * 2, s * 1.2);
      ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(0, s * 0.2); ctx.lineTo(s, -s * 0.6); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.2); ctx.lineTo(0, -s); ctx.lineTo(s, -s * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillRect(-s * 0.7, -s * 0.2, s * 1.4, s * 0.9);
    }
    ctx.restore();
  }
  function drawLabelPillScreen(cx, top, label, cat, visitedFlag, fontPx) {
    ctx.font = "bold " + fontPx + "px system-ui, sans-serif";
    var tw = ctx.measureText(label).width;
    var pw = 30 + tw + 10, ph = 24;
    var px = cx - pw / 2;
    ctx.fillStyle = "rgba(22,32,47,0.94)";
    rr(px, top, pw, ph, 2); ctx.fill();
    ctx.strokeStyle = "#f6d743"; ctx.lineWidth = 2; ctx.stroke();
    drawCatIcon(cat, px + 15, top + ph / 2, 7);
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "left";
    ctx.fillText(label, px + 28, top + ph / 2 + 5);
    if (visitedFlag) {
      var bx = px + pw + 12, by = top + ph / 2;
      ctx.fillStyle = "#f6d743";
      ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#16202f"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx - 5, by); ctx.lineTo(bx - 1.5, by + 4); ctx.lineTo(bx + 5, by - 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(cx, top - 14, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c0392b"; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", cx, top - 14 + 5);
      ctx.textAlign = "left";
    }
  }
  function grassBase(sx, sy, tx, ty) {
    ctx.fillStyle = "#67b35c"; ctx.fillRect(sx, sy, TILE, TILE);
    var hash = (tx * 31 + ty * 17) % 6;
    ctx.fillStyle = "#4e9a48";
    ctx.fillRect(sx + 3, sy + 4, 1, 1);
    ctx.fillRect(sx + 11, sy + 9, 1, 1);
    if (hash % 2 === 0) ctx.fillRect(sx + 7, sy + 13, 1, 1);
    ctx.fillStyle = "#7cc46e";
    ctx.fillRect(sx + 13, sy + 3, 1, 1);
    if (hash % 3 === 0) ctx.fillRect(sx + 5, sy + 11, 1, 1);
    if (hash === 1) {
      ctx.fillStyle = "#4e9a48";
      ctx.fillRect(sx + 5, sy + 6, 1, 3);
      ctx.fillRect(sx + 8, sy + 5, 1, 4);
      ctx.fillRect(sx + 11, sy + 6, 1, 3);
    }
  }
  function drawTile(t, tx, ty) {
    var sx = tx * TILE, sy = ty * TILE;
    if (t === WATER) {
      ctx.fillStyle = "#4a90d9"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#7ab8e8";
      ctx.fillRect(sx + 3, sy + 7, 6, 1);
      ctx.fillRect(sx + 9, sy + 11, 4, 1);
      ctx.fillStyle = "#2f6fb0";
      if (ty > 0 && grid[ty - 1][tx] !== WATER) ctx.fillRect(sx, sy, TILE, 1);
      if (ty < ROWS - 1 && grid[ty + 1][tx] !== WATER) ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
      if (tx > 0 && grid[ty][tx - 1] !== WATER) ctx.fillRect(sx, sy, 1, TILE);
      if (tx < COLS - 1 && grid[ty][tx + 1] !== WATER) ctx.fillRect(sx + TILE - 1, sy, 1, TILE);
      return;
    }
    grassBase(sx, sy, tx, ty);
    if (t === PATH) {
      ctx.fillStyle = "#e8cf8a"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#d9ba6e";
      ctx.fillRect(sx + 3, sy + 5, 1, 1);
      ctx.fillRect(sx + 10, sy + 11, 1, 1);
      ctx.fillRect(sx + 13, sy + 3, 1, 1);
      if ((tx + ty) % 3 === 0) ctx.fillRect(sx + 6, sy + 9, 1, 1);
    } else if (t === FLOWER) {
      ctx.fillStyle = "#e86a92";
      ctx.fillRect(sx + 4, sy + 4, 1, 1); ctx.fillRect(sx + 6, sy + 4, 1, 1);
      ctx.fillRect(sx + 5, sy + 3, 1, 1); ctx.fillRect(sx + 5, sy + 5, 1, 1);
      ctx.fillStyle = "#f6d743"; ctx.fillRect(sx + 5, sy + 4, 1, 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx + 11, sy + 10, 1, 1); ctx.fillRect(sx + 12, sy + 11, 1, 1);
      ctx.fillStyle = "#e86a92"; ctx.fillRect(sx + 11, sy + 11, 1, 1);
    }
  }
  function drawTree(gx, gy) {
    var cx = gx * TILE + 8, cy = gy * TILE + 8;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(cx - 8, cy + 6, 16, 2);
    ctx.fillStyle = "#6b4a2f"; ctx.fillRect(cx - 1, cy + 2, 2, 6);
    ctx.fillStyle = "#2e7a2e";
    ctx.fillRect(cx - 7, cy - 13, 14, 3);
    ctx.fillRect(cx - 9, cy - 10, 18, 4);
    ctx.fillRect(cx - 8, cy - 6, 16, 3);
    ctx.fillStyle = "#256b26";
    ctx.fillRect(cx - 8, cy - 3, 16, 1);
    ctx.fillStyle = "#4ea84e";
    ctx.fillRect(cx - 6, cy - 12, 4, 2);
    ctx.fillRect(cx + 2, cy - 9, 3, 1);
  }
  function drawRock(gx, gy) {
    var cx = gx * TILE + 8, cy = gy * TILE + 8;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(cx - 5, cy + 6, 10, 1);
    ctx.fillStyle = "#8d8d94";
    ctx.fillRect(cx - 5, cy + 2, 10, 4);
    ctx.fillStyle = "#a9a9b0";
    ctx.fillRect(cx - 3, cy + 2, 4, 2);
  }
  function drawBuilding(b) {
    var cx = b.x * TILE + 8, cy = b.y * TILE + 8;
    var H = bldgH(b), base = cy + 8, roofTop = base - H, wallTop = roofTop + 20;
    var roof = ROOF[b.shape];
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(cx - 40, base + 1, 80, 3);
    // Brick walls: mortar lines with offset vertical joints, like the
    // buildings in the reference screenshots.
    ctx.fillStyle = "#efe6cc"; ctx.fillRect(cx - 36, wallTop, 72, H - 20);
    for (var row = 0; row < (H - 20) / 4; row++) {
      var wy = wallTop + row * 4;
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(cx - 36, wy, 72, 1);
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      var off = (row % 2) * 4;
      for (var jx = off; jx < 72; jx += 8) ctx.fillRect(cx - 36 + jx, wy, 1, 4);
    }
    // Roof, different for each building type.
    if (b.shape === "hall") {
      // Stepped pediment roof: narrow at the apex, wide at the eaves.
      for (var s = 0; s < 4; s++) {
        var w = 44 + s * 12, x = cx - w / 2, y = roofTop + s * 5;
        ctx.fillStyle = roof; ctx.fillRect(x, y, w, 5);
        if (s % 2) { ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(x, y, w, 5); }
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(cx - 22, roofTop, 44, 2);
    } else if (b.shape === "house") {
      // Steep pitched roof: narrow at the apex, wide at the eaves, with a
      // chimney sitting on the right-hand slope.
      for (var p = 0; p < 6; p++) {
        var w2 = 20 + p * 12, x2 = cx - w2 / 2, y2 = roofTop + p * 3;
        ctx.fillStyle = roof; ctx.fillRect(x2, y2, w2, 4);
        if (p % 2) { ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(x2, y2, w2, 4); }
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(cx - 10, roofTop, 20, 2);
      ctx.fillStyle = "#8a5a3a"; ctx.fillRect(cx + 26, roofTop + 10, 5, 9);
    } else {
      // Flat shaded roof with an overhang: bright ridge, darker bands
      // toward the eaves, staggered shingle ticks, and a shadow on the wall.
      ctx.fillStyle = roof; ctx.fillRect(cx - 40, roofTop, 80, 20);
      for (var band = 0; band < 4; band++) {
        var by = roofTop + band * 5;
        ctx.fillStyle = "rgba(0,0,0,0.20)";
        for (var sx = (band % 2) * 4; sx < 80; sx += 8) ctx.fillRect(cx - 40 + sx, by, 1, 5);
        ctx.fillRect(cx - 40, by + 4, 80, 1);
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(cx - 40, roofTop, 80, 2);
      if (b.shape === "office") { ctx.fillStyle = "#8d8d94"; ctx.fillRect(cx - 10, roofTop - 5, 12, 5); }
      if (b.shape === "workshop") { ctx.fillStyle = "#8d8d94"; ctx.fillRect(cx - 10, roofTop - 4, 12, 4); }
    }
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.fillRect(cx - 36, wallTop, 72, 2);
    // Windows with a cross frame, like the reference buildings.
    function win(wx, wy, w, h) {
      ctx.fillStyle = "#f2ead8"; ctx.fillRect(wx - 1, wy - 1, w + 2, h + 2);
      ctx.fillStyle = "#2a3a5e"; ctx.fillRect(wx, wy, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(wx + 6, wy, 1, h);
      ctx.fillRect(wx, wy + 6, w, 1);
      ctx.fillStyle = "#dfe9f5"; ctx.fillRect(wx + 1, wy + 1, 2, 2);
      ctx.fillStyle = "#b8a98a"; ctx.fillRect(wx - 1, wy + h + 1, w + 2, 1);
    }
    if (b.shape === "office") {
      [wallTop + 6, wallTop + 24].forEach(function (wy) {
        win(cx - 30, wy, 12, 12); win(cx - 6, wy, 12, 12); win(cx + 18, wy, 12, 12);
      });
    } else if (b.shape === "hall") {
      // Columns and two windows.
      ctx.fillStyle = "#f2ead8";
      [cx - 30, cx - 12, cx + 8, cx + 26].forEach(function (colX) {
        ctx.fillRect(colX, wallTop, 4, H - 20);
        ctx.fillRect(colX - 1, wallTop, 6, 2);
      });
      win(cx - 24, wallTop + 12, 10, 10); win(cx + 14, wallTop + 12, 10, 10);
    } else if (b.shape === "workshop") {
      // Wide workshop window and double doors.
      ctx.fillStyle = "#f2ead8"; ctx.fillRect(cx - 25, wallTop + 5, 50, 14);
      ctx.fillStyle = "#2a3a5e"; ctx.fillRect(cx - 24, wallTop + 6, 48, 12);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(cx - 8, wallTop + 6, 1, 12);
      ctx.fillRect(cx + 8, wallTop + 6, 1, 12);
      ctx.fillStyle = "#dfe9f5"; ctx.fillRect(cx - 23, wallTop + 7, 2, 2);
      ctx.fillStyle = "#6b4a2f";
      ctx.fillRect(cx - 12, base - 16, 12, 16);
      ctx.fillRect(cx, base - 16, 12, 16);
      ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.fillRect(cx - 1, base - 14, 2, 12);
      ctx.fillStyle = "#f6d743";
      ctx.fillRect(cx - 3, base - 9, 1, 1);
      ctx.fillRect(cx + 2, base - 9, 1, 1);
    } else if (b.shape === "school") {
      win(cx - 30, wallTop + 8, 12, 12); win(cx - 6, wallTop + 8, 12, 12); win(cx + 18, wallTop + 8, 12, 12);
      // Gold school flag, plus a blue work flag on City University,
      // which holds both a degree and a workplace.
      ctx.fillStyle = "#1a2233"; ctx.fillRect(cx + 28, roofTop - 10, 1, 10);
      ctx.fillStyle = "#c9a227"; ctx.fillRect(cx + 29, roofTop - 10, 7, 4);
      if (b.bid === "cityu") {
        ctx.fillStyle = "#1a2233"; ctx.fillRect(cx - 32, roofTop - 10, 1, 10);
        ctx.fillStyle = "#3454e0"; ctx.fillRect(cx - 39, roofTop - 10, 7, 4);
      }
    } else if (b.shape === "post") {
      // Striped awning, windows, and a mailbox.
      for (var ax = cx - 32; ax < cx + 32; ax += 8) {
        ctx.fillStyle = "#5a7a9a"; ctx.fillRect(ax, wallTop + 2, 4, 6);
        ctx.fillStyle = "#f2ead8"; ctx.fillRect(ax + 4, wallTop + 2, 4, 6);
      }
      win(cx - 30, wallTop + 12, 12, 12); win(cx + 18, wallTop + 12, 12, 12);
      ctx.fillStyle = "#3454e0"; ctx.fillRect(cx + 24, base - 8, 6, 8);
      ctx.fillStyle = "#f6d743"; ctx.fillRect(cx + 24, base - 8, 6, 1);
    } else {
      win(cx - 30, wallTop + 6, 12, 12); win(cx + 18, wallTop + 6, 12, 12);
    }
    // Door with panels and two steps (the workshop already has double doors).
    if (b.shape !== "workshop") {
      ctx.fillStyle = "#6b4a2f"; ctx.fillRect(cx - 6, base - 16, 12, 16);
      ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.fillRect(cx - 1, base - 14, 1, 12);
      ctx.fillStyle = "#f6d743"; ctx.fillRect(cx + 4, base - 9, 1, 1);
    }
    ctx.fillStyle = "#b8a98a"; ctx.fillRect(cx - 9, base, 18, 2);
    ctx.fillStyle = "#a99a7d"; ctx.fillRect(cx - 11, base + 2, 22, 2);
    // Sign board in front, like the shop signs in the reference.
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(cx - 46, base + 8, 16, 2);
    ctx.fillStyle = "#6b4a2f"; ctx.fillRect(cx - 39, base + 2, 2, 6);
    ctx.fillStyle = "#2f3b4d"; ctx.fillRect(cx - 46, base - 10, 16, 12);
    ctx.strokeStyle = "#f6d743"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - 46, base - 10, 16, 12);
    drawCatIcon(b.cat, cx - 38, base - 4, 4);
    // City University holds both a degree and a workplace, so it gets a
    // second sign on the other side showing the work icon.
    if (b.bid === "cityu") {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(cx + 30, base + 8, 16, 2);
      ctx.fillStyle = "#6b4a2f"; ctx.fillRect(cx + 37, base + 2, 2, 6);
      ctx.fillStyle = "#2f3b4d"; ctx.fillRect(cx + 30, base - 10, 16, 12);
      ctx.strokeStyle = "#f6d743"; ctx.lineWidth = 1;
      ctx.strokeRect(cx + 30, base - 10, 16, 12);
      drawCatIcon("work", cx + 38, base - 4, 4);
    }
    // Name painted on the building itself: on the roof band for flat
    // roofs, on a nameplate at the top of the wall for the hall, and on
    // a centred wall plate for the house.
    ctx.textAlign = "center";
    if (b.shape === "hall") {
      ctx.fillStyle = "#17213a"; ctx.fillRect(cx - 36, wallTop, 72, 11);
      ctx.strokeStyle = "#f6d743"; ctx.lineWidth = 1; ctx.strokeRect(cx - 36, wallTop, 72, 11);
      ctx.font = "bold 7px system-ui, sans-serif"; ctx.fillStyle = "#ffffff";
      ctx.fillText(b.label, cx, wallTop + 8);
    } else if (b.shape === "house") {
      ctx.fillStyle = "#17213a"; ctx.fillRect(cx - 20, wallTop + 2, 40, 10);
      ctx.strokeStyle = "#f6d743"; ctx.lineWidth = 1; ctx.strokeRect(cx - 20, wallTop + 2, 40, 10);
      ctx.font = "bold 7px system-ui, sans-serif"; ctx.fillStyle = "#ffffff";
      ctx.fillText(b.label, cx, wallTop + 9);
    } else {
      var nameLines = wrapLines(b.label, "bold 7px system-ui, sans-serif", 74, 2);
      var nameY = nameLines.length > 1 ? roofTop + 8 : roofTop + 13;
      nameLines.forEach(function (line, i) {
        ctx.lineWidth = 2; ctx.strokeStyle = "#17213a";
        ctx.strokeText(line, cx, nameY + i * 9);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(line, cx, nameY + i * 9);
      });
    }
    ctx.textAlign = "left";
  }
  function drawFile(f) {
    var cx = f.x * TILE + 8, cy = f.y * TILE + 8;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(cx - 7, cy + 7, 14, 2);
    if (visited[f.id]) ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#fdfdf5"; ctx.fillRect(cx - 6, cy - 7, 12, 14);
    ctx.strokeStyle = "#1a2233"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - 6, cy - 7, 12, 14);
    ctx.fillStyle = "#6a3fa0"; ctx.fillRect(cx - 6, cy - 7, 12, 3);
    ctx.fillStyle = "#e8e4da"; ctx.fillRect(cx + 3, cy - 7, 3, 3);
    ctx.fillStyle = "#9a9aa2";
    ctx.fillRect(cx - 4, cy - 1, 8, 1);
    ctx.fillRect(cx - 4, cy + 2, 8, 1);
    ctx.fillRect(cx - 4, cy + 5, 6, 1);
    ctx.globalAlpha = 1;
  }
  // The character is the pixel robot from the portfolio hero: dark navy
  // body, pale face screen, blue eyes, burnt-orange antenna bulb and
  // hand. It blinks on the same 9-second rhythm as the page robot, and
  // its antenna turns gold once the quest is complete.
  function drawPlayer() {
    var ox = player.x - 7, top = player.y - 10;
    var frame = player.moving ? Math.floor(player.dist / 9) % 2 : 0;
    var bob = player.moving ? frame : 0;
    var liftL = player.moving ? (frame === 0 ? 0 : 1) : 0;
    var liftR = player.moving ? (frame === 0 ? 1 : 0) : 0;
    var ty = top - bob;
    var gold = allFound();
    var now = performance.now() % 9000;
    var eyeH = (now > 8460 && now < 8820) ? 1 : 2;
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.fillRect(player.x - 7, player.y + 8, 14, 2);
    // Antenna: navy stem, burnt-orange bulb (gold once the quest is done).
    ctx.fillStyle = "#17213a"; ctx.fillRect(ox + 6, ty, 2, 2);
    ctx.fillStyle = gold ? "#f6d743" : "#b0451f"; ctx.fillRect(ox + 5, ty - 3, 4, 3);
    // Head: navy frame, pale face screen.
    ctx.fillStyle = "#17213a"; ctx.fillRect(ox + 1, ty + 2, 12, 7);
    ctx.fillStyle = "#e7ebfb"; ctx.fillRect(ox + 2, ty + 3, 10, 5);
    if (player.facing !== "up") {
      ctx.fillStyle = "#3454e0";
      if (player.facing === "down") { ctx.fillRect(ox + 3, ty + 4, 2, eyeH); ctx.fillRect(ox + 9, ty + 4, 2, eyeH); }
      else if (player.facing === "left") { ctx.fillRect(ox + 3, ty + 4, 2, eyeH); }
      else { ctx.fillRect(ox + 9, ty + 4, 2, eyeH); }
      ctx.fillStyle = "#17213a"; ctx.fillRect(ox + 6, ty + 7, 2, 1);
    } else {
      ctx.fillStyle = "#9aa0ab"; ctx.fillRect(ox + 4, ty + 4, 6, 2);
    }
    // Body: navy torso, blue chest panel, cream light.
    ctx.fillStyle = "#17213a"; ctx.fillRect(ox + 2, ty + 9, 10, 5);
    if (player.facing === "up") {
      ctx.fillStyle = "#9aa0ab"; ctx.fillRect(ox + 4, ty + 10, 6, 2);
    } else {
      ctx.fillStyle = "#3454e0"; ctx.fillRect(ox + 3, ty + 10, 8, 3);
      ctx.fillStyle = gold ? "#f6d743" : "#f5f1e7"; ctx.fillRect(ox + 6, ty + 11, 2, 1);
    }
    // Arms: navy, right hand burnt orange, swinging with the walk.
    ctx.fillStyle = "#17213a";
    ctx.fillRect(ox, ty + 10 - liftL, 2, 4);
    ctx.fillRect(ox + 12, ty + 10 - liftR, 2, 4);
    ctx.fillStyle = "#b0451f"; ctx.fillRect(ox + 12, ty + 13 - liftR, 2, 1);
    // Legs and feet, stepping with the walk cycle.
    ctx.fillStyle = "#17213a";
    ctx.fillRect(ox + 3, ty + 14, 3, 3);
    ctx.fillRect(ox + 8, ty + 14, 3, 3);
    ctx.fillStyle = "#2b3648";
    ctx.fillRect(ox + 3, ty + 17 - liftL, 3, 1);
    ctx.fillRect(ox + 8, ty + 17 - liftR, 3, 1);
  }
  // In-game dialog: drawn on the canvas itself, never an outside popup.
  // Overview first; the full description only after "See details".
  function drawDialog() {
    if (!dialog) return;
    var W = canvas.width, H = canvas.height;
    var b = dialog.b;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(10,16,32,0.35)";
    ctx.fillRect(0, 0, W, H);
    var boxW = Math.min(W - 32, 640), boxX = (W - boxW) / 2;
    var textW = boxW - 56;
    var stacked = boxW < 520;
    var btnDefs = [];
    if (dialog.mode === "overview") {
      btnDefs = [{ label: "See details", action: "details" }, { label: "Close", action: "close" }];
    } else if (dialog.mode === "details") {
      btnDefs = [{ label: "Back", action: "back" }];
      if (b.link) btnDefs.push({ label: b.linkLabel || "Open link", action: "link" });
      btnDefs.push({ label: "Close", action: "close" });
    } else {
      btnDefs = [{ label: "View resume", action: "resume" }, { label: "Email Sumit", action: "email" }, { label: "Close", action: "close" }];
    }
    ctx.font = "bold 16px system-ui, sans-serif";
    var widths = btnDefs.map(function (bd) { return ctx.measureText(bd.label).width + 36; });
    var totalBtnW = widths.reduce(function (a, c) { return a + c; }, 0) + (btnDefs.length - 1) * 10;
    var fitsRow = !stacked && totalBtnW <= boxW - 56;
    var buttonsH = fitsRow ? 38 : btnDefs.length * 48 - 10;
    if (!dialog.pages || dialog.wrapWidth !== textW || dialog.modeCache !== dialog.mode) {
      var titleLines = wrapLines(b.title, "bold 22px system-ui, sans-serif", textW, 3);
      var contentText = dialog.mode === "overview" ? (b.overview || b.body) : b.body;
      var contentLines = wrapLines(contentText, "18px system-ui, sans-serif", textW, 0);
      var titleH = titleLines.length * 30;
      var trophyH = b.trophy ? 48 : 0;
      var maxBoxH = H - 48;
      var perPage = Math.max(1, Math.floor((maxBoxH - (118 + trophyH + titleH + buttonsH)) / 30));
      var pages = [];
      for (var i = 0; i < contentLines.length; i += perPage) pages.push(contentLines.slice(i, i + perPage));
      if (pages.length === 0) pages = [[]];
      dialog.titleLines = titleLines; dialog.pages = pages; dialog.wrapWidth = textW; dialog.modeCache = dialog.mode; dialog.page = 0;
    }
    var pageLines = dialog.pages[dialog.page] || [];
    var titleH2 = dialog.titleLines.length * 30;
    var trophyH2 = b.trophy ? 48 : 0;
    var boxH = 118 + trophyH2 + titleH2 + pageLines.length * 30 + buttonsH;
    var boxY = Math.max(16, (H - boxH) / 2);
    dialog.box = [boxX, boxY, boxX + boxW, boxY + boxH];
    ctx.fillStyle = "#fdfdf5";
    rr(boxX, boxY, boxW, boxH, 2); ctx.fill();
    ctx.strokeStyle = "#17213a"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#17213a"; ctx.textAlign = "left";
    var ty = boxY + 28;
    if (b.trophy) {
      var tcx = boxX + boxW / 2;
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(tcx - 14, ty, 28, 18);
      ctx.fillRect(tcx - 3, ty + 18, 6, 8);
      ctx.fillRect(tcx - 12, ty + 26, 24, 5);
      ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tcx - 14, ty + 9, 6, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(tcx + 14, ty + 9, 6, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(tcx - 10, ty + 3, 4, 6);
      ty += 48;
    }
    ctx.font = "bold 22px system-ui, sans-serif";
    dialog.titleLines.forEach(function (line, i) { ctx.fillText(line, boxX + 28, ty + 22 + i * 30); });
    ty += titleH2 + 10;
    ctx.fillStyle = "rgba(23,33,58,0.25)";
    ctx.fillRect(boxX + 28, ty, boxW - 56, 2);
    ty += 2 + 14;
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillStyle = "#17213a";
    pageLines.forEach(function (line, i) { ctx.fillText(line, boxX + 28, ty + 21 + i * 30); });
    ty += pageLines.length * 30 + 16;
    ctx.font = "14px system-ui, sans-serif"; ctx.fillStyle = "#5a5a5a";
    var hint = "";
    if (dialog.mode === "overview") hint = "Tap See details for more · Esc to close";
    else if (dialog.mode === "details") {
      hint = dialog.pages.length > 1
        ? "Page " + (dialog.page + 1) + "/" + dialog.pages.length + " — Space for more · B back · Esc close"
        : "Space to close · B back · Esc close";
      if (b.link) hint += " · L link";
    } else hint = "Tap or Space to close";
    ctx.fillText(hint, boxX + 28, ty + 14);
    ty += 14 + 14;
    dialog.btnRects = {};
    ctx.font = "bold 16px system-ui, sans-serif";
    if (fitsRow) {
      var bx = boxX + boxW - 28 - totalBtnW;
      btnDefs.forEach(function (bd, i) {
        var r = [bx, ty, bx + widths[i], ty + 38];
        dialog.btnRects[bd.action] = r;
        ctx.fillStyle = (bd.action === "details" || bd.action === "link" || bd.action === "resume" || bd.action === "email") ? "#c9a227" : "#17213a";
        rr(r[0], r[1], widths[i], 38, 2); ctx.fill();
        ctx.fillStyle = (bd.action === "details" || bd.action === "link" || bd.action === "resume" || bd.action === "email") ? "#17213a" : "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(bd.label, r[0] + 18, r[1] + 24);
        bx += widths[i] + 10;
      });
    } else {
      var by = ty;
      btnDefs.forEach(function (bd) {
        var r = [boxX + 28, by, boxX + boxW - 28, by + 38];
        dialog.btnRects[bd.action] = r;
        ctx.fillStyle = (bd.action === "details" || bd.action === "link" || bd.action === "resume" || bd.action === "email") ? "#c9a227" : "#17213a";
        rr(r[0], r[1], boxW - 56, 38, 2); ctx.fill();
        ctx.fillStyle = (bd.action === "details" || bd.action === "link" || bd.action === "resume" || bd.action === "email") ? "#17213a" : "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(bd.label, r[0] + 18, r[1] + 24);
        by += 48;
      });
    }
    ctx.textAlign = "left";
    ctx.restore();
  }

  // ---- Resize ----
  // ---- Mini-map: terrain, buildings, files, player, and the camera view ----
  var MINITILE = 5; // minimap pixels per world tile
  function drawMinimap() {
    var m = minimapCtx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.clearRect(0, 0, 220, 140);
    for (var ty = 0; ty < ROWS; ty++) {
      for (var tx = 0; tx < COLS; tx++) {
        var t = grid[ty][tx];
        m.fillStyle = t === PATH ? "#e3dbc5" : t === WATER ? "#6db3e8" : t === TREE ? "#2f7a3d" : t === ROCK ? "#9a9a9a" : t === FLOWER ? "#e8a0c0" : "#7fae6a";
        m.fillRect(tx * MINITILE, ty * MINITILE, MINITILE, MINITILE);
      }
    }
    BLDGS.forEach(function (b) {
      m.fillStyle = buildingVisited(b.bid) ? "#d9a441" : "#17213a";
      m.fillRect((b.x - 2) * MINITILE, topTile(b) * MINITILE, 5 * MINITILE, (b.y - topTile(b) + 1) * MINITILE);
    });
    PLACES.forEach(function (p) {
      if (p.kind !== "file") return;
      m.fillStyle = visited[p.id] ? "#d9a441" : "#ffffff";
      m.fillRect(p.x * MINITILE, p.y * MINITILE, MINITILE, MINITILE);
    });
    // Building names, each placed to stay clear of its neighbours.
    var labelSide = { cityu: "above", bs: "above", certs: "aboveRight", skills: "left", house: "above", post: "right", aank: "below" };
    var labelText = { cityu: "CityU", bs: "Informatics", certs: "Cert Hall", skills: "Skills", house: "My House", post: "Contact", aank: "Aankhijhyal" };
    m.font = "bold 9px system-ui, sans-serif";
    BLDGS.forEach(function (b) {
      var rx = (b.x - 2) * MINITILE, rw = 5 * MINITILE, rt = topTile(b) * MINITILE, rb = (b.y + 1) * MINITILE;
      var side = labelSide[b.bid], tx, ty;
      if (side === "above") { m.textAlign = "left"; tx = rx; ty = rt - 4; }
      else if (side === "aboveRight") { m.textAlign = "right"; tx = rx + rw; ty = rt - 4; }
      else if (side === "left") { m.textAlign = "right"; tx = rx - 2; ty = rt + (rb - rt) / 2 + 3; }
      else if (side === "right") { m.textAlign = "left"; tx = rx + rw + 2; ty = rt + (rb - rt) / 2 + 3; }
      else { m.textAlign = "left"; tx = rx; ty = rb + 12; }
      m.lineWidth = 3; m.strokeStyle = "#17213a";
      m.strokeText(labelText[b.bid], tx, ty);
      m.fillStyle = "#ffffff";
      m.fillText(labelText[b.bid], tx, ty);
    });
    // Guide route on the map, matching the arrow above the player: a
    // dashed gold line from the player to the next place in quest order,
    // with a pulsing ring on that place.
    var target = !dialog ? nextQuestTarget() : null;
    if (target) {
      var gx = target.x * MINITILE + MINITILE / 2, gy = target.y * MINITILE + MINITILE / 2;
      var qx = player.x / TILE * MINITILE, qy = player.y / TILE * MINITILE;
      m.strokeStyle = "#f6d743"; m.lineWidth = 2; m.setLineDash([4, 3]);
      m.beginPath(); m.moveTo(qx, qy); m.lineTo(gx, gy); m.stroke();
      m.setLineDash([]);
      m.beginPath(); m.arc(gx, gy, 5 + Math.sin(performance.now() / 300) * 1.5, 0, Math.PI * 2); m.stroke();
    }
    // Camera view rectangle.
    var vw = canvas.width / (zoom * SCALE), vh = canvas.height / (zoom * SCALE);
    m.strokeStyle = "#ffffff"; m.lineWidth = 1;
    m.strokeRect(camX / TILE * MINITILE, camY / TILE * MINITILE, vw / TILE * MINITILE, vh / TILE * MINITILE);
    // Player dot.
    var px = player.x / TILE * MINITILE, py = player.y / TILE * MINITILE;
    m.fillStyle = "#ff5a3c";
    m.beginPath(); m.arc(px, py, 3, 0, Math.PI * 2); m.fill();
    m.strokeStyle = "#ffffff"; m.lineWidth = 1; m.stroke();
  }

  // Next place in quest order: the first one not visited yet. Both the
  // arrow above the player and the route on the mini-map point at it.
  function nextQuestTarget() {
    for (var i = 0; i < QUEST_ORDER.length; i++) {
      var p = placeById(QUEST_ORDER[i]);
      if (p && !visited[p.id]) return p;
    }
    return null;
  }

  // ---- Guide arrow: a pill above the player pointing at the next place in quest order ----
  function drawGuideArrow(now) {
    if (dialog || howtoOpen || allFound()) return;
    var best = nextQuestTarget();
    if (!best) return;
    var k = zoom * SCALE;
    var sx = (player.x - camX) * k, sy = (player.y - camY) * k;
    var label = "Next: " + best.label;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "bold 12px system-ui, sans-serif";
    var tw = ctx.measureText(label).width;
    var pw = tw + 34, ph = 24;
    var px = Math.max(8, Math.min(canvas.width - pw - 8, sx - pw / 2));
    var py = Math.max(8, sy - 66 + Math.sin(now / 300) * 2);
    ctx.fillStyle = "rgba(22,32,47,0.92)";
    rr(px, py, pw, ph, 12); ctx.fill();
    var ang = Math.atan2(best.y * TILE + 8 - player.y, best.x * TILE + 8 - player.x);
    ctx.save();
    ctx.translate(px + 14, py + 12);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = "#f6d743";
    ctx.beginPath();
    ctx.moveTo(0, -7); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "left";
    ctx.fillText(label, px + 24, py + 16);
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  // Mini-map starts collapsed on narrow screens; the How to play popup
  // shows once, on first open, and can be reopened any time.
  if (window.innerWidth <= 640) { minimapWrap.classList.add("collapsed"); minimapToggle.textContent = "+"; }
  var howtoSeen = false;
  try { howtoSeen = localStorage.getItem("portfolioQuestHowTo") === "1"; } catch (e) {}
  if (!howtoSeen) showHowto();

  // ---- Loop ----
  var last = performance.now();
  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    player.moving = false;
    if (!dialog && !howtoOpen) {
      var dx = 0, dy = 0;
      if (keys.left) dx -= 1;
      if (keys.right) dx += 1;
      if (keys.up) dy -= 1;
      if (keys.down) dy += 1;
      if (dx !== 0 || dy !== 0) {
        var len = Math.hypot(dx, dy);
        dx /= len; dy /= len;
      } else if (joy.active && (joy.x !== 0 || joy.y !== 0)) {
        dx = joy.x; dy = joy.y;
      }
      if (dx !== 0 || dy !== 0) {
        if (Math.abs(dy) > Math.abs(dx)) player.facing = dy < 0 ? "up" : "down";
        else player.facing = dx < 0 ? "left" : "right";
        var step = 70 * dt;
        var nx = player.x + dx * step;
        var movedX = false, movedY = false;
        if (!collides(nx, player.y)) { player.dist += Math.abs(nx - player.x); player.x = nx; movedX = true; }
        var ny = player.y + dy * step;
        if (!collides(player.x, ny)) { player.dist += Math.abs(ny - player.y); player.y = ny; movedY = true; }
        player.moving = movedX || movedY;
      }
      player.x = Math.max(8, Math.min(WORLD_W - 8, player.x));
      player.y = Math.max(8, Math.min(WORLD_H - 8, player.y));
    }
    var W = canvas.width, H = canvas.height;
    var viewW = W / (zoom * SCALE), viewH = H / (zoom * SCALE);
    var totalW = WORLD_W + 128, totalH = WORLD_H + 128;
    var focusX = player.x + pan.x, focusY = player.y + pan.y;
    camX = viewW >= totalW ? -64 + (totalW - viewW) / 2 : Math.max(-64, Math.min(totalW - 64 - viewW, focusX - viewW / 2));
    camY = viewH >= totalH ? -64 + (totalH - viewH) / 2 : Math.max(-64, Math.min(totalH - 64 - viewH, focusY - viewH / 2));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.scale(zoom * SCALE, zoom * SCALE);
    ctx.translate(-camX, -camY);
    var x0 = Math.max(0, Math.floor(camX / TILE)), x1 = Math.min(COLS - 1, Math.floor((camX + viewW) / TILE));
    var y0 = Math.max(0, Math.floor(camY / TILE)), y1 = Math.min(ROWS - 1, Math.floor((camY + viewH) / TILE));
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) drawTile(grid[ty][tx], tx, ty);
    }
    var drawables = [];
    for (var dty = y0; dty <= y1; dty++) {
      for (var dtx = x0; dtx <= x1; dtx++) {
        if (grid[dty][dtx] === TREE) drawables.push({ y: dty, x: dtx, kind: "tree" });
        else if (grid[dty][dtx] === ROCK) drawables.push({ y: dty, x: dtx, kind: "rock" });
      }
    }
    BLDGS.forEach(function (b) { drawables.push({ y: b.y, x: b.x, kind: "building", b: b }); });
    PLACES.forEach(function (p) {
      if (p.kind === "file") drawables.push({ y: p.y, x: p.x, kind: "file", p: p });
    });
    drawables.push({ y: player.y / TILE, x: player.x / TILE, kind: "player" });
    drawables.sort(function (a, c) { return (a.y - c.y) || (a.x - c.x); });
    drawables.forEach(function (d) {
      if (d.kind === "building") drawBuilding(d.b);
      else if (d.kind === "file") drawFile(d.p);
      else if (d.kind === "tree") drawTree(d.x, d.y);
      else if (d.kind === "rock") drawRock(d.x, d.y);
      else drawPlayer();
    });
    ctx.restore();
    // Screen-space labels (crisp text, constant size at any zoom).
    var k = zoom * SCALE;
    BLDGS.forEach(function (b) {
      var bx = b.x * TILE + 8, by = b.y * TILE + 8, H = bldgH(b);
      var lx = (bx - camX) * k, ly = (by + 8 - H - 18 - camY) * k;
      if (lx > -160 && lx < W + 160 && ly > -40 && ly < H + 40) {
        drawLabelPillScreen(lx, ly, b.label, b.cat, buildingVisited(b.bid), 13);
      }
    });
    PLACES.forEach(function (p) {
      if (p.kind !== "file") return;
      var fx = p.x * TILE + 8, fy = p.y * TILE + 8;
      var lx = (fx - camX) * k, ly = (fy - 22 - camY) * k;
      if (lx > -160 && lx < W + 160 && ly > -40 && ly < H + 40) {
        drawLabelPillScreen(lx, ly, p.label, p.cat, !!visited[p.id], 12);
      }
    });
    if (!dialog) {
      var near = nearestPlace(48);
      if (near) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center";
        var label = "Space / tap to open";
        var w = ctx.measureText(label).width + 20;
        var lx2 = Math.max(8, Math.min(W - w - 8, (player.x - camX) * k - w / 2));
        var ly2 = Math.max(8, (player.y - camY) * k - 32);
        ctx.fillStyle = "rgba(22,32,47,0.92)";
        rr(lx2, ly2, w, 26, 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, lx2 + w / 2, ly2 + 18);
        ctx.textAlign = "left";
      }
    }
    drawGuideArrow(now);
    if (!minimapWrap.classList.contains("collapsed")) drawMinimap();
    drawDialog();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
