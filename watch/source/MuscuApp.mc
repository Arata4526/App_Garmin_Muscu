using Toybox.Application;
using Toybox.WatchUi;
using Toybox.Lang;

// Point d'entree de l'app. Detient l'etat partage (repo, recorder, controller)
// et centralise la navigation entre ecrans (un seul ecran actif via switchToView).
class MuscuApp extends Application.AppBase {

    var repo as WorkoutRepository;
    var recorder as SessionRecorder;
    var controller as SessionController or Null;   // null tant que le workout n'est pas charge
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
        // Retente d'abord d'envoyer toute session restee en file suite a un
        // echec POST precedent (montre hors reseau apres une seance) ; best
        // effort, ne bloque pas le chargement du nouveau workout.
        repo.flushPendingSessions();
        repo.loadWorkout(method(:onWorkoutLoaded));
    }

    function onStop(state as Lang.Dictionary or Null) as Void {
        // Securite : si l'app se ferme en cours de seance, on n'abandonne pas
        // automatiquement l'enregistrement (l'utilisateur passe normalement par le resume).
    }

    // Ecran initial : chargement.
    function getInitialView() as [WatchUi.Views] or [WatchUi.Views, WatchUi.InputDelegates] {
        var v = new LoadingView(null);
        return [v, new SimpleExitDelegate()];
    }

    // Callback du chargement du workout.
    function onWorkoutLoaded(model as WorkoutModel or Null, err as Lang.String or Null) as Void {
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
    // controller est garanti non-null a partir d'ici : ces methodes ne sont
    // appelees qu'une fois la seance demarree (onWorkoutLoaded l'a instancie).

    function showExercise(transition as WatchUi.SlideType) as Void {
        var c = controller as SessionController;
        WatchUi.switchToView(new ExerciseView(c), new ExerciseDelegate(c), transition);
    }

    function showRest(durationSec as Lang.Number) as Void {
        var c = controller as SessionController;
        var rv = new RestView(c, durationSec);
        WatchUi.switchToView(rv, new RestDelegate(rv), WatchUi.SLIDE_UP);
    }

    // Fin de seance : arret + sauvegarde FIT, puis POST des resultats.
    function finishWorkout() as Void {
        var c = controller as SessionController;
        recorder.finishAndSave();
        var summary = new SummaryView();
        WatchUi.switchToView(summary, new SimpleExitDelegate(), WatchUi.SLIDE_LEFT);
        WatchUi.requestUpdate();
        repo.postSession(c.toSessionBody(), summary.method(:onPosted));
    }
}

// Renvoie l'instance de l'app (acces a l'etat partage depuis les vues).
function app() as MuscuApp {
    return Application.getApp() as MuscuApp;
}
