import cron from 'node-cron';
import { Patient } from '../modules/Authentication/patient.model.js';
import Doctor from '../modules/Doctors/doctor.model.js';


export const runAccountCleanupJob = () => {
  // Run every night at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Starting 90-day account cleanup job...');
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const query = {
        isDeleted: true,
        deletedAt: { $lte: ninetyDaysAgo }
      };

      const deletedPatients = await Patient.deleteMany(query);
      const deletedStaff = await Doctor.deleteMany(query);

      console.log(`[CRON] Cleanup finished. Hard-deleted ${deletedPatients.deletedCount} patients and ${deletedStaff.deletedCount} staff accounts that were soft-deleted over 90 days ago.`);
    } catch (error) {
      console.error('[CRON] Error during account cleanup:', error);
    }
  });
};
