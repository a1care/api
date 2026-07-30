import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeBase extends Document {
  title: string;
  content: string; // Markdown or HTML
  category: string; // e.g. "General", "Booking", "Wallet", "Profile"
  targetAudience: 'Doctor' | 'Nurse' | 'Ambulance' | 'Rental' | 'All';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: { type: String, required: true, default: 'General' },
    targetAudience: { 
      type: String, 
      enum: ['Doctor', 'Nurse', 'Ambulance', 'Rental', 'All'], 
      default: 'All' 
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

KnowledgeBaseSchema.index({ targetAudience: 1, isActive: 1 });
KnowledgeBaseSchema.index({ category: 1 });

export const KnowledgeBase = mongoose.model<IKnowledgeBase>('KnowledgeBase', KnowledgeBaseSchema);
