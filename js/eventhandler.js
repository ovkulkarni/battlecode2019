import { dis } from "./helpers.js";
import { constants } from "./constants.js";

export class EventHandler{
    constructor(seed=0) {
        this.seed = seed;
        this.past = [];
    }
    next_event(m) {
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
        return { who: best_a_id - 0, what: constants.ATTACK, where: best_e_loc };
    }
}