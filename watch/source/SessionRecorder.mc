using Toybox.ActivityRecording;
using Toybox.Activity;
using Toybox.Lang;
using Toybox.System;

// Enregistrement de l'activite au format FIT (type musculation / strength).
// L'activite apparait dans Garmin Connect apres synchro de la montre.
class SessionRecorder {
    private var _session as ActivityRecording.Session or Null;

    function initialize() {
        _session = null;
    }

    private function available() as Lang.Boolean {
        return (Toybox has :ActivityRecording);
    }

    function start(name as Lang.String) as Void {
        if (!available() || _session != null) { return; }
        // NOTE: Activity.SPORT_TRAINING est documente et compile, mais son
        // symbole n'est pas resolu par le runtime simulateur vivoactive3
        // (decalage doc API vs profil figé du device). SPORT_GENERIC +
        // SUB_SPORT_STRENGTH_TRAINING est la combinaison qui fonctionne et
        // reste classee "Musculation" dans Garmin Connect via le sous-sport.
        // NOTE (voir README > Blocage simulateur vivoactive3) : ces enums
        // Activity.Sport/SubSport sont documentees, compilent, et fonctionnent
        // sur d'autres devices (teste OK sur vivoactive5) mais font planter le
        // SIMULATEUR sur le profil device vivoactive3 actuellement servi par
        // Garmin (toutes SDK versions disponibles testees). A garder tel quel :
        // c'est le comportement correct pour le hardware reel / Garmin Connect.
        _session = ActivityRecording.createSession({
            :name => name,
            :sport => Activity.SPORT_GENERIC,
            :subSport => Activity.SUB_SPORT_STRENGTH_TRAINING
        });
        _session.start();
        System.println("FIT recording start");
    }

    // Termine et sauvegarde le FIT (=> visible dans Garmin Connect).
    function finishAndSave() as Void {
        if (_session == null) { return; }
        if (_session.isRecording()) { _session.stop(); }
        _session.save();
        _session = null;
        System.println("FIT recording saved");
    }

    // Abandonne l'enregistrement sans sauvegarder.
    function discard() as Void {
        if (_session == null) { return; }
        if (_session.isRecording()) { _session.stop(); }
        _session.discard();
        _session = null;
    }
}
