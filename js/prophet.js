import { SPECS } from 'battlecode';
import { Pathfinder } from './pathfinder.js';
import { prophet_pred, attack_pred, around_pred, lattice_pred, lattice_outside_pred, defend_resources_pred } from "./predicates.js";
import { constants } from './constants.js';
import { calcOpposite, dis, create_augmented_obj, idx, passable_loc, all_neighbors2 } from './helpers.js';
import { decode16, encode8 } from './communication.js';
import { compact_horde, optimal_attack_diff, best_fuel_locs, best_karb_locs } from './analyzemap.js';

export function runProphet(m) {
    //m.log(`PROPHET: (${m.me.x}, ${m.me.y})`);
    if (m.me.turn === 1) {
        let opp = calcOpposite(m, m.spawn_castle.x, m.spawn_castle.y);
        switch (m.mission) {
            case constants.ATTACK:
                m.pathfinder = new Pathfinder(m, attack_pred(m, ...opp));
                break;
            case constants.CONSTRICT:
                m.pathfinder = new Pathfinder(m, around_pred(...m.constrict_loc, 10, 11))
                break;
            case constants.HORDE:
                m.horde_loc = { x: opp[0], y: opp[1] };
                break;
            case constants.PROTECT:
                break;
            case constants.DEFEND_RESOURCES:
                m.resource_locs = best_fuel_locs(m, m.spawn_castle.x, m.spawn_castle.y);
                m.resource_locs.push(...best_karb_locs(m, m.spawn_castle.x, m.spawn_castle.y));
                let good_outpost_map = get_good_outpost_map(m);
                m.pathfinder = new Pathfinder(m, defend_resources_pred(m, good_outpost_map));
                break;
            default:
                m.pathfinder = new Pathfinder(m, lattice_outside_pred(m, m.spawn_castle.x, m.spawn_castle.y, 9));
                break;
        }
    }
    for (let r of (m.mission === constants.CONSTRICT ? m.visible_robots : m.visible_allies)) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            // m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if ((m.mission === constants.HORDE || m.mission === constants.PROTECT) && message.command === "send_horde") {
                m.horde_loc = {};
                m.horde_loc.x = message.args[0];
                m.horde_loc.y = message.args[1];
                m.sending_castle = message.args[2];
                m.begin_horde = true;
            } else if (message.command === "update_task") {
                m.mission = message.args[0];
            } else if (message.command === "start" && m.mission === constants.CONSTRICT) {
                m.started_constricting = true;
            } else if (message.command === "stop" && m.mission === constants.CONSTRICT) {
                let r = SPECS.UNITS[(message.args[2] === 0 ? 0 : message.args[2] + 2)].ATTACK_RADIUS[1];
                m.pathfinder = new Pathfinder(m, around_pred(message.args[0], message.args[1], r + 25, r + 64));
            } else if (message.command === "step" && m.mission === constants.CONSTRICT) {
                let next = new Pathfinder(m, exact_pred(...message.args)).next_loc();
                if (next.fail || next.wait || next.fin)
                    continue;
                m.log(`stepping towards ${JSON.stringify(message.args)}`);
                return m.move(...next.diff);
            }
        }
    }
    let att = optimal_attack_diff(m);
    if (att)
        return m.attack(...att);
    if (m.mission === constants.CONSTRICT && !m.started_constricting) {
        return;
    }
    if (m.mission === constants.HORDE || m.mission === constants.PROTECT) {
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
    let next = m.pathfinder.next_loc(m);
    if (next.fail || next.wait) {
        if (m.me.turn % 5 === 0)
            m.pathfinder.recalculate(m);
        return;
    }
    else if (next.fin) {
        if (next.fin) {
            switch (m.mission) {
                case constants.HORDE:
                    if (m.on_intermediate) {
                        m.on_intermediate = false;
                        if (m.sending_castle < 3)
                            m.pathfinder = new Pathfinder(m, attack_pred(m, m.horde_loc.x, m.horde_loc.y));
                        else
                            m.pathfinder = new Pathfinder(m, around_pred(m.horde_loc.x, m.horde_loc.y, 1, 3));
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
                case constants.PROTECT:
                    if (m.on_intermediate) {
                        m.on_intermediate = false;
                        m.pathfinder = new Pathfinder(m, around_pred(m.horde_loc.x, m.horde_loc.y, 1, 3));
                        return;
                    } else {
                        m.mission = constants.DEFEND;
                        m.pathfinder = new Pathfinder(m, prophet_pred(m, m.horde_loc.x, m.horde_loc.y));
                        delete m.begin_horde;
                        delete m.intermediate_point;
                        delete m.on_intermediate;
                        delete m.started;
                        return;
                    }
                case constants.RETURN:
                    m.mission = constants.HORDE;
                    m.castleTalk(encode8("came_back"));
                    return;
                case constants.CONSTRICT:
                    delete m.started_constricting;
                    return true;
                default:
                    m.mission = constants.DEFEND;
                    return true;
            }
        }
    }
    compact_horde(m, next);
    if (idx(m.visible_map, ...next.res) >= 1 || !passable_loc(m, ...next.res))
        return;
    return m.move(...next.diff);
}

function get_good_outpost_map(m) {
    let amap = [];
    for (let i = 0; i < m.map.length; i++) {
        amap.push([]);
        for (let j = 0; j < m.map.length; j++) {
            amap[i][j] = false;
        }
    }
    for (let rloc of m.resource_locs) {
        let neighbors = all_neighbors2(m, ...rloc);
        let max_dist = -1;
        let max_loc = undefined;
        for (let loc of neighbors) {
            if (idx(m.karbonite_map, ...loc) || idx(m.fuel_map, ...loc))
                continue;
            let dist = dis(m.spawn_castle.x, m.spawn_castle.y, ...loc);
            if (dist > max_dist) {
                max_loc = loc;
                max_dist = dist;
            }
        }
        if (max_loc !== undefined)
            amap[max_loc[0]][max_loc[1]] = true;
    }
    return amap;
}
