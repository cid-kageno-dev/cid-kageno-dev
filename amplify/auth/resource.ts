import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Verify your Cid Kageno Portfolio account',
      verificationEmailBody: (createCode) =>
        `Welcome! Your verification code is: ${createCode()}. This code expires in 24 hours.`,
    },
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
      },
      callbackUrls: [
        'http://localhost:5000/',
        'https://main.YOUR_AMPLIFY_APP_ID.amplifyapp.com/',
      ],
      logoutUrls: [
        'http://localhost:5000/',
        'https://main.YOUR_AMPLIFY_APP_ID.amplifyapp.com/',
      ],
    },
  },
});
