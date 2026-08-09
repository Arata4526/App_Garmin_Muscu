using Toybox.Lang;
using Toybox.System;

// Modele de donnees de la seance + journal des resultats reels.
// Conforme au contrat d'API (FIGE) :
//   GET  /api/workouts/:id -> { id, name, exercises: [ { exercise_id, name, sets: [ { reps, weight, rest } ] } ] }
//   POST /api/sessions     -> { workout_id, started_at, finished_at,
//                               exercises: [ { exercise_id, sets: [ { reps, weight } ] } ] }

// Une serie cible (telle que prescrite par le workout).
class SetTarget {
    var reps as Lang.Number;
    var weight as Lang.Float;   // charge cible (kg)
    var rest as Lang.Number;    // repos en secondes APRES cette serie

    function initialize(reps as Lang.Number, weight as Lang.Float, rest as Lang.Number) {
        me.reps = reps;
        me.weight = weight;
        me.rest = rest;
    }
}

// Un exercice = un nom + une liste de series cibles.
// exerciseId est une STRING cote API reelle (ex. "0025") : on ne le convertit
// jamais en nombre, on le transporte tel quel du GET vers le POST.
class ExerciseDef {
    var exerciseId as Lang.String;
    var name as Lang.String;
    var sets as Lang.Array<SetTarget>;

    function initialize(exerciseId as Lang.String, name as Lang.String, sets as Lang.Array<SetTarget>) {
        me.exerciseId = exerciseId;
        me.name = name;
        me.sets = sets;
    }
}

// Le workout complet.
class WorkoutModel {
    var id as Lang.Number;
    var name as Lang.String;
    var exercises as Lang.Array<ExerciseDef>;

    function initialize(id as Lang.Number, name as Lang.String, exercises as Lang.Array<ExerciseDef>) {
        me.id = id;
        me.name = name;
        me.exercises = exercises;
    }

    // Construit un WorkoutModel a partir d'une reponse JSON (mock ou API).
    // Parsing defensif : toute structure inattendue (champ manquant, mauvais
    // type, reponse 200 malformee) est ignoree/sautee plutot que de crasher ;
    // renvoie null si le workout final n'a aucun exercice exploitable.
    static function fromJson(data) as WorkoutModel {
        if (!(data instanceof Lang.Dictionary)) { return null; }
        var dict = data as Lang.Dictionary;

        try {
            var exObj = dict.get("exercises");
            if (!(exObj instanceof Lang.Array)) { return null; }
            var exJson = exObj as Lang.Array;

            var exercises = [] as Lang.Array<ExerciseDef>;
            for (var e = 0; e < exJson.size(); e++) {
                var exObjItem = exJson[e];
                if (!(exObjItem instanceof Lang.Dictionary)) { continue; }
                var ex = exObjItem as Lang.Dictionary;

                var sets = [] as Lang.Array<SetTarget>;
                var setsObj = ex.get("sets");
                if (setsObj instanceof Lang.Array) {
                    var setsJson = setsObj as Lang.Array;
                    for (var s = 0; s < setsJson.size(); s++) {
                        var stObj = setsJson[s];
                        if (!(stObj instanceof Lang.Dictionary)) { continue; }
                        var st = stObj as Lang.Dictionary;
                        sets.add(new SetTarget(
                            toNum(st.get("reps"), 0),
                            toFloat(st.get("weight"), 0.0),
                            toNum(st.get("rest"), 0)
                        ));
                    }
                }
                if (sets.size() == 0) { continue; }   // exercice inexploitable sans serie

                var exName = ex.get("name");
                var exId = ex.get("exercise_id");
                exercises.add(new ExerciseDef(
                    (exId == null) ? "" : exId.toString(),
                    (exName == null) ? "?" : exName.toString(),
                    sets
                ));
            }
            if (exercises.size() == 0) { return null; }

            var wName = dict.get("name");
            return new WorkoutModel(
                toNum(dict.get("id"), 0),
                (wName == null) ? "Seance" : wName.toString(),
                exercises
            );
        } catch (ex) {
            System.println("WorkoutModel.fromJson: parse error " + ex.getErrorMessage());
            return null;
        }
    }

    static function toNum(v, dflt as Lang.Number) as Lang.Number {
        if (v == null) { return dflt; }
        if (v instanceof Lang.Number) { return v; }
        if (v instanceof Lang.Float || v instanceof Lang.Double) { return v.toNumber(); }
        if (v instanceof Lang.String) { return v.toNumber() == null ? dflt : v.toNumber(); }
        return dflt;
    }

    static function toFloat(v, dflt as Lang.Float) as Lang.Float {
        if (v == null) { return dflt; }
        if (v instanceof Lang.Float || v instanceof Lang.Double) { return v.toFloat(); }
        if (v instanceof Lang.Number) { return v.toFloat(); }
        if (v instanceof Lang.String) { return v.toFloat() == null ? dflt : v.toFloat(); }
        return dflt;
    }
}
