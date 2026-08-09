# Muscu — App montre Garmin (Connect IQ / Monkey C)

Watch-app Connect IQ qui déroule une séance de musculation avec **repos automatique**,
pensée pour la **Vivoactive 3** (écran tactile rond 240×240, **un seul bouton latéral**).

Fait partie du monorepo `App_Garmin_Muscu`. Ce dossier `watch/` est la brique montre ;
`web/` (API) est géré séparément. Le **contrat d'API est figé et partagé** avec le web.

---

## Flux de séance

1. **Lancement** → chargement du workout (mock local ou API) et parsing.
2. **Écran exercice** : nom de l'exo, `série x/N`, reps cible, charge cible.
3. **Gros bouton tactile « SÉRIE TERMINÉE »** → lance **automatiquement** un compte
   à rebours de repos (`rest` du workout, en secondes) avec **vibration + bip** à la fin,
   puis **passage automatique** à la série / l'exercice suivant.
4. **Bouton physique** = pause / reprise du repos ; **tap « PASSER »** = skip immédiat ;
   gestes tactiles = interaction.
5. **Fin de séance** : enregistrement de l'activité en **FIT** (type *strength*, visible
   dans Garmin Connect) **+ POST** des résultats réels vers `/api/sessions`.

---

## Contrat d'API (FIGÉ — identique côté web)

```
GET /api/workouts/:id
Authorization: Bearer <token>
-> { id, name, exercises: [ { exercise_id, name,
       sets: [ { reps, weight, rest } ] } ] }        // rest en secondes

POST /api/sessions
Authorization: Bearer <token>
Content-Type: application/json
body { workout_id, started_at, finished_at,
       exercises: [ { exercise_id, sets: [ { reps, weight } ] } ] }
```

`started_at` / `finished_at` sont envoyés en **ISO 8601 UTC** (`2026-08-09T10:20:30Z`).

---

## App Settings (properties éditables)

| Clé          | Type    | Rôle                                                    |
|--------------|---------|---------------------------------------------------------|
| `apiBaseUrl` | string  | Base de l'API, ex. `https://muscu.alexisbousquet.fr`    |
| `token`      | string  | Jeton `Bearer` d'authentification                       |
| `workoutId`  | string  | ID du workout à charger                                 |
| `useMock`    | boolean | `true` = ignore l'API et charge le **mock local**       |

Éditables dans le simulateur (**File ▸ Edit Application.Properties**) ou via Garmin
Connect Mobile sur la montre. Par défaut `useMock = true` : **le flux tourne sans API**.

Pour pointer sur l'API réelle : `useMock = false`, renseigner `apiBaseUrl`, `token`,
`workoutId`. Aucun changement de code nécessaire.

---

## Prérequis (SDK non installé sur cette machine)

⚠️ La machine de dev actuelle n'a **ni le SDK Connect IQ, ni `monkeyc`, ni Java** :
le build/simulateur n'a donc **pas** pu être lancé ici. Étapes pour builder :

1. **Java 17+** (`sudo apt install openjdk-17-jdk`).
2. **Connect IQ SDK Manager** : https://developer.garmin.com/connect-iq/sdk/
   → installer le SDK récent + le **device vivoactive3**.
3. Ajouter les binaires du SDK au `PATH` (`.../connectiq-sdk-*/bin`) :
   `monkeyc`, `monkeydo`, `connectiq`, `simulator`.
4. Générer une **clé de développeur** (une fois) :
   ```
   openssl genrsa -out developer_key.pem 4096
   openssl pkcs8 -topk8 -inform PEM -outform DER -in developer_key.pem \
     -out developer_key.der -nocrypt
   ```
   Le plus simple : **VS Code + extension « Monkey C »** (Ctrl+Shift+P ▸
   *Monkey C: Generate a Developer Key*), qui gère aussi build/run.

---

## Build & test dans le simulateur

Depuis `watch/` :

```bash
# 1. Compiler pour la vivoactive3
monkeyc -f monkey.jungle -o bin/Muscu.prg -y /chemin/developer_key.der -d vivoactive3

# 2. Démarrer le simulateur (dans un terminal séparé)
connectiq            # ou: simulator

# 3. Charger le .prg dans le simulateur
monkeydo bin/Muscu.prg vivoactive3
```

Sous **VS Code** : `F5` (Run) → sélectionner *vivoactive3* → build + simulateur
automatiques. **File ▸ Edit Application.Properties** pour changer les settings à chaud.

### Vérifier le flux (mock)
- `useMock = true` → séance « Push A » (repos courts 10–15 s pour tester vite).
- Taper le gros bouton **SÉRIE TERMINÉE** → le repos démarre seul → à 0 : vibration
  (icône de vibration dans le sim) + passage auto à la série suivante.
- Bouton physique (touche du sim) pendant le repos → **PAUSE / reprise**.
- Tap **PASSER** → skip immédiat.
- Dernière série → écran **SÉANCE TERMINÉE** : FIT sauvegardé + POST (tracé en console
  en mode mock : `MOCK POST /api/sessions : {...}`).

Console de debug : `System.println(...)` s'affiche dans l'onglet de sortie du sim.

---

## Sideload sur une vraie Vivoactive 3

1. Builder en mode *release* :
   `monkeyc -f monkey.jungle -o bin/Muscu.prg -y developer_key.der -r -d vivoactive3`
2. Brancher la montre en USB (mode stockage).
3. Copier `bin/Muscu.prg` dans le dossier **`GARMIN/APPS/`** de la montre.
4. Éjecter, l'app apparaît dans la liste des applications.

(La distribution finale passe par le **Connect IQ Store**.)

---

## Architecture (`source/`)

| Fichier                  | Rôle                                                        |
|--------------------------|-------------------------------------------------------------|
| `MuscuApp.mc`            | AppBase, état partagé, navigation (`switchToView`)          |
| `WorkoutModel.mc`       | Modèle `WorkoutModel/ExerciseDef/SetTarget` + parsing JSON  |
| `MockData.mc`           | Mock local conforme au contrat GET                          |
| `WorkoutRepository.mc`  | GET workout / POST session (`makeWebRequest`) + bascule mock|
| `SessionController.mc`  | Curseur exo/série, journal des résultats, body POST         |
| `SessionRecorder.mc`    | Enregistrement FIT (`ActivityRecording`, strength)          |
| `Util.mc`               | ISO 8601, format `mm:ss`                                     |
| `LoadingView.mc`        | Écran chargement / erreur                                    |
| `ExerciseView.mc`       | Écran exercice + gros bouton tactile + `Layout`             |
| `RestView.mc`           | Repos : compte à rebours auto, vibration, pause/skip        |
| `SummaryView.mc`        | Fin : état FIT + état POST                                   |

Navigation à **une seule vue active** (`switchToView` partout) : pas d'empilement,
le bouton retour quitte proprement l'app.

---

## Spike ergonomique : 1 bouton + tactile (à valider tôt dans le sim)

La VA3 n'a **pas** de bouton back/lap. Choix retenus, **à confirmer sur simulateur** :

- **Action principale = tactile** (gros bouton « SÉRIE TERMINÉE »), pas le bouton
  physique → évite les validations accidentelles et reste lisible en effort.
- **Bouton physique réservé au repos** (pause/reprise) : moment où on n'a pas forcément
  envie de viser l'écran, doigts moites/gants.
- **Skip du repos = tactile** (« PASSER ») pour ne pas surcharger le bouton unique.
- Sur l'écran exercice, le bouton physique **quitte l'app** (comportement back natif
  VA3). ⚠️ **Point à valider** : risque de sortie involontaire en pleine séance —
  si confirmé, envisager une confirmation « quitter la séance ? ».
- `onKey` gère `KEY_ENTER/KEY_START/KEY_ESC` car le mapping du bouton unique VA3 en
  contexte activité **doit être vérifié dans le simulateur** (d'où le spike).

> **À remonter après test sim** : mapping réel du bouton physique VA3, confort du repos
> auto, taille/zone du bouton tactile sur écran rond, et le risque de sortie involontaire.

**Correction appliquée suite à revue** : le bouton latéral VA3 remonte en réalité un
événement **back** (`KEY_ESC` / `onBack`), jamais `ENTER`/`START`. `ExerciseDelegate` et
`RestDelegate` étendent désormais `WatchUi.BehaviorDelegate` et surchargent `onBack()` :
sur l'écran exercice il valide la série (comme le gros bouton tactile), sur l'écran repos
il bascule pause/reprise. Sans ce fix, le bouton physique fermait l'app en pleine séance
(comportement `onBack` par défaut = sortie).

## Résilience réseau

- **Parsing défensif** (`WorkoutModel.fromJson`) : toute structure JSON inattendue (champ
  manquant, mauvais type, réponse 200 malformée) est ignorée entrée par entrée plutôt que
  de crasher l'app ; le tout est en plus enveloppé dans un `try/catch`.
- **File d'attente offline** (`WorkoutRepository`) : si `POST /api/sessions` échoue (montre
  hors réseau juste après la séance, cas fréquent), le body est conservé dans
  `Application.Storage` (persiste entre lancements) et renvoyé automatiquement au
  prochain démarrage de l'app (`flushPendingSessions`, appelé avant le chargement du
  workout suivant). Aucune perte de résultats réels en cas de coupure réseau.
