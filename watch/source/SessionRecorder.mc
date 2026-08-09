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
        _session = ActivityRecording.createSession({
            :name => name,
            :sport => Activity.SPORT_TRAINING,
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
