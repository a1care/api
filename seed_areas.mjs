import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://a1caresocialhub_db_user:A1care1231@cluster0.swo4f25.mongodb.net/a1care?retryWrites=true&w=majority";

const ServiceableAreaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, default: 'Hyderabad' },
  state: { type: String, default: 'Telangana' },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

const ServiceableArea = mongoose.model('ServiceableArea', ServiceableAreaSchema);

const defaultAreas = [
  { name: 'Safilguda',       city: 'Hyderabad', state: 'Telangana', displayOrder: 1 },
  { name: 'Neredmet',        city: 'Hyderabad', state: 'Telangana', displayOrder: 2 },
  { name: 'Malkajgiri',      city: 'Hyderabad', state: 'Telangana', displayOrder: 3 },
  { name: 'Anand Bagh',      city: 'Hyderabad', state: 'Telangana', displayOrder: 4 },
  { name: 'Dayanand Nagar',  city: 'Hyderabad', state: 'Telangana', displayOrder: 5 },
  { name: 'Moula Ali',       city: 'Hyderabad', state: 'Telangana', displayOrder: 6 },
  { name: 'A.S. Rao Nagar',  city: 'Hyderabad', state: 'Telangana', displayOrder: 7 },
  { name: 'Sainikpuri',      city: 'Hyderabad', state: 'Telangana', displayOrder: 8 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  let added = 0, skipped = 0;
  for (const area of defaultAreas) {
    const exists = await ServiceableArea.findOne({ name: area.name, city: area.city });
    if (!exists) {
      await ServiceableArea.create({ ...area, isActive: true });
      console.log(`  ➕ Added: ${area.name}`);
      added++;
    } else {
      console.log(`  ⏭  Skipped (already exists): ${area.name}`);
      skipped++;
    }
  }

  console.log(`\n🎉 Done! Added: ${added}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
