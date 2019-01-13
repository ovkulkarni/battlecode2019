import { Pathfinder } from './pathfinder.js';
import { prophet_pred } from "./predicates.js";
import { encode8 } from './communication.js';
import { constants } from './constants.js';

export function runProphet(m) {
    m.log(`PROPHET: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn) {
        switch (m.mission) {
            case constants.ATTACK:
                let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            default:
                m.pathfinder = new Pathfinder(m, prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
        }
    }
    for (let r of m.visible_enemies) {
        m.log(`ATTACKING: (${r.x}, ${r.y})`);
        return m.attack(r.x - m.me.x, r.y - m.me.y);
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fin || next.fail || next.wait)
        return;
    return m.move(...next.diff);
}