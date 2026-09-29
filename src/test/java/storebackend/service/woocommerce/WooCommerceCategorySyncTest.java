package storebackend.service.woocommerce;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.woocommerce.api.WooCategoryDto;
import storebackend.dto.woocommerce.api.WooImageDto;
import storebackend.entity.Category;
import storebackend.entity.Store;
import storebackend.entity.WooCommerceConfig;
import storebackend.repository.CategoryRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.WooCommerceConfigRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WooCommerceCategorySyncTest {
    @Mock private WooCommerceApiClient apiClient;
    @Mock private WooCommerceConfigRepository configRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private CategoryRepository categoryRepository;
    @InjectMocks private WooCommerceImportService service;

    @Test
    void linksExistingChildEvenWhenWooReturnsItBeforeParent() {
        Store store = new Store();
        store.setId(121L);
        WooCommerceConfig config = new WooCommerceConfig();
        Category child = category(299L, store);
        Category parent = category(316L, store);
        WooCategoryDto wooChild = new WooCategoryDto();
        wooChild.setId(40L);
        wooChild.setName("Couscous");
        wooChild.setParent(42L);
        WooImageDto image = new WooImageDto();
        image.setSrc("https://example.com/couscous.jpg");
        wooChild.setImage(image);
        WooCategoryDto wooParent = new WooCategoryDto();
        wooParent.setId(42L);
        wooParent.setName("Lebensmittel");
        wooParent.setParent(0L);

        when(storeRepository.findById(121L)).thenReturn(Optional.of(store));
        when(configRepository.findByStoreId(121L)).thenReturn(Optional.of(config));
        when(apiClient.getCategories(config, 1, 100)).thenReturn(List.of(wooChild, wooParent));
        when(categoryRepository.findByStoreIdAndExternalSourceAndExternalId(eq(121L), eq("WOOCOMMERCE"), eq("40")))
                .thenReturn(Optional.of(child));
        when(categoryRepository.findByStoreIdAndExternalSourceAndExternalId(eq(121L), eq("WOOCOMMERCE"), eq("42")))
                .thenReturn(Optional.of(parent));
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.syncCategories(121L)).isEqualTo(2);
        assertThat(child.getParent()).isSameAs(parent);
        assertThat(child.getImageUrl()).isEqualTo("https://example.com/couscous.jpg");
    }

    private Category category(Long id, Store store) {
        Category category = new Category();
        category.setId(id);
        category.setStore(store);
        return category;
    }
}
