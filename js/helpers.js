import { SPECS } from 'battlecode';
import { constants } from './constants.js';
import { decode16 } from './communication.js';

// Based on the Unit, returns an array of movement speed, movement cost, vision radius, damage, attack damage, attack range, and fuel cost
export function get_stats(m) {
    let o = SPECS.UNITS[m.me.unit];
    switch (m.me.unit) {
        case SPECS.CASTLE:
            o.DIRECTIONS = list_dir(2);
            break;
        case SPECS.CHURCH:
            o.DIRECTIONS = list_dir(2);
            break;
        default:
            o.DIRECTIONS = list_dir(o.SPEED);
    }
    return o;
}

export function open_neighbors(m, x, y) {
    const choices = m.stats.DIRECTIONS; //[[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    return choices.map(s => [x + s[0], y + s[1]])
        .filter(valid_loc(m));
}

export function open_neighbors2(m, x, y) {
    const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    return choices.map(s => [x + s[0], y + s[1]])
        .filter(valid_loc(m));
}

export function open_neighbors_diff(m, x, y) {
    return open_neighbors(m, x, y).map(s => [s[0] - x, s[1] - y]);
}
export function valid_loc(m) {
    return (l => {
        let x = l[0];
        let y = l[1];
        if (!(x >= 0 && y >= 0 && x < m.map[0].length && y < m.map.length))
            return false;
        let visMapIx = idx(m.visible_map, x, y);
        return idx(m.map, x, y) && (visMapIx == 0 || visMapIx == -1);
    });
}

export function list_dir(r) {
    let pos = []
    for (var i = Math.floor(-1 * Math.sqrt(r)); i <= Math.sqrt(r); i++) {
        for (var j = Math.floor(-1 * Math.sqrt(r)); j <= Math.sqrt(r); j++) {
            if (i * i + j * j <= r && i * i + j * j != 0) {
                pos.push([i, j]);
            }
        }
    }
    return pos;
}

export function idx(a, x, y) {
    return a[y][x];
}

export function calcOpposite(m, x, y) {
    const y_max = m.karbonite_map.length;
    const x_max = m.karbonite_map[0].length;
    if (m.symmetry === constants.VERTICAL) {
        return [x_max - x - 1, y];
    }
    return [x, y_max - y - 1];
}

export function dis(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}

export function get_mission(m) {
    for (let r of m.visible_allies) {
        if (r.signal !== -1) {
            let message = decode16(r.signal);
            m.log(`GOT MISSION TO ${message.args[0]} FROM ${r.id}`);
            return message.args[0];
        }
    }
}