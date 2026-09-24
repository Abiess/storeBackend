package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.CustomerAddress;
import storebackend.enums.AddressType;

import java.util.List;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {

    List<CustomerAddress> findByCustomerId(Long customerId);

    List<CustomerAddress> findByCustomerIdAndAddressType(Long customerId, AddressType addressType);

    List<CustomerAddress> findByCustomerIdAndIsDefaultTrue(Long customerId);
}

