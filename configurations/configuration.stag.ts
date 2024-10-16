// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const configuration = {
  production: false,
  staging: false,
  hmr: false,
  debug: false
};

export const buildConfig = {
  DEBUG: true,
  APPLICATION_ID: "dev.sunbirdsaas.app",
  BUILD_TYPE: "debug",
  FLAVOR: "dev",
  VERSION_CODE: 1,
  VERSION_NAME: "release-8",
  // Field from product flavor: staging
  BASE_URL: "https://sunbirdsaas.com",
  // Field from product flavor: staging
  CHANNEL_ID: "01358974742001254423",
  // Field from product flavor: staging
  MAX_COMPATIBILITY_LEVEL: 5,
  // Field from product flavor: staging
  MOBILE_APP_CONSUMER: "mobile_device",
  // Field from product flavor: staging
  MOBILE_APP_KEY: "dev.sunbird.com-mobile-app-sunbirdsaas-11",
  // Field from product flavor: staging
  MOBILE_APP_SECRET: "VRqSm3K0cuR6aLxkmY0tL63FC48YyDi6",
  // Field from the variant API
  REAL_VERSION_NAME: "release-8",
  // Field from default config.
  SUPPORT_EMAIL: "nidhi_k@tekditechnologies.com",
  // Field from build type: debug
  USE_CRASHLYTICS: false
}
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
