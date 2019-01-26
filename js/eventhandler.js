import { constants } from "./constants.js";
import { dis, idx, dis_opp_side, centricity } from "./helpers.js";

export var mask = 0xffffffff;

export class EventHandler {
    constructor(seed = 0) {
        this.seed = seed;
        this.m_w = (123456789 + seed) & mask;
        this.m_z = (987654321 - seed) & mask;
        this.past = [];
        this.last_clear = {};
        this.church_fails = {};
    }
    next_event(m, failed = false) {
        if (failed) {
            this.handle_failure(m);
        }
        let clear = this.next_clear(m);
        let church = this.next_church(m);
        let horde = this.next_horde(m, 0.2);
        let constrict = this.next_constrict(m);
        let event;
        if (this.past.length % 4 === 0 && church !== undefined) {
            event = church;
            //m.log("CHURCH");
        }
        else {
            event = clear;
            //m.log("CLEARING");
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
        let first_flag = false;
        for (let id in m.friendly_castles) {
            if (this.last_clear[id] === undefined) {
                this.last_clear[id] = -1;
                first_flag = true;
            }
            if (nc === undefined || this.last_clear[id] < this.last_clear[nc])
                nc = id;
        }
        if (first_flag) {
            return this.Event(this.closest_to_enemy(m, -1), constants.CLEAR_QUEUE, undefined, 0);
        }
        return this.Event(nc - 0, constants.CLEAR_QUEUE, undefined, 0);
    }
    next_constrict(m) {
        return this.Event(this.closest_to_enemy(m, 0.5), constants.CONSTRICT, undefined, 0);
    }
    next_horde(m, random_factor) {
        return this.Event(this.closest_to_enemy(m, random_factor), constants.ATTACK, undefined, 0);
    }
    next_church(m) {
        let where;
        let who;
        for (let group of m.resource_groups) {
            if (this.church_fails[[group.x, group.y]] === undefined)
                this.church_fails[[group.x, group.y]] = 0;
            if (this.church_fails[[group.x, group.y]] >= 2)
                continue;
            
            let fails = this.church_fails[[group.x, group.y]];
            let too_close = false;
            let min_dist_castle_id;
            let min_dist;
            // compare distance to castles
            for (let a_id in m.friendly_castles) {
                let dist = dis(
                    m.friendly_castles[a_id].x, m.friendly_castles[a_id].y,
                    group.x, group.y
                );
                if (dist <= 49)
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
                    group.x, group.y
                );
                if (dist <= 49)
                    too_close = true;
            }
            //compare distance to enemy castles
            for (let a_id in m.enemy_castles) {
                let dist = dis(
                    m.enemy_castles[a_id].x, m.enemy_castles[a_id].y,
                    group.x, group.y
                );
                if (dist <= 120)
                    too_close = true;
            }
            if (too_close) continue;

            let cand_cent = centricity(m, group.x, group.y);
            //m.log(`${JSON.stringify(where)} ${JSON.stringify(group)}`);
            //m.log(`${dis_cand} ${dis_curr}`);
            if (where === undefined ||
                (cand_cent <= 50 && (group.size > where.size || where.cent > 50) && fails <= where.fails) ||
                (where.cent > 50 && min_dist < where.dist)
            ) {
                where = group;
                where.fails = fails;
                where.dist = min_dist;
                where.cent = cand_cent;
                who = min_dist_castle_id;
            }
        }
        if (who !== undefined && where !== undefined) {
            let event = this.Event(who - 0, constants.BUILD_CHURCH, [where.x, where.y], 50);
            if (where.fails !== 0) {
                event.defenders = where.fails * 3;
                return; //COMMENT THIS LINE OUT TO REINSTATE RAIDING
            }
            return event;
        }
        return;
    }
    handle_failure(m) {
        let prev_event = this.past[this.past.length - 1];
        switch (prev_event.what) {
            case constants.BUILD_CHURCH:
                if (this.church_fails[prev_event.where] === undefined)
                    this.church_fails[prev_event.where] = 0
                this.church_fails[prev_event.where]++;
                break;
        }
    }
    closest_to_enemy(m, random_factor) {
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
        return best_a_id - 0;
    }
    random() {
        this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & mask;
        this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & mask;
        let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0;
        result /= 4294967296;
        return result;
    }
    Event(who, what, where, blocking) {
        return { id: this.past.length+1, who: who, what: what, where: where, blocking: blocking };
    }
}
