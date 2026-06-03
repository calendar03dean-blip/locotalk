/**
 * iap.ts — 인앱 결제 서비스 (react-native-iap v14+)
 *
 * App Store Connect 상품 등록:
 *   appstoreconnect.apple.com → Locotalk → 수익화 → 인앱 구입 → +
 *   유형: 자동 갱신 구독
 *   구독 그룹명: "Locotalk Premium"
 *   ┌─────────────────────────────────────┬────────┐
 *   │ 참조 이름                           │ 가격   │
 *   ├─────────────────────────────────────┼────────┤
 *   │ locotalk.premium.monthly  (월간)    │ ₩5,900 │
 *   │ locotalk.premium.yearly   (연간)    │₩59,900 │
 *   └─────────────────────────────────────┴────────┘
 */
import {
  initConnection,
  endConnection,
  getAvailablePurchases,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
  fetchProducts,
  requestPurchase,
  ErrorCode,
  type ProductSubscription,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { useStore } from '../store';

// ── 상품 ID ──────────────────────────────────────────────────────────
export const PRODUCT_IDS = {
  MONTHLY: 'locotalk.premium.monthly',
  YEARLY:  'locotalk.premium.yearly',
} as const;

export type PlanType = 'monthly' | 'yearly';

// ── 내부 상태 ─────────────────────────────────────────────────────────
let isConnected = false;
let purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
let purchaseErrorSub:  ReturnType<typeof purchaseErrorListener>  | null = null;

// ── IAP 초기화 ────────────────────────────────────────────────────────
export async function initIAP(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await initConnection();
    isConnected = true;

    // 구매 완료 이벤트
    purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
      if (purchase.transactionId) {
        try {
          // TODO: 서버에서 영수증 검증 (production)
          await finishTransaction({ purchase, isConsumable: false });
          useStore.getState().setPremium(true);
        } catch (e) {
          console.warn('[IAP] finishTransaction 실패:', e);
        }
      }
    });

    // 구매 오류 이벤트
    purchaseErrorSub = purchaseErrorListener((error) => {
      if (error.code !== ErrorCode.Interrupted) {
        console.warn('[IAP] 구매 오류:', error.code, error.message);
      }
    });

    // 앱 시작 시 기존 구독 복원
    await restoreExistingPurchases();
  } catch (e) {
    console.warn('[IAP] 초기화 실패:', e);
  }
}

// ── 기존 구독 자동 복원 ──────────────────────────────────────────────
async function restoreExistingPurchases(): Promise<boolean> {
  if (!isConnected) return false;
  try {
    const purchases = await getAvailablePurchases();
    const hasActive = purchases.some(p =>
      p.productId === PRODUCT_IDS.MONTHLY ||
      p.productId === PRODUCT_IDS.YEARLY
    );
    if (hasActive) useStore.getState().setPremium(true);
    return hasActive;
  } catch (e) {
    console.warn('[IAP] 복원 실패:', e);
    return false;
  }
}

// ── 상품 정보 로드 ───────────────────────────────────────────────────
export async function loadSubscriptionProducts(): Promise<ProductSubscription[]> {
  if (!isConnected) {
    try { await initConnection(); isConnected = true; } catch { return []; }
  }
  try {
    const result = await fetchProducts({
      skus: [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY],
      type: 'subs',
    });
    return (result ?? []) as ProductSubscription[];
  } catch (e) {
    console.warn('[IAP] 상품 로드 실패:', e);
    return [];
  }
}

// ── 구독 구매 ────────────────────────────────────────────────────────
export async function purchasePlan(plan: PlanType): Promise<void> {
  const sku = plan === 'monthly' ? PRODUCT_IDS.MONTHLY : PRODUCT_IDS.YEARLY;
  if (!isConnected) {
    try { await initConnection(); isConnected = true; }
    catch { throw new Error('스토어에 연결할 수 없어요. 잠시 후 다시 시도해주세요.'); }
  }
  // requestPurchase → purchaseUpdatedListener에서 완료 처리
  await requestPurchase({
    type: 'subs',
    request: { apple: { sku } },
  });
}

// ── 구매 수동 복원 ───────────────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  if (!isConnected) {
    try { await initConnection(); isConnected = true; } catch { return false; }
  }
  return await restoreExistingPurchases();
}

// ── 연결 해제 ────────────────────────────────────────────────────────
export function cleanupIAP(): void {
  purchaseUpdateSub?.remove();
  purchaseErrorSub?.remove();
  if (isConnected) {
    endConnection();
    isConnected = false;
  }
}
