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

## ⚠️ Incompatibilités d'API réelles avec vivoactive3

Le premier test sur la **vraie montre** d'Alexis a planté au lancement (écran "IQ!"). Ce
crash reproduisait fidèlement dans le simulateur vivoactive3 : ce ne sont **pas** des bugs
de profil de simulation, mais de **vraies incompatibilités d'API** avec le niveau
supporté par la VA3, à corriger dans le code (ce qui a été fait pour la première, cf.
ci-dessous).

### 1. `ActivityRecording.createSession` — CORRIGÉ

`Toybox.Activity.SPORT_GENERIC` / `SPORT_TRAINING` (module récent) ne sont **pas résolus
au runtime sur vivoactive3** (→ *"Could not find symbol"*, crash immédiat). Cause : la VA3
ne reconnaît que l'énumération **historique**, propre au module `Toybox.ActivityRecording`
lui-même (`ActivityRecording.SPORT_*` / `SUB_SPORT_*`, dépréciée depuis "System 8" mais
présente depuis l'API 1.0.0 — voir doc `Toybox.ActivityRecording`, section "Constant
Summary Sport1/Sport2"). C'est un enum **différent** de `Activity.Sport` (même valeurs
numériques pour certaines entrées comme `SPORT_GENERIC=0`, mais pas le même symbole/type).

**Fix appliqué** (`SessionRecorder.mc`) : utilise `ActivityRecording.SPORT_TRAINING` /
`ActivityRecording.SUB_SPORT_STRENGTH_TRAINING`, avec garde défensive
(`ActivityRecording has :SPORT_TRAINING`) et repli sans `:sport`/`:subSport` si même cette
énumération legacy venait à manquer sur un autre device — pour ne jamais crasher au
démarrage pour un simple champ de classification.

Cette erreur survient **avant** le premier rendu d'écran dans le flux de l'app (elle est
déclenchée par `onWorkoutLoaded` → `recorder.start()`, avant `showExercise()`) : c'est très
probablement la cause **unique** du crash "IQ!" observé sur la vraie montre, puisque
l'exécution ne pouvait pas aller plus loin.

### 2. `dc.drawText(...)` — NON RÉSOLU, à valider sur le nouveau build hardware

Investigation approfondie (simulateur, **confirmé fiable** — reproduit le crash matériel) :
`dc.drawText(...)` avec **n'importe quelle** police (`FONT_MEDIUM`, `FONT_SMALL`,
`FONT_SYSTEM_SMALL`, testées) crashe systématiquement sur vivoactive3 avec
*"Invalid Font Specified" / "Failed invoking <symbol>"* — alors que `dc.fillCircle(...)`
(sans police) fonctionne normalement. Reproduit :
- Sur les 2 seules versions de SDK actuellement servies par Garmin (9.2.0 et 8.4.1).
- Dans un **projet minimal isolé** d'une seule vue (`dc.drawText` + une police, rien
  d'autre) — donc pas lié à la complexité de notre app.
- Avec un entier brut castés en `Graphics.FontType` à la place de la constante nommée —
  même résultat, donc pas un problème de résolution du *symbole nommé* spécifiquement.
- Indépendant de `minApiLevel` (testé 1.2.0 et 3.0.0).

Cause probable : dans ce SDK, `Graphics.FontType` est un typedef complexe
(`WatchUi.FontResource or Graphics.FontDefinition or Graphics.FontReference or
Graphics.VectorFont`, **pas** un simple entier) — le bytecode compilé pour `drawText`
semble reposer sur un mécanisme de résolution de police que le **profil de simulation**
VA3 ne reconnaît pas.

**CONFIRMÉ SUR MATÉRIEL RÉEL (build 23e59ba) : ce bug #2 n'affecte PAS la vraie montre.**
L'app démarre et déroule le flux de bout en bout sur la Vivoactive 3 physique d'Alexis
(chargement, tactile, navigation). C'était bien un artefact du simulateur uniquement — le
crash "IQ!" initial était entièrement causé par le bug #1 (`ActivityRecording`), qui
intervenait plus tôt dans le flux et empêchait d'atteindre le premier `drawText`. Pas de
contournement nécessaire, aucune action de suivi sur ce point.

### 3. Bouton physique qui sort de l'app malgré `onBack()` — EN COURS

Sur le simulateur, surcharger `onBack()` (BehaviorDelegate) suffit à intercepter le bouton
latéral. **Sur le vrai matériel (confirmé en test terrain), ce n'est pas suffisant** :
l'appui sur le bouton fait quand même sortir de l'app vers l'écran principal de la montre,
alors qu'`onBack()` est bien surchargé et retourne `true`.

**Fix appliqué** (`ExerciseDelegate`/`RestDelegate`) : double filet — en plus de `onBack()`,
surcharge de `onKey(evt)` interceptant explicitement `KEY_ESC`/`KEY_ENTER`/`KEY_START` (les
trois événements possibles selon la façon dont le firmware VA3 remonte l'appui), chacun
retournant `true` pour consommer l'événement. Le simulateur ne reflétant pas fidèlement le
comportement du bouton physique réel (déjà vu pour les bugs #1 et #2 ci-dessus), ce
correctif couvre les deux mécanismes plutôt que de parier sur un seul — **à valider sur la
montre physique**, le simulateur ne permettant pas de le confirmer.

⚠️ **Limite connue, pas un bug** : un **appui long** sur le bouton latéral déclenche le
menu système de la montre (settings/power), un comportement **géré par le firmware avant
même que l'app ne reçoive l'événement** — aucun delegate ne peut l'intercepter. Le
correctif ci-dessus cible uniquement l'**appui court**, qui est le seul évènement
transmis à l'application.

`bin/muscu.prg` est rebuildé (mode *release*, avec les fix #1 et #3, `useMock = true` par
défaut dans `resources/properties/properties.xml`) : le test sur la montre déroule une
séance complète **sans dépendre de l'API ni du téléphone** (workout mock "Push A", repos
courts).

---

## Sideload sur une vraie Vivoactive 3 (validation matériel réel)

### 1. Builder en mode release

Depuis `watch/`, PATH configuré (Java + SDK bin) :
```bash
monkeyc -f monkey.jungle -d vivoactive3 -o bin/muscu.prg -y keys/developer_key.der -r
```
(`-r` = mode release, requis pour tourner sur une vraie montre — le mode debug par défaut
de `monkeyc` ne fonctionne qu'avec le simulateur/débogueur attaché.)

### 2. Brancher la montre en USB

Appairer le câble USB fourni avec la VA3. La montre affiche "USB connecté" et se monte
comme un **volume de stockage de masse**, pas besoin de driver particulier sous Linux.

Sous Linux (udisks/gvfs, environnement de bureau standard), le point de montage typique
est :
```
/media/$USER/GARMIN/
```
ou, selon l'environnement (GNOME via gvfs) :
```
/run/user/$(id -u)/gvfs/mtp:host=.../  (si montée en MTP plutôt qu'en stockage de masse)
```
Si aucun des deux n'apparaît automatiquement, lister les volumes montés :
```bash
lsblk -f          # repérer le volume "GARMIN" (souvent vfat/FAT32)
ls /media/$USER/  # ou ~/media selon la distro
```

### 3. Copier le `.prg`

Le dossier applications sur la montre est **`GARMIN/APPS/`** à la racine du volume
(certains firmwares utilisent `GARMIN/Apps/`, la casse ne compte généralement pas sous
FAT32) :
```bash
cp bin/muscu.prg /media/$USER/GARMIN/GARMIN/APPS/
# ou, si le point de montage n'a qu'un niveau GARMIN/ :
cp bin/muscu.prg /media/$USER/GARMIN/APPS/
```
Vérifier le contenu du volume (`ls /media/$USER/GARMIN/`) si le chemin exact diffère —
la structure interne varie légèrement selon le firmware.

### 4. Éjecter proprement

```bash
sync
udisksctl unmount -b /dev/sdXN   # ou clic droit "Éjecter" dans le gestionnaire de fichiers
```
Ne jamais débrancher sans éjecter : risque de corruption du volume.

### 5. Lancer l'app sur la montre

La montre redémarre son processus applicatif après éjection. L'app **Muscu** apparaît
dans la liste des applications (bouton START/UP-DOWN pour naviguer, appui pour lancer,
selon le menu habituel de la VA3). Elle démarre directement sur l'écran de chargement du
workout mock.

**À valider pendant ce test (spike ergonomique)** :
- Le bouton physique latéral ne quitte plus l'app ni pendant une série ni pendant le
  repos (fix `onBack()` — cf. section précédente).
- Le gros bouton tactile "SÉRIE TERMINÉE" déclenche bien le repos automatique
  (vibration + enchaînement à la série/exo suivant).
- Le tap "PASSER" pendant le repos fonctionne, et le bouton physique bascule pause/reprise.
- En fin de séance : l'activité doit apparaître dans **l'historique d'activités** de la
  montre (type Musculation), et se synchroniser vers Garmin Connect au prochain contact
  Bluetooth avec le téléphone.

### Test en conditions réelles (API, hors mock)

Pour ce test, `makeWebRequest` (`Toybox.Communications`) passe **exclusivement par le
téléphone appairé** : la Vivoactive 3 n'a pas de connectivité IP directe, tout le trafic
réseau de l'app transite en Bluetooth via **l'app Garmin Connect Mobile sur l'iPhone**, qui
fait office de relais internet. Sans iPhone à portée avec Garmin Connect actif, `useMock =
false` échouera systématiquement (pas de réseau).

Autre contrainte : l'iOS de l'iPhone (WebKit/ATS) et le pipeline Garmin Connect exigent en
pratique une URL **HTTPS avec certificat valide** pour `apiBaseUrl` — un `http://` brut
(type `http://<ip-locale-du-pi>`) ne fonctionnera pas de façon fiable en conditions réelles.
Il faudra donc exposer l'API du Raspberry Pi derrière un **reverse proxy HTTPS public**
(certificat valide, ex. Let's Encrypt) avant de basculer `useMock = false` /
`apiBaseUrl` sur l'URL réelle dans les App Settings.

(La distribution finale, hors phase de dev, passe par le **Connect IQ Store**.)

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

## Spike ergonomique : 1 bouton + tactile

La VA3 n'a **pas** de bouton back/lap, un seul bouton latéral. Choix retenus :

- **Action principale = tactile** (gros bouton « SÉRIE TERMINÉE »), pas le bouton
  physique → évite les validations accidentelles et reste lisible en effort.
- **Bouton physique = validation de la série** (écran exercice) et **pause/reprise du
  repos** (écran repos) : piloter la séance au bouton sans avoir à regarder/viser
  l'écran (doigts moites, gants, effort).
- **Skip du repos = tactile** (« PASSER ») pour ne pas surcharger le bouton unique.

**État validé sur matériel réel** (build 23e59ba, cf. section "Incompatibilités d'API"
ci-dessus point #3) :`ExerciseDelegate`/`RestDelegate` étendent `WatchUi.BehaviorDelegate`
et surchargent **à la fois** `onBack()` et `onKey()` (`KEY_ESC`/`KEY_ENTER`/`KEY_START`) —
double filet nécessaire car le simulateur et le matériel réel ne remontent pas
l'appui du bouton de la même façon (onBack seul suffit en simulateur, pas confirmé sur la
vraie montre). Un appui **long** déclenche le menu système (non interceptable par l'app,
géré au niveau firmware) — limite acceptée, pas un bug.

## Résilience réseau

- **Parsing défensif** (`WorkoutModel.fromJson`) : toute structure JSON inattendue (champ
  manquant, mauvais type, réponse 200 malformée) est ignorée entrée par entrée plutôt que
  de crasher l'app ; le tout est en plus enveloppé dans un `try/catch`.
- **File d'attente offline** (`WorkoutRepository`) : si `POST /api/sessions` échoue (montre
  hors réseau juste après la séance, cas fréquent), le body est conservé dans
  `Application.Storage` (persiste entre lancements) et renvoyé automatiquement au
  prochain démarrage de l'app (`flushPendingSessions`, appelé avant le chargement du
  workout suivant). Aucune perte de résultats réels en cas de coupure réseau.
