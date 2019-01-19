import { Pathfinder } from './pathfinder.js';
import { attack_pred, around_pred, prophet_pred } from './predicates.js';
import { calcOpposite, dis, create_augmented_obj, idx, passable_loc } from './helpers.js';
import { constants } from './constants.js';
import { wander, compact_horde } from './analyzemap.js';
import { decode16, encode8 } from './communication.js';

export function runPreacher(m) {
    //m.log("PREACHER ID: " + m.me.id + "  X: " + m.me.x + "  Y: " + m.me.y);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);;
        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] }
                break;
            case constants.DEFEND:
                m.pathfinder = new Pathfinder(m, prophet_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
            default:
                m.pathfinder = new Pathfinder(m, attack_pred(m, m.spawn_castle.x, m.spawn_castle.y));
                break;
        }
    }
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            // m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (m.mission === constants.HORDE && message.command === "send_horde") {
                m.horde_loc = {};
                m.horde_loc.x = message.args[0];
                m.horde_loc.y = message.args[1];
                m.sending_castle = message.args[2];
                m.begin_horde = true;
            } else if (message.command === "update_task") {
                m.mission = message.args[0];
            }
        }
    }
    for (let r of m.visible_enemies) {
        let dist = dis(m.me.x, m.me.y, r.x, r.y);
        if (shouldAttack(m, r.x - m.me.x, r.y - m.me.y) && m.stats.ATTACK_RADIUS[0] <= dist && dist <= m.stats.ATTACK_RADIUS[1]) {
            return m.attack(r.x - m.me.x, r.y - m.me.y);
        }
    }
    if (m.mission === constants.HORDE) {
        if (m.begin_horde) {
            if (m.intermediate_point === undefined) {
                //m.log(`Trying to find path from ${JSON.stringify(m.spawn_castle)} to ${JSON.stringify(m.horde_loc)}`);
                let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                if (pf.path === undefined) {
                    //m.log(`NO PATH FROM CASTLE TO OPPOSITE :(`);
                    return;
                }
                m.intermediate_point = pf.path[Math.floor(pf.path.length / 2)];
                return;
            } else {
                m.pathfinder = new Pathfinder(m, around_pred(...m.intermediate_point, 1, 2));
                m.begin_horde = false;
                m.on_intermediate = true;
                m.started = true;
            }
        } else if (!m.started) {
            return;
        }
    }
    if (m.pathfinder === undefined)
        return;
    let next = m.pathfinder.next_loc(m);
    if (next.fail) {
        //m.log("FAILED");
        return;
    }
    if (next.wait) {
        //m.log("WAITING");
        return;
    }
    if (next.fin) {
        switch (m.mission) {
            case constants.HORDE:
                if (m.on_intermediate) {
                    m.on_intermediate = false;
                    m.pathfinder = new Pathfinder(m, attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                    return;
                } else {
                    m.mission = constants.RETURN;
                    m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 3));
                    if (dis(m.horde_loc.x, m.horde_loc.y, m.me.x, m.me.y) <= m.stats.VISION_RADIUS && m.visible_enemies.filter(r => r.unit === SPECS.CASTLE).length === 0) {
                        let message = encode8("castle_killed", m.sending_castle);
                        m.castleTalk(message)
                    }
                    delete m.begin_horde;
                    delete m.intermediate_point;
                    delete m.on_intermediate;
                    delete m.started;
                    return;
                }
            case constants.RETURN:
                m.mission = constants.HORDE;
                m.castleTalk(encode8("came_back", m.sending_castle));
                delete m.sending_castle;
                return;
            case constants.DEFEND:
                return;
            default:
                m.mission = constants.NEUTRAL;
                //m.log("WANDERING");
                wander(m);
                return;
        }
    }
    compact_horde(m, next);
    if (idx(m.visible_map, ...next.res) >= 1 || !passable_loc(m, ...next.res))
        return;
    return m.move(...next.diff);

}

export function shouldAttack(m, x, y) {

    let count = 0
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (passable_loc(m, m.me.x + i + x, m.me.y + j + y)) {
                let id = idx(m.visible_map, m.me.x + i + x, m.me.y + j + y);
                if (id !== 0 && id !== -1) {
                    if (m.getRobot(id).team === m.me.team) {
                        count = count - 1;
                    }
                    else {
                        count = count + 1;
                    }
                }
            }
        }
    }
    return count > 0;
}
