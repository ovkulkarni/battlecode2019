import { SPECS } from 'battlecode';
import { open_neighbors_diff } from './helpers.js';

export function runCastle(m) {
    m.log("CASTLE X: " + m.me.x + " Y: " + m.me.y);
    const choices = open_neighbors_diff(m, m.me.x, m.me.y);
    const choice = choices[Math.floor(Math.random() * choices.length)];
    m.log("BUILD UNIT");
    if (m.karbonite >= botCost("crusader")) {
        m.log(m.karbonite);
        return m.buildUnit(whatUnit(m), ...choice);
    } else {
        m.log(m.me.karbonite + " Not enough karbonite");
    }

}

export function whatUnit(m) {
    return SPECS.CRUSADER;
}

export function botCost(b) {
    switch (b) {
        case "pilgrim":
            return 10;
        case "crusader":
            return 20;
        case "prophet":
            return 25;
        case "preacher":
            return 30
        default:
            return -1;
    }
}
