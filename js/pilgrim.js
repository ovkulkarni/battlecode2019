import { SPECS } from 'battlecode';
import { Pathfinder } from './pathfinder.js';
import { karbonite_pred, around_pred, fuel_pred, exact_pred, every_pred } from './predicates.js';
import { constants } from './constants.js';
import { unit_cost } from './castle.js';
//import { get_symmetry } from './analyzemap.js';
import { encode8, encode16, decode16 } from './communication.js';
import { open_neighbors2, idx, calcOpposite, dis, edge_attacker, visible_ally_attackers } from './helpers.js';

export function runPilgrim(m) {
    //if (m.me.turn === 1)
    //    m.log(`PILGRIM: (${m.me.x}, ${m.me.y})`);
    //m.log("INITIAL MISSION: " + m.mission);
    //m.log("PILGRIM: " + JSON.stringify(m.pathfinder) + " " + m.me.x + " " + m.me.y);
    if (m.deposit_loc === undefined) {
        m.deposit_loc = m.spawn_castle;
    }
    if (m.diffused) {
        m.diffused = false;
        if (m.pathfinder === undefined)
            m.pathfinder.recalculate(m);
    }
    if (m.me.turn === 1) {
        get_start_pathfinder(m);
        m.signaled_for = {};
    }
    if (m.mission === constants.GATHER) {
        get_pathfinder(m);
    }
    if (m.pathfinder === undefined) {
        m.log("PATHFINDER DOESNT EXIST");
        m.log("MISSION: " + m.mission);
        get_pathfinder(m);
    }
    //m.log("PATHFINDER: " + JSON.stringify(m.pathfinder));
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            // m.log(`GOT COMMAND ${message.command} (${message.args}) FROM ${r.id}`);
            if (m.mission === constants.SCOUT && message.command === "start_pilgrim") {
                m.started = true;
            }
        }
    }
    let edge = edge_attacker(m);
    if (edge && m.mission === constants.SCOUT) {
        let msg;
        for (let r of m.visible_allies) {
            if (!m.signaled_for[`${edge.x},${edge.y}`])
                m.signaled_for[`${edge.x},${edge.y}`] = new Set();
            if (r.dist <= 100 && (r.unit === SPECS.PREACHER || r.unit === SPECS.PROPHET) && !m.signaled_for[`${edge.x},${edge.y}`].has(r.id)) {
                m.signaled_for[`${edge.x},${edge.y}`].add(r.id)
                msg = encode16("stop", edge.x, edge.y, (edge.unit === 0 ? 0 : edge.unit - 2));
            }
        }
        if (msg === undefined && m.scary_enemies.length * 2 < visible_ally_attackers(m).length) {
            // msg = encode16("step", edge.x, edge.y);
        }
        if (msg)
            m.signal(msg, 100);
        return;
    }
    if (m.mission === constants.SCOUT && !m.started)
        return;
    let next = m.pathfinder.next_loc(m);
    //m.log("NEXT MOVE: " + JSON.stringify(next));
    if (next.fin) {
        switch (m.mission) {
            case constants.CHURCH:
                if (m.church_loc === undefined) {
                    m.log("BUILDING CHURCH");
                    return build_church(m);
                }
                else {
                    m.log("SHOULD NOT HAPPEN");
                    m.mission = constants.GATHER;
                    return true;
                }
            case constants.GATHER:
                return handleGather(m);
            case constants.GATHER_KARB:
                return handleGather(m);
            case constants.GATHER_FUEL:
                return handleGather(m);
            case constants.DEPOSIT:
                return handleDeposit(m);
            default:
                return handleOther(m);
        }
    }
    else if (next.wait) {
        return;
    }
    else if (next.fail) {
        if (m.me.turn % 5 === 0)
            m.pathfinder.recalculate(m);
        return;
    }
    else {
        if (m.mission === constants.SCOUT && !m.signaled_started) {
            if (dis(m.me.x, m.me.y, m.spawn_castle.x, m.spawn_castle.y) > 50) {
                m.signal(encode16("start"), 20 * 20);
                m.signaled_started = true;
            }
        }
        return m.move(...next.diff);
    }
}

export function get_start_pathfinder(m) {
    switch (m.mission) {
        case constants.GATHER:
            m.pathfinder = new Pathfinder(m, every_pred(m));
            m.mission = constants.GATHER;
            break;
        case constants.DEPOSIT:
            m.pathfinder = new Pathfinder(m, around_pred(m.deposit_loc.x, m.deposit_loc.y, 1, 2));
            m.pathfinder.final_loc = [m.deposit_loc.x, m.deposit_loc.y];
            break;
        case constants.GATHER_KARB:
            m.pathfinder = new Pathfinder(m, karbonite_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        case constants.CHURCH:
            m.castleTalk(encode8("watch_me"));
            //m.log("CHURCH PILGRIM   CHURCH: " + m.church);
            m.pathfinder = new Pathfinder(m, exact_pred(...m.church));
            m.pathfinder.pilgrim_kys = true;
            break;
        case constants.GATHER_FUEL:
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            m.initial_mission = m.mission;
            break;
        case constants.SCOUT:
            m.pathfinder = new Pathfinder(m, around_pred(...m.constrict_loc, 10, 11))
            break;
        default:
            m.log("ERROR SHOULDNT HAPPEN");
    }
}

export function get_pathfinder(m) {
    switch (m.mission) {
        case constants.GATHER:
            if (m.initial_mission === undefined) {
                m.initial_mission = m.mission;
            }
            m.pathfinder = new Pathfinder(m, every_pred(m));
            m.mission = constants.GATHER;
            break;
        case constants.DEPOSIT:
            m.pathfinder = new Pathfinder(m, around_pred(m.deposit_loc.x, m.deposit_loc.y, 1, 2));
            m.pathfinder.final_loc = [m.deposit_loc.x, m.deposit_loc.y];
            break;
        case constants.GATHER_KARB:
            if (m.initial_mission === undefined) {
                m.initial_mission = m.mission;
            }
            m.pathfinder = new Pathfinder(m, karbonite_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            break;
        case constants.CHURCH:
            m.castleTalk(encode8("watch_me"));
            m.pathfinder = new Pathfinder(m, exact_pred(...m.church));
            break;
        case constants.GATHER_FUEL:
            if (m.initial_mission === undefined) {
                m.initial_mission = m.mission;
            }
            m.pathfinder = new Pathfinder(m, fuel_pred(m));
            //m.pathfinder = new Pathfinder(m, every_pred(m));
            break;
        default:
            m.log("ERROR SHOULDNT HAPPEN");
    }
}

export function build_church(m) {
    m.hasChurch = true;
    let dir = open_neighbors2(m, m.me.x, m.me.y);
    if (dir.length === 0) {
        m.mission = constants.DEPOSIT;
        get_pathfinder(m);
        return;
    }
    let dr = dir[0];
    for (let i = 0; i < dir.length; i++) {
        // m.log("CHOICE: " + dir[i]);
        if (idx(m.karbonite_map, ...dir[i]) || idx(m.fuel_map, ...dir[i])) continue;
        dr = dir[i];
        break;
    }
    m.church_loc = dr;
    m.diff_church_loc = [dr[0] - m.me.x, dr[1] - m.me.y];
    if (m.karbonite >= unit_cost(SPECS.CHURCH)[0] && m.fuel >= unit_cost(SPECS.CHURCH)[1]) {
        m.mission = constants.GATHER;
        m.deposit_loc = { x: dr[0], y: dr[1] };
        m.signal(encode16("task", constants.EVENT), 2);
        return m.buildUnit(SPECS.CHURCH, ...m.diff_church_loc);
    }
    m.church_loc = undefined;
    return;
}

export function handleGather(m) {
    if (m.me.karbonite === m.stats.KARBONITE_CAPACITY || m.me.fuel === m.stats.FUEL_CAPACITY) {
        if (m.initial_mission === undefined) {
            m.initial_mission = m.mission;
        }
        m.mission = constants.DEPOSIT;
        get_pathfinder(m);
        let nextt = m.pathfinder.next_loc(m);
        if (nextt.fin) {
            m.mission === constants.GATHER;
            return m.give(m.pathfinder.final_loc[0] - m.me.x, m.pathfinder.final_loc[1] - m.me.y, m.me.karbonite, m.me.fuel);
        }
        else if (nextt.fail) {
            m.pathfinder.recalculate(m);
            return true;
        }
        else if (nextt.wait) {
            return true;
        }
        else {
            if (m.initial_mission === undefined) {
                m.initial_mission = m.mission;
            }
            m.mission = constants.DEPOSIT;
            get_pathfinder(m);
            let nextt = m.pathfinder.next_loc(m);
            if (nextt.fin) {
                m.mission === constants.GATHER;
                return m.give(m.pathfinder.final_loc[0] - m.me.x, m.pathfinder.final_loc[1] - m.me.y, m.me.karbonite, m.me.fuel);
            }
            else if (nextt.fail) {
                m.pathfinder.recalculate(m);
                return true;
            }
            else if (nextt.wait) {
                return true;
            }
            else {
                return m.move(...nextt.diff);
            }
        }
    }
    else {
        if (m.fuel > SPECS.MINE_FUEL_COST) {
            if (idx(m.fuel_map, m.me.x, m.me.y) || idx(m.karbonite_map, m.me.x, m.me.y))
                return m.mine();
            else {
                m.pathfinder.recalculate(m);
            }
        }
        else {
            m.log("NOT ENOUGH FUEL TO MINE");
            return true;
        }
    }
}

export function handleDeposit(m) {
    if (m.initial_mission === undefined) {
        m.mission = constants.GATHER;
        m.initial_mission = m.mission;
    }
    else
        m.mission = m.initial_mission;
    let dx = m.pathfinder.final_loc[0] - m.me.x;
    let dy = m.pathfinder.final_loc[1] - m.me.y;
    get_pathfinder(m);
    //m.log("GIVING IN DIRECTION: " + dx + " " + dy);
    if (idx(m.visible_map, m.me.x + dx, m.me.y + dy) === 0) {
        m.log("CASTLE DIED: BUILDING CHURCH");
        return m.buildUnit(SPECS.CHURCH, dx, dy);
    }
    return m.give(dx, dy, m.me.karbonite, m.me.fuel);
}

export function handleOther(m) {
    return;
}
