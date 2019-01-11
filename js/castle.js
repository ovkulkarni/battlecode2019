import { SPECS } from 'battlecode';
import { open_neighbors_diff } from './helpers.js';
import { encode8, decode8, encode16, decode16 } from "./communication.js";
import { constants } from "./constants.js";

export function runCastle(m) {
    m.log(`CASTLE: (${m.me.x}, ${m.me.y})`);
    if (m.friendly_castles === undefined) {
        m.friendly_castles = {}
    }

    if (m.mission === undefined)
        m.mission = constants.NEUTRAL;

    for (let r of m.visible_allies) {
        if (r.castle_talk !== 0) {
            let message = decode8(r.castle_talk);
            m.log(`RECEIVED (${message.command} ${message.args}) FROM ${r.id}`);
            if (message.command === "defend")
                m.mission = constants.DEFEND;
            if (message.command === "castle_coord") {
                handle_castle_coord(m, r, message)
            }
            if (message.command === "firstdone") {
                m.fdone = true;
            }
            if (message.command === "stopbuild" && !(m.fdone === true)) {
                m.fdone = false;
            }
        }
    }

    send_castle_coord(m);

    m.log("BUILD UNIT");
    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = what_unit(m);
    m.log("UNIT: " + unit);
    if (unit.unit !== undefined && build_opts.length > 0) {
        if (m.karbonite >= unit_cost(unit.unit)[0] && m.fuel >= unit_cost(unit.unit)[1]) {
            let build_loc = build_opts[Math.floor(Math.random() * build_opts.length)];
            m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            // Figure Out Transmitting o.task
            let msg = encode16("task", unit.task);
            m.log("SENDING " + msg + " SIGNAL FOR GUY WITH TASK " + unit.task);
            m.signal(msg, build_loc[0] ** 2 + build_loc[1] ** 2);
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            m.log(m.me.karbonite + " Not enough karbonite");
        }
    }
    return;
}

export function what_unit(m) {
    let o = {};
    if (m.fdone === undefined) {
        m.fdone = false;
        o.unit = SPECS.PILGRIM;
        o.task = constants.CHURCH_KARB;
        m.log("FIRST UNIT BUILDiNG");
        let msg = encode8("stopbuild", 0);
        m.castleTalk(msg);
        return o;
    }
    if (m.fdone) {
        if (m.karbonite < constants.MIN_KARB || m.fuel < constants.MIN_FUEL) {
            o.unit = SPECS.PILGRIM;
            o.task = constants.GATHER;
            return o;
        }
        if (m.mission === constants.DEFEND) {
            o.unit = SPECS.PROPHET;
            o.task = constants.DEFEND;
            return o;
        }
        if (Math.random() < 0.1) {
            o.unit = SPECS.PROPHET;
            o.task = constants.ATTACK;
        }
        else {
            o.unit = SPECS.CRUSADER;
            o.task = constants.ATTACK;
        }
        return o;
    }
    m.log("WHY");
    return o;
}

export function unit_cost(b) {
    return [SPECS.UNITS[b].CONSTRUCTION_KARBONITE, SPECS.UNITS[b].CONSTRUCTION_FUEL];
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
