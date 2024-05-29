'use strict';

const path = require('path');
const protobuf = require("protobufjs");
const fs = require('fs');

class ProtoBufHandler {
    constructor(protoFilePath, messageTypeName) {
        this.protoFilePath = protoFilePath;
        this.messageTypeName = messageTypeName;
        this.root = null;
        this.MessageType = null;

        this.loadProto();
    }

    async loadProto() {
        try {
            let protoPath;
            if (process.pkg) {
                protoPath = path.join(path.dirname(process.execPath), 'yaticker.proto');
            } else {
                protoPath = path.resolve(__dirname, this.protoFilePath);
            }

            if (!fs.existsSync(protoPath)) {
                throw new Error(`Proto file does not exist at path: ${protoPath}`);
            }

            this.root = await protobuf.load(protoPath);
            this.MessageType = this.root.lookupType(this.messageTypeName);
        } catch (err) {
            throw new Error(`Failed to load proto file: ${err.message}`);
        }
    }

    decodeBase64(base64Message) {
        if (!this.MessageType) {
            throw new Error("Proto file not loaded. Call loadProto() first.");
        }

        const buffer = Buffer.from(base64Message, "base64");
        const message = this.MessageType.decode(buffer);

        const errMsg = this.MessageType.verify(message);
        if (errMsg) {
            throw new Error(`Message verification failed: ${errMsg}`);
        }

        return this.MessageType.toObject(message, {
            longs: String,
            enums: String,
            bytes: String,
        });
    }
}

module.exports = ProtoBufHandler;
