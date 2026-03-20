

# Relier une Mission a un Devis avec import automatique du materiel

## Objectif

Permettre de selectionner une mission lors de la creation/edition d'un devis. Quand une mission est selectionnee, le materiel assigne a cette mission est automatiquement ajoute comme lignes du devis, avec le tarif horaire (prix de location) multiplie par le nombre d'heures de la prestation. Un champ "Heures de prestation" sera ajoute au formulaire.

## Ce qui existe deja

- La table `devis` possede deja une colonne `mission_id` (nullable) -- aucune migration necessaire
- La table `materiel` possede un champ `rental_price` (tarif horaire)
- La table `mission_materiel` lie les materiels aux missions avec une quantite
- Le `MissionDetail` verifie deja le nombre de devis lies a une mission

## Changements prevus

### 1. Formulaire de Devis (`src/pages/DevisForm.tsx`)

- Ajouter un hook `useMissions()` pour recuperer la liste des missions
- Ajouter un selecteur "Mission" dans les informations generales (optionnel, entre Client et Date)
- Quand une mission est selectionnee :
  - Pre-remplir automatiquement le client (client_id de la mission)
  - Pre-remplir les dates du devis si la mission a des dates
- Ajouter un champ numerique **"Heures de prestation"** (ex: 8h, 12h...)
- Ajouter un bouton **"Importer le materiel de la mission"** qui :
  - Recupere le materiel assigne via `useMissionMateriel(missionId)`
  - Pour chaque materiel assigne, cree une ligne de devis :
    - Description : nom du materiel
    - Quantite : quantite assignee a la mission
    - Prix unitaire HT : `rental_price * heures`
  - Les lignes importees s'ajoutent aux lignes existantes (pas de remplacement)
- Inclure `mission_id` dans le payload envoye a `useCreateDevis` / `useUpdateDevis`

### 2. Hook de donnees (`src/hooks/use-data.ts`)

- Modifier `useCreateDevis` et `useUpdateDevis` pour transmettre `mission_id` dans le payload (le champ existe deja en base, il suffit de ne plus l'ignorer)

### 3. Detail du Devis (`src/pages/DevisDetail.tsx`)

- Afficher un lien vers la mission liee dans la sidebar (si `mission_id` est renseigne)
- Modifier la requete `useDevis` pour inclure `missions(title, id)` dans le select

### 4. Detail de la Mission (`src/pages/MissionDetail.tsx`)

- Ajouter un bouton "Generer un devis" qui redirige vers `/finance/devis/nouveau?fromMission={missionId}`
- Le formulaire DevisForm detectera ce parametre et pre-selectionnera la mission

## Details techniques

### Flux utilisateur

```text
Mission Detail
  |
  +-- Clic "Generer un devis"
  |
  v
DevisForm (pre-rempli)
  +-- Mission selectionnee automatiquement
  +-- Client pre-rempli depuis la mission
  +-- Champ "Heures de prestation" a saisir (ex: 10)
  +-- Clic "Importer le materiel"
  |     |
  |     +-- Ligne 1 : "Enceinte JBL x2" -> 2 x (50 EUR/h x 10h) = 1000 EUR
  |     +-- Ligne 2 : "Table de mixage x1" -> 1 x (30 EUR/h x 10h) = 300 EUR
  |
  +-- Total HT calcule automatiquement
  +-- Enregistrer (avec mission_id sauvegarde)
```

### Calcul du prix par ligne

Pour chaque materiel assigne a la mission :
- `description` = nom du materiel + " (location {heures}h)"
- `quantity` = quantite assignee dans mission_materiel
- `unitPrice` = `rental_price * heures` (si rental_price est null, utiliser 0)

### Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/pages/DevisForm.tsx` | Selecteur mission, champ heures, bouton import materiel, pre-remplissage client |
| `src/hooks/use-data.ts` | Inclure `mission_id` dans create/update devis, ajouter `missions(title)` au select de `useDevis` |
| `src/pages/DevisDetail.tsx` | Afficher lien mission liee en sidebar |
| `src/pages/MissionDetail.tsx` | Bouton "Generer un devis" |

### Pas de migration necessaire

La colonne `mission_id` existe deja sur la table `devis`. Aucun changement de schema n'est requis.

