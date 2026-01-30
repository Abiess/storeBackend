/**
 * Translation templates for multi-language support
 */

const translations = {
  de: {
    // Login Flow
    login_visit_homepage: 'Homepage besuchen',
    login_click_button: 'Login-Button klicken',
    login_enter_credentials: 'Anmeldedaten eingeben',
    login_submit: 'Anmeldung abschicken',
    login_success: 'Erfolgreich angemeldet',

    // Checkout Flow
    checkout_goto_products: 'Zur Produktübersicht',
    checkout_select_product: 'Produkt auswählen',
    checkout_add_to_cart: 'In den Warenkorb legen',
    checkout_goto_cart: 'Zum Warenkorb',
    checkout_proceed: 'Zur Kasse gehen',
    checkout_shipping_info: 'Versandinformationen eingeben',
    checkout_payment: 'Zahlungsmethode wählen',
    checkout_complete: 'Bestellung abschließen',
    checkout_success: 'Bestellung erfolgreich',

    // Products Flow
    products_browse: 'Zur Produktübersicht',
    products_category: 'Kategorie auswählen',
    products_details: 'Produktdetails ansehen',
    products_images: 'Produktbilder durchsehen',
    products_description: 'Produktbeschreibung lesen',
    products_related: 'Ähnliche Produkte ansehen',

    // Create Store Flow
    store_login: 'Anmelden',
    store_navigate: 'Store erstellen aufrufen',
    store_fill_details: 'Store-Informationen eingeben',
    store_submit: 'Store erstellen abschließen',
    store_success: 'Store erfolgreich erstellt',

    // Generic
    intro_title: 'Willkommen zu diesem Tutorial',
    outro_title: 'Jetzt kostenlos testen!',
    outro_cta: 'Besuchen Sie uns auf'
  },

  en: {
    // Login Flow
    login_visit_homepage: 'Visit homepage',
    login_click_button: 'Click login button',
    login_enter_credentials: 'Enter credentials',
    login_submit: 'Submit login',
    login_success: 'Successfully logged in',

    // Checkout Flow
    checkout_goto_products: 'Go to products',
    checkout_select_product: 'Select a product',
    checkout_add_to_cart: 'Add to cart',
    checkout_goto_cart: 'Go to cart',
    checkout_proceed: 'Proceed to checkout',
    checkout_shipping_info: 'Enter shipping information',
    checkout_payment: 'Select payment method',
    checkout_complete: 'Complete order',
    checkout_success: 'Order successful',

    // Products Flow
    products_browse: 'Browse products',
    products_category: 'Select category',
    products_details: 'View product details',
    products_images: 'Browse product images',
    products_description: 'Read product description',
    products_related: 'View related products',

    // Create Store Flow
    store_login: 'Sign in',
    store_navigate: 'Go to create store',
    store_fill_details: 'Enter store information',
    store_submit: 'Complete store creation',
    store_success: 'Store created successfully',

    // Generic
    intro_title: 'Welcome to this tutorial',
    outro_title: 'Try it for free!',
    outro_cta: 'Visit us at'
  },

  ar: {
    // Login Flow
    login_visit_homepage: 'زيارة الصفحة الرئيسية',
    login_click_button: 'انقر على زر تسجيل الدخول',
    login_enter_credentials: 'أدخل بيانات الاعتماد',
    login_submit: 'إرسال تسجيل الدخول',
    login_success: 'تم تسجيل الدخول بنجاح',

    // Checkout Flow
    checkout_goto_products: 'انتقل إلى المنتجات',
    checkout_select_product: 'اختر منتجًا',
    checkout_add_to_cart: 'أضف إلى السلة',
    checkout_goto_cart: 'انتقل إلى السلة',
    checkout_proceed: 'انتقل إلى الدفع',
    checkout_shipping_info: 'أدخل معلومات الشحن',
    checkout_payment: 'اختر طريقة الدفع',
    checkout_complete: 'إتمام الطلب',
    checkout_success: 'تم الطلب بنجاح',

    // Products Flow
    products_browse: 'تصفح المنتجات',
    products_category: 'اختر الفئة',
    products_details: 'عرض تفاصيل المنتج',
    products_images: 'تصفح صور المنتج',
    products_description: 'اقرأ وصف المنتج',
    products_related: 'عرض المنتجات ذات الصلة',

    // Create Store Flow
    store_login: 'تسجيل الدخول',
    store_navigate: 'انتقل إلى إنشاء المتجر',
    store_fill_details: 'أدخل معلومات المتجر',
    store_submit: 'إتمام إنشاء المتجر',
    store_success: 'تم إنشاء المتجر بنجاح',

    // Generic
    intro_title: 'مرحبًا بك في هذا البرنامج التعليمي',
    outro_title: 'جربه مجانًا الآن!',
    outro_cta: 'قم بزيارتنا على'
  }
};

function getTranslation(lang, key) {
  return translations[lang]?.[key] || translations['en'][key] || key;
}

function getAllTranslations(lang) {
  return translations[lang] || translations['en'];
}

module.exports = {
  translations,
  getTranslation,
  getAllTranslations
};
