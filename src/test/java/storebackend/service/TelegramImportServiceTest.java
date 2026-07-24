package storebackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.ProductDTO;
import storebackend.dto.TelegramImportResultDto;
import storebackend.dto.TelegramMessageDto;
import storebackend.entity.Media;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.TelegramStoreConfig;
import storebackend.entity.User;
import storebackend.repository.*;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramImportServiceTest {

    @Mock private TelegramBotService telegramBotService;
    @Mock private TelegramStoreConfigRepository configRepository;
    @Mock private TelegramImportLogRepository importLogRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private ProductService productService;
    @Mock private CategoryService categoryService;
    @Mock private CategoryRepository categoryRepository;
    @Mock private MediaService mediaService;
    @Mock private MinioService minioService;
    @Mock private ProductMediaRepository productMediaRepository;
    @Mock private ProductRepository productRepository;

    @InjectMocks
    private TelegramImportService telegramImportService;

    @Test
    void processPostStoresPermanentPublicUrlForFirstTelegramImage() throws Exception {
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(77L);

        ProductDTO productDto = new ProductDTO();
        productDto.setId(77L);

        Media media = new Media();
        media.setId(501L);
        media.setMinioObjectName("stores/121/telegram/produkt.jpg");

        TelegramStoreConfig cfg = new TelegramStoreConfig();
        cfg.setChannelId("@markt");

        TelegramMessageDto post = new TelegramMessageDto();
        post.setMessageId(9001L);
        post.setText("Telegram Produkt 49 EUR");
        post.setPhotoUrls(List.of("https://cdn.telegram.org/image.jpg"));

        when(importLogRepository.existsByStoreIdAndChannelIdAndTelegramMsgId(121L, "@markt", 9001L)).thenReturn(false);
        when(productService.createProduct(any(), any(), any())).thenReturn(productDto);
        when(productRepository.findById(77L)).thenReturn(Optional.of(product));
        when(mediaService.uploadFromUrl(store, "https://cdn.telegram.org/image.jpg", "Telegram Produkt 49 EUR (Telegram)"))
            .thenReturn(media);
        when(minioService.getPublicUrl("store-assets", "stores/121/telegram/produkt.jpg"))
            .thenReturn("https://minio.markt.ma/store-assets/stores/121/telegram/produkt.jpg");
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productMediaRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        TelegramImportResultDto result = new TelegramImportResultDto();
        telegramImportService.processPost(post, cfg, store, new User(), result);

        ArgumentCaptor<Product> productCaptor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(productCaptor.capture());
        assertEquals("https://minio.markt.ma/store-assets/stores/121/telegram/produkt.jpg", productCaptor.getValue().getImageUrl());
        assertEquals(1, result.getImported());
    }
}
