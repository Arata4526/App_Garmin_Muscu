using Toybox.Communications;
using Toybox.Application;
using Toybox.Application.Properties;
using Toybox.Application.Storage;
using Toybox.PersistedContent;
using Toybox.Lang;
using Toybox.System;

// Signature exacte attendue par Communications.makeWebRequest pour son callback.
typedef WebCallback as Method(code as Lang.Number,
    data as Null or Lang.Dictionary or Lang.String or PersistedContent.Iterator) as Void;

// Acces aux donnees : chargement du workout (mock ou API) et envoi des resultats.
//
// Resilience POST /api/sessions : la montre est frequemment hors reseau juste
// apres une seance (retour vestiaire, etc.). Un POST en echec est donc mis en
// file dans Application.Storage (persiste entre lancements de l'app) et
// retente au prochain demarrage / prochaine connexion (cf. flushPendingSessions,
// appele depuis MuscuApp.onStart).
class WorkoutRepository {
    private const PENDING_KEY = "pendingSessions";

    private var _loadCb as Lang.Method or Null;
    private var _postCb as Lang.Method or Null;
    private var _lastAttemptBody as Lang.Dictionary or Null;
    private var _flushQueue as Lang.Array = [];

    // callback(model as WorkoutModel or Null, errMsg as String or Null)
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
        Communications.makeWebRequest(url, null, options, method(:onWorkoutResponse) as WebCallback);
    }

    // data peut ne pas etre un Dictionary (reponse non-JSON, erreur reseau, etc.) :
    // on ne suppose jamais sa forme avant de l'avoir verifiee.
    function onWorkoutResponse(code as Lang.Number,
            data as Null or Lang.Dictionary or Lang.String or PersistedContent.Iterator) as Void {
        var cb = _loadCb as Lang.Method;
        if (code == 200 && data instanceof Lang.Dictionary) {
            var model = WorkoutModel.fromJson(data as Lang.Dictionary);
            cb.invoke(model, model == null ? "Reponse invalide" : null);
        } else {
            System.println("GET workout HTTP " + code);
            cb.invoke(null, "HTTP " + code);
        }
    }

    // Envoie les resultats reels. callback(success as Boolean, code as Number)
    // En cas d'echec (hors mock), le body est conserve dans Storage pour retry
    // ulterieur : l'appelant est informe de l'echec mais NE PERD PAS les donnees.
    function postSession(body as Lang.Dictionary, callback as Lang.Method) as Void {
        _postCb = callback;

        if (getBool("useMock", true)) {
            // En mode mock, on ne poste rien : on trace le body et on simule un succes.
            System.println("MOCK POST /api/sessions : " + body.toString());
            callback.invoke(true, 200);
            return;
        }

        sendSession(body, method(:onPostResponse) as WebCallback);
    }

    function onPostResponse(code as Lang.Number,
            data as Null or Lang.Dictionary or Lang.String or PersistedContent.Iterator) as Void {
        var ok = (code >= 200 && code < 300);
        System.println("POST session HTTP " + code);
        if (!ok) {
            enqueuePending(_lastAttemptBody);
        }
        (_postCb as Lang.Method).invoke(ok, code);
    }

    // A appeler au demarrage de l'app (avant/independamment du chargement du
    // prochain workout) : retente d'envoyer les sessions restees en file suite
    // a un echec reseau precedent. Best effort, ne bloque rien : en cas de
    // nouvel echec les entrees restent en file pour la prochaine tentative.
    function flushPendingSessions() as Void {
        if (getBool("useMock", true)) { return; }

        var pending = getPending();
        if (pending.size() == 0) { return; }
        flushNext(pending);
    }

    private function flushNext(pending as Lang.Array) as Void {
        if (pending.size() == 0) {
            setPending(pending);
            return;
        }
        var body = pending[0] as Lang.Dictionary;
        // Affecte _flushQueue AVANT l'appel reseau : sendSession peut invoquer
        // le callback de maniere synchrone (ex. apiBaseUrl vide), et
        // onFlushResponse doit alors trouver _flushQueue deja a jour.
        _flushQueue = pending;
        sendSession(body, method(:onFlushResponse) as WebCallback);
    }

    function onFlushResponse(code as Lang.Number,
            data as Null or Lang.Dictionary or Lang.String or PersistedContent.Iterator) as Void {
        var ok = (code >= 200 && code < 300);
        var remaining = _flushQueue;
        if (ok && remaining.size() > 0) {
            // Retire le premier element (celui qui vient d'etre envoye avec succes)
            // par index plutot que par egalite de valeur, pour eviter toute
            // ambiguite si deux sessions en file avaient un contenu identique.
            remaining = remaining.slice(1, null);
            setPending(remaining);
            System.println("Flush session OK, " + remaining.size() + " restante(s)");
            flushNext(remaining);
        } else if (!ok) {
            System.println("Flush session echec HTTP " + code + ", reessai plus tard");
            setPending(remaining);   // laisse la file telle quelle
        }
    }

    // --- helpers reseau ---

    private function sendSession(body as Lang.Dictionary, callback as WebCallback) as Void {
        _lastAttemptBody = body;
        var base = getStr("apiBaseUrl", "");
        if (base.length() == 0) {
            callback.invoke(0, null);
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
        Communications.makeWebRequest(url, body, options, callback);
    }

    // --- helpers file d'attente (Application.Storage) ---

    private function getPending() as Lang.Array {
        var v = Storage.getValue(PENDING_KEY);
        return (v instanceof Lang.Array) ? (v as Lang.Array) : [];
    }

    private function setPending(list as Lang.Array) as Void {
        if (list.size() == 0) {
            Storage.deleteValue(PENDING_KEY);
        } else {
            Storage.setValue(PENDING_KEY, list);
        }
    }

    private function enqueuePending(body as Lang.Dictionary or Null) as Void {
        if (body == null) { return; }
        var list = getPending();
        list.add(body);
        setPending(list);
        System.println("Session mise en file (offline), total=" + list.size());
    }

    // --- helpers generaux ---

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
