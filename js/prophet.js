import { Pathfinder } from './pathfinder.js';
import { prophet_pred } from "./predicates.js";

export function runProphet(m) {
    m.log(`PROPHET: (${m.me.x}, ${m.me.y})`);
    if (typeof m.pathfinder === "undefined")
        m.pathfinder = new Pathfinder(m, prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
    let next = m.pathfinder.next_loc(m);
    if (next.fin || next.fail || next.wait)
        return;
    return m.move(...next.diff);
}