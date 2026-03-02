class QrisGenerator {
    constructor(baseString) {
        this.baseString = baseString;
        this.tags = this.parse(baseString);
    }

    parse(str) {
        const tags = {};
        let i = 0;
        while (i < str.length) {
            const id = str.substr(i, 2);
            i += 2;
            const len = parseInt(str.substr(i, 2));
            i += 2;
            const value = str.substr(i, len);
            i += len;
            tags[id] = value;
        }
        return tags;
    }

    setAmount(amount) {
        // Tag 54
        // If amount is not integer string, handle it? 
        // QRIS amount usually excludes currency symbol, just digits.
        if (amount && amount > 0) {
            this.tags['54'] = amount.toString();
        } else {
            delete this.tags['54'];
        }
        return this;
    }

    setMerchantName(name) {
        // Tag 59
        if (name) {
            this.tags['59'] = name;
        }
        return this;
    }

    generate() {
        // Sort keys numerically
        const keys = Object.keys(this.tags).filter(k => k !== '63').sort((a, b) => parseInt(a) - parseInt(b));
        let payload = '';

        for (const k of keys) {
            const val = this.tags[k];
            const len = val.length.toString().padStart(2, '0');
            payload += `${k}${len}${val}`;
        }

        // Append 6304 for CRC calculation
        payload += '6304';

        // Calculate CRC
        const crc = this.crc16(payload);
        return payload + crc;
    }

    crc16(str) {
        let crc = 0xFFFF;
        for (let i = 0; i < str.length; i++) {
            let x = ((crc >> 8) ^ str.charCodeAt(i)) & 0xFF;
            x ^= x >> 4;
            crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }
}

module.exports = QrisGenerator;
