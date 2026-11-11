// Script unique de « Bittensor sans jargon », chargé sur toutes les pages avec defer.
// Chaque partie vérifie d'abord que les éléments dont elle a besoin existent sur la page.

const anglais = document.documentElement.lang === "en";
const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

function lireMemoire(cle) {
  try { return localStorage.getItem(cle); } catch (e) { return null; }
}
function ecrireMemoire(cle, valeur) {
  try { localStorage.setItem(cle, valeur); } catch (e) { /* mémoire bloquée : tant pis */ }
}
function nombre(valeur, decimales = 0) {
  return valeur.toLocaleString(anglais ? "en-GB" : "fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}
function couleur(nom) {
  return getComputedStyle(document.body).getPropertyValue(nom).trim();
}

// =====================================================================  1. Thème clair / sombre
const boutonTheme = document.querySelector("#bouton-theme");

function appliquerTheme(sombre) {
  document.body.classList.toggle("sombre", sombre);
  boutonTheme.setAttribute("aria-pressed", String(sombre));
  if (sombre) {
    boutonTheme.textContent = anglais ? "Light mode" : "Mode clair";
  } else {
    boutonTheme.textContent = anglais ? "Dark mode" : "Mode sombre";
  }
  document.dispatchEvent(new Event("theme"));
}

appliquerTheme(lireMemoire("theme-tao") !== "clair");

boutonTheme.addEventListener("click", function () {
  const sombre = !document.body.classList.contains("sombre");
  appliquerTheme(sombre);
  ecrireMemoire("theme-tao", sombre ? "sombre" : "clair");
});

// =====================================================================  2. Menu sur téléphone
const boutonMenu = document.querySelector(".menu-bouton");
const menu = document.querySelector("#menu");
boutonMenu.addEventListener("click", function () {
  const ouvert = menu.classList.toggle("ouvert");
  boutonMenu.setAttribute("aria-expanded", String(ouvert));
});

// =====================================================================  3. Barre de lecture
const barreLecture = document.querySelector(".progression span");
function majLecture() {
  const total = document.documentElement.scrollHeight - innerHeight;
  barreLecture.style.transform = `scaleX(${total > 0 ? scrollY / total : 0})`;
}
addEventListener("scroll", majLecture, { passive: true });
majLecture();

// =====================================================================  4. Apparition au défilement
const observateur = new IntersectionObserver(function (entrees) {
  for (const entree of entrees) {
    if (entree.isIntersecting) {
      entree.target.classList.add("visible");
      entree.target.dispatchEvent(new Event("apparu"));
      observateur.unobserve(entree.target);
    }
  }
}, { threshold: 0.12 });

for (const element of document.querySelectorAll(".apparait")) {
  observateur.observe(element);
}

// =====================================================================  5. Compteurs animés (accueil)
for (const compteur of document.querySelectorAll("[data-compteur]")) {
  const cible = Number(compteur.dataset.compteur);
  const decimales = Number(compteur.dataset.decimales || 0);
  const suffixe = compteur.dataset.suffixe || "";
  const ecrire = (v) => { compteur.textContent = nombre(v, decimales) + suffixe; };
  ecrire(cible);
  if (mouvementReduit) continue;

  const section = compteur.closest(".apparait");
  ecrire(0);
  section.addEventListener("apparu", function () {
    const debut = performance.now();
    function etape(maintenant) {
      const t = Math.min((maintenant - debut) / 1800, 1);
      const adouci = 1 - Math.pow(1 - t, 4);
      ecrire(cible * adouci);
      if (t < 1) requestAnimationFrame(etape);
    }
    requestAnimationFrame(etape);
  });
}

// =====================================================================  6. Réseau animé (accueil)
const toile = document.querySelector("#reseau");

if (toile) {
  const ctx = toile.getContext("2d");
  let largeur, hauteur, noeuds = [], impulsions = [], souris = null, actif = true;
  let teinte = couleur("--accent"), teinte2 = couleur("--ambre");
  document.addEventListener("theme", () => { teinte = couleur("--accent"); teinte2 = couleur("--ambre"); if (mouvementReduit) dessiner(); });

  function redimensionner() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    largeur = toile.clientWidth;
    hauteur = toile.clientHeight;
    toile.width = largeur * ratio;
    toile.height = hauteur * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const combien = Math.round(Math.min(90, (largeur * hauteur) / 11000));
    noeuds = [];
    for (let i = 0; i < combien; i++) {
      noeuds.push({
        x: Math.random() * largeur, y: Math.random() * hauteur,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: 1.5 + Math.random() * 2.5, validateur: Math.random() < 0.12,
      });
    }
  }

  function voisins() {
    const liens = [];
    for (let i = 0; i < noeuds.length; i++) {
      for (let j = i + 1; j < noeuds.length; j++) {
        const dx = noeuds[i].x - noeuds[j].x, dy = noeuds[i].y - noeuds[j].y;
        const d = Math.hypot(dx, dy);
        if (d < 150) liens.push([i, j, d]);
      }
    }
    return liens;
  }

  function dessiner() {
    ctx.clearRect(0, 0, largeur, hauteur);
    const liens = voisins();
    ctx.lineWidth = 1;
    for (const [i, j, d] of liens) {
      ctx.globalAlpha = (1 - d / 150) * 0.45;
      ctx.strokeStyle = teinte;
      ctx.beginPath();
      ctx.moveTo(noeuds[i].x, noeuds[i].y);
      ctx.lineTo(noeuds[j].x, noeuds[j].y);
      ctx.stroke();
    }
    // De temps en temps, un « paiement » part d'un validateur vers un voisin.
    if (!mouvementReduit && Math.random() < 0.08 && liens.length) {
      const [i, j] = liens[Math.floor(Math.random() * liens.length)];
      impulsions.push({ de: i, vers: j, t: 0 });
    }
    ctx.globalAlpha = 1;
    impulsions = impulsions.filter((p) => p.t <= 1);
    for (const p of impulsions) {
      const a = noeuds[p.de], b = noeuds[p.vers];
      const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
      ctx.fillStyle = teinte2;
      ctx.shadowColor = teinte2;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      p.t += 0.02;
    }
    ctx.shadowBlur = 0;
    for (const n of noeuds) {
      ctx.fillStyle = n.validateur ? teinte2 : teinte;
      ctx.globalAlpha = n.validateur ? 0.95 : 0.75;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.validateur ? n.r + 2 : n.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function bouger() {
    for (const n of noeuds) {
      if (souris) {
        const dx = souris.x - n.x, dy = souris.y - n.y, d = Math.hypot(dx, dy);
        if (d < 180) { n.vx += dx / d * 0.02; n.vy += dy / d * 0.02; }
      }
      n.vx *= 0.99; n.vy *= 0.99;
      n.vx += (Math.random() - 0.5) * 0.02; n.vy += (Math.random() - 0.5) * 0.02;
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > largeur) n.vx *= -1;
      if (n.y < 0 || n.y > hauteur) n.vy *= -1;
    }
  }

  function boucle() {
    if (actif) { bouger(); dessiner(); }
    requestAnimationFrame(boucle);
  }

  toile.parentElement.addEventListener("pointermove", (e) => {
    const r = toile.getBoundingClientRect();
    souris = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  toile.parentElement.addEventListener("pointerleave", () => { souris = null; });
  new IntersectionObserver((e) => { actif = e[0].isIntersecting; }).observe(toile);
  addEventListener("resize", () => { redimensionner(); if (mouvementReduit) dessiner(); });

  redimensionner();
  if (mouvementReduit) dessiner(); else boucle();
}

// =====================================================================  7. SHA-256 (pour la démo blockchain)
// Implémentation compacte de l'algorithme SHA-256 sur une chaîne de caractères UTF-8.
function sha256(texte) {
  const K = [];
  const H = [];
  let premier = 2;
  const estPremier = (n) => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  while (K.length < 64) {
    if (estPremier(premier)) {
      if (H.length < 8) H.push((Math.pow(premier, 1 / 2) * 2 ** 32) | 0);
      K.push((Math.pow(premier, 1 / 3) * 2 ** 32) | 0);
    }
    premier++;
  }
  const octets = Array.from(new TextEncoder().encode(texte));
  const longueurBits = octets.length * 8;
  octets.push(0x80);
  while (octets.length % 64 !== 56) octets.push(0);
  for (let i = 7; i >= 0; i--) octets.push(i >= 4 ? 0 : (longueurBits >>> (i * 8)) & 0xff);
  const rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let bloc = 0; bloc < octets.length; bloc += 64) {
    const W = new Array(64);
    for (let i = 0; i < 16; i++) {
      const j = bloc + i * 4;
      W[i] = (octets[j] << 24) | (octets[j + 1] << 16) | (octets[j + 2] << 8) | octets[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rot(W[i - 15], 7) ^ rot(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rot(W[i - 2], 17) ^ rot(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
}

// =====================================================================  8. Démo : la chaîne de blocs
const chaine = document.querySelector("#chaine");

if (chaine) {
  const blocs = chaine.querySelectorAll(".bloc");
  const champs = chaine.querySelectorAll("textarea");
  const origines = Array.from(champs, (c) => c.value);
  const message = document.querySelector("#message-chaine");
  // Les empreintes « enregistrées » par le réseau au départ
  const enregistrees = [];
  let precedente = "0".repeat(64);
  for (const champ of champs) {
    precedente = sha256(precedente + champ.value);
    enregistrees.push(precedente);
  }

  function verifier() {
    let precedent = "0".repeat(64);
    let premierCasse = -1;
    blocs.forEach((bloc, i) => {
      const empreinte = sha256(precedent + champs[i].value);
      bloc.querySelector(".precedent").textContent = precedent.slice(0, 16) + "…";
      bloc.querySelector(".empreinte").textContent = empreinte.slice(0, 16) + "…";
      const casse = empreinte !== enregistrees[i];
      bloc.classList.toggle("casse", casse);
      if (casse && premierCasse < 0) premierCasse = i;
      if (anglais) {
        bloc.querySelector(".etat-bloc").textContent = casse ? "✗ Does not match the network" : "✓ Valid";
      } else {
        bloc.querySelector(".etat-bloc").textContent = casse ? "✗ Ne correspond plus au réseau" : "✓ Valide";
      }
      precedent = empreinte;
    });
    if (premierCasse < 0) {
      message.textContent = "";
    } else if (anglais) {
      message.textContent = `Changing block ${premierCasse + 1} broke every block after it. The other copies of the network instantly see the fraud.`;
    } else {
      message.textContent = `Modifier le bloc ${premierCasse + 1} a cassé tous les blocs suivants. Les autres copies du réseau voient la fraude immédiatement.`;
    }
  }

  for (const champ of champs) champ.addEventListener("input", verifier);
  document.querySelector("#reparer").addEventListener("click", function () {
    champs.forEach((c, i) => { c.value = origines[i]; });
    verifier();
  });
  verifier();
}

// =====================================================================  9. Simulateur du consensus Yuma
const yuma = document.querySelector("#yuma");

if (yuma) {
  const mineurs = anglais ? ["Miner 1", "Miner 2", "Miner 3"] : ["Mineur 1", "Mineur 2", "Mineur 3"];
  const scenarios = {
    honnete: { stakes: [40, 35, 25], notes: [[8, 5, 3], [7, 6, 3], [8, 5, 4]] },
    tricheur: { stakes: [40, 35, 25], notes: [[8, 5, 3], [7, 6, 3], [1, 1, 10]] },
    majorite: { stakes: [25, 15, 60], notes: [[8, 5, 3], [7, 6, 3], [1, 1, 10]] },
  };
  const etat = structuredClone(scenarios.honnete);
  const zoneJures = yuma.querySelector(".yuma-jures");

  function curseur(id, texte, min, max, valeur, quandChange) {
    const ligne = document.createElement("div");
    ligne.className = "reglage";
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = texte;
    const entree = document.createElement("input");
    entree.type = "range"; entree.id = id; entree.min = min; entree.max = max; entree.value = valeur;
    const sortie = document.createElement("output");
    sortie.textContent = valeur;
    entree.addEventListener("input", () => { sortie.textContent = entree.value; quandChange(Number(entree.value)); calculer(); });
    ligne.append(label, entree, sortie);
    return ligne;
  }

  function construire() {
    zoneJures.textContent = "";
    ["A", "B", "C"].forEach((lettre, v) => {
      const carte = document.createElement("div");
      carte.className = "jure";
      const titre = document.createElement("h3");
      titre.textContent = (anglais ? "Validator " : "Validateur ") + lettre;
      const part = document.createElement("small");
      part.className = "part-stake";
      titre.append(part);
      carte.append(titre);
      carte.append(curseur(`stake-${v}`, anglais ? "TAO staked" : "TAO confiés", 1, 100, etat.stakes[v], (x) => { etat.stakes[v] = x; }));
      mineurs.forEach((nom, m) => {
        carte.append(curseur(`note-${v}-${m}`, (anglais ? "Score " : "Note ") + nom.toLowerCase(), 0, 10, etat.notes[v][m], (x) => { etat.notes[v][m] = x; }));
      });
      zoneJures.append(carte);
    });
  }

  function medianePonderee(valeurs, poids) {
    const paires = valeurs.map((v, i) => [v, poids[i]]).sort((a, b) => a[0] - b[0]);
    const moitie = poids.reduce((s, p) => s + p, 0) / 2;
    let cumul = 0;
    for (const [v, p] of paires) {
      cumul += p;
      if (cumul >= moitie) return v;
    }
    return paires[paires.length - 1][0];
  }

  function barres(conteneur, donnees, ambre) {
    if (conteneur.children.length !== donnees.length) {
      conteneur.textContent = "";
      for (const d of donnees) {
        const ligne = document.createElement("div");
        ligne.className = "barre";
        ligne.innerHTML = `<span></span><div class="barre-fond"><div class="barre-plein${ambre ? " ambre" : ""}"></div></div><span></span>`;
        conteneur.append(ligne);
      }
    }
    donnees.forEach((d, i) => {
      const ligne = conteneur.children[i];
      ligne.children[0].textContent = d.nom;
      ligne.querySelector(".barre-plein").style.width = Math.round(d.valeur * 100) + "%";
      ligne.children[2].textContent = Math.round(d.valeur * 100) + " %";
    });
  }

  function calculer() {
    const totalStake = etat.stakes.reduce((s, x) => s + x, 0);
    // Chaque validateur répartit 100 % de ses notes entre les mineurs.
    const normalisees = etat.notes.map((ligne) => {
      const somme = ligne.reduce((s, x) => s + x, 0) || 1;
      return ligne.map((x) => x / somme);
    });
    const consensus = mineurs.map((_, m) => medianePonderee(normalisees.map((l) => l[m]), etat.stakes));
    const rabotees = normalisees.map((ligne) => ligne.map((x, m) => Math.min(x, consensus[m])));
    const rangs = mineurs.map((_, m) => rabotees.reduce((s, ligne, v) => s + ligne[m] * etat.stakes[v], 0));
    const totalRangs = rangs.reduce((s, x) => s + x, 0) || 1;

    barres(document.querySelector("#yuma-barres"), mineurs.map((nom, m) => ({ nom, valeur: rangs[m] / totalRangs })), false);
    barres(document.querySelector("#yuma-accord"), ["A", "B", "C"].map((l, v) => ({
      nom: (anglais ? "Validator " : "Valid. ") + l,
      valeur: rabotees[v].reduce((s, x) => s + x, 0),
    })), true);
    zoneJures.querySelectorAll(".part-stake").forEach((el, v) => {
      el.textContent = Math.round(etat.stakes[v] / totalStake * 100) + (anglais ? "% of the stake" : " % du stake");
    });
  }

  for (const bouton of document.querySelectorAll("[data-scenario]")) {
    bouton.addEventListener("click", function () {
      Object.assign(etat, structuredClone(scenarios[bouton.dataset.scenario]));
      construire();
      calculer();
    });
  }

  construire();
  calculer();
}

// =====================================================================  10. Courbe de l'offre de TAO
const graphique = document.querySelector("#graphique-offre");

if (graphique) {
  const NS = "http://www.w3.org/2000/svg";
  const L = 720, Hh = 320, marge = { g: 56, d: 16, h: 16, b: 34 };
  const debut = new Date(2021, 0, 1), fin = new Date(2045, 11, 31);
  const premierHalving = new Date(2025, 11, 12);
  const jour = 86400000;

  // Modèle simplifié : 7 200 τ par jour jusqu'à 10,5 millions, puis moitié à chaque seuil.
  function offreA(date) {
    const jours = (date - premierHalving) / jour;
    if (jours < 0) return Math.max(0, 10.5e6 + jours * 7200);
    let offre = 10.5e6, parJour = 3600, reste = jours, seuil = 15.75e6;
    while (reste > 0) {
      const joursJusquauSeuil = (seuil - offre) / parJour;
      if (reste <= joursJusquauSeuil) return offre + reste * parJour;
      reste -= joursJusquauSeuil;
      offre = seuil; parJour /= 2; seuil = offre + (21e6 - offre) / 2;
    }
    return offre;
  }
  function creationParJour(date) {
    const offre = offreA(date);
    if (offre < 10.5e6) return 7200;
    let seuil = 15.75e6, parJour = 3600, base = 10.5e6;
    while (offre >= seuil) { parJour /= 2; base = seuil; seuil = base + (21e6 - base) / 2; }
    return parJour;
  }

  const x = (date) => marge.g + (date - debut) / (fin - debut) * (L - marge.g - marge.d);
  const y = (offre) => Hh - marge.b - offre / 21e6 * (Hh - marge.h - marge.b);
  const dateDeX = (px) => new Date(+debut + (px - marge.g) / (L - marge.g - marge.d) * (fin - debut));

  function el(nom, attributs, texte) {
    const e = document.createElementNS(NS, nom);
    for (const [k, v] of Object.entries(attributs)) e.setAttribute(k, v);
    if (texte) e.textContent = texte;
    graphique.append(e);
    return e;
  }

  // Axes et graduations
  for (const m of [0, 5, 10, 15, 21]) {
    el("line", { x1: marge.g, x2: L - marge.d, y1: y(m * 1e6), y2: y(m * 1e6), class: "axe" });
    el("text", { x: marge.g - 8, y: y(m * 1e6) + 4, "text-anchor": "end", class: "axe-texte" }, m + " M");
  }
  for (let an = 2021; an <= 2045; an += 4) {
    el("text", { x: x(new Date(an, 0, 1)), y: Hh - 10, "text-anchor": "middle", class: "axe-texte" }, String(an));
  }

  // Courbe
  let chemin = "";
  const points = [];
  for (let t = +debut; t <= +fin; t += 30 * jour) {
    const d = new Date(t);
    points.push([x(d), y(offreA(d))]);
  }
  chemin = points.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  el("path", { d: chemin + ` L${x(fin)} ${y(0)} L${x(debut)} ${y(0)} Z`, class: "aire" });
  const courbe = el("path", { d: chemin, class: "courbe" });

  // Repères des halvings (estimés)
  let seuil = 10.5e6, numero = 1;
  for (let t = +debut; t <= +fin && numero <= 4; t += jour) {
    if (offreA(new Date(t)) >= seuil) {
      const px = x(new Date(t));
      el("line", { x1: px, x2: px, y1: y(21e6), y2: y(0), class: "repere-halving" });
      el("text", { x: px + 4, y: y(20e6) + numero * 13, class: "texte-halving" }, "halving " + numero);
      seuil = seuil + (21e6 - seuil) / 2;
      numero++;
    }
  }
  const aujourdhui = new Date(2026, 10, 11);
  el("circle", { cx: x(aujourdhui), cy: y(offreA(aujourdhui)), r: 4, class: "curseur-point" });
  el("text", { x: x(aujourdhui) + 8, y: y(offreA(aujourdhui)) + 18, class: "aujourdhui" }, anglais ? "today" : "aujourd'hui");

  // Animation de tracé
  if (!mouvementReduit) {
    const longueur = courbe.getTotalLength();
    courbe.style.strokeDasharray = longueur;
    courbe.style.strokeDashoffset = longueur;
    graphique.closest(".apparait").addEventListener("apparu", () => {
      courbe.style.transition = "stroke-dashoffset 2.4s cubic-bezier(0.4, 0, 0.2, 1)";
      courbe.style.strokeDashoffset = 0;
    });
  }

  // Lecture interactive : souris, doigt ou flèches du clavier
  const ligne = el("line", { y1: y(21e6), y2: y(0), class: "curseur-ligne", visibility: "hidden" });
  const point = el("circle", { r: 6, class: "curseur-point", visibility: "hidden" });
  const info = document.querySelector("#info-courbe");
  const formatMois = new Intl.DateTimeFormat(anglais ? "en-GB" : "fr-FR", { month: "long", year: "numeric" });
  let dateCurseur = aujourdhui;

  function montrer(date) {
    if (date < debut) date = debut;
    if (date > fin) date = fin;
    dateCurseur = date;
    const px = x(date), py = y(offreA(date));
    ligne.setAttribute("x1", px); ligne.setAttribute("x2", px); ligne.setAttribute("visibility", "visible");
    point.setAttribute("cx", px); point.setAttribute("cy", py); point.setAttribute("visibility", "visible");
    const millions = nombre(offreA(date) / 1e6, 2);
    const parJour = nombre(creationParJour(date));
    info.textContent = anglais
      ? `${formatMois.format(date)}: about ${millions} million TAO in circulation, ${parJour} τ created per day.`
      : `${formatMois.format(date)} : environ ${millions} millions de TAO en circulation, ${parJour} τ créés par jour.`;
  }

  graphique.setAttribute("tabindex", "0");
  graphique.addEventListener("pointermove", (e) => {
    const r = graphique.getBoundingClientRect();
    montrer(dateDeX((e.clientX - r.left) / r.width * L));
  });
  graphique.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const pas = (e.shiftKey ? 365 : 30) * jour * (e.key === "ArrowRight" ? 1 : -1);
      montrer(new Date(+dateCurseur + pas));
    }
  });
  graphique.addEventListener("focus", () => montrer(dateCurseur));
}

// =====================================================================  11. Réservoir TAO / alpha
const reservoir = document.querySelector("#reservoir");

if (reservoir) {
  const TAO = 10000, ALPHA = 100000, K = TAO * ALPHA, PRIX = TAO / ALPHA;
  const entree = document.querySelector("#montant-tao");
  const sortie = document.querySelector("#sortie-tao");

  function majReservoir() {
    const verse = Number(entree.value);
    const alphaRecus = ALPHA - K / (TAO + verse);
    const prixMoyen = verse > 0 ? verse / alphaRecus : PRIX;
    const glissement = (prixMoyen / PRIX - 1) * 100;
    const nouveauPrix = (TAO + verse) / (ALPHA - alphaRecus);
    sortie.textContent = nombre(verse) + " τ";
    document.querySelector("#alpha-recus").textContent = nombre(alphaRecus, 0) + " α";
    document.querySelector("#prix-moyen").textContent = nombre(prixMoyen, 4) + " τ";
    document.querySelector("#glissement").textContent = nombre(glissement, 1) + " %";
    document.querySelector("#nouveau-prix").textContent = nombre(nouveauPrix, 4) + " τ";
    reservoir.querySelector(".niveau-tao").style.height = ((TAO + verse) / 15000 * 100) + "%";
    reservoir.querySelector(".niveau-alpha").style.height = ((ALPHA - alphaRecus) / ALPHA * 100) + "%";
  }
  entree.addEventListener("input", majReservoir);
  majReservoir();
}

// Le donut s'anime quand sa section apparaît
const donut = document.querySelector(".donut");
if (donut && mouvementReduit) donut.classList.add("visible");

// =====================================================================  12. Filtre des subnets
const filtres = document.querySelectorAll(".filtre");

if (filtres.length) {
  const cartes = document.querySelectorAll(".carte-subnet");
  const compte = document.querySelector("#compte-subnets");

  function filtrer(categorie) {
    let visibles = 0;
    for (const carte of cartes) {
      const montrer = categorie === "tous" || carte.dataset.categorie === categorie;
      carte.classList.toggle("cachee", !montrer);
      if (montrer) visibles++;
    }
    for (const f of filtres) f.setAttribute("aria-pressed", String(f.dataset.filtre === categorie));
    compte.textContent = anglais ? `${visibles} subnets shown` : `${visibles} subnets affichés`;
  }

  for (const f of filtres) f.addEventListener("click", () => filtrer(f.dataset.filtre));
  filtrer("tous");
}

// =====================================================================  13. Onglets et terminaux animés
const onglets = document.querySelectorAll('[role="tab"]');

if (onglets.length) {
  const terminaux = new Map();

  // Chaque terminal mémorise ses lignes pour pouvoir les « taper » à nouveau.
  for (const terminal of document.querySelectorAll(".terminal")) {
    const ecran = terminal.querySelector(".terminal-ecran");
    const lignes = Array.from(ecran.children, (s) => ({ classe: s.className, texte: s.textContent }));
    const donnees = { ecran, lignes, jeton: 0, tape: false };
    terminaux.set(terminal, donnees);

    terminal.querySelector(".rejouer").addEventListener("click", () => taper(donnees));
    terminal.querySelector(".copier").addEventListener("click", async function () {
      const commandes = lignes.filter((l) => l.classe === "t-cmd").map((l) => l.texte).join("\n");
      try {
        await navigator.clipboard.writeText(commandes);
        this.textContent = anglais ? "Copied!" : "Copié !";
      } catch (e) {
        this.textContent = anglais ? "Copy failed" : "Copie impossible";
      }
      setTimeout(() => { this.textContent = anglais ? "Copy the commands" : "Copier les commandes"; }, 1800);
    });
  }

  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

  async function taper(donnees) {
    const jeton = ++donnees.jeton;
    donnees.tape = true;
    const { ecran, lignes } = donnees;
    ecran.textContent = "";
    if (mouvementReduit) {
      for (const l of lignes) { const s = document.createElement("span"); s.className = l.classe; s.textContent = l.texte; ecran.append(s); }
      return;
    }
    for (const l of lignes) {
      const s = document.createElement("span");
      s.className = l.classe + " t-curseur";
      ecran.append(s);
      if (l.classe === "t-cmd") {
        for (const lettre of l.texte) {
          if (jeton !== donnees.jeton) return;
          s.textContent += lettre;
          await attendre(14 + Math.random() * 28);
        }
        await attendre(350);
      } else {
        s.textContent = l.texte;
        await attendre(l.classe === "t-sortie" ? 450 : 180);
      }
      if (jeton !== donnees.jeton) return;
      s.classList.remove("t-curseur");
    }
  }

  function activer(onglet, focus) {
    for (const o of onglets) {
      const choisi = o === onglet;
      o.setAttribute("aria-selected", String(choisi));
      o.tabIndex = choisi ? 0 : -1;
      document.getElementById(o.getAttribute("aria-controls")).hidden = !choisi;
    }
    if (focus) onglet.focus();
    const panneau = document.getElementById(onglet.getAttribute("aria-controls"));
    const terminal = panneau.querySelector(".terminal");
    if (terminal) taper(terminaux.get(terminal));
  }

  onglets.forEach((onglet, i) => {
    onglet.addEventListener("click", () => activer(onglet, false));
    onglet.addEventListener("keydown", (e) => {
      let cible = null;
      if (e.key === "ArrowRight") cible = onglets[(i + 1) % onglets.length];
      if (e.key === "ArrowLeft") cible = onglets[(i - 1 + onglets.length) % onglets.length];
      if (e.key === "Home") cible = onglets[0];
      if (e.key === "End") cible = onglets[onglets.length - 1];
      if (cible) { e.preventDefault(); activer(cible, true); }
    });
  });

  // Le premier terminal se tape quand il arrive à l'écran.
  const premier = document.querySelector(".terminal");
  new IntersectionObserver((entrees, obs) => {
    if (entrees[0].isIntersecting) {
      const d = terminaux.get(premier);
      if (!d.tape) taper(d);
      obs.disconnect();
    }
  }, { threshold: 0.3 }).observe(premier);

  // Un lien vers #onglet-… ouvre l'onglet correspondant.
  function ouvrirDepuisAdresse() {
    const onglet = location.hash && document.querySelector(location.hash + '[role="tab"]');
    if (onglet) activer(onglet, false);
  }
  addEventListener("hashchange", ouvrirDepuisAdresse);
  ouvrirDepuisAdresse();
}

// =====================================================================  14. Bandeau « Offre limitée » (le dark pattern volontaire, voir Sources)
const minuteur = document.querySelector("#minuteur");

if (minuteur) {
  let secondes = 599;
  setInterval(function () {
    secondes = secondes > 0 ? secondes - 1 : 599; // à zéro, il repart discrètement
    const m = String(Math.floor(secondes / 60)).padStart(2, "0");
    const s = String(secondes % 60).padStart(2, "0");
    minuteur.textContent = `${m}:${s}`;
  }, 1000);
}
