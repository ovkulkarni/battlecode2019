import { constants } from "./constants.js";
import { dis, idx, dis_opp_side } from "./helpers.js";

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
        } else if (church !== undefined) {
            event = church;
        } else {
            event = horde;
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
        let where;
        let who;
        for (let group of m.resource_groups) {
            let group_karbs = group.filter(l => idx(m.karbonite_map, ...l));
            let candidate = group_karbs.length !== 0 ? group_karbs[0] : group[0];
            let too_close = false;
            let min_dist_castle_id;
            let min_dist;
            // compare distance to castles
            for (let a_id in m.friendly_castles) {
                let dist = dis(
                    m.friendly_castles[a_id].x, m.friendly_castles[a_id].y,
                    ...candidate
                );
                if (dist <= 25)
                    too_close = true;
                else if (min_dist === undefined || dist < min_dist) {
                    min_dist_castle_id = a_id;
                    min_dist = dist;
                }
            }
            //compare distance to churches
            for (let a_id in m.friendly_churches) {
                let dist = dis(
                    m.friendly_churches[a_id].x, m.friendly_churches[a_id].y,
                    ...candidate
                );
                if (dist <= 25)
                    too_close = true;
            }
            //compare distance to enemy castles
            for (let a_id in m.enemy_castles) {
                let dist = dis(
                    m.enemy_castles[a_id].x, m.enemy_castles[a_id].y,
                    ...candidate
                );
                if (dist <= 100)
                    too_close = true;
            }
            if (too_close) continue;
            if (where === undefined || dis_opp_side(m, ...where) < dis_opp_side(m, ...candidate)) {
                where = candidate;
                who = min_dist_castle_id;
            }
        }
        if (who !== undefined && where !== undefined) {
            return Event(who - 0, constants.BUILD_CHURCH, where, 50);
        }
        return;
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
