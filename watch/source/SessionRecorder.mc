using Toybox.ActivityRecording;
using Toybox.Lang;
using Toybox.System;

// Enregistrement de l'activite au format FIT (type musculation / strength).
// L'activite apparait dans Garmin Connect apres synchro de la montre.
//
// IMPORTANT (VA3 - confirme sur matériel reel) : Toybox.Activity.SPORT_* /
// SUB_SPORT_* (module recent) n'est PAS resolu au runtime sur vivoactive3
// -> "Could not find symbol" -> crash immediat au lancement (ecran "IQ!").
// Toybox.ActivityRecording possede son PROPRE enum Sport/SubSport (deprecie
// depuis "System 8" mais present depuis l'API 1.0.0) : c'est celui-ci que la
// VA3 reconnait reellement. On l'utilise, avec garde defensive (`has`) et
// repli sans sport/subSport si meme ca devait manquer, plutot que de risquer
// un crash au demarrage pour un champ de classification secondaire.
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

        var options = { :name => name };
        if ((ActivityRecording has :SPORT_TRAINING) && (ActivityRecording has :SUB_SPORT_STRENGTH_TRAINING)) {
            options.put(:sport, ActivityRecording.SPORT_TRAINING);
            options.put(:subSport, ActivityRecording.SUB_SPORT_STRENGTH_TRAINING);
        }

        _session = ActivityRecording.createSession(options);
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
