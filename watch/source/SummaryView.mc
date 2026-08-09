using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Lang;

// Ecran de fin : confirme l'enregistrement FIT et l'etat du POST /api/sessions.
class SummaryView extends WatchUi.View {
    private var _posted as Lang.Boolean;
    private var _postOk as Lang.Boolean;
    private var _code as Lang.Number;

    function initialize() {
        View.initialize();
        _posted = false;
        _postOk = false;
        _code = 0;
    }

    // Callback de WorkoutRepository.postSession.
    function onPosted(success as Lang.Boolean, code as Lang.Number) as Void {
        _posted = true;
        _postOk = success;
        _code = code;
        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.24, Graphics.FONT_MEDIUM,
                    WatchUi.loadResource(Rez.Strings.workoutDone),
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.50, Graphics.FONT_TINY, "Activite FIT enregistree",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        var syncMsg;
        var syncColor;
        if (!_posted) {
            syncMsg = WatchUi.loadResource(Rez.Strings.saving);
            syncColor = Graphics.COLOR_LT_GRAY;
        } else if (_postOk) {
            syncMsg = "Resultats envoyes";
            syncColor = Graphics.COLOR_GREEN;
        } else {
            syncMsg = "Envoi echoue (" + _code.format("%d") + ")";
            syncColor = Graphics.COLOR_RED;
        }
        dc.setColor(syncColor, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.64, Graphics.FONT_TINY, syncMsg,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}
