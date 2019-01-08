import { SPECS } from 'battlecode';

// Based on the Unit, returns an array of movement speed, movement cost, vision radius, damage, attack damage, attack range, and fuel cost
export function get_stats(m) {
    let v = null;
    switch(m.me.unit) {
        case SPECS.CASTLE: // Movement Speed is the same as like Deploying Speed???
            return new Map([["ms",2]]);
        case SPECS.CHURCH:
            return new Map([["ms",2]]);
        default:
            v = SPECS.UNITS[m.me.unit];
    }
    return new Map([["ms", v.SPEED], ["mc", v.FUEL_PER_MOVE],["vr",v.VISION_RADIUS],["da",v.ATTACK_DAMAGE],["ar",v.ATTACK_RADIUS],["fc",v.ATTACK_FUEL_COST]]);
}

export function open_neighbors(m, x, y) {
    const choices =  list_dir(get_stats(m).get("ms")); //[[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
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
<<<<<<< HEAD
        if (!(x >= 0 && y >= 0 && x < m.map[0].length && y < m.map.length))
          return false;
        let visMapIx = idx(m.visible_map, x, y);
        return idx(m.map, x, y) && (visMapIx == 0 || visMapIx == -1);
=======
        let visMapIx = idx(m.visible_map, x, y);
        return x >= 0 && y >= 0 &&
          x < m.map[0].length && y < m.map.length &&
          idx(m.map, x, y) &&
          (visMapIx == 0 || visMapIx == -1);
>>>>>>> 9ee84fac603c22346e9ddef01e28e505db7a057c
    });
}

export function list_dir(r) {
    let pos = []
    for(var i = Math.floor(-1*Math.sqrt(r)); i <= Math.sqrt(r); i++) {
        for(var j = Math.floor(-1*Math.sqrt(r)); j <= Math.sqrt(r); j++) {
            if(i*i + j*j <= r && i*i + j*j != 0) {
                pos.push([i,j]);
            }
        }
    }
    return pos;
}

export function idx(a, x, y) {
    return a[y][x];
}
