import { SPECS } from 'battlecode';
import { open_neighbors_diff } from './helpers.js';
import { encode8, decode8 } from "./communication.js";
import { constants } from "./constants.js"

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
        }
    }

    send_castle_coord(m);

    m.log("BUILD UNIT");
    let build_opts = open_neighbors_diff(m, m.me.x, m.me.y);
    let unit = what_unit(m);
    if (unit !== undefined && build_opts.length > 0) {
        if (m.karbonite >= unit_cost(unit.unit)) {
            let build_loc = build_opts[Math.floor(Math.random() * build_opts.length)];
            m.log(`BUILD UNIT ${unit.unit} AT (${build_loc[0] + m.me.x}, ${build_loc[1] + m.me.y})`);
            return m.buildUnit(unit.unit, ...build_loc);
        } else {
            m.log(m.me.karbonite + " Not enough karbonite");
        }
    }

}

export function what_unit(m) {
    let o = {};
    if (m.karbonite < constants.MIN_KARB || m.fuel < constants.MIN_FUEL)
        o.unit = SPECS.PILGRIM;
    o.task = constants.GATHER;
    return o;
    if (m.mission === constants.DEFEND)
        o.unit = SPECS.PROPHET;
    o.task = constants.DEFEND;
    return o;
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

export function unit_cost(b) {
    return SPECS.UNITS[b].CONSTRUCTION_KARBONITE;
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