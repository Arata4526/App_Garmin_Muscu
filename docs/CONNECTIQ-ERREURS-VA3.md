# Connect IQ — Erreurs & compatibilité Vivoactive 3

Doc de référence sur les erreurs rencontrées en développant l'app montre (`watch/`)
pour la **Garmin Vivoactive 3**, leur cause racine, et les correctifs.

---

## 1. L'écran « IQ! » (point d'exclamation orange)

Quand la montre affiche le logo **IQ!** au lancement d'une app Connect IQ, cela
signifie que **l'app a échoué / planté** (elle n'a pas pu démarrer ou a levé une
exception non gérée). Causes typiques :

- **Crash runtime** : une exception non catchée (symbole/API indisponible, ressource
  invalide) → c'est notre cas.
- **API incompatible** : usage d'un symbole absent du niveau d'API du device.
- **Permission manquante** dans le `manifest.xml` (ex. `Fit` pour l'enregistrement d'activité).
- **Installation corrompue** ou build **debug** poussé sur du matériel réel (utiliser un build **release `-r`**).

Point clé : **le simulateur du device cible reproduit fidèlement ces crashs**. Si
l'app plante dans le simulateur *vivoactive3*, elle plantera aussi sur la vraie montre.
Un code qui tourne sur *vivoactive5* mais pas *vivoactive3* = **problème de niveau d'API**,
pas un bug du simulateur.

---

## 2. Erreurs rencontrées sur ce projet

### a. `Could not find symbol` — `Activity.SPORT_GENERIC` / `Activity.SPORT_TRAINING`

- **Où** : `ActivityRecording.createSession(...)` (enregistrement FIT de la séance).
- **Cause racine** : les constantes **`Activity.SPORT_*`** sont documentées comme
  ajoutées en **API 3.2.0+**. La Vivoactive 3 est un device plus ancien : selon le
  profil/SDK, le symbole `Activity.SPORT_*` n'est **pas résolu** → *Could not find symbol*.
- **Correctif** : utiliser les constantes du module **`ActivityRecording.SPORT_*`**
  (`SPORT_TRAINING`, `SPORT_GENERIC`, …), disponibles depuis **API 1.0.0** donc
  présentes sur la VA3 (elles sont `deprecated` mais fonctionnelles), avec une
  **garde défensive** :

  ```
  var sport = (ActivityRecording has :SPORT_TRAINING)
      ? ActivityRecording.SPORT_TRAINING
      : ActivityRecording.SPORT_GENERIC;
  if (Toybox has :ActivityRecording) {
      session = ActivityRecording.createSession({
          :name => "Muscu",
          :sport => sport
      });
  }
  ```

  Si le device n'expose pas l'enregistrement, **désactiver proprement le FIT** plutôt
  que de laisser planter l'app.

### b. `Invalid Font Specified` — `FONT_MEDIUM` / `FONT_SMALL` / `FONT_SYSTEM_SMALL`

- **Où** : `dc.drawText(...)`.
- **Cause racine** : le device charge une **table de polices** spécifique. Une police
  passée à `drawText` mais absente de la table du profil VA3 lève *Invalid Font Specified*.
- **Correctif** : n'utiliser que les polices **réellement supportées par la VA3**
  (vérifier `bin/devices/vivoactive3` / `simulator.json` du SDK), typiquement
  `Graphics.FONT_TINY / FONT_SMALL / FONT_MEDIUM / FONT_LARGE / FONT_NUMBER_*`.
  Tester chaque `drawText` dans le simulateur VA3 et garder un fallback.

---

## 3. Pourquoi ça marchait sur vivoactive5 mais pas Vivoactive 3

La **vivoactive5** embarque un niveau d'API Connect IQ **récent** : `Activity.SPORT_*`
et les polices y sont résolus sans problème. La **Vivoactive 3** (2017, CIQ 2.x→3.x)
a un niveau d'API et une table de polices plus **limités**. D'où l'importance de :

1. **Cibler et tester le device réel** (`-d vivoactive3` + simulateur VA3 + vraie montre).
2. Utiliser des **API disponibles au niveau du device** (préférer `ActivityRecording.SPORT_*`).
3. Ajouter des **gardes** `X has :symbol` / `Toybox has :Module` pour dégrader proprement.

> Note : l'optimiseur Monkey C fait du *constant folding* (remplace les enums par leur
> valeur à la compilation), ce qui masque parfois l'indisponibilité réelle d'un symbole
> jusqu'au **runtime sur le device** — ne pas se fier au seul succès de compilation.

---

## 4. Bonnes pratiques VA3 (check-list)

- [ ] `manifest.xml` : `minApiLevel` **≤** API max de la VA3, `product id="vivoactive3"` présent.
- [ ] Permissions déclarées (`Fit`, `Communications`, …) sinon → `IQ!`.
- [ ] Constantes de sport via `ActivityRecording.SPORT_*` + garde `has`.
- [ ] Polices restreintes à celles supportées par la VA3.
- [ ] Build **release** pour le matériel réel : `monkeyc -f monkey.jungle -d vivoactive3 -o bin/muscu.prg -r -y <clé>.der`.
- [ ] Valider **dans le simulateur VA3** que l'app atteint l'écran exercice + déroule le flux avant sideload.
- [ ] VA3 = **1 bouton + tactile** : consommer le `onBack` (`BehaviorDelegate`) pour ne pas quitter l'app en séance/repos.

---

## 5. Références officielles Connect IQ

- Device reference vívoactive 3 : https://developer.garmin.com/connect-iq/device-reference/vivoactive3/
- Module `Toybox.ActivityRecording` : https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityRecording.html
- Module `Toybox.Activity` : https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity.html
- Core Topics — Activity Recording : https://developer.garmin.com/connect-iq/core-topics/activity-recording/
- Types d'apps Connect IQ : https://developer.garmin.com/connect-iq/connect-iq-basics/app-types/
- « IQ! » sur l'appareil (support) : https://support.garmin.com/en-US/?faq=nfeK0ZgFWu5WGHBTcKCNS9
- Forum — niveaux d'API `Activity.SPORT_*` / `SUB_SPORT_*` : https://forums.garmin.com/developer/connect-iq/i/bug-reports/fix-documentation-of-min-api-level-in-activity-sport_-and-sub_sport_
