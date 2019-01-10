export let encode8, decode8, encode16, decode16;

const commands8 = [
    command("defense", []),
    command("castle_coord", [6])
]

const commands16 = [
    command("test1", [6, 6]),
    command("test2", [3, 9]),
    command("workermine", [6, 6])
]

function command(name, bit_list) {
    return { name: name, bit_list: bit_list };
    // bit_list is a list of bit lengths, which signify the maximum
    // integer size which can be encoded/decoded in that slot.
}

function setup(bits, cs) {
    // header analysis
    for (let c of cs)
        c.header_len = bits - c.bit_list.reduce((a, b) => a + b, 0);
    let sorted_cs = cs.sort((a, b) => b.header_len - a.header_len)

    let header_name = new Map();
    let name_header = new Map();
    let name_header_len = new Map();

    let next_acc = -1;
    let cur_len = sorted_cs[0].header_len;
    for (let c of sorted_cs) {
        if (c.header_len < cur_len) {
            next_acc >>= cur_len - c.header_len;
            cur_len = c.header_len;
        }
        next_acc++;
        let header = bitMirror(next_acc, cur_len);
        header_name.set(header, c.name);
        name_header.set(c.name, header);
        name_header_len.set(c.name, c.header_len);
    }

    // generate partial encode and decode functions
    let e_funcs = {}
    let d_funcs = {}
    for (let c of cs) {

        let entries = c.bit_list.length;
        let passed = [0];
        for (let i = 0; i < entries - 1; i++)
            passed.push(passed[passed.length - 1] + c.bit_list[i]);

        let encode_partial = (list => {
            let sum = 0
            for (let i = 0; i < entries; i++)
                sum += list[i] * 2 ** passed[i];
            return sum;
        });

        let decode_partial = (x => {
            let list = [];
            let acc = x;
            for (let i = 0; i < entries; i++) {
                let denom = 2 ** c.bit_list[i];
                list.push(acc % denom);
                acc = Math.floor(acc / denom);
            }
            return list;
        });

        e_funcs[c.name] = encode_partial;
        d_funcs[c.name] = decode_partial;
    }

    // generate full encode and decode functions

    let encode = ((command, ...list) => {
        return 1 + e_funcs[command](list) * 2 ** name_header_len.get(command) + name_header.get(command);
    });

    let decode = (x => {
        x--;
        let command;
        for (let len of sorted_cs.map(c => c.header_len)) {
            if (header_name.has(x % (2 ** len))) {
                command = header_name.get(x % (2 ** len));
                break;
            }
            len++;
        }
        let denom = 2 ** name_header_len.get(command);
        let args = d_funcs[command](Math.floor(x / denom));
        return { command: command, args: args };
    });

    return { encode: encode, decode: decode };
}

function bitMirror(x, bits) {
    let j = 0;
    let result = 0;
    for (let i = bits - 1; i >= 0; i--) {
        result |= ((x >> j) & 1) << i;
        j++;
    }
    return result;
}

let functions16 = setup(16, commands16);
let functions8 = setup(8, commands8);

encode16 = functions16.encode;
decode16 = functions16.decode;
encode8 = functions8.encode;
decode8 = functions8.decode;

// Testing functions
function test8(command, ...list) {
    console.log(command, list);
    let encode = encode8(command, ...list);
    console.log(encode);
    console.log(JSON.stringify(decode8(encode)));
}
function test16(command, ...list) {
    console.log(command, list);
    let encode = encode16(command, ...list);
    console.log(encode);
    console.log(JSON.stringify(decode16(encode)));
}