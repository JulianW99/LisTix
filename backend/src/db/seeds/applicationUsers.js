import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { roles } from "../../config/constants.js";

const demoUsers = [
  { email: "demo.alex@listix.local", password: "DemoUser123!", displayName: "Alex Morgan", role: roles.user, city: "Berlin", country: "Germany" },
  { email: "demo.jamie@listix.local", password: "DemoUser123!", displayName: "Jamie Keller", role: roles.user, city: "Amsterdam", country: "Netherlands" },
  { email: "demo.taylor@listix.local", password: "DemoUser123!", displayName: "Taylor Reed", role: roles.user, city: "London", country: "United Kingdom" },
  { email: env.systemAdminUser.email, password: env.systemAdminUser.password, displayName: env.systemAdminUser.displayName, role: roles.systemAdmin, city: "Berlin", country: "Germany" },
];

export const seedApplicationUsers = async (client) => {
  const users = [
    { email: env.adminUser.email, password: env.adminUser.password, displayName: env.adminUser.displayName, role: roles.admin, city: "Berlin", country: "Germany" },
    ...demoUsers,
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const profileSettings = { city: user.city, country: user.country, payoutMethod: "Bank transfer", discordHandle: `@${user.displayName.toLowerCase().replace(/\s+/g, ".")}` };
    await client.query(`
      INSERT INTO users (email, password_hash, display_name, role, profile_settings)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name,
        role = EXCLUDED.role, profile_settings = users.profile_settings || EXCLUDED.profile_settings,
        updated_at = NOW()
    `, [user.email, passwordHash, user.displayName, user.role, JSON.stringify(profileSettings)]);
  }
};
