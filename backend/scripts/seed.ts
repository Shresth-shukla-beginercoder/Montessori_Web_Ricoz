/**
 * Seeds a demo centre + users for local smoke testing.
 * Does NOT wipe existing data — upserts by email.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI required');
  await mongoose.connect(uri);

  const { DaycareCentre } = await import('../src/models/DaycareCentre');
  const { User } = await import('../src/models/User');
  const { Staff } = await import('../src/models/Staff');
  const { Parent } = await import('../src/models/Parent');
  const { Child } = await import('../src/models/Child');

  let centre = await DaycareCentre.findOne({ name: 'Demo Montessori Centre' });
  if (!centre) {
    centre = await DaycareCentre.create({
      name: 'Demo Montessori Centre',
      address: '12 Learning Lane, Demo City',
      status: 'active',
    });
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const upsertUser = async (email: string, name: string, role: string, centreId?: string) => {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, passwordHash, name, role, centreId });
    }
    return user;
  };

  const admin = await upsertUser('admin@demo.local', 'HQ Admin', 'super_admin');
  const manager = await upsertUser(
    'manager@demo.local',
    'Centre Manager',
    'centre_manager',
    String(centre._id)
  );
  const teacher = await upsertUser(
    'teacher@demo.local',
    'Lead Teacher',
    'teacher',
    String(centre._id)
  );
  const parentUser = await upsertUser(
    'parent@demo.local',
    'Demo Parent',
    'parent',
    String(centre._id)
  );

  const ensureStaff = async (userId: unknown, name: string, role: 'teacher' | 'centre_manager') => {
    const existing = await Staff.findOne({ userId });
    if (!existing) {
      await Staff.create({ centreId: centre!._id, userId, name, role });
    }
  };
  await ensureStaff(manager._id, manager.name, 'centre_manager');
  await ensureStaff(teacher._id, teacher.name, 'teacher');

  let parent = await Parent.findOne({ userId: parentUser._id });
  if (!parent) {
    parent = await Parent.create({
      centreId: centre._id,
      userId: parentUser._id,
      name: parentUser.name,
      phone: '+910000000000',
    });
  }

  let child = await Child.findOne({ name: 'Demo Child', centreId: centre._id });
  if (!child) {
    child = await Child.create({
      centreId: centre._id,
      name: 'Demo Child',
      dob: new Date('2021-06-15'),
      parentIds: [parentUser._id],
      status: 'active',
    });
  }

  console.log(
    JSON.stringify(
      {
        centreId: String(centre._id),
        users: {
          admin: admin.email,
          manager: manager.email,
          teacher: teacher.email,
          parent: parentUser.email,
        },
        childId: String(child._id),
        password: 'Password123!',
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
