import { SPECS } from 'battlecode';
import { open_neighbors_diff } from './helpers.js';

export function runCastle(m) {
    m.log("CASTLE X: " + m.me.x + " Y: " + m.me.y);
    const choices = open_neighbors_diff(m, m.me.x, m.me.y);
    const choice = choices[Math.floor(Math.random() * choices.length)];
    m.log("BUILD UNIT");
    if (m.karbonite >= botCost(whatUnit(m)) && Math.random() < 0.1) {
        m.log(m.karbonite);
        return m.buildUnit(whatUnit(m), ...choice);
    } else {
        m.log(m.me.karbonite + " Not enough karbonite");
    }

}

export function whatUnit(m) {
    return SPECS.PILGRIM;
}

export function botCost(b) {
    return SPECS.UNITS[b].CONSTRUCTION_KARBONITE;
}
