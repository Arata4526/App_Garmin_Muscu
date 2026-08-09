using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.System;
using Toybox.Lang;

// Geometrie partagee du gros bouton tactile (identique au dessin et au test de tap).
module Layout {
    // Bande basse de l'ecran. Renvoie [x, y, w, h].
    function bigButton(sw as Lang.Number, sh as Lang.Number) as Lang.Array {
        var y = (sh * 0.60).toNumber();
        return [0, y, sw, sh - y];
    }

    function inBigButton(coords as Lang.Array, sw as Lang.Number, sh as Lang.Number) as Lang.Boolean {
        var r = bigButton(sw, sh);
        var x = coords[0];
        var y = coords[1];
        return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
    }
}

// Ecran principal : exercice courant, cible, et bouton "SERIE TERMINEE".
class ExerciseView extends WatchUi.View {
    private var _c as SessionController;

    function initialize(controller as SessionController) {
        View.initialize();
        _c = controller;
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        var ex = _c.currentExercise();
        var st = _c.currentSet();

        // Nom de l'exercice (haut).
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.14, Graphics.FONT_SMALL, ex.name,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Serie x/N.
        dc.setColor(Graphics.COLOR_YELLOW, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.28,
                    Graphics.FONT_NUMBER_MEDIUM,
                    _c.setNumber().format("%d") + " / " + _c.setCount().format("%d"),
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Reps x Charge (cible).
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        var line = st.reps.format("%d") + " reps  -  " + fmtWeight(st.weight);
        dc.drawText(w / 2, h * 0.44, Graphics.FONT_SMALL, line,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Gros bouton tactile.
        var r = Layout.bigButton(w, h);
        dc.setColor(Graphics.COLOR_DK_GREEN, Graphics.COLOR_TRANSPARENT);
        dc.fillRoundedRectangle(r[0] + 6, r[1], r[2] - 12, r[3] - 8, 10);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, r[1] + (r[3] - 8) / 2,
                    Graphics.FONT_MEDIUM,
                    WatchUi.loadResource(Rez.Strings.setDone),
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    private function fmtWeight(kg as Lang.Float) as Lang.String {
        if (kg <= 0.0) { return "PDC"; }   // poids de corps
        // Affiche sans decimale si entier.
        if (kg == kg.toNumber().toFloat()) {
            return kg.toNumber().format("%d") + " kg";
        }
        return kg.format("%.1f") + " kg";
    }
}

// Entrees de l'ecran exercice : tap sur le gros bouton OU bouton physique = serie terminee.
//
// IMPORTANT (VA3) : le bouton lateral remonte un evenement "back" (KEY_ESC),
// jamais ENTER/START. Un InputDelegate.onKey ne consomme PAS cet evenement :
// le comportement par defaut ferme l'app en pleine serie. Il faut donc etendre
// BehaviorDelegate et surcharger onBack() pour intercepter ce cas.
class ExerciseDelegate extends WatchUi.BehaviorDelegate {
    private var _c as SessionController;
    private var _done as Lang.Boolean;   // garde d'idempotence (evite double completeSet)

    function initialize(controller as SessionController) {
        BehaviorDelegate.initialize();
        _c = controller;
        _done = false;
    }

    function onTap(evt as WatchUi.ClickEvent) as Lang.Boolean {
        var ds = System.getDeviceSettings();
        if (Layout.inBigButton(evt.getCoordinates(), ds.screenWidth, ds.screenHeight)) {
            completeSet();
            return true;
        }
        return false;
    }

    // Bouton physique = valider la serie (au lieu de fermer l'app via le back par defaut).
    function onBack() as Lang.Boolean {
        completeSet();
        return true;
    }

    private function completeSet() as Void {
        if (_done) { return; }
        _done = true;

        var st = _c.currentSet();
        // MVP : reps/charge reels = cibles.
        _c.completeCurrentSet(st.reps, st.weight);

        if (_c.hasNext()) {
            var rest = st.rest;
            if (rest > 0) {
                app().showRest(rest);
            } else {
                _c.advance();
                app().showExercise(WatchUi.SLIDE_LEFT);
            }
        } else {
            app().finishWorkout();
        }
    }
}
