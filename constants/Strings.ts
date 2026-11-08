export const Strings = {
  cart: {
    addLabel: (name: string) => `Add ${name} to shopping list`,
    removeLabel: (name: string) => `Remove ${name} from shopping list`,
  },
  profile: {
    title: 'Profile',
    guestName: 'Guest shopper',
    guestSubtitle: 'Your shopping list is saved on this device',
    preferencesSection: 'Preferences',
    appearance: 'Appearance',
    appearanceOptions: { light: 'Light', dark: 'Dark', system: 'Auto' },
    supportSection: 'Support',
    contactSupport: 'Contact support',
    privacyPolicy: 'Privacy policy',
    aboutSection: 'About',
    aboutBody:
      'Brite Shopping compares grocery prices across stores so you can see where to get the best deal.',
    storesWeCompare: 'Stores we compare',
    storesLoading: 'Loading stores…',
    storesError: 'Couldn’t load stores. Tap to retry.',
    storesEmpty: 'No stores available yet',
    version: 'Version',
    disclaimer:
      'Prices are estimates collected from store websites and may differ in store.',
    deviceId: (id: string) => `Device ID: ${id}`,
    emailUnavailableTitle: 'No email app found',
    emailUnavailableBody: (email: string) => `Email us at ${email}`,
    linkErrorTitle: 'Couldn’t open link',
    linkErrorBody: 'Please try again later.',
  },
} as const;

export const SUPPORT_EMAIL = 'support@briteshopping.com';
export const PRIVACY_POLICY_URL = 'https://brite-shopping-api.onrender.com/privacy';
