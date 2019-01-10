import { Pathfinder } from './pathfinder.js';
import { prophet_pred } from "./predicates.js";
import { encode8 } from './communication.js';

export function runProphet(m) {
    m.log(`PROPHET: (${m.me.x}, ${m.me.y})`);
    if (typeof m.pathfinder === "undefined")
        m.pathfinder = new Pathfinder(m, prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
    for (let r of m.visible_enemies) {
        m.log(`ATTACKING: (${r.x}, ${r.y})`);
        if (!m.defending) {
            m.defending = true;
            let message = encode8("defense", 1);
            m.log(`CTALK DEFENSE: ${message}`);
            m.castleTalk(message);
        }
        return m.attack(r.x - m.me.x, r.y - m.me.y);
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fin || next.fail || next.wait)
        return;
    return m.move(...next.diff);
}