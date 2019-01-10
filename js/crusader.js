import { Pathfinder } from './pathfinder.js';
import { attack_pred } from './predicates.js';
import { calcOpposite } from './helpers.js';

export function runCrusader(m) {
    m.log(`CRUSADER: (${m.me.x}, ${m.me.y})`);
    if (typeof m.pathfinder === "undefined") {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
        opp[0]--;
        m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
    }
    
    let next = m.pathfinder.next_loc(m);
    if (next.fail || next.wait) {
        m.log("FAILED/WAITING");
        return;
    }
    if (next.fin) {
        for (let r of m.visible_robots) {
            if (r.team !== m.me.team) {
                m.log(`ATTACKING: (${r.x}, ${r.y})`);
                return m.attack(r.x - m.me.x, r.y - m.me.y);
            }
        }
    }
    return m.move(...next.diff);
}
