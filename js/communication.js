export let encode8, decode8, encode16, decode16;

const commands8 = [
  command("defense", [5]),
  command("", [7])
]

const commands16 = [
  command("test1", [6, 6]),
  command("test2", [3, 9])
]

function command(name, bit_list){
  return {name: name, bit_list: bit_list};
  // bit_list is a list of bit lengths, which signify the maximum
  // integer size which can be encoded/decoded in that slot.
}

function setup(bits, cs) {
  let header_bits = Math.ceil(Math.log2(cs.length));
  let footer_bits = bits - header_bits;
  let e_funcs = {}
  let d_funcs = {}
  for (let c of cs) {
    if (c.bit_list.reduce((a, b) => a + b, 0) > footer_bits)
      throw "Too many bits in this command!"

    // generate encode and decode functions
    let entries = c.bit_list.length;
    let passed = [0];
    for (let i = 0; i < entries - 1; i++)
      passed.push(passed[passed.length - 1] + c.bit_list[i]);

    let encode_partial = (list => {
      let sum = 0
      for (let i = 0; i < entries; i++)
        sum += list[i]*2**passed[i];
      return sum;
    });

    let decode_partial = (x => {
      let list = [];
      let acc = x;
      for (let i = 0; i < entries; i++) {
        let denom = 2**c.bit_list[i];
        list.push(acc % denom);
        acc = Math.floor(acc/denom);
      }
      return list;
    });

    e_funcs[c.name] = encode_partial;
    d_funcs[c.name] = decode_partial;
  }

  let num_name = new Map();
  let name_num = new Map();
  for (let i = 0; i < cs.length; i++) {
    num_name.set(i, cs[i].name);
    name_num.set(cs[i].name, i);
  }

  let encode = ((command, ...list) =>
    e_funcs[command](list)*2**header_bits + name_num.get(command)
  );

  let decode = (x => {
    let denom = 2**header_bits
    let command = num_name.get(x % denom);
    let args = d_funcs[command](Math.floor(x/denom));
    return {command:command, args:args};
  });

  return {encode:encode, decode:decode};
}

let functions16 = setup(16, commands16);
let functions8 = setup(8, commands8);

encode16 = functions16.encode;
decode16 = functions16.decode;
encode8 = functions8.encode;
decode8 = functions8.decode;
