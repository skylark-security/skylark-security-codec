define([
    "./codec"
], function(codec) {
    //ref:pdfjs>src/core/arithmetic_decoder.js
    'use strict';
    const QeTable = [
        {
            qe: 22017,
            nmps: 1,
            nlps: 1,
            switchFlag: 1
        },
        {
            qe: 13313,
            nmps: 2,
            nlps: 6,
            switchFlag: 0
        },
        {
            qe: 6145,
            nmps: 3,
            nlps: 9,
            switchFlag: 0
        },
        {
            qe: 2753,
            nmps: 4,
            nlps: 12,
            switchFlag: 0
        },
        {
            qe: 1313,
            nmps: 5,
            nlps: 29,
            switchFlag: 0
        },
        {
            qe: 545,
            nmps: 38,
            nlps: 33,
            switchFlag: 0
        },
        {
            qe: 22017,
            nmps: 7,
            nlps: 6,
            switchFlag: 1
        },
        {
            qe: 21505,
            nmps: 8,
            nlps: 14,
            switchFlag: 0
        },
        {
            qe: 18433,
            nmps: 9,
            nlps: 14,
            switchFlag: 0
        },
        {
            qe: 14337,
            nmps: 10,
            nlps: 14,
            switchFlag: 0
        },
        {
            qe: 12289,
            nmps: 11,
            nlps: 17,
            switchFlag: 0
        },
        {
            qe: 9217,
            nmps: 12,
            nlps: 18,
            switchFlag: 0
        },
        {
            qe: 7169,
            nmps: 13,
            nlps: 20,
            switchFlag: 0
        },
        {
            qe: 5633,
            nmps: 29,
            nlps: 21,
            switchFlag: 0
        },
        {
            qe: 22017,
            nmps: 15,
            nlps: 14,
            switchFlag: 1
        },
        {
            qe: 21505,
            nmps: 16,
            nlps: 14,
            switchFlag: 0
        },
        {
            qe: 20737,
            nmps: 17,
            nlps: 15,
            switchFlag: 0
        },
        {
            qe: 18433,
            nmps: 18,
            nlps: 16,
            switchFlag: 0
        },
        {
            qe: 14337,
            nmps: 19,
            nlps: 17,
            switchFlag: 0
        },
        {
            qe: 13313,
            nmps: 20,
            nlps: 18,
            switchFlag: 0
        },
        {
            qe: 12289,
            nmps: 21,
            nlps: 19,
            switchFlag: 0
        },
        {
            qe: 10241,
            nmps: 22,
            nlps: 19,
            switchFlag: 0
        },
        {
            qe: 9217,
            nmps: 23,
            nlps: 20,
            switchFlag: 0
        },
        {
            qe: 8705,
            nmps: 24,
            nlps: 21,
            switchFlag: 0
        },
        {
            qe: 7169,
            nmps: 25,
            nlps: 22,
            switchFlag: 0
        },
        {
            qe: 6145,
            nmps: 26,
            nlps: 23,
            switchFlag: 0
        },
        {
            qe: 5633,
            nmps: 27,
            nlps: 24,
            switchFlag: 0
        },
        {
            qe: 5121,
            nmps: 28,
            nlps: 25,
            switchFlag: 0
        },
        {
            qe: 4609,
            nmps: 29,
            nlps: 26,
            switchFlag: 0
        },
        {
            qe: 4353,
            nmps: 30,
            nlps: 27,
            switchFlag: 0
        },
        {
            qe: 2753,
            nmps: 31,
            nlps: 28,
            switchFlag: 0
        },
        {
            qe: 2497,
            nmps: 32,
            nlps: 29,
            switchFlag: 0
        },
        {
            qe: 2209,
            nmps: 33,
            nlps: 30,
            switchFlag: 0
        },
        {
            qe: 1313,
            nmps: 34,
            nlps: 31,
            switchFlag: 0
        },
        {
            qe: 1089,
            nmps: 35,
            nlps: 32,
            switchFlag: 0
        },
        {
            qe: 673,
            nmps: 36,
            nlps: 33,
            switchFlag: 0
        },
        {
            qe: 545,
            nmps: 37,
            nlps: 34,
            switchFlag: 0
        },
        {
            qe: 321,
            nmps: 38,
            nlps: 35,
            switchFlag: 0
        },
        {
            qe: 273,
            nmps: 39,
            nlps: 36,
            switchFlag: 0
        },
        {
            qe: 133,
            nmps: 40,
            nlps: 37,
            switchFlag: 0
        },
        {
            qe: 73,
            nmps: 41,
            nlps: 38,
            switchFlag: 0
        },
        {
            qe: 37,
            nmps: 42,
            nlps: 39,
            switchFlag: 0
        },
        {
            qe: 21,
            nmps: 43,
            nlps: 40,
            switchFlag: 0
        },
        {
            qe: 9,
            nmps: 44,
            nlps: 41,
            switchFlag: 0
        },
        {
            qe: 5,
            nmps: 45,
            nlps: 42,
            switchFlag: 0
        },
        {
            qe: 1,
            nmps: 45,
            nlps: 43,
            switchFlag: 0
        },
        {
            qe: 22017,
            nmps: 46,
            nlps: 46,
            switchFlag: 0
        }
    ];
    class ArithmeticDecoder {
        constructor(data, start, end) {
            this.data = data;
            this.bp = start;
            this.dataEnd = end;
            this.chigh = data[start];
            this.clow = 0;
            this.byteIn();
            this.chigh = this.chigh << 7 & 65535 | this.clow >> 9 & 127;
            this.clow = this.clow << 7 & 65535;
            this.ct -= 7;
            this.a = 32768;
        }
        byteIn() {
            const data = this.data;
            let bp = this.bp;
            if (data[bp] === 255) {
                if (data[bp + 1] > 143) {
                    this.clow += 65280;
                    this.ct = 8;
                } else {
                    bp++;
                    this.clow += data[bp] << 9;
                    this.ct = 7;
                    this.bp = bp;
                }
            } else {
                bp++;
                this.clow += bp < this.dataEnd ? data[bp] << 8 : 65280;
                this.ct = 8;
                this.bp = bp;
            }
            if (this.clow > 65535) {
                this.chigh += this.clow >> 16;
                this.clow &= 65535;
            }
        }
        readBit(contexts, pos) {
            let cx_index = contexts[pos] >> 1, cx_mps = contexts[pos] & 1;
            const qeTableIcx = QeTable[cx_index];
            const qeIcx = qeTableIcx.qe;
            let d;
            let a = this.a - qeIcx;
            if (this.chigh < qeIcx) {
                if (a < qeIcx) {
                    a = qeIcx;
                    d = cx_mps;
                    cx_index = qeTableIcx.nmps;
                } else {
                    a = qeIcx;
                    d = 1 ^ cx_mps;
                    if (qeTableIcx.switchFlag === 1) {
                        cx_mps = d;
                    }
                    cx_index = qeTableIcx.nlps;
                }
            } else {
                this.chigh -= qeIcx;
                if ((a & 32768) !== 0) {
                    this.a = a;
                    return cx_mps;
                }
                if (a < qeIcx) {
                    d = 1 ^ cx_mps;
                    if (qeTableIcx.switchFlag === 1) {
                        cx_mps = d;
                    }
                    cx_index = qeTableIcx.nlps;
                } else {
                    d = cx_mps;
                    cx_index = qeTableIcx.nmps;
                }
            }
            do {
                if (this.ct === 0) {
                    this.byteIn();
                }
                a <<= 1;
                this.chigh = this.chigh << 1 & 65535 | this.clow >> 15 & 1;
                this.clow = this.clow << 1 & 65535;
                this.ct--;
            } while ((a & 32768) === 0);
            this.a = a;
            contexts[pos] = cx_index << 1 | cx_mps;
            return d;
        }
    }
    return codec.arithmetic = { ArithmeticDecoder };
});