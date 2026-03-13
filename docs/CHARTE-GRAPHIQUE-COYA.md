# Charte graphique COYA / SENEGEL

Document de référence pour l’identité visuelle de COYA.PRO (plateforme SENEGEL).

---

## 1. Couleurs principales

### Vert COYA / SENEGEL (primaire)
- **`--coya-green`** : `#1a5f3a` — vert principal (texte, bordures, fonds discrets).
- **`--coya-green-light`** : `#247a4a` — vert clair (hover, liens, accents).
- **Émeraude** : `--coya-emeraude` — teinte plus claire pour fonds et barres de progression (alignée avec le vert SENEGEL).

### Jaune / Ambre (accent, CTA)
- **`--coya-yellow`** : `#e8b923` — jaune principal (boutons d’action secondaires, highlights).
- **`--coya-yellow-light`** : `#f0c94a` — jaune clair (hover sur CTA).
- **`--coya-ambre`** : variante ambre pour états « attention » ou « warning ».

### Or Barké (Trinité)
- **`--coya-or-barke`** : teinte or/dorée pour l’élément « Barké » de la Trinité (usage futur : indicateurs, badges, rituels).

### Fonds et neutres
- **Fond clair** : `--coya-bg` — fond de page (ex. `#F4F8FB`).
- **Fond cartes** : blanc ou léger gris selon thème.
- **Texte** : `--coya-text` (principal), `--coya-text-muted` (secondaire).

---

## 2. Usage recommandé

| Usage | Couleur / variable |
|--------|---------------------|
| Liens, boutons primaires, état actif (nav) | `--coya-green` / `--coya-green-light` |
| Boutons CTA secondaires, highlights | `--coya-yellow` |
| Succès, validation, progression | vert / émeraude |
| Attention, avertissement | ambre / orange |
| Erreur, danger | rouge (palette standard) |
| Fond de page | `--coya-bg` |
| Cartes, modales | fond blanc / `--coya-card-bg` |

---

## 3. Trinité (Ndiguel / Yar / Barké)

Pour les modules liés à la Trinité (OKR, rythme hebdo, indicateurs) :
- **Ndiguel** : couleur dédiée (ex. vert).
- **Yar** : couleur dédiée (ex. bleu ou autre).
- **Barké** : `--coya-or-barke` (or).

Les couleurs exactes pour Ndiguel et Yar pourront être définies dans une mise à jour ultérieure (Phase 4 bloc 2).

---

## 4. Typographie et espacements

- **Police** : `'Segoe UI', system-ui, -apple-system, sans-serif` (variable `--coya-font`).
- **Espacements** : cohérence avec Tailwind (multiples de 4px).
- **Ombres** : `--coya-shadow` — ombre légère verte pour cartes et élévations.

---

## 5. Mode sombre

En `[data-theme="dark"]`, les variables sont surchargées :
- Fonds plus sombres (`--coya-bg`, `--coya-card-bg`).
- Texte clair (`--coya-text`), texte atténué (`--coya-text-muted`).
- Bordures et états actifs restent sur la palette COYA avec contraste adapté.

---

## 6. Fichiers techniques

- **Variables CSS** : `coya-pro/src/index.css` (thèmes light et dark).
- **Tailwind** : `tailwind.config.js` — couleurs étendues `coya.*` mappées sur ces variables pour usage en classes (`bg-coya-primary`, `text-coya-accent`, etc.).
