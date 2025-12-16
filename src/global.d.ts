export {};

declare global {
  interface Window {
    uiAlert: (message: string, title?: string) => Promise<void>;
    uiConfirm: (message: string, title?: string) => Promise<boolean>;

    configReady: Promise<void>;
    CONFIG: {
      WHATSAPP_TO?: string;
      EMAIL_TO?: string;
      PHONE_TO?: string;
    };
  }
}
