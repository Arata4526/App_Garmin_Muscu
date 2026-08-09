using Toybox.Lang;
using Toybox.Time;

// Pilote le deroulement de la seance : position courante (exercice/serie),
// journal des resultats reels, et construction du body POST /api/sessions.
class SessionController {
    var model as WorkoutModel;
    var exIdx as Lang.Number;
    var setIdx as Lang.Number;

    var startedAtIso as Lang.String;
    // results[exIdx] = Array de dictionnaires { exercise_id, sets: [ { reps, weight } ] }
    var results as Lang.Array;

    function initialize(model as WorkoutModel) {
        me.model = model;
        me.exIdx = 0;
        me.setIdx = 0;
        me.startedAtIso = Util.isoNow();

        // Pre-alloue le journal (une entree par exercice).
        me.results = [] as Lang.Array;
        for (var e = 0; e < model.exercises.size(); e++) {
            me.results.add({
                "exercise_id" => model.exercises[e].exerciseId,
                "sets" => ([] as Lang.Array)
            });
        }
    }

    function currentExercise() as ExerciseDef {
        return model.exercises[exIdx];
    }

    function currentSet() as SetTarget {
        return currentExercise().sets[setIdx];
    }

    function setNumber() as Lang.Number { return setIdx + 1; }
    function setCount() as Lang.Number { return currentExercise().sets.size(); }

    // Existe-t-il une serie apres la serie courante (dans cet exo ou un exo suivant) ?
    function hasNext() as Lang.Boolean {
        if (setIdx + 1 < currentExercise().sets.size()) { return true; }
        return exIdx + 1 < model.exercises.size();
    }

    // Enregistre le resultat reel de la serie courante.
    // Pour ce MVP, reps/charge reels = cibles (l'edition fine viendra ensuite).
    function completeCurrentSet(reps as Lang.Number, weight as Lang.Float) as Void {
        var entry = results[exIdx] as Lang.Dictionary;
        var sets = entry.get("sets") as Lang.Array;
        sets.add({ "reps" => reps, "weight" => weight });
    }

    // Avance vers la serie suivante (a appeler apres le repos).
    function advance() as Void {
        if (setIdx + 1 < currentExercise().sets.size()) {
            setIdx += 1;
        } else {
            exIdx += 1;
            setIdx = 0;
        }
    }

    // Body conforme a POST /api/sessions.
    function toSessionBody() as Lang.Dictionary {
        return {
            "workout_id" => model.id,
            "started_at" => startedAtIso,
            "finished_at" => Util.isoNow(),
            "exercises" => results
        };
    }
}
