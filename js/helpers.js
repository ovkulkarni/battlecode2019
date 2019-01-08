import { SPECS } from 'battlecode';

// Based on the Unit, returns an array of movement speed, movement cost, vision radius, damage, attack damage, attack range, and fuel cost
export function get_stats(m) {
    switch(m.me.unit) {
        case SPECS.PILGRIM:
            return new Map([["ms",4],["mc",1],["vr",100],["ad",0],["ar",0],["fc",0]]);
        case SPECS.CRUSADER:
            return new Map([["ms",9],["mc",1],["vr",36],["ad",10],["ar",4],["fc",10]]);
        case SPECS.PROPHET:
            return new Map([["ms",4],["mc",2],["vr",64],["ad",10],["ar",8],["fc",25]]);
        case SPECS.PREACHER:
            return new Map([["ms",4],["mc",3],["vr",16],["ad",20],["ar",4],["fc",15]]);
        case SPECS.CASTLE: // Movement Speed is the same as like Deploying Speed???
            return new Map([["ms",2]]);
        case SPECS.CHURCH:
            return new Map([["ms",2]]);
    }
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
        if (!(x >= 0 && y >= 0 && x < m.map[0].length && y < m.map.length))
          return false;
        let visMapIx = idx(m.visible_map, x, y);
        return idx(m.map, x, y) && (visMapIx == 0 || visMapIx == -1);
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
