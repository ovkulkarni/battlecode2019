import { SPECS } from 'battlecode';
import { constants } from './constants.js';

export function get_symmetry(m){
  const N = m.karbonite_map.length;
  const M = m.karbonite_map[0].length;
  let horizontal = true;
  if (m.symmetry === undefined) {
      for (let i = 0, k = N - 1; i < N / 2; i++ , k--) {
          for (let j = 0; j < M; j++) {
              if (m.karbonite_map[i][j] !== m.karbonite_map[k][j]) {
                  horizontal = false;
                  break;
              }
          }
      }
      if (horizontal)
        return constants.HORIZONTAL
      else
        return constants.VERTICAL;
  }
}

export function get_visible_castle(m){
  for (let robot of m.visible_robots) {
      if (robot.unit === SPECS.CASTLE)
          return robot;
  }
}
