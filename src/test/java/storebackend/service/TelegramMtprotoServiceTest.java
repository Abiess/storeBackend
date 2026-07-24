package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import storebackend.dto.ProductDTO;
import storebackend.entity.Media;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.TelegramMtprotoConfig;
import storebackend.entity.User;
import storebackend.repository.*;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TelegramMtprotoServiceTest {

    @Test
    void saveOneProductFromPostStoresPermanentPublicUrlForFirstTelegramImage() throws Exception {
        TelegramMtprotoConfigRepository mtprotoRepository = mock(TelegramMtprotoConfigRepository.class);
        TelegramImportLogRepository importLogRepository = mock(TelegramImportLogRepository.class);
        StoreRepository storeRepository = mock(StoreRepository.class);
        ProductService productService = mock(ProductService.class);
        CategoryService categoryService = mock(CategoryService.class);
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        MediaService mediaService = mock(MediaService.class);
        MinioService minioService = mock(MinioService.class);
        ProductMediaRepository productMediaRepository = mock(ProductMediaRepository.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        TelegramSyncNotificationRepository notificationRepository = mock(TelegramSyncNotificationRepository.class);
        AiModelProvider aiModelProvider = mock(AiModelProvider.class);

        TelegramMtprotoService service = new TelegramMtprotoService(
            mtprotoRepository,
            importLogRepository,
            storeRepository,
            productService,
            categoryService,
            categoryRepository,
            mediaService,
            minioService,
            new ObjectMapper(),
            productMediaRepository,
            productRepository,
            notificationRepository,
            aiModelProvider
        );

        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(88L);

        ProductDTO productDto = new ProductDTO();
        productDto.setId(88L);

        Media media = new Media();
        media.setId(777L);
        media.setMinioObjectName("stores/121/telegram/mtproto.jpg");

        when(productService.createProduct(any(), any(), any())).thenReturn(productDto);
        when(productRepository.findById(88L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productMediaRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(mediaService.uploadFromBase64(store, "aGVsbG8=", "Telegram Import 12 EUR (Telegram)")).thenReturn(media);
        when(minioService.getPublicUrl("store-assets", "stores/121/telegram/mtproto.jpg"))
            .thenReturn("https://minio.markt.ma/store-assets/stores/121/telegram/mtproto.jpg");

        JsonNode post = new ObjectMapper().readTree("""
            {
              "message_id": 11,
              "text": "Telegram Import 12 EUR",
              "date": "2026-07-24T11:00:00Z",
              "photo_bytes_list": ["aGVsbG8="]
            }
            """);

        service.saveOneProductFromPost(post, store, new User(), "@markt", new TelegramMtprotoConfig());

        ArgumentCaptor<Product> productCaptor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository, org.mockito.Mockito.atLeast(2)).save(productCaptor.capture());
        assertEquals(
            "https://minio.markt.ma/store-assets/stores/121/telegram/mtproto.jpg",
            productCaptor.getAllValues().get(productCaptor.getAllValues().size() - 1).getImageUrl()
        );
    }
}
