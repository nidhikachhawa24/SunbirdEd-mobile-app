import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.sunbirdsaas.app',
  appName: 'Sunbird',
  webDir: "www",
  loggingBehavior: "none",
  server: {
    androidScheme: 'https',
  },
  plugins: {
    FCMPlugin: {
      "ANDROID_FIREBASE_BOM_VERSION": "26.5.0",
      "GRADLE_TOOLS_VERSION": "8.0.0",
      "GOOGLE_SERVICES_VERSION": "4.3.15",
      "ANDROID_DEFAULT_NOTIFICATION_ICON": "@mipmap/ic_launcher"
    },
    customtabs: {
      "URL_SCHEME": "dev.sunbirdsaas.app",
      "URL_HOST": "mobile",
    },
    "window.plugins.googleplus": {
      "PLAY_SERVICES_VERSION": "15.0.1"
    },
    SplashScreen: {
      "launchShowDuration": 0
    },
    LocalNotifications: {
      iconColor: "#488AFF",
      smallIcon: 'mipmap-hdpi-icon/ic_launcher',
      sound: "beep.wav",
    },
  },
};

export default config;
