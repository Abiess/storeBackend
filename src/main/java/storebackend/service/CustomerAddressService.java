package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CustomerAddressDTO;
import storebackend.entity.CustomerAddress;
import storebackend.enums.AddressType;
import storebackend.repository.CustomerAddressRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerAddressService {

    private final CustomerAddressRepository addressRepository;

    @Transactional
    public CustomerAddressDTO createAddress(Long customerId, CustomerAddressDTO dto) {
        CustomerAddress address = new CustomerAddress();
        address.setCustomerId(customerId);
        address.setAddressType(dto.getAddressType());
        address.setFirstName(dto.getFirstName());
        address.setLastName(dto.getLastName());
        address.setCompany(dto.getCompany());
        address.setStreet(dto.getStreet());
        address.setStreet2(dto.getStreet2());
        address.setCity(dto.getCity());
        address.setStateProvince(dto.getStateProvince());
        address.setPostalCode(dto.getPostalCode());
        address.setCountry(dto.getCountry());
        address.setPhone(dto.getPhone());
        address.setIsDefault(dto.getIsDefault() != null && dto.getIsDefault());
        address.setCreatedAt(LocalDateTime.now());
        address.setUpdatedAt(LocalDateTime.now());

        // Wenn diese Adresse als Standard gesetzt wird, alle anderen auf nicht-Standard setzen
        if (address.getIsDefault()) {
            addressRepository.findByCustomerId(customerId)
                    .stream()
                    .filter(a -> a.getAddressType() == address.getAddressType())
                    .forEach(a -> {
                        a.setIsDefault(false);
                        addressRepository.save(a);
                    });
        }

        CustomerAddress saved = addressRepository.save(address);
        return toDTO(saved);
    }

    @Transactional
    public CustomerAddressDTO updateAddress(Long addressId, Long customerId, CustomerAddressDTO dto) {
        CustomerAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Adresse nicht gefunden"));

        if (!address.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diese Adresse");
        }

        address.setAddressType(dto.getAddressType());
        address.setFirstName(dto.getFirstName());
        address.setLastName(dto.getLastName());
        address.setCompany(dto.getCompany());
        address.setStreet(dto.getStreet());
        address.setStreet2(dto.getStreet2());
        address.setCity(dto.getCity());
        address.setStateProvince(dto.getStateProvince());
        address.setPostalCode(dto.getPostalCode());
        address.setCountry(dto.getCountry());
        address.setPhone(dto.getPhone());
        address.setUpdatedAt(LocalDateTime.now());

        if (dto.getIsDefault() != null && dto.getIsDefault() && !address.getIsDefault()) {
            setAsDefault(addressId, customerId);
        }

        CustomerAddress updated = addressRepository.save(address);
        return toDTO(updated);
    }

    @Transactional
    public void deleteAddress(Long addressId, Long customerId) {
        CustomerAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Adresse nicht gefunden"));

        if (!address.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diese Adresse");
        }

        addressRepository.delete(address);
    }

    @Transactional
    public CustomerAddressDTO setAsDefault(Long addressId, Long customerId) {
        CustomerAddress address = addressRepository.findById(addressId)
                .orElseThrow(() -> new RuntimeException("Adresse nicht gefunden"));

        if (!address.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Keine Berechtigung für diese Adresse");
        }

        // Alle anderen Adressen des gleichen Typs auf nicht-Standard setzen
        addressRepository.findByCustomerIdAndAddressType(customerId, address.getAddressType())
                .forEach(a -> {
                    if (!a.getId().equals(addressId)) {
                        a.setIsDefault(false);
                        addressRepository.save(a);
                    }
                });

        address.setIsDefault(true);
        address.setUpdatedAt(LocalDateTime.now());
        CustomerAddress updated = addressRepository.save(address);
        return toDTO(updated);
    }

    public List<CustomerAddressDTO> getAddressesByCustomer(Long customerId) {
        return addressRepository.findByCustomerId(customerId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<CustomerAddressDTO> getAddressesByType(Long customerId, AddressType type) {
        return addressRepository.findByCustomerIdAndAddressType(customerId, type)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public CustomerAddressDTO getDefaultAddress(Long customerId, AddressType type) {
        return addressRepository.findByCustomerIdAndIsDefaultTrue(customerId)
                .stream()
                .filter(a -> a.getAddressType() == type)
                .findFirst()
                .map(this::toDTO)
                .orElse(null);
    }

    private CustomerAddressDTO toDTO(CustomerAddress address) {
        CustomerAddressDTO dto = new CustomerAddressDTO();
        dto.setId(address.getId());
        dto.setCustomerId(address.getCustomerId());
        dto.setAddressType(address.getAddressType());
        dto.setFirstName(address.getFirstName());
        dto.setLastName(address.getLastName());
        dto.setCompany(address.getCompany());
        dto.setStreet(address.getStreet());
        dto.setStreet2(address.getStreet2());
        dto.setCity(address.getCity());
        dto.setStateProvince(address.getStateProvince());
        dto.setPostalCode(address.getPostalCode());
        dto.setCountry(address.getCountry());
        dto.setPhone(address.getPhone());
        dto.setIsDefault(address.getIsDefault());
        dto.setCreatedAt(address.getCreatedAt());
        dto.setUpdatedAt(address.getUpdatedAt());
        return dto;
    }
}

