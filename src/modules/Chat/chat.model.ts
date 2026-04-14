import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  bookingId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderType: "Patient" | "Partner";
  message: string;
  type: "text" | "image" | "file";
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    bookingId: { 
        type: Schema.Types.ObjectId, 
        required: true, 
        index: true 
    },
    senderId: { 
        type: Schema.Types.ObjectId, 
        required: true 
    },
    senderType: { 
        type: String, 
        enum: ["Patient", "Partner"], 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ["text", "image", "file"], 
        default: "text" 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
  },
  { timestamps: true }
);

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
