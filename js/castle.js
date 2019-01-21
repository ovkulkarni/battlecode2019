import { SPECS } from 'battlecode';
import { open_neighbors_diff, most_central_loc, calcOpposite, dis, current_stash, visible_ally_attackers, getDef } from './helpers.js';
import { encode8, decode8, encode16 } from "./communication.js";
import { constants } from "./constants.js";
import { best_fuel_locs, best_karb_locs, find_optimal_churches, optimal_attack_diff } from './analyzemap.js';
import { PriorityQueue } from './pqueue.js';
import { EventHandler } from './eventhandler.js';

export function runCastle(m) {
    //m.log(`CASTLE [${m.me.turn}]: (${m.me.x}, ${m.me.y})`);

    if (m.me.turn === 1) {
        set_globals(m);
    }

    if (m.new_event_available) {
        m.new_event_available = false;
        new_event(m);
    }
    handle_castle_talk(m);
    send_castle_coord(m);

    if (m.me.turn === 3) {
        m.resource_groups = find_optimal_churches(m);
        create_event_handler(m);
    }
    determine_mission(m);

    // first turn logic
    if (m.me.turn === 1) {
        initialize_queue(m);
    }

    let att = optimal_attack_diff(m);
    if (att)
        return m.attack(...att);

    if (handle_horde(m)) {
        return;
    }

    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = pick_unit(m);
    let result;
    if (unit !== undefined) {
        let leftover_k = m.karbonite - unit_cost(unit.unit)[0];
        let leftover_f = m.fuel - unit_cost(unit.unit)[1];
        if (!m.paused &&
            build_opts.length > 0 &&
            leftover_k >= 0 && leftover_f >= 0 &&
            !(m.mission === constants.DEFEND && unit.task !== constants.DEFEND) &&
            (m.event === undefined || (m.event.who === m.me.id && leftover_k >= m.event.blocking)
                || leftover_k >= (m.event.blocking + current_stash(m))
                || unit.priority >= constants.EMERGENCY_PRIORITY)
        ) {
            let build_loc = most_central_loc(m, build_opts);
            //m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            //m.log(`SENDING TASK ${unit.task}`);
            switch (unit.task) {
                case constants.HORDE:
                    m.current_horde++; break;
            }
            let msg = 0;
            if (unit.task === constants.CHURCH)
                msg = encode16("build_church", ...unit.loc);
            else
                msg = encode16("task", unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            result = m.buildUnit(unit.unit, ...build_loc);
        } else {
            //m.log(`FAILED BUILD ATTEMPT: ${JSON.stringify(unit)}`);
            m.queue.push(unit);
        }
    }
    if (m.event && m.event.who === m.me.id && m.event.what === constants.CLEAR_QUEUE && m.queue.isEmpty()) {
        event_complete(m);
    }
    return result;
}

function pick_unit(m) {
    update_queue(m);
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
}

function update_queue(m) {
    if (m.mission === constants.DEFEND) {
        //m.log("DEFENDING");
        const defenders = [SPECS.PREACHER, SPECS.PROPHET];
        for (let d of defenders) {
            if (m.karbonite >= unit_cost(d)[0]) {
                m.queue.push(Unit(d, constants.DEFEND, constants.EMERGENCY_PRIORITY + 1));
                break;
            }
        }
    }
    // restore pilgrims
    const visible_pilgrims = m.visible_allies.filter(r => r.unit === SPECS.PILGRIM).length;
    const desired_pilgrims = m.fuel_locs.length + m.karb_locs.length;
    //m.log("VISIBLE: " + (visible_pilgrims+getDef(m.queue.unit_count, SPECS.PILGRIM, 0)) + " DESIRED: " + desired_pilgrims);
    //if(visible_pilgrims === 0) initialize_queue(m);
    //else
    while (getDef(m.queue.unit_count, SPECS.PILGRIM, 0) + visible_pilgrims < desired_pilgrims) {
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER, 4));
    }
    // restore defense
    const current_defenders = visible_ally_attackers(m).length - m.current_horde;
    const desired_defenders = Math.floor(m.me.turn / 50)*1 + 3;
    while (getDef(m.queue.task_count, constants.DEFEND, 0) + current_defenders < desired_defenders) {
        m.queue.push(Unit(random_defender(m), constants.DEFEND, 5));
    }
}

function initialize_queue(m) {
    for (let i = 0; i < m.karb_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_KARB, 6));
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_FUEL, 3));
    for (let i = 0; i < 3; i++)
        m.queue.push(Unit(SPECS.PROPHET, constants.DEFEND, 4));
}

function handle_horde(m) {
    if (check_horde(m) && m.event.who === m.me.id) {
        let best_e_loc;
        let best_e_id;
        let min_distance = 64 * 64 + 1;
        for (let e_id in m.enemy_castles) {
            let distance = dis(
                m.me.x, m.me.y,
                m.enemy_castles[e_id].x, m.enemy_castles[e_id].y
            );
            if (distance < min_distance) {
                min_distance = distance;
                best_e_loc = [m.enemy_castles[e_id].x, m.enemy_castles[e_id].y];
                best_e_id = e_id;
            }
        }
        m.log(`SENDING HORDE TO ${JSON.stringify(best_e_loc)} opposite ${best_e_id} (${JSON.stringify(m.friendly_ids)}`);

        //todo only send as far as u have to
        m.log("SENDING HORDE OF SIZE: " + m.current_horde);
        m.signal(encode16("send_horde", ...best_e_loc, m.friendly_ids.indexOf(`${best_e_id}`)), 20 * 20);
        if (m.max_horde_size < m.ultimate_horde_size)
            m.max_horde_size += 2;
        m.current_horde = 0;

        event_complete(m);
        return true;
    }
}

function determine_mission(m) {
    let prev_mission = m.mission;
    if (m.visible_enemies.length > 0) {
        m.mission = constants.DEFEND;
        if (prev_mission !== constants.DEFEND) {
            m.log(`I'm under attack! (${m.me.turn})`);
            m.my_pause = true;
            m.castleTalk(encode8("pause"));
        }
    }
    else {
        m.mission = constants.NEUTRAL;
        if (prev_mission !== constants.NEUTRAL)
            m.log(`NEUTRAL (${m.me.turn})`);
        while (!m.queue.isEmpty()) {
            let unit = m.queue.peek();
            if (unit.priority >= constants.EMERGENCY_PRIORITY && unit.task === constants.DEFEND) {
                m.queue.pop();
            } else { break; }
        }
        if (m.my_pause) {
            m.castleTalk(encode8("unpause"));
            m.my_pause = false;
        }
    }
}

function handle_castle_talk(m) {
    let alive = {};
    let event_complete_flag;
    let event_failed_flag = false;
    for (let r of m.visible_allies) {
        if (r.castle_talk !== 0) {
            let message = decode8(r.castle_talk);
            let log_recieve = true;
            switch (message.command) {
                case "castle_coord":
                    handle_castle_coord(m, r, message); break;
                case "event_complete":
                    event_complete_flag = true;
                    if (m.friendly_castles[r.id] === undefined) {
                        m.log("CHURCH LOCATED  EVENT: " + JSON.stringify(m.event));
                        m.friendly_churches[r.id] = { x: m.event.where[0], y: m.event.where[1] };
                    }
                    break;
                case "castle_killed":
                    let c_id = m.friendly_ids[message.args[0]];
                    m.log(`CASTLE OPPOSITE ${c_id} WAS KILLED`);
                    delete m.enemy_castles[c_id];
                    break;
                case "watch_me":
                    if (m.watch_out) {
                        m.watch_me = r.id;
                        m.watch_out = false;
                    } else { log_recieve = false; }
                    break;
                case "pause":
                    m.paused = true;
                    m.paused_by = r.id;
                    break;
                case "unpause":
                    m.paused = false;
                    break;
                case "came_back":
                    if (r.dist <= 36)
                        m.current_horde++;
                    break;
            }
            if (log_recieve)
                m.log(`RECEIVED (${message.command} ${message.args}) FROM ${r.id}`);
        }
        alive[r.id] = true;
    }

    // delete dead castles
    let to_delete = [];
    for (let id in m.friendly_castles) {
        if (id - 0 === m.me.id) continue;
        if (alive[id] === undefined) {
            to_delete.push(id);
            if (m.event !== undefined && m.event.who === id - 0)
                event_complete_flag = true;
        }
    }
    for (let id of to_delete) {
        delete m.friendly_castles[id];
        m.log("DEATH OF " + id);
        if (m.paused && m.paused_by === (id - 0)) {
            m.paused = false;
            m.log("UNPAUSED");
        }
    }

    // delete dead churches
    to_delete = [];
    for (let id in m.friendly_churches) {
        if (id - 0 === m.me.id) continue;
        if (alive[id] === undefined) {
            to_delete.push(id);
            if (m.event !== undefined && m.event.who === id - 0)
                event_complete_flag = true;
        }
    }
    for (let id of to_delete) {
        delete m.friendly_churches[id];
        m.log("DEATH OF " + id);
        if (m.paused && m.paused_by === (id - 0)) {
            m.paused = false;
            m.log("UNPAUSED");
        }
    }

    // check on m.watch_me
    if (m.watch_me !== undefined && alive[m.watch_me] === undefined) {
        m.watch_me = undefined;
        event_complete_flag = true;
        event_failed_flag = true;
    }

    // complete the event!
    if (event_complete_flag) {
        event_complete(m, event_failed_flag);
    }
}

function event_complete(m, failed = false) {
    if (m.event !== undefined) {
        if (m.event.who === m.me.id && !(m.event.what === constants.BUILD_CHURCH && !failed)) {
            m.log("Sending event_complete");
            m.castleTalk(encode8("event_complete"));
        }
    }
    m.new_event_available = true;
}

function new_event(m) {
    // load new event
    m.event = m.event_handler.next_event(m);
    //m.log(`NEW EVENT ${JSON.stringify(m.event)}`);
    // clear watch_me
    m.watch_me = undefined;
    // initial reaction to event
    if (m.event.who === m.me.id) {
        m.log(`[${m.me.turn}] NEW EVENT ${JSON.stringify(m.event)}`);
        switch (m.event.what) {
            case constants.ATTACK:
                for (let i = 0; i < m.max_horde_size; i++) {
                    m.queue.push(Unit(SPECS.PROPHET, constants.HORDE, 2));
                }
                break;
            case constants.BUILD_CHURCH:
                m.watch_out = true;
                m.queue.push(Unit(SPECS.PILGRIM, constants.CHURCH, constants.EMERGENCY_PRIORITY - 1, m.event.where));
                break;
            case constants.CLEAR_QUEUE:
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
    if (m.friendly_castles[r.id] === undefined) {
        m.friendly_castles[r.id] = {}
    }
    if (m.friendly_castles[r.id].x === undefined)
        m.friendly_castles[r.id].x = message.args[0];
    else if (m.friendly_castles[r.id].y === undefined) {
        m.friendly_castles[r.id].y = message.args[0];
        let x = m.friendly_castles[r.id].x;
        let y = m.friendly_castles[r.id].y;
        let opp = calcOpposite(m, x, y);
        m.enemy_castles[r.id] = { x: opp[0], y: opp[1] };
    }
    if (m.friendly_ids.indexOf(`${r.id}`) === -1)
        m.friendly_ids.push(`${r.id}`);
    m.friendly_ids.sort((a, b) => parseInt(a) - parseInt(b));
}

function create_event_handler(m) {
    m.event_handler = new EventHandler();
    new_event(m);
}

function set_globals(m) {
    m.queue = new PriorityQueue((a, b) => a.priority > b.priority);

    m.friendly_castles = {};
    m.friendly_churches = {};
    m.friendly_castles[m.me.id] = { x: m.me.x, y: m.me.y };

    m.enemy_castles = {};
    let opp = calcOpposite(m, m.me.x, m.me.y);
    m.enemy_castles[m.me.id] = { x: opp[0], y: opp[1] };

    m.fuel_locs = best_fuel_locs(m);
    m.karb_locs = best_karb_locs(m);
    m.mission = constants.NEUTRAL;
    m.max_horde_size = 8;
    m.ultimate_horde_size = Math.ceil(Math.max(m.map.length, m.map[0].length) / 4);
    m.current_horde = 0;
    m.friendly_ids = [`${m.me.id}`];
}

export function check_horde(m) {
    return m.current_horde >= m.max_horde_size;
}

function Unit(unit, task, priority, loc) {
    return { unit: unit, task: task, priority: priority, loc: loc }
}

export function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}

export function random_defender(m) {
    let preachers = m.visible_allies.filter(r => r.unit === SPECS.PREACHER).length;
    let prophets = m.visible_allies.filter(r => r.unit === SPECS.PROPHET).length;
    /*if ((preachers / prophets) < 0.5)
        return SPECS.PREACHER;
    */
    return SPECS.PROPHET;
}
