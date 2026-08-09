using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Lang;

// Ecran de chargement / message d'erreur.
class LoadingView extends WatchUi.View {
    private var _msg as Lang.String or Null;

    function initialize(msg as Lang.String or Null) {
        View.initialize();
        _msg = msg;
    }

    function onShow() as Void {
        // Ne lance le chargement qu'une fois, une fois la vue initiale a l'ecran.
        app().startLoadingIfNeeded();
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        var text = (_msg == null) ? WatchUi.loadResource(Rez.Strings.loading) : _msg;
        dc.drawText(dc.getWidth() / 2, dc.getHeight() / 2,
                    Graphics.FONT_MEDIUM, text,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
}

// Delegate minimal : le bouton physique / retour ferme l'app.
class SimpleExitDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onBack() as Lang.Boolean {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        return true;
    }
}
