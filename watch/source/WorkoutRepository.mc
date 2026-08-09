using Toybox.Communications;
using Toybox.Application;
using Toybox.Application.Properties;
using Toybox.Lang;
using Toybox.System;

// Acces aux donnees : chargement du workout (mock ou API) et envoi des resultats.
class WorkoutRepository {

    // callback(model as WorkoutModel, errMsg as String or null)
    function loadWorkout(callback as Lang.Method) as Void {
        _loadCb = callback;

        if (getBool("useMock", true)) {
            var model = WorkoutModel.fromJson(MockData.workout());
            callback.invoke(model, model == null ? "Mock invalide" : null);
            return;
        }

        var base = getStr("apiBaseUrl", "");
        var id = getStr("workoutId", "");
        if (base.length() == 0) {
            callback.invoke(null, "apiBaseUrl vide");
            return;
        }

        var url = base + "/api/workouts/" + id;
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => authHeaders(),
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(url, null, options, method(:onWorkoutResponse));
    }

    function onWorkoutResponse(code as Lang.Number, data as Lang.Dictionary) as Void {
        if (code == 200 && data != null) {
            var model = WorkoutModel.fromJson(data);
            _loadCb.invoke(model, model == null ? "Reponse invalide" : null);
        } else {
            System.println("GET workout HTTP " + code);
            _loadCb.invoke(null, "HTTP " + code);
        }
    }

    // Envoie les resultats reels. callback(success as Boolean, code as Number)
    function postSession(body as Lang.Dictionary, callback as Lang.Method) as Void {
        _postCb = callback;

        if (getBool("useMock", true)) {
            // En mode mock, on ne poste rien : on trace le body et on simule un succes.
            System.println("MOCK POST /api/sessions : " + body.toString());
            callback.invoke(true, 200);
            return;
        }

        var base = getStr("apiBaseUrl", "");
        if (base.length() == 0) {
            callback.invoke(false, 0);
            return;
        }

        var url = base + "/api/sessions";
        var headers = authHeaders();
        headers.put("Content-Type", Communications.REQUEST_CONTENT_TYPE_JSON);
        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_POST,
            :headers => headers,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };
        Communications.makeWebRequest(url, body, options, method(:onPostResponse));
    }

    function onPostResponse(code as Lang.Number, data as Lang.Dictionary) as Void {
        System.println("POST session HTTP " + code);
        _postCb.invoke(code >= 200 && code < 300, code);
    }

    // --- helpers ---

    private var _loadCb as Lang.Method;
    private var _postCb as Lang.Method;

    private function authHeaders() as Lang.Dictionary {
        var token = getStr("token", "");
        var h = {
            "Accept" => "application/json"
        };
        if (token.length() > 0) {
            h.put("Authorization", "Bearer " + token);
        }
        return h;
    }

    private function getStr(key as Lang.String, dflt as Lang.String) as Lang.String {
        var v = Properties.getValue(key);
        return (v == null) ? dflt : v.toString();
    }

    private function getBool(key as Lang.String, dflt as Lang.Boolean) as Lang.Boolean {
        var v = Properties.getValue(key);
        return (v == null) ? dflt : v;
    }
}
