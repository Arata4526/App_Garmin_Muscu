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

## Installation du SDK (headless, sans le GUI officiel)

Le **SDK Manager officiel** (GUI Electron/WebKit) plante sur certaines distributions
Linux récentes (Ubuntu 24.10+/25.10) : `libwebkit2gtk-4.0.so.37` n'existe plus dans les
dépôts, et même en réparant les libs manquantes une par une le process finit par crasher
(`WebKitNetworkProcess` introuvable, conflit glib). **Solution qui fonctionne** : l'outil
tiers open-source [`connect-iq-sdk-manager-cli`](https://github.com/lindell/connect-iq-sdk-manager-cli)
(Go, zéro dépendance GTK/WebKit).

```bash
# 1. Installer le CLI (binaire release, ex. Linux x86_64) dans un dossier utilisateur
curl -sL -o ciqcli.tar.gz \
  "https://github.com/lindell/connect-iq-sdk-manager-cli/releases/download/v0.8.4/connect-iq-sdk-manager-cli_0.8.4_Linux_x86_64.tar.gz"
mkdir -p ~/tools/bin && tar xzf ciqcli.tar.gz -C ~/tools/bin
chmod +x ~/tools/bin/connect-iq-sdk-manager
export PATH="$HOME/tools/bin:$PATH"

# 2. Accepter la licence CIQ (une fois)
connect-iq-sdk-manager agreement view      # affiche le hash courant
connect-iq-sdk-manager agreement accept --agreement-hash=<HASH_AFFICHE>

# 3. Login (flow OAuth via VOTRE navigateur habituel, pas de mot de passe en CLI)
connect-iq-sdk-manager login
# -> affiche "Please login at: http://localhost:PORT/login"
#    Ouvrir ce lien dans Firefox/Chrome, se connecter avec le compte Garmin.

# 4. Télécharger le SDK (le plus récent servi par Garmin) et le device vivoactive3
connect-iq-sdk-manager sdk set ">=0.0.0"
connect-iq-sdk-manager device download -d vivoactive3
export PATH="$(connect-iq-sdk-manager sdk current-path --bin):$PATH"

# 5. Clé développeur (une fois, jamais commitée — voir .gitignore)
mkdir -p keys
openssl genrsa -out keys/developer_key.pem 4096
openssl pkcs8 -topk8 -inform PEM -outform DER -nocrypt \
  -in keys/developer_key.pem -out keys/developer_key.der
```

⚠️ Java 17+ est requis par le SDK (`monkeyc` est un outil Java). Si absent :
installer un JDK portable (ex. Temurin, sans sudo) et l'ajouter au `PATH`
(`JAVA_HOME=/chemin/jdk-17.../ ; PATH="$JAVA_HOME/bin:$PATH"`).

⚠️ Le **simulateur** (`bin/simulator`) utilise aussi WebKit et peut buter sur la même
lib manquante (`libwebkit2gtk-4.0.so.37`). Contournement sans sudo qui fonctionne : si
un runtime snap GNOME 42 (ou équivalent Ubuntu ~22.04) est présent sur la machine, pointer
`LD_LIBRARY_PATH` dessus avant de lancer le simulateur :
```bash
export LD_LIBRARY_PATH="/snap/gnome-42-2204/<rev>/usr/lib/x86_64-linux-gnu"
```
(Sinon, extraire manuellement `libwebkit2gtk-4.0-37` + `libjavascriptcoregtk-4.0-18` +
`libicu70` + `libunistring.so.2` depuis des paquets `.deb` Ubuntu 22.04 avec `dpkg-deb -x`,
sans les installer.)

---

## Build & test dans le simulateur

Depuis `watch/`, une fois le PATH configuré (Java + SDK bin, cf. ci-dessus) :

```bash
# 1. Compiler pour la vivoactive3
monkeyc -f monkey.jungle -d vivoactive3 -o bin/muscu.prg -y keys/developer_key.der

# 2. Démarrer le simulateur (processus séparé, garder ouvert)
simulator &

# 3. Charger le .prg dans le simulateur déjà lancé
monkeydo bin/muscu.prg vivoactive3
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

## ⚠️ Blocage connu : simulateur vivoactive3 instable (SDK 8.4.1 et 9.2.0)

Le build **compile et link correctement** pour `vivoactive3` (`BUILD SUCCESSFUL`), mais
le **simulateur crashe au runtime** dès l'écran de chargement, sur des symboles pourtant
documentés et anciens (`Graphics.FONT_MEDIUM`/`FONT_SMALL`/`FONT_SYSTEM_SMALL` → *"Invalid
Font Specified"* sur `dc.drawText`, et `Activity.SPORT_GENERIC`/`SPORT_TRAINING` → *"Could
not find symbol"* sur `ActivityRecording.createSession`).

**Diagnostic effectué** (pour ne pas reproduire le travail) :
- Reproductible sur les **deux** versions de SDK actuellement servies par Garmin (9.2.0 et
  8.4.1 — ce sont les seules disponibles, les zips SDK antérieurs à 8.x ne sont plus
  hébergés, 404 confirmé).
- Le device vivoactive3 a été **re-téléchargé** (hash identique, download stable).
- **Le même code, compilé avec le même SDK, tourne sans aucune erreur sur `vivoactive5`**
  (testé en build + simulateur) : le bug n'est donc pas dans notre code Monkey C, il est
  spécifique au **profil device vivoactive3** tel que servi actuellement par Garmin.
- Hypothèse la plus probable : vivoactive3 est un device 2017 dont le profil de simulation
  n'est plus correctement régénéré/testé par Garmin contre les SDK récents (9.x/8.x) —
  possible bug côté Garmin, pas forcément présent sur le firmware d'une vraie montre.

**Pistes non testées faute de temps / accès** :
- Sideload du `.prg` sur une **vraie Vivoactive 3** physique (le firmware réel pourrait
  ne pas avoir ce bug, contrairement au profil de simulation).
- SDK Manager **officiel GUI** (si Alexis parvient à le faire tourner) pourrait servir un
  device vivoactive3 différent/plus à jour que celui du CLI tiers (peu probable vu que le
  hash de téléchargement est stable, mais non exclu).
- Forums développeurs Garmin (bug potentiellement déjà rapporté pour ce device).

`bin/muscu.prg` est buildé et prêt ; le spike ergonomique 1-bouton (onBack) est implémenté
et validé par lecture de code + fonctionnement confirmé sur vivoactive5, mais **pas encore
validé visuellement en interaction sur vivoactive3** à cause de ce blocage.

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
