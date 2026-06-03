// Type stubs for native modules not yet installed in devDependencies.
// These allow tsc to pass; actual runtime behaviour comes from the native packages.

declare module 'expo-web-browser' {
  export function maybeCompleteAuthSession(): void;
  export function openAuthSessionAsync(url: string, redirectUrl: string): Promise<{ type: string; url?: string }>;
}

declare module 'expo-apple-authentication' {
  export enum AppleAuthenticationScope {
    EMAIL = 0,
    FULL_NAME = 1,
  }
  export enum AppleAuthenticationButtonType {
    SIGN_IN = 0,
    CONTINUE = 1,
  }
  export enum AppleAuthenticationButtonStyle {
    WHITE = 0,
    WHITE_OUTLINE = 1,
    BLACK = 2,
  }
  export interface AppleAuthenticationCredential {
    user: string;
    email?: string | null;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
    identityToken?: string | null;
  }
  export function signInAsync(options: { requestedScopes: AppleAuthenticationScope[] }): Promise<AppleAuthenticationCredential>;
  export function AppleAuthenticationButton(props: {
    buttonType: AppleAuthenticationButtonType;
    buttonStyle: AppleAuthenticationButtonStyle;
    cornerRadius?: number;
    style?: any;
    onPress: () => void;
  }): JSX.Element;
}

declare module '@react-native-google-signin/google-signin' {
  export interface ConfigureParams {
    iosClientId?: string;
    webClientId?: string;
  }
  export interface User {
    email: string;
    id: string;
    name?: string | null;
    photo?: string | null;
  }
  export interface SignInResponse {
    data?: { user?: User };
  }
  export const GoogleSignin: {
    configure(params: ConfigureParams): void;
    hasPlayServices(opts?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
    signIn(): Promise<SignInResponse>;
    signOut(): Promise<void>;
  };
}

declare module '@react-native-kakao/user' {
  export interface KakaoProfile {
    id: string;
    email?: string;
  }
  export function login(): Promise<{ accessToken: string }>;
  export function logout(): Promise<void>;
  export function getProfile(): Promise<KakaoProfile>;
}

declare module 'react-native-iap' {
  export interface ProductSubscription {
    productId: string;
    title: string;
    description: string;
    localizedPrice: string;
    currency: string;
    subscriptionPeriodNumberIOS?: string;
    subscriptionPeriodUnitIOS?: string;
  }
  export interface Purchase {
    productId: string;
    transactionId?: string;
    transactionReceipt?: string;
  }
  export interface PurchaseError {
    code: string;
    message: string;
  }
  export enum ErrorCode {
    Interrupted = 'E_INTERRUPTED',
    UserCancelled = 'E_USER_CANCELLED',
  }
  export function initConnection(): Promise<boolean>;
  export function endConnection(): Promise<void>;
  export function getAvailablePurchases(): Promise<Purchase[]>;
  export function finishTransaction(opts: { purchase: Purchase; isConsumable: boolean }): Promise<void>;
  export function fetchProducts(opts: { skus: string[]; type?: string }): Promise<ProductSubscription[]>;
  export function requestPurchase(opts: { type: string; request: any }): Promise<Purchase>;
  export function purchaseUpdatedListener(cb: (purchase: Purchase) => void): { remove(): void };
  export function purchaseErrorListener(cb: (error: PurchaseError) => void): { remove(): void };
}
