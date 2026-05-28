import Purchases from 'react-native-purchases';

export const REVENUECAT_API_KEY = 'appl_wTczoiAoAftnoWuPqRtBNvvZeIh';

export async function iniciarRevenueCat(userId) {
  try {
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId || null,
    });
  } catch (e) {
    console.log('RevenueCat init error', e);
  }
}

export async function comprarProMensual() {
  try {
    const offerings = await Purchases.getOfferings();

    const paquete =
      offerings.current?.monthly ||
      offerings.current?.availablePackages?.[0];

    if (!paquete) {
      throw new Error('No hay paquete mensual');
    }

    const compra = await Purchases.purchasePackage(paquete);

    return compra.customerInfo.entitlements.active['comelo Pro'];
  } catch (e) {
    console.log('Error compra pro', e);
    return false;
  }
}

export async function restaurarCompras() {
  try {
    const customerInfo = await Purchases.restorePurchases();

    return customerInfo.entitlements.active['comelo Pro'];
  } catch (e) {
    console.log('Error restaurando', e);
    return false;
  }
}
