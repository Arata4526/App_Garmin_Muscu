using Toybox.Application;
using Toybox.WatchUi;
using Toybox.Lang;

// Point d'entree de l'app. Detient l'etat partage (repo, recorder, controller)
// et centralise la navigation entre ecrans (un seul ecran actif via switchToView).
class MuscuApp extends Application.AppBase {

    var repo as WorkoutRepository;
    var recorder as SessionRecorder;
    var controller as SessionController;   // null tant que le workout n'est pas charge
    private var _loadStarted as Lang.Boolean;

    function initialize() {
        AppBase.initialize();
        repo = new WorkoutRepository();
        recorder = new SessionRecorder();
        controller = null;
        _loadStarted = false;
    }

    function onStart(state as Lang.Dictionary or Null) as Void {
    }

    // Declenche depuis LoadingView.onShow : garantit que la vue initiale est
    // affichee avant un eventuel switchToView (cas du mock synchrone).
    function startLoadingIfNeeded() as Void {
        if (_loadStarted) { return; }
        _loadStarted = true;
        repo.loadWorkout(method(:onWorkoutLoaded));
    }

    function onStop(state as Lang.Dictionary or Null) as Void {
        // Securite : si l'app se ferme en cours de seance, on n'abandonne pas
        // automatiquement l'enregistrement (l'utilisateur passe normalement par le resume).
    }

    // Ecran initial : chargement.
    function getInitialView() as Lang.Array {
        var v = new LoadingView(null);
        return [v, new SimpleExitDelegate()] as Lang.Array;
    }

    // Callback du chargement du workout.
    function onWorkoutLoaded(model as WorkoutModel, err as Lang.String) as Void {
        if (model == null || err != null) {
            WatchUi.switchToView(new LoadingView(err == null ? "Erreur" : err),
                                 new SimpleExitDelegate(), WatchUi.SLIDE_IMMEDIATE);
            WatchUi.requestUpdate();
            return;
        }
        controller = new SessionController(model);
        recorder.start(model.name);
        showExercise(WatchUi.SLIDE_LEFT);
    }

    // --- Navigation ---

    function showExercise(transition as Lang.Number) as Void {
        WatchUi.switchToView(new ExerciseView(controller),
                             new ExerciseDelegate(controller), transition);
    }

    function showRest(durationSec as Lang.Number) as Void {
        var rv = new RestView(controller, durationSec);
        WatchUi.switchToView(rv, new RestDelegate(rv), WatchUi.SLIDE_UP);
    }

    // Fin de seance : arret + sauvegarde FIT, puis POST des resultats.
    function finishWorkout() as Void {
        recorder.finishAndSave();
        var summary = new SummaryView();
        WatchUi.switchToView(summary, new SimpleExitDelegate(), WatchUi.SLIDE_LEFT);
        WatchUi.requestUpdate();
        repo.postSession(controller.toSessionBody(), summary.method(:onPosted));
    }
}

// Renvoie l'instance de l'app (acces a l'etat partage depuis les vues).
function app() as MuscuApp {
    return Application.getApp() as MuscuApp;
}
