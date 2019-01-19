import { constants } from "./constants.js";
import { dis, idx } from "./helpers.js";

export var mask = 0xffffffff;

export class EventHandler {
    constructor(seed = 0) {
        this.seed = seed;
        this.m_w = (123456789 + seed) & mask;
        this.m_z = (987654321 - seed) & mask;
        this.past = [];
        this.last_clear = {};
    }
    next_event(m) {
        let clear = this.next_clear(m);
        let church = this.next_church(m);
        let horde = this.next_horde(m);
        let event;
        if ((this.past.length - 3) % 2 === 0) {
            event = clear;
        } else if ((this.past.length - 2) % 5 === 0 && church !== undefined) {
            m.karb_groups.shift();
            event = church;
        } else {
            event = church;
        }
        this.handle_chosen_event(m, event);
        this.past.push(event);
        return event;
    }
    handle_chosen_event(m, event) {
        switch (event.what) {
            case constants.CLEAR_QUEUE:
                this.last_clear[event.who] = m.me.turn;
                break;
        }
    }
    next_clear(m) {
        let nc;
        for (let id in m.friendly_castles) {
            if (this.last_clear[id] === undefined)
                this.last_clear[id] = -1;
            if (nc === undefined || this.last_clear[id] < this.last_clear[nc])
                nc = id;
        }
        return Event(nc - 0, constants.CLEAR_QUEUE, undefined, 0);
    }
    next_horde(m, random_factor) {
        let best_a_id;
        let min_distance = 64 * 64 + 1;
        for (let a_id in m.friendly_castles) {
            for (let e_id in m.enemy_castles) {
                let distance = dis(
                    m.friendly_castles[a_id].x, m.friendly_castles[a_id].y,
                    m.enemy_castles[e_id].x, m.enemy_castles[e_id].y
                );
                if (distance < min_distance) {
                    min_distance = distance;
                    if (best_a_id === undefined || this.random() > random_factor)
                        best_a_id = a_id;
                }
            }
        }
        return Event(best_a_id - 0, constants.ATTACK, undefined, 0);
    }
    next_church(m) {
        let who = Math.min(...Object.keys(m.friendly_castles));
        let where = m.karb_groups[0];
        m.log("LIST FOR BUILD_CHURCH: " + where);
        if(where === undefined) {
            //m.log("OUT OF OPTIONS");
            // TODO: What to do?
            return undefined;
        }
        else {
            for(let i = 0; i < where.length; i++) {
                if(idx(m.karbonite_map, ...where[i])) {
                    return Event(who, constants.BUILD_CHURCH, where[i], 50); // Set it to a Karbonite Location
                }
            }
        }
        return Event(who, constants.BUILD_CHURCH, where[0], 50); // No Karbonite Locations --> set it to fuel loc
    }
    random() {
        this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & mask;
        this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & mask;
        let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0;
        result /= 4294967296;
        return result;
    }
}

function Event(who, what, where, blocking) {
    return { who: who, what: what, where: where, blocking: blocking };
}
