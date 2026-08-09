using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Timer;
using Toybox.Attention;
using Toybox.System;
using Toybox.Lang;

// Retour haptique/sonore de fin de repos (avec garde-fous simulateur/device).
module Feedback {
    function restOver() as Void {
        if (Attention has :vibrate) {
            Attention.vibrate([
                new Attention.VibeProfile(75, 300),
                new Attention.VibeProfile(0, 120),
                new Attention.VibeProfile(75, 300)
            ]);
        }
        if (Attention has :playTone) {
            Attention.playTone(Attention.TONE_LAP);
        }
    }
}

// Ecran de repos : compte a rebours auto, puis passage automatique a la serie suivante.
class RestView extends WatchUi.View {
    private var _c as SessionController;
    private var _total as Lang.Number;
    private var _remaining as Lang.Number;
    private var _paused as Lang.Boolean;
    private var _timer as Timer.Timer or Null;

    function initialize(controller as SessionController, durationSec as Lang.Number) {
        View.initialize();
        _c = controller;
        _total = durationSec;
        _remaining = durationSec;
        _paused = false;
        _timer = null;
    }

    function onShow() as Void {
        if (_timer == null) {
            _timer = new Timer.Timer();
            _timer.start(method(:onTick), 1000, true);
        }
    }

    function onHide() as Void {
        stopTimer();
    }

    private function stopTimer() as Void {
        if (_timer != null) {
            _timer.stop();
            _timer = null;
        }
    }

    function onTick() as Void {
        if (_paused) { return; }
        _remaining -= 1;
        if (_remaining <= 0) {
            _remaining = 0;
            finishRest(true);
            return;
        }
        WatchUi.requestUpdate();
    }

    // Fin du repos. auto=true => vibration + bip ; puis serie suivante.
    function finishRest(auto as Lang.Boolean) as Void {
        stopTimer();
        if (auto) { Feedback.restOver(); }
        _c.advance();
        app().showExercise(WatchUi.SLIDE_LEFT);
    }

    function togglePause() as Void {
        _paused = !_paused;
        WatchUi.requestUpdate();
    }

    function skip() as Void {
        finishRest(false);
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        // Titre.
        dc.setColor(_paused ? Graphics.COLOR_ORANGE : Graphics.COLOR_LT_GRAY,
                    Graphics.COLOR_TRANSPARENT);
        var title = _paused ? WatchUi.loadResource(Rez.Strings.paused)
                            : WatchUi.loadResource(Rez.Strings.rest);
        dc.drawText(w / 2, h * 0.16, Graphics.FONT_SMALL, title,
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Compte a rebours (gros).
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.40, Graphics.FONT_NUMBER_THAI_HOT,
                    Util.fmtClock(_remaining),
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Apercu de la serie suivante.
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, h * 0.60, Graphics.FONT_TINY, nextLabel(),
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Bouton tactile "PASSER".
        var r = Layout.bigButton(w, h);
        dc.setColor(Graphics.COLOR_DK_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.fillRoundedRectangle(r[0] + 6, r[1] + 4, r[2] - 12, r[3] - 12, 10);
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, r[1] + r[3] / 2, Graphics.FONT_SMALL, "PASSER",
                    Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    // Ce qui vient apres ce repos (sans muter le controller).
    private function nextLabel() as Lang.String {
        var c = _c;
        var ex = c.currentExercise();
        if (c.setNumber() < c.setCount()) {
            return "-> " + ex.name + "  serie " + (c.setNumber() + 1).format("%d");
        }
        // Exercice suivant.
        var nextEx = c.exIdx + 1;
        if (nextEx < c.model.exercises.size()) {
            return "-> " + c.model.exercises[nextEx].name;
        }
        return "-> fin";
    }
}

// Entrees de l'ecran repos : bouton physique = pause/reprise, tap "PASSER" = skip.
//
// IMPORTANT (VA3) : sur le simulateur, surcharger onBack() suffit a intercepter
// le bouton lateral. Sur le VRAI MATERIEL (confirme en test terrain), onBack()
// n'est pas toujours consomme par le framework et l'appui ressort quand meme
// vers l'app systeme -> on surcharge AUSSI onKey() pour KEY_ESC/ENTER/START en
// plus de onBack(), meme logique de double filet que ExerciseDelegate.
class RestDelegate extends WatchUi.BehaviorDelegate {
    private var _view as RestView;

    function initialize(view as RestView) {
        BehaviorDelegate.initialize();
        _view = view;
    }

    function onBack() as Lang.Boolean {
        _view.togglePause();
        return true;
    }

    // Filet de secours si le framework ne route pas le bouton via onBack().
    function onKey(evt as WatchUi.KeyEvent) as Lang.Boolean {
        var k = evt.getKey();
        if (k == WatchUi.KEY_ESC || k == WatchUi.KEY_ENTER || k == WatchUi.KEY_START) {
            _view.togglePause();
            return true;
        }
        return false;
    }

    function onTap(evt as WatchUi.ClickEvent) as Lang.Boolean {
        var ds = System.getDeviceSettings();
        if (Layout.inBigButton(evt.getCoordinates(), ds.screenWidth, ds.screenHeight)) {
            _view.skip();
            return true;
        }
        // Tap ailleurs = pause/reprise (surface tactile large, pratique en seance).
        _view.togglePause();
        return true;
    }
}
