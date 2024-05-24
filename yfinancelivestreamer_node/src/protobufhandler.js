'use strict';

const protobuf = require("protobufjs");

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
            this.root = await protobuf.load(this.protoFilePath);
            this.MessageType = this.root.lookupType(this.messageTypeName);
        } 
        
        catch (err) {
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
