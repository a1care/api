import mongoose, { Document, Schema } from "mongoose";

export interface IEmailTemplate extends Document {
    name: string;
    code: string;
    subject: string;
    htmlBody: string;
    availableVariables: string[];
    createdAt: Date;
    updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
    {
        name: { type: String, required: true },
        code: { type: String, required: true, unique: true },
        subject: { type: String, required: true },
        htmlBody: { type: String, required: true },
        availableVariables: [{ type: String }],
    },
    { timestamps: true }
);

export const EmailTemplate = mongoose.model<IEmailTemplate>("EmailTemplate", emailTemplateSchema);
