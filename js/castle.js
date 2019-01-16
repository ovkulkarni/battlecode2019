import { SPECS } from 'battlecode';
import { open_neighbors_diff, random_from, most_central_loc, calcOpposite, stash_condition, dis } from './helpers.js';
import { encode8, decode8, encode16, decode16 } from "./communication.js";
import { constants } from "./constants.js";
import { best_fuel_locs, best_karb_locs } from './analyzemap.js';
import { PriorityQueue } from './pqueue.js';

export function runCastle(m) {
    m.log(`CASTLE: (${m.me.x}, ${m.me.y})`);

    set_globals(m);
    handle_kstash(m);
    handle_castle_talk(m);
    send_castle_coord(m);
    determine_mission(m);

    // first turn logic
    if (m.me.turn === 1) {
        initialize_queue(m);
    }

    if (handle_horde(m)) {
        return;
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit(m);
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost(unit.unit)[1];
        if (
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0 &&
            (leftover_k >= m.kstash || unit.priority >= constants.EMERGENCY_PRIORITY)
        ) {
            let build_loc = most_central_loc(m, build_opts);
            m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            m.log(`SENDING TASK ${unit.task}`);
            if (unit.task === constants.HORDE) {
                m.current_horde++;
            }
            let msg = encode16("task", unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
            m.queue.push(unit);
        }
    }
    return;
}

function pick_unit(m) {
    update_queue(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
    // TODO: Remove this once we have better logic for when to spawn a crusader
    return Unit(SPECS.CRUSADER, constants.HORDE, 8);
}

function update_queue(m) {
    if (m.kstash > 0 && m.church_flag === constants.FIRST_CHURCH) {
        m.log("CHURCH PILGRIM QUEUED");
        m.queue.push(Unit(SPECS.PILGRIM, constants.CHURCH_KARB, 2));
        m.church_flag = constants.FIRST_NOT_CHURCH;
    }
    if (m.mission === constants.DEFEND) {
        m.queue.push(Unit(SPECS.PREACHER, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
        const current_defenders = m.visible_allies.length;
        const desired_defenders = Math.floor(m.visible_enemies.length * constants.DEFENSE_RATIO);
        while (m.queue.task_count.get(constants.DEFEND) + current_defenders < desired_defenders) {
            m.log("QUEUE DEFENDER!");
            m.queue.push(Unit(SPECS.PREACHER, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
        }
    }
    const visible_pilgrims = m.visible_allies.filter(r => r.unit === SPECS.PILGRIM).length;
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    while (m.queue.unit_count.get(SPECS.PILGRIM) + visible_pilgrims < desired_pilgrims) {
        m.log("QUEUE PILGRIM!");
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER, 10));
    }
}

function initialize_queue(m) {
    for (let i = 0; i < m.karb_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_KARB, 1.5));
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_FUEL, 1));
    m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 3));
}

function handle_horde(m) {
    if (check_horde(m)) {
        let opp = calcOpposite(m, m.me.x, m.me.y);
        m.log(`SENDING OUT LOCATION ${JSON.stringify(opp)}`);
        //todo only send as far as u have to
        m.signal(encode16("send_horde", ...opp), 100);
        m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 3));
        m.horde_size += 2;
        m.current_horde = 0;
        return true;
    }
}

function determine_mission(m) {
    if (m.visible_enemies.length > 0) {
        m.log("I'm being attacked! Ow.");
        m.mission = constants.DEFEND;
    }
    else {
        m.mission = constants.NEUTRAL;
    }
}

function handle_castle_talk(m) {
    for (let r of m.visible_allies) {
        if (r.castle_talk !== 0) {

            let message = decode8(r.castle_talk);
            m.log(`RECEIVED (${message.command} ${message.args}) FROM ${r.id}`);

            if (message.command === "castle_coord") {
                handle_castle_coord(m, r, message);
                if (m.church_flag === constants.FIRST_CHURCH)
                    m.church_flag = constants.FIRST_NOT_CHURCH;
            }
            if (message.command === "firstdone") {
                // m.startBuilding = true;
            }

            if (m.me.turn === 1)
                m.church_flag = constants.FIRST_NOT_CHURCH;
        }
    }
}

function send_castle_coord(m) {
    if (m.sent_x_coord === undefined) {
        m.sent_x_coord = true;
        let msg = encode8("castle_coord", m.me.x);
        m.log(`Sending ${msg} as x-coordinate`);
        m.castleTalk(msg);
    }
    else if (m.sent_y_coord === undefined) {
        m.sent_y_coord = true;
        let msg = encode8("castle_coord", m.me.y);
        m.log(`Sending ${msg} as y-coordinate`);
        m.castleTalk(msg);
    }
    else {
        m.log(`Friendlies: ${JSON.stringify(m.friendly_castles)}`);
    }
}

function handle_castle_coord(m, r, message) {
    if (m.friendly_castles[r.id] === undefined)
        m.friendly_castles[r.id] = {}
    if (m.friendly_castles[r.id].x === undefined)
        m.friendly_castles[r.id].x = message.args[0];
    else if (m.friendly_castles[r.id].y === undefined)
        m.friendly_castles[r.id].y = message.args[0];
}

function set_globals(m) {
    if (m.kstash === undefined) {
        m.kstash = 0;
    }
    if (m.queue === undefined) {
        m.queue = new PriorityQueue((a, b) => a.priority > b.priority);
    }
    if (m.friendly_castles === undefined) {
        m.friendly_castles = {}
    }
    if (m.mission === undefined) {
        m.mission = constants.NEUTRAL;
    }
    if (m.fuel_locs === undefined) {
        m.fuel_locs = best_fuel_locs(m);
    }
    if (m.karb_locs === undefined) {
        m.karb_locs = best_karb_locs(m);
    }
    if (m.mission === undefined) {
        m.mission = constants.NEUTRAL;
    }
    if (m.church_flag === undefined) {
        m.church_flag = constants.FIRST_CHURCH;
    }
    if (m.horde_size === undefined) {
        m.horde_size = 4;
    }
    if (m.current_horde === undefined) {
        m.current_horde = 0;
    }
}

export function check_horde(m) {
    return m.current_horde >= m.horde_size;
}

function handle_kstash(m) {
    if (stash_condition(m)) {
        m.log("KSTASH");
        m.kstash = 50;
    } else {
        m.kstash = 0;
    }
}

function Unit(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

export function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}
