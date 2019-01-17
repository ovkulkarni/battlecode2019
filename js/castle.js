import { SPECS } from 'battlecode';
import { open_neighbors_diff, most_central_loc, calcOpposite, dis } from './helpers.js';
import { encode8, decode8, encode16 } from "./communication.js";
import { constants } from "./constants.js";
import { best_fuel_locs, best_karb_locs } from './analyzemap.js';
import { PriorityQueue } from './pqueue.js';
import { EventHandler } from './eventhandler.js';

export function runCastle(m) {
    //m.log(`CASTLE [${m.me.turn}]: (${m.me.x}, ${m.me.y})`);

    if (m.me.turn === 1) {
        set_globals(m);
    }

    handle_castle_talk(m);
    send_castle_coord(m);

    if (m.me.turn === 3) {
        create_event_handler(m);
    }
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
            (m.event === undefined || !m.event.blocking || unit.priority >= constants.EMERGENCY_PRIORITY)
        ) {
            let build_loc = most_central_loc(m, build_opts);
            //m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            //m.log(`SENDING TASK ${unit.task}`);
            if (unit.task === constants.HORDE) {
                m.current_horde++;
            }
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

function pick_unit(m) {
    update_queue(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
    // TODO: Remove this once we have better logic for when to spawn a crusader
    // return Unit(SPECS.PREACHER, constants.HORDE, 8);
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
    while (m.queue.unit_count.get(SPECS.PILGRIM) + visible_pilgrims < desired_pilgrims) {
        //m.log("QUEUE PILGRIM!");
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
    if (check_horde(m) && m.event.who === m.me.id) {
        let best_e_loc;
        let min_distance = 64 * 64 + 1;
        for (let a_id in m.friendly_castles) {
            for (let e_id in m.enemy_castles) {
                let distance = dis(
                    m.friendly_castles[a_id].x, m.friendly_castles[a_id].y,
                    m.enemy_castles[e_id].x, m.enemy_castles[e_id].y
                );
                if (distance < min_distance) {
                    min_distance = distance;
                    best_e_loc = [m.enemy_castles[e_id].x, m.enemy_castles[e_id].y];
                }
            }
        }
        m.log(`SENDING HORDE TO ${JSON.stringify(best_e_loc)}`);

        //todo only send as far as u have to
        m.signal(encode16("send_horde", ...best_e_loc, Object.keys(m.friendly_castles).indexOf(`${m.me.id}`)), 100);
        m.max_horde_size += 2;
        m.current_horde = 0;

        event_complete(m);
        return true;
    }
}

function determine_mission(m) {
    if (m.visible_enemies.length > 0) {
        if (m.mission !== constants.DEFEND) {
            m.log("I'm under attack!");
        }
        m.mission = constants.DEFEND;
    }
    else {
        m.mission = constants.NEUTRAL;
    }
}

function handle_castle_talk(m) {
    let alive_castle = {};
    let event_complete_flag;
    for (let r of m.visible_allies) {
        if (r.castle_talk !== 0) {

            let message = decode8(r.castle_talk);
            m.log(`RECEIVED (${message.command} ${message.args}) FROM ${r.id}`);

            if (message.command === "castle_coord") {
                handle_castle_coord(m, r, message);
            }
            if (message.command === "event_complete") {
                event_complete_flag = true;
            }
            if (message.command === "castle_killed") {
                let c_id = Object.keys(m.friendly_castles)[message.args[0]];
                m.log(`CASTLE OPPOSITE ${c_id} WAS KILLED`);
                delete m.enemy_castles[c_id];
            }

            if (m.me.turn === 1)
                m.church_flag = constants.FIRST_NOT_CHURCH;

        }
        if (m.friendly_castles[r.id] !== undefined) {
            alive_castle[r.id] = true;
        }
    }

    let to_delete = [];
    for (let id in m.friendly_castles) {
        if (id - 0 === m.me.id) continue;
        if (alive_castle[id] === undefined) {
            to_delete.push(id);
            if (m.event !== undefined && m.event.who === id - 0)
                event_complete_flag = true;
        }
    }
    for (let id of to_delete) {
        delete m.friendly_castles[id];
        m.log("DEATH OF " + id);
    }

    if (event_complete_flag) {
        event_complete(m);
    }
}

function event_complete(m) {
    if (m.event !== undefined) {
        if (m.event.who === m.me.id) {
            m.log("Sending event_complete");
            m.castleTalk(encode8("event_complete"));
        }
        // bolster defenses
        m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 3));
    }
    // load new event
    m.event = m.event_handler.next_event(m);
    m.log(`NEW EVENT ${JSON.stringify(m.event)}`);
    // initial reaction to event
    if (m.event.who === m.me.id) {
        switch (m.event.what) {
            case constants.ATTACK:
                for (let i = 0; i < m.max_horde_size; i++) {
                    m.queue.push(Unit(SPECS.PREACHER, constants.HORDE, 8));
                }
                break;
            case constants.BUILD_CHURCH:
                m.queue.push(Unit(SPECS.PILGRIM, constants.CHURCH_KARB, constants.EMERGENCY_PRIORITY));
                break;
            default:
                m.log(`SWITCH STATEMENT ERROR ${m.event.what}`);
        }
    }
}

function send_castle_coord(m) {
    if (m.sent_x_coord === undefined) {
        m.sent_x_coord = true;
        let msg = encode8("castle_coord", m.me.x);
        //m.log(`Sending ${msg} as x-coordinate`);
        m.castleTalk(msg);
    }
    else if (m.sent_y_coord === undefined) {
        m.sent_y_coord = true;
        let msg = encode8("castle_coord", m.me.y);
        //m.log(`Sending ${msg} as y-coordinate`);
        m.castleTalk(msg);
    }
    else {
        //m.log(`Friendlies: ${JSON.stringify(m.friendly_castles)}`);
    }
}

function handle_castle_coord(m, r, message) {
    if (m.friendly_castles[r.id] === undefined)
        m.friendly_castles[r.id] = {}
    if (m.friendly_castles[r.id].x === undefined)
        m.friendly_castles[r.id].x = message.args[0];
    else if (m.friendly_castles[r.id].y === undefined) {
        m.friendly_castles[r.id].y = message.args[0];
        let x = m.friendly_castles[r.id].x;
        let y = m.friendly_castles[r.id].y;
        let opp = calcOpposite(m, x, y);
        m.enemy_castles[r.id] = { x: opp[0], y: opp[1] };
    }

}

function create_event_handler(m) {
    m.event_handler = new EventHandler();
    event_complete(m);
}

function set_globals(m) {
    m.queue = new PriorityQueue((a, b) => a.priority > b.priority);

    m.friendly_castles = {};
    m.friendly_castles[m.me.id] = { x: m.me.x, y: m.me.y };

    m.enemy_castles = {};
    let opp = calcOpposite(m, m.me.x, m.me.y);
    m.enemy_castles[m.me.id] = { x: opp[0], y: opp[1] };

    m.fuel_locs = best_fuel_locs(m);
    m.karb_locs = best_karb_locs(m);
    m.mission = constants.NEUTRAL;
    m.max_horde_size = 4;
    m.current_horde = 0;
}

export function check_horde(m) {
    return m.current_horde >= m.max_horde_size;
}

function Unit(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

export function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}
