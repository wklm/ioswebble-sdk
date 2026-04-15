// Ambient type declaration for optional @ios-web-bluetooth/core dependency.
// The dynamic import in detect.ts is wrapped in try/catch, so core is not required at runtime.
declare module '@ios-web-bluetooth/core' {
  export type Platform = 'safari-extension' | 'ios-safari' | 'other-mobile' | 'desktop';
  export function detectPlatform(): Platform;
}
