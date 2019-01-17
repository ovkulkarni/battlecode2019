import { dis } from "./helpers.js";
import { constants } from "./constants.js";

export var mask = 0xffffffff;

export class EventHandler {
    constructor(seed = 0) {
        this.seed = seed;
        this.m_w = (123456789 + seed) & mask;
        this.m_z = (987654321 - seed) & mask;
        this.past = [];
    }
    next_event(m) {
        let result;
        if (this.past.length === 2) {
            let who = Math.min(Object.keys(m.friendly_castles));
            result = Event(who, constants.BUILD_CHURCH, undefined, true);
        } else {
            let best_a_id;
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
                        best_a_id = a_id;
                        best_e_loc = [m.enemy_castles[a_id].x, m.enemy_castles[a_id].y];
                    }
                }
            }
            result = Event(best_a_id - 0, constants.ATTACK, best_e_loc, false);
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