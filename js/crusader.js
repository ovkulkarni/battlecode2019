import { Pathfinder, exact_pred } from './pathfinder.js';
import { calcOpposite } from './helpers.js';

export function runCrusader(m) {
    m.log("CRUSADER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
    if (typeof m.pathfinder === "undefined") {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
        opp[0]--;
        m.pathfinder = new Pathfinder(m, exact_pred(...opp));
    }
    let next = m.pathfinder.next_loc(m);
    if (next === undefined) return m.attack(1, 0);
    else if (next === -1) {
        m.log("CRUSADER STUCK BIG RIP");
    }
    else {
        m.log("CRUSADER MOVING: " + next);
        let dx = next[0] - m.me.x; let dy = next[1] - m.me.y;
        return m.move(dx, dy);
    }
}
