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

    // Create Store with Login Flow (Full Journey)
    store_auth_homepage: 'Zur Homepage navigieren',
    store_auth_click_login: 'Login-Button klicken',
    store_auth_enter_email: 'E-Mail eingeben',
    store_auth_enter_password: 'Passwort eingeben',
    store_auth_submit: 'Anmelden',
    store_auth_enter_name: 'Store-Namen eingeben',
    store_auth_select_city: 'Stadt auswählen',
    store_auth_select_category: 'Kategorie auswählen',
    store_auth_create: 'Store jetzt erstellen',
    store_auth_skip_products: 'Produkte später hinzufügen',
    store_auth_goto_dashboard: 'Zum Dashboard navigieren',
    store_auth_manage_store: 'Store verwalten',
    store_auth_success: 'Store erfolgreich erstellt und verwaltet',

    // Quick Start Flow (No Registration)
    quick_landing: 'Homepage besuchen',
    quick_cta_click: 'Auf "Shop erstellen" klicken',
    quick_enter_name: 'Shop-Namen eingeben',
    quick_select_type: 'Geschäftstyp auswählen',
    quick_create_store: 'Shop erstellen',
    quick_view_store: 'Shop ansehen (Storefront)',
    quick_success: 'Erfolg! Shop erstellt',

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

    // Create Store with Login Flow (Full Journey)
    store_auth_homepage: 'Navigate to homepage',
    store_auth_click_login: 'Click login button',
    store_auth_enter_email: 'Enter email',
    store_auth_enter_password: 'Enter password',
    store_auth_submit: 'Sign in',
    store_auth_enter_name: 'Enter store name',
    store_auth_select_city: 'Select city',
    store_auth_select_category: 'Select category',
    store_auth_create: 'Create store now',
    store_auth_skip_products: 'Add products later',
    store_auth_goto_dashboard: 'Navigate to dashboard',
    store_auth_manage_store: 'Manage store',
    store_auth_success: 'Store created and managed successfully',

    // Quick Start Flow (No Registration)
    quick_landing: 'Visit homepage',
    quick_cta_click: 'Click "Create Shop"',
    quick_enter_name: 'Enter shop name',
    quick_select_type: 'Select business type',
    quick_create_store: 'Create shop',
    quick_view_store: 'View shop (Storefront)',
    quick_success: 'Success! Shop created',

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

    // Create Store with Login Flow (Full Journey)
    store_auth_homepage: 'الانتقال إلى الصفحة الرئيسية',
    store_auth_click_login: 'انقر على زر تسجيل الدخول',
    store_auth_enter_email: 'أدخل البريد الإلكتروني',
    store_auth_enter_password: 'أدخل كلمة المرور',
    store_auth_submit: 'تسجيل الدخول',
    store_auth_enter_name: 'أدخل اسم المتجر',
    store_auth_select_city: 'اختر المدينة',
    store_auth_select_category: 'اختر الفئة',
    store_auth_create: 'إنشاء المتجر الآن',
    store_auth_skip_products: 'إضافة المنتجات لاحقًا',
    store_auth_goto_dashboard: 'الانتقال إلى لوحة التحكم',
    store_auth_manage_store: 'إدارة المتجر',
    store_auth_success: 'تم إنشاء المتجر وإدارته بنجاح',

    // Quick Start Flow (No Registration)
    quick_landing: 'زيارة الصفحة الرئيسية',
    quick_cta_click: 'انقر على "إنشاء متجر"',
    quick_enter_name: 'أدخل اسم المتجر',
    quick_select_type: 'اختر نوع العمل',
    quick_create_store: 'إنشاء متجر',
    quick_view_store: 'عرض المتجر (واجهة المتجر)',
    quick_success: 'نجاح! تم إنشاء المتجر',

    // Generic
    intro_title: 'مرحبًا بك في هذا البرنامج التعليمي',
    outro_title: 'جربه مجانًا الآن!',
    outro_cta: 'قم بزيارتنا على'
  },

  fr: {
    // Login Flow
    login_visit_homepage: 'Visiter la page d\'accueil',
    login_click_button: 'Cliquer sur connexion',
    login_enter_credentials: 'Entrer les identifiants',
    login_submit: 'Soumettre la connexion',
    login_success: 'Connexion réussie',

    // Checkout Flow
    checkout_goto_products: 'Aller aux produits',
    checkout_select_product: 'Sélectionner un produit',
    checkout_add_to_cart: 'Ajouter au panier',
    checkout_goto_cart: 'Aller au panier',
    checkout_proceed: 'Passer à la caisse',
    checkout_shipping_info: 'Entrer les informations de livraison',
    checkout_payment: 'Sélectionner le mode de paiement',
    checkout_complete: 'Finaliser la commande',
    checkout_success: 'Commande réussie',

    // Products Flow
    products_browse: 'Parcourir les produits',
    products_category: 'Sélectionner la catégorie',
    products_details: 'Voir les détails du produit',
    products_images: 'Parcourir les images du produit',
    products_description: 'Lire la description du produit',
    products_related: 'Voir les produits similaires',

    // Create Store Flow
    store_login: 'Se connecter',
    store_navigate: 'Aller à la création de boutique',
    store_fill_details: 'Entrer les informations de la boutique',
    store_submit: 'Finaliser la création',
    store_success: 'Boutique créée avec succès',

    // Quick Start Flow (No Registration)
    quick_landing: 'Visiter la page d\'accueil',
    quick_cta_click: 'Cliquer sur "Créer boutique"',
    quick_enter_name: 'Entrer le nom de la boutique',
    quick_select_type: 'Sélectionner le type d\'activité',
    quick_create_store: 'Créer la boutique',
    quick_view_store: 'Voir la boutique (Storefront)',
    quick_success: 'Succès ! Boutique créée',

    // Generic
    intro_title: 'Bienvenue dans ce tutoriel',
    outro_title: 'Essayez gratuitement !',
    outro_cta: 'Visitez-nous sur'
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
