using Toybox.Time;
using Toybox.Time.Gregorian;
using Toybox.Lang;

// Fonctions utilitaires transverses.
module Util {

    // Horodatage ISO 8601 UTC, ex: "2026-08-09T10:20:30Z".
    // Format aligne avec le contrat d'API (started_at / finished_at).
    function isoNow() as Lang.String {
        return isoFromMoment(Time.now());
    }

    function isoFromMoment(moment as Time.Moment) as Lang.String {
        var i = Gregorian.utcInfo(moment, Time.FORMAT_SHORT);
        return i.year.format("%04d") + "-" +
               i.month.format("%02d") + "-" +
               i.day.format("%02d") + "T" +
               i.hour.format("%02d") + ":" +
               i.min.format("%02d") + ":" +
               i.sec.format("%02d") + "Z";
    }

    // "mm:ss" a partir d'un nombre de secondes.
    function fmtClock(totalSec as Lang.Number) as Lang.String {
        if (totalSec < 0) { totalSec = 0; }
        var m = totalSec / 60;
        var s = totalSec % 60;
        return m.format("%d") + ":" + s.format("%02d");
    }
}
