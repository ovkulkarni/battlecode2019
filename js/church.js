import { SPECS } from 'battlecode';
import { open_neighbors_diff, random_from, most_central_loc, getDef } from './helpers.js';
import { encode8, decode8, encode16, decode16 } from "./communication.js";
import { constants } from "./constants.js";
import { best_fuel_locs, best_karb_locs } from './analyzemap.js';
import { PriorityQueue } from './pqueue.js';

export function runChurch(m) {
    //m.log(`CHURCH: (${m.me.x}, ${m.me.y})`);

    if (m.me.turn === 1) {
        set_globals(m);
    }

    determine_mission(m);
    if (m.me.turn === 1) {
        initialize_queue(m);
    }

    // first turn logic
    if (!m.send_complete && m.queue.isEmpty()) {
        m.log("[CHURCH] Sending Event_complete");
        m.castleTalk(encode8("event_complete"));
        m.send_complete = true;
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit(m);
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost(unit.unit)[1];
        if (
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0
        ) {
            let build_loc = most_central_loc(m, build_opts);
            //m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            //m.log(`SENDING TASK ${unit.task}`);
            let msg = encode16("task", unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            //m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
            m.queue.push(unit);
        }
    }
    return;
}

export function pick_unit(m) {
    update_queue(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
}

function update_queue(m) {
    if (m.mission === constants.DEFEND) {
        const current_defenders = m.visible_allies.length;
        const desired_defenders = Math.floor(m.visible_enemies.length * constants.DEFENSE_RATIO);
        while (m.queue.task_count.get(constants.DEFEND) + current_defenders < desired_defenders) {
            //m.log("QUEUE DEFENDER!");
            m.queue.push(Unit(SPECS.PREACHER, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
        }
    }
    const visible_pilgrims = m.visible_allies.filter(r => r.unit === SPECS.PILGRIM).length;
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    while (getDef(m.queue.unit_count, SPECS.PILGRIM, 0) + visible_pilgrims < desired_pilgrims) {
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER, 3));
    }
}

function initialize_queue(m) {
    m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 3));
    for (let i = 0; i < m.karb_locs.length - 1; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_KARB, 3));
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_FUEL, 1));
}

function determine_mission(m) {
    let prev_mission = m.mission;
    if (m.visible_enemies.length > 0) {
        m.mission = constants.DEFEND;
        if (prev_mission !== constants.DEFEND) {
            m.log("I'm under attack!");
        }
    }
    else {
        m.mission = constants.NEUTRAL;
        while (!m.queue.isEmpty()) {
            let unit = m.queue.peek();
            if (unit.priority >= constants.EMERGENCY_PRIORITY && m.task === constants.DEFEND) {
                m.queue.pop();

            } else {
                break;
            }
        }
    }
}

function set_globals(m) {
    m.queue = new PriorityQueue((a, b) => a.priority > b.priority);
    m.mission = constants.NEUTRAL;
    m.fuel_locs = best_fuel_locs(m);
    m.karb_locs = best_karb_locs(m);
}

function Unit(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

export function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}
