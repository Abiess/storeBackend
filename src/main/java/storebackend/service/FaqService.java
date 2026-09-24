package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.FaqCategoryDTO;
import storebackend.dto.FaqItemDTO;
import storebackend.entity.FaqCategory;
import storebackend.entity.FaqItem;
import storebackend.entity.Store;
import storebackend.repository.FaqCategoryRepository;
import storebackend.repository.FaqItemRepository;
import storebackend.repository.StoreRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FaqService {

    private final FaqItemRepository faqItemRepository;
    private final FaqCategoryRepository faqCategoryRepository;
    private final StoreRepository storeRepository;

    @Transactional(readOnly = true)
    public List<FaqCategoryDTO> getCategories(Long storeId) {
        List<FaqCategory> categories = faqCategoryRepository.findAllByOrderByDisplayOrderAsc();

        return categories.stream()
                .map(this::convertCategoryToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FaqItemDTO> getFaqsByCategory(Long categoryId, Long storeId) {
        List<FaqItem> faqs = faqItemRepository.findByCategoryIdAndIsActiveTrueOrderByDisplayOrderAsc(categoryId);

        // Filter to show global FAQs + store-specific FAQs
        return faqs.stream()
                .filter(faq -> faq.getStore() == null || faq.getStore().getId().equals(storeId))
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FaqItemDTO> searchFaq(Long storeId, String keyword) {
        List<FaqItem> faqs = faqItemRepository.searchByKeyword(storeId, keyword);

        return faqs.stream()
                .map(this::convertItemToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public FaqItemDTO createFaqItem(Long storeId, FaqItemDTO dto) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        FaqCategory category = faqCategoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        FaqItem faq = new FaqItem();
        faq.setStore(store);
        faq.setCategory(category);
        faq.setQuestion(dto.getQuestion());
        faq.setAnswer(dto.getAnswer());
        faq.setKeywords(dto.getKeywords());
        faq.setDisplayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0);
        faq.setLanguage(dto.getLanguage() != null ? dto.getLanguage() : "de");
        faq.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        faq.setCreatedAt(LocalDateTime.now());
        faq.setUpdatedAt(LocalDateTime.now());

        faq = faqItemRepository.save(faq);
        log.info("Created FAQ item {} for store {}", faq.getId(), storeId);

        return convertItemToDTO(faq);
    }

    @Transactional
    public FaqItemDTO updateFaqItem(Long faqId, Long storeId, FaqItemDTO dto) {
        FaqItem faq = faqItemRepository.findById(faqId)
                .orElseThrow(() -> new RuntimeException("FAQ not found"));

        // Verify ownership
        if (faq.getStore() == null || !faq.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized: Cannot edit global or other store's FAQ");
        }

        if (dto.getQuestion() != null) faq.setQuestion(dto.getQuestion());
        if (dto.getAnswer() != null) faq.setAnswer(dto.getAnswer());
        if (dto.getKeywords() != null) faq.setKeywords(dto.getKeywords());
        if (dto.getDisplayOrder() != null) faq.setDisplayOrder(dto.getDisplayOrder());
        if (dto.getIsActive() != null) faq.setIsActive(dto.getIsActive());

        faq.setUpdatedAt(LocalDateTime.now());
        faq = faqItemRepository.save(faq);

        log.info("Updated FAQ item {}", faqId);
        return convertItemToDTO(faq);
    }

    @Transactional
    public void deleteFaqItem(Long faqId, Long storeId) {
        FaqItem faq = faqItemRepository.findById(faqId)
                .orElseThrow(() -> new RuntimeException("FAQ not found"));

        // Verify ownership
        if (faq.getStore() == null || !faq.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Unauthorized: Cannot delete global or other store's FAQ");
        }

        faqItemRepository.delete(faq);
        log.info("Deleted FAQ item {}", faqId);
    }

    @Transactional
    public void markHelpful(Long faqId) {
        FaqItem faq = faqItemRepository.findById(faqId)
                .orElseThrow(() -> new RuntimeException("FAQ not found"));

        faq.setHelpfulCount(faq.getHelpfulCount() + 1);
        faqItemRepository.save(faq);
    }

    private FaqCategoryDTO convertCategoryToDTO(FaqCategory category) {
        FaqCategoryDTO dto = new FaqCategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setSlug(category.getSlug());
        dto.setIcon(category.getIcon());
        dto.setDisplayOrder(category.getDisplayOrder());
        return dto;
    }

    private FaqItemDTO convertItemToDTO(FaqItem faq) {
        FaqItemDTO dto = new FaqItemDTO();
        dto.setId(faq.getId());
        dto.setCategoryId(faq.getCategory().getId());
        dto.setCategoryName(faq.getCategory().getName());
        dto.setQuestion(faq.getQuestion());
        dto.setAnswer(faq.getAnswer());
        dto.setKeywords(faq.getKeywords());
        dto.setDisplayOrder(faq.getDisplayOrder());
        dto.setViewCount(faq.getViewCount());
        dto.setHelpfulCount(faq.getHelpfulCount());
        dto.setLanguage(faq.getLanguage());
        dto.setIsActive(faq.getIsActive());
        dto.setIsGlobal(faq.getStore() == null);
        dto.setCreatedAt(faq.getCreatedAt());
        dto.setUpdatedAt(faq.getUpdatedAt());
        return dto;
    }
}

