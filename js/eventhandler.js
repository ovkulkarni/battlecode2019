import { constants } from "./constants.js";
import { dis } from "./helpers.js";

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
        let result;
        let next_clear;
        for (let id in m.friendly_castles) {
            if (this.last_clear[id] === undefined)
                this.last_clear[id] = -1;
            if (next_clear === undefined || this.last_clear[id] < this.last_clear[next_clear])
                next_clear = id;
        }
        if ((this.past.length - 3) % 2 === 0) {
            this.last_clear[next_clear] = m.me.turn;
            result = Event(next_clear - 0, constants.CLEAR_QUEUE, undefined, 0); 
        } else if (this.past.length === 2) {
            let who = Math.min(...Object.keys(m.friendly_castles));
            result = Event(who, constants.BUILD_CHURCH, undefined, 50);
        } else {
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
                        best_a_id = a_id;
                    }
                }
            }
            result = Event(best_a_id - 0, constants.ATTACK, undefined, 0);
        }
        this.past.push(result);
        return result;
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
