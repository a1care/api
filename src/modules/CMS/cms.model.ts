import mongoose, { Document, Schema } from 'mongoose';

export interface FAQItem {
  question: string;
  answer: string;
  isActive: boolean;
}

export interface ICMSContent extends Document {
  type: 'TERMS' | 'PRIVACY' | 'FAQ';
  targetApp: 'CUSTOMER' | 'PARTNER';
  content?: string; // HTML content for Terms and Privacy
  faqs?: FAQItem[]; // Questions and Answers for FAQs
  createdAt: Date;
  updatedAt: Date;
}

const FAQItemSchema = new Schema<FAQItem>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

const CMSContentSchema = new Schema<ICMSContent>(
  {
    type: { 
      type: String, 
      enum: ['TERMS', 'PRIVACY', 'FAQ'], 
      required: true 
    },
    targetApp: { 
      type: String, 
      enum: ['CUSTOMER', 'PARTNER'], 
      required: true 
    },
    content: { 
      type: String,
      default: ''
    },
    faqs: [FAQItemSchema]
  },
  { timestamps: true }
);

// Ensure only one active document per type per app
CMSContentSchema.index({ type: 1, targetApp: 1 }, { unique: true });

export const CMSContent = mongoose.model<ICMSContent>('CMSContent', CMSContentSchema);
