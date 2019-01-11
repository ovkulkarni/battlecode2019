import { SPECS } from 'battlecode';
import { open_neighbors_diff } from './helpers.js';
import { encode8, decode8, encode16, decode16 } from "./communication.js";
import { constants } from "./constants.js";
import { best_fuel_locs } from './analyzemap.js';
import { PriorityQueue } from './pqueue.js';

export function runCastle(m) {
    m.log(`CASTLE: (${m.me.x}, ${m.me.y})`);

    // set "global" variables
    m.kstash = 50;
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
        m.log(`Good Fuel Locs: ${JSON.stringify(m.fuel_locs)}`);
    }

    let flag = constants.FIRST_CHURCH;

    // handle castle-talk
    for (let r of m.visible_allies) {
        if (r.castle_talk !== 0) {

            let message = decode8(r.castle_talk);
            m.log(`RECEIVED (${message.command} ${message.args}) FROM ${r.id}`);

            if (message.command === "defend") {
                m.mission = constants.DEFEND;
            } else if (message.command === "castle_coord") {
                handle_castle_coord(m, r, message);
                if(flag === constants.FIRST_CHURCH) flag = constants.FIRST_NOT_CHURCH;
            }
            if(message.command === "firstdone") {
                // m.startBuilding = true;
            }

            if (m.me.turn === 1)
                flag = constants.FIRST_NOT_CHURCH;
        }
    }

    send_castle_coord(m);

    // first turn logic
    if (m.me.turn === 1) {
        initializeQueue(m, flag);
    }
    m.log("BUILD UNIT");
    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = what_unit(m);
    m.log("UNIT: " + unit);
    if (unit !== undefined && build_opts.length > 0) {
        if (m.karbonite >= unit_cost(unit.unit)[0] + m.kstash && m.fuel >= unit_cost(unit.unit)[1]) {
            let build_loc = build_opts[Math.floor(Math.random() * build_opts.length)];
            m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            // Figure Out Transmitting o.task
            let msg = encode16("task", unit.task);
            m.log("SENDING " + msg + " SIGNAL FOR GUY WITH TASK " + unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            // if(m.me.turn === 1) m.startBuilding = false;
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            m.log(m.me.karbonite + " Not enough karbonite");
            m.queue.push(unit);
        }
    }
    return;
}

export function what_unit(m) {
    if (!m.queue.isEmpty()) {
        return m.queue.pop();
    }
}

export function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
}

function Unit(unit, task, priority) {
    return { unit: unit, task: task, priority: priority };
}

function initializeQueue(m, flag) {
    if (flag === constants.FIRST_CHURCH) {
        m.queue.push(Unit(SPECS.PILGRIM, constants.CHURCH_KARB, 8));
    }
    for (let i = 0; i < m.fuel_locs.length; i++)
        m.queue.push(Unit(SPECS.PILGRIM, constants.GATHER_FUEL, 1));
}

function handle_castle_coord(m, r, message) {
    if (m.friendly_castles[r.id] === undefined)
        m.friendly_castles[r.id] = {}
    if (m.friendly_castles[r.id].x === undefined)
        m.friendly_castles[r.id].x = message.args[0];
    else if (m.friendly_castles[r.id].y === undefined)
        m.friendly_castles[r.id].y = message.args[0];
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
