import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { roles } from "../../config/constants.js";

export const demoUserAccounts = [
  {
    email: "demo.alex@listix.local",
    password: "X4!bR8@nK2-vM7_L9qT5pC6z",
    displayName: "Alex Morgan",
    role: roles.user,
    profileSettings: {
      city: "Berlin",
      country: "Germany",
      payoutMethod: "Bank transfer",
      payoutAccountHolder: "Alex Morgan",
      payoutBankName: "N26",
      paymentCardBrand: "Visa",
      paymentCardLast4: "4242",
      discordHandle: "@alex.morgan",
    },
  },
  {
    email: "demo.jamie@listix.local",
    password: "J6@wP3!tN8-rV4_K2mQ9xL7c",
    displayName: "Jamie Keller",
    role: roles.user,
    profileSettings: {
      city: "Amsterdam",
      country: "Netherlands",
      payoutMethod: "Revolut",
      revolutRevtag: "@jamie-listix",
      paymentCardBrand: "MasterCard",
      paymentCardLast4: "5454",
      discordHandle: "@jamie.keller",
    },
  },
  {
    email: "demo.taylor@listix.local",
    password: "T8!zM5@qR2-vK9_L4nP7xC3w",
    displayName: "Taylor Reed",
    role: roles.user,
    profileSettings: {
      city: "London",
      country: "United Kingdom",
      payoutMethod: "Bank transfer",
      payoutAccountHolder: "Taylor Reed",
      payoutBankName: "Monzo",
      paymentCardBrand: "Visa",
      paymentCardLast4: "1881",
      discordHandle: "@taylor.reed",
    },
  },
];

const coreUsers = [
  {
    email: env.adminUser.email,
    password: env.adminUser.password,
    displayName: env.adminUser.displayName,
    role: roles.admin,
    profileSettings: {
      city: "Berlin",
      country: "Germany",
      payoutMethod: "Bank transfer",
      discordHandle: "@platform.admin",
    },
  },
  {
    email: env.systemAdminUser.email,
    password: env.systemAdminUser.password,
    displayName: env.systemAdminUser.displayName,
    role: roles.systemAdmin,
    profileSettings: {
      city: "Berlin",
      country: "Germany",
      payoutMethod: "Bank transfer",
      discordHandle: "@listix.system.admin",
    },
  },
];

export const seedApplicationUsers = async (
  client,
  { includeDemoUsers = env.seedDemoData } = {},
) => {
  const users = includeDemoUsers ? [...coreUsers, ...demoUserAccounts] : coreUsers;

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await client.query(`
      INSERT INTO users (email, password_hash, display_name, role, profile_settings)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        profile_settings = users.profile_settings || EXCLUDED.profile_settings,
        updated_at = NOW()
    `, [
      user.email.toLowerCase().trim(),
      passwordHash,
      user.displayName,
      user.role,
      JSON.stringify(user.profileSettings),
    ]);
  }
};
