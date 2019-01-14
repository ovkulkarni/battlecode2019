import { Pathfinder } from './pathfinder.js';
import { get_stats, calcOpposite, idx, dis } from './helpers.js';
import { attack_pred } from "./predicates.js";
import { constants } from "./constants.js"
import { horde } from './analyzemap.js';

export function runPreacher(m) {
    m.log("PREACHER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
    if (m.stats === undefined) {
        m.stats = get_stats(m);
    }
    if (m.me.turn === 1) {
        switch (m.mission) {
            case constants.ATTACK:
                let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            default:
                m.pathfinder = new Pathfinder(m, attack_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
        }
    }
    for (let r of m.visible_enemies) {
        let dist = dis(m.me.x, m.me.y, r.x, r.y);
        if (shouldAttack(m, r.x - m.me.x, r.y - m.me.y) && m.stats.ATTACK_RADIUS[0] <= dist && dist <= m.stats.ATTACK_RADIUS[1]) {
            m.log(`ATTACKING: (${r.x}, ${r.y})`);
            return m.attack(r.x - m.me.x, r.y - m.me.y);
        }
    }
    let h = horde(m);
    if (h === false)
        return;
    let next = m.pathfinder.next_loc(m);
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
    else if (next.wait || next.fail) {
        m.log("PREACHER STUCK");
        return;
    }
    else {
        m.log("PREACHER MOVING: " + next);
        //let dx = next[0] - m.me.x; let dy = next[1] - m.me.y;
        return m.move(...next.diff);
    }
}

export function shouldAttack(m, x, y) {

    let count = 0
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            //if (i != 0 || j != 0) {
            let id = idx(m.getVisibleRobotMap(), m.me.x + i + x, m.me.y + j + y);
            // m.log("ROBOT ID " + id);
            if (id !== 0 && id !== -1) {
                // m.log("TEAM " + m.getRobot(id).team);
                if (m.getRobot(id).team === m.team) {
                    count = count - 1;
                }
                else count = count + 1;
            }
            //}
        }
    }
    return count > 0;
}
