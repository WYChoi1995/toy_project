'use strict';

const protobuf = require('protobufjs');

class ProtoBufHandler {
    constructor(protoFilePath) {
        this.protoFilePath = protoFilePath;
        this.root = null;
        this.yatikcer = null;
        this.loadProtoFile();
    }

    async loadProtoFile() {
        try {
            this.root = await protobuf.load(this.protoFilePath);
            this.yatikcer = this.root.lookupType('yaticker');
        } catch (err) {
            throw err;
        }
    }

    async decode(buffer) {
        if (!this.yatikcer) {
            await this.loadProtoFile();
        }

        const message = this.yatikcer.decode(buffer);

        return this.yatikcer.toObject(message, {
            longs: String,
            enums: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true
        });
    }
}

module.exports = ProtoBufHandler;
