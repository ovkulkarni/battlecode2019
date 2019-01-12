import { Pathfinder } from './pathfinder.js';
import { attack_pred, around_pred } from './predicates.js';
import { calcOpposite, dis, create_augmented_obj } from './helpers.js';
import { constants } from './constants.js';
import { wander, check_horde } from './analyzemap.js';

export function runCrusader(m) {
    m.log(`CRUSADER: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn === 1) {
        switch (m.mission) {
            case constants.ATTACK:
                let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
        }
    }
    for (let r of m.visible_enemies) {
        let dist = dis(m.me.x, m.me.y, r.x, r.y);
        if (m.stats.ATTACK_RADIUS[0] <= dist && dist <= m.stats.ATTACK_RADIUS[1]) {
            m.log(`ATTACKING: (${r.x}, ${r.y})`);
            return m.attack(r.x - m.me.x, r.y - m.me.y);
        }
    }
    let castle_dist = dis(m.spawn_castle.x, m.spawn_castle.y, m.me.x, m.me.y);
    let in_horde = check_horde(m) || m.joined_horde;
    if (!in_horde && castle_dist <= 10)
        return;
    else if (in_horde && (castle_dist <= 10 || m.mission === constants.HORDE_INTERMEDIATE)) {
        m.log("IN HORDE");
        m.joined_horde = true;
        if (m.intermediate_point === undefined) {
            m.mission = constants.HORDE_INTERMEDIATE;
            let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
            let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, ...opp));
            m.intermediate_point = pf.path[Math.floor(pf.path.length / 2)];
            return;
        }
        else {
            m.pathfinder = new Pathfinder(m, around_pred(...m.intermediate_point, 1, 2));
        }
    }
    let next = m.pathfinder.next_loc(m);
    if (next.fail) { m.log("FAILED"); return; }
    if (next.wait) { m.log("WAITING"); return; }
    if (next.fin) {
        switch (m.mission) {
            case constants.HORDE_INTERMEDIATE:
                m.mission = constants.ATTACK;
                let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                return;
            default:
                m.mission = constants.NEUTRAL;
                m.log("WANDERING");
                wander(m);
                return;
        }
    }
    return m.move(...next.diff);
}
