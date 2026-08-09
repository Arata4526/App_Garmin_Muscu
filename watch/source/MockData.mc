using Toybox.Lang;

// Mock local conforme au contrat GET /api/workouts/:id.
// Utilise tant que l'API n'est pas prete (App Setting "useMock" = true).
// Repos volontairement courts pour tester le flux rapidement dans le simulateur.
module MockData {

    function workout() as Lang.Dictionary {
        return {
            "id" => 1,
            "name" => "Push A",
            "exercises" => [
                {
                    "exercise_id" => "0101",
                    "name" => "Developpe couche",
                    "sets" => [
                        { "reps" => 10, "weight" => 40.0, "rest" => 12 },
                        { "reps" => 8,  "weight" => 45.0, "rest" => 12 },
                        { "reps" => 6,  "weight" => 50.0, "rest" => 15 }
                    ]
                },
                {
                    "exercise_id" => "0102",
                    "name" => "Developpe militaire",
                    "sets" => [
                        { "reps" => 10, "weight" => 25.0, "rest" => 10 },
                        { "reps" => 10, "weight" => 25.0, "rest" => 10 }
                    ]
                },
                {
                    "exercise_id" => "0103",
                    "name" => "Dips",
                    "sets" => [
                        { "reps" => 12, "weight" => 0.0, "rest" => 10 },
                        { "reps" => 10, "weight" => 0.0, "rest" => 0 }
                    ]
                }
            ]
        };
    }
}
