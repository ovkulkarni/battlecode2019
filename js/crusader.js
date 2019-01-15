import { Pathfinder } from './pathfinder.js';
import { attack_pred, around_pred } from './predicates.js';
import { calcOpposite, dis, create_augmented_obj, get_mission } from './helpers.js';
import { constants } from './constants.js';
import { wander } from './analyzemap.js';
import { decode16 } from './communication.js';

export function runCrusader(m) {
    m.log(`CRUSADER: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);;
        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] }
                break;
        }
    }
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (message.command === "horde_loc") {
                m.horde_loc = {};
                m.horde_loc.x = message.args[0];
                m.horde_loc.y = message.args[1];
            } else if (message.command === "release_horde") {
                m.begin_horde = true;
            } else if (message.command === "task") {
                m.mission = message.args[0];
            }
        }
    }
    for (let r of m.visible_enemies) {
        let dist = dis(m.me.x, m.me.y, r.x, r.y);
        if (m.stats.ATTACK_RADIUS[0] < dist && dist < m.stats.ATTACK_RADIUS[1]) {
            m.log(`ATTACKING: (${r.x}, ${r.y})`);
            return m.attack(r.x - m.me.x, r.y - m.me.y);
        }
    }
    if (m.mission === constants.HORDE) {
        if (m.begin_horde) {
            if (m.intermediate_point === undefined) {
                m.log(`Trying to find path from ${JSON.stringify(m.spawn_castle)} to ${JSON.stringify(m.horde_loc)}`);
                let pf = new Pathfinder(create_augmented_obj(m, m.spawn_castle.x, m.spawn_castle.y), attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                if (pf.path === undefined) {
                    m.log(`NO PATH FROM CASTLE TO OPPOSITE :(`);
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
    let next = m.pathfinder.next_loc(m);
    if (next.fail) { m.log("FAILED"); return; }
    if (next.wait) { m.log("WAITING"); return; }
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
                    m.begin_horde = undefined;
                    m.intermediate_point = undefined;
                    m.on_intermediate = undefined;
                    m.started = undefined;
                    return;
                }
            case constants.RETURN:
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
