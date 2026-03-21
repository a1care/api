import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
    ticketId?: mongoose.Types.ObjectId;
    bookingId?: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    senderType: 'User' | 'Staff';
    message: string;
    attachments: string[];
    readBy: mongoose.Types.ObjectId[];
}

const MessageSchema = new Schema<IMessage>(
    {
        ticketId: { type: Schema.Types.ObjectId, ref: "ticket" },
        bookingId: { type: Schema.Types.ObjectId, ref: "DoctorAppointment" },
        senderId: { type: Schema.Types.ObjectId, required: true },
        senderType: { type: String, enum: ['User', 'Staff'], required: true },
        message: { type: String, required: true },
        attachments: [{ type: String }],
        readBy: [{ type: Schema.Types.ObjectId }]
    },
    { timestamps: true }
);

export default mongoose.model<IMessage>("message", MessageSchema);
