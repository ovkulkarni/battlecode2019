import { Pathfinder } from './pathfinder.js';
import { attack_pred, around_pred, prophet_pred, crusader_pred } from './predicates.js';
import { calcOpposite, dis, create_augmented_obj, get_mission, idx, passable_loc } from './helpers.js';
import { constants } from './constants.js';
import { wander, compact_horde, optimal_attack_diff } from './analyzemap.js';
import { decode16, encode8 } from './communication.js';

export function runCrusader(m) {
    //m.log(`CRUSADER: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);;
        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.DEFEND:
                m.pathfinder = new Pathfinder(m, crusader_pred(m, m.spawn_castle.x, m.spawn_castle.y, 25));
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] }
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
    let att = optimal_attack_diff(m);
    if (att)
        return m.attack(...att);
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
                    if (m.sending_castle < 3) {
                        m.mission = constants.RETURN;
                        m.pathfinder = new Pathfinder(m, around_pred(m.spawn_castle.x, m.spawn_castle.y, 1, 25));
                        if (dis(m.horde_loc.x, m.horde_loc.y, m.me.x, m.me.y) <= m.stats.VISION_RADIUS && m.visible_enemies.filter(r => r.unit === SPECS.CASTLE).length === 0) {
                            let message = encode8("castle_killed", m.sending_castle);
                            m.castleTalk(message)
                        }
                    } else {
                        m.mission = constants.DEFEND;
                        m.pathfinder = new Pathfinder(m, prophet_pred(m, m.horde_loc.x, m.horde_loc.y));
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
                return true;
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
